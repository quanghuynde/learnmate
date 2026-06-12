import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Check,
  Sparkles,
  Network,
  ArrowRight,
  BookOpen,
  AlertCircle,
  Loader2,
  ChevronLeft,
  X,
  FileBox,
  Trash2,
  History,
  Clock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react'
import { api, DocumentItem, KnowledgeMapData, UserItem } from '../lib/api'

interface KnowledgeMapProps {
  token: string
  user: UserItem | null
}

interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
}

// ─── Branch color palette (one per level-1 branch) ─────────────────────────

const BRANCH_COLORS = [
  { node: '#3b82f6', line: '#3b82f6', light: '#eff6ff', text: '#1e3a8a' }, // Blue
  { node: '#10b981', line: '#10b981', light: '#ecfdf5', text: '#064e3b' }, // Emerald
  { node: '#f59e0b', line: '#f59e0b', light: '#fffbeb', text: '#78350f' }, // Amber
  { node: '#8b5cf6', line: '#8b5cf6', light: '#f5f3ff', text: '#4c1d95' }, // Violet
  { node: '#ef4444', line: '#ef4444', light: '#fef2f2', text: '#7f1d1d' }, // Red
  { node: '#06b6d4', line: '#06b6d4', light: '#ecfeff', text: '#164e63' }, // Cyan
  { node: '#ec4899', line: '#ec4899', light: '#fdf2f8', text: '#831843' }, // Pink
  { node: '#14b8a6', line: '#14b8a6', light: '#f0fdfa', text: '#0f3731' }, // Teal
]

function getBranchColor(branchIndex: number) {
  return BRANCH_COLORS[branchIndex % BRANCH_COLORS.length]
}

// ─── Layout constants ────────────────────────────────────────────────────────

const NODE_H = 36
const NODE_PADDING_X = 14
const LEVEL_GAP_X = 220
const SIBLING_GAP_Y = 14
const ROOT_X = 180

// ─── Measure text width ──────────────────────────────────────────────────────

function measureText(text: string, fontSize = 13): number {
  return Math.min(Math.max(text.length * (fontSize * 0.58), 80), 260)
}

// ─── Node with position info ─────────────────────────────────────────────────

interface PositionedNode {
  id: string
  label: string
  depth: number
  branchIndex: number   // index of direct child of root
  x: number
  y: number
  width: number
  height: number
  children: PositionedNode[]
  hasChildren: boolean
  expanded: boolean
  parentId: string | null
}

// ─── Tree layout engine ──────────────────────────────────────────────────────

function buildLayout(
  node: TreeNode,
  expandedSet: Set<string>,
  depth = 0,
  branchIndex = 0,
  parentId: string | null = null,
): PositionedNode & { _subtreeHeight: number } {
  const hasChildren = !!(node.children && node.children.length > 0)
  const expanded = expandedSet.has(node.id)
  const width = measureText(node.label) + NODE_PADDING_X * 2
  const height = NODE_H

  let children: (PositionedNode & { _subtreeHeight: number })[] = []
  let subtreeH = height

  if (hasChildren && expanded) {
    children = node.children!.map((c, i) =>
      buildLayout(c, expandedSet, depth + 1, depth === 0 ? i : branchIndex, node.id)
    )
    // Vertical extent
    const childrenTotal = children.reduce((s, c) => s + c._subtreeHeight, 0) + SIBLING_GAP_Y * (children.length - 1)
    subtreeH = Math.max(height, childrenTotal)
  }

  // x,y will be set in a second pass
  return {
    id: node.id,
    label: node.label,
    depth,
    branchIndex: depth === 0 ? -1 : branchIndex,
    x: 0, y: 0,
    width, height,
    children: children as PositionedNode[],
    hasChildren,
    expanded,
    parentId,
    _subtreeHeight: subtreeH,
  }
}

function positionTree(
  node: PositionedNode & { _subtreeHeight: number },
  startX: number,
  startY: number,
): void {
  node.x = startX
  node.y = startY + node._subtreeHeight / 2 - node.height / 2

  if (node.children.length > 0) {
    const cx = startX + node.width + LEVEL_GAP_X
    let cy = startY
    for (const child of node.children as (PositionedNode & { _subtreeHeight: number })[]) {
      positionTree(child, cx, cy)
      cy += child._subtreeHeight + SIBLING_GAP_Y
    }
  }
}

function flattenTree(node: PositionedNode): PositionedNode[] {
  return [node, ...node.children.flatMap(flattenTree)]
}

// ─── SVG curved path between two nodes ──────────────────────────────────────

function cubicPath(
  x1: number, y1: number,
  x2: number, y2: number,
): string {
  const cx1 = x1 + (x2 - x1) * 0.6
  const cx2 = x1 + (x2 - x1) * 0.4
  return `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`
}

// ─── Mind map SVG renderer ───────────────────────────────────────────────────

function MindMapSVG({
  rootNode,
  onToggle,
  activeDepth,
}: {
  rootNode: TreeNode
  onToggle: (id: string) => void
  activeDepth: number | null
}) {
  const [expandedSet, setExpandedSet] = useState<Set<string>>(() => {
    // Expand root + level 1 by default
    const s = new Set<string>()
    s.add(rootNode.id)
    rootNode.children?.forEach(c => s.add(c.id))
    return s
  })

  const PADDING = 60

  // Build layout
  const layoutTree = buildLayout(rootNode, expandedSet) as PositionedNode & { _subtreeHeight: number }
  positionTree(layoutTree, ROOT_X, PADDING)
  const all = flattenTree(layoutTree)

  // Compute SVG bounds
  const maxX = Math.max(...all.map(n => n.x + n.width)) + PADDING
  const maxY = Math.max(...all.map(n => n.y + n.height)) + PADDING
  const svgW = Math.max(maxX, 900)
  const svgH = Math.max(maxY, 500)

  const toggle = (id: string) => {
    setExpandedSet(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    onToggle(id)
  }

  // Expand/collapse all up to a specific depth
  useLayoutEffect(() => {
    if (activeDepth === null) return;
    
    const newSet = new Set<string>();
    const expandToDepth = (node: TreeNode, currentDepth: number) => {
      if (currentDepth < activeDepth) {
        newSet.add(node.id);
        if (node.children) {
          node.children.forEach(child => expandToDepth(child, currentDepth + 1));
        }
      }
    };
    
    expandToDepth(rootNode, 0);
    setExpandedSet(newSet);
  }, [activeDepth, rootNode]);

  // Edges
  const edges: JSX.Element[] = []
  for (const node of all) {
    if (!node.parentId) continue
    const parent = all.find(n => n.id === node.parentId)
    if (!parent) continue
    const color = node.branchIndex >= 0 ? getBranchColor(node.branchIndex).line : '#94a3b8'
    const x1 = parent.x + parent.width
    const y1 = parent.y + parent.height / 2
    const x2 = node.x
    const y2 = node.y + node.height / 2

    // filter by depth
    const visible =
      activeDepth === null ||
      node.depth <= activeDepth + 1

    if (!visible) continue

    edges.push(
      <path
        key={`edge-${parent.id}-${node.id}`}
        d={cubicPath(x1, y1, x2, y2)}
        stroke={color}
        strokeWidth={node.depth === 1 ? 2.5 : 1.8}
        fill="none"
        strokeLinecap="round"
        opacity={0.85}
      />
    )
  }

  return (
    <svg
      width={svgW}
      height={svgH}
      style={{ overflow: 'visible', cursor: 'default' }}
    >
      {edges}
      {all.map(node => {
        const color = node.branchIndex >= 0
          ? (node.depth === 1
            ? { bg: getBranchColor(node.branchIndex).node, text: '#fff', border: getBranchColor(node.branchIndex).node }
            : { bg: getBranchColor(node.branchIndex).light, text: getBranchColor(node.branchIndex).text, border: getBranchColor(node.branchIndex).line })
          : { bg: '#1e293b', text: '#fff', border: '#1e293b' } // root

        const activeDepthOk = activeDepth === null || node.depth <= activeDepth

        if (!activeDepthOk && node.depth > 0) return null

        return (
          <g
            key={node.id}
            transform={`translate(${node.x},${node.y})`}
            onClick={() => node.hasChildren && toggle(node.id)}
            style={{ cursor: node.hasChildren ? 'pointer' : 'default' }}
          >
            <rect
              x={0}
              y={0}
              width={node.width}
              height={node.height}
              rx={10}
              ry={10}
              fill={color.bg}
              stroke={color.border}
              strokeWidth={1.5}
            />
            <text
              x={NODE_PADDING_X}
              y={node.height / 2}
              dominantBaseline="middle"
              fontSize={13}
              fill={color.text}
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight={node.depth === 0 ? '700' : node.depth === 1 ? '600' : '500'}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              <tspan>
                {node.label.length > 38 ? node.label.slice(0, 36) + '…' : node.label}
              </tspan>
            </text>

            {/* Expand/collapse icon */}
            {node.hasChildren && (
              <g transform={`translate(${node.width - 20}, ${node.height / 2})`}>
                <circle cx={0} cy={0} r={9} fill="white" opacity={0.9} />
                <text
                  x={0} y={0}
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fontSize={11}
                  fill={node.branchIndex >= 0 ? getBranchColor(node.branchIndex).node : '#64748b'}
                  fontWeight="700"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {expandedSet.has(node.id) ? '−' : '+'}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function KnowledgeMap({ token, user }: KnowledgeMapProps) {
  const [step, setStep] = useState<'select' | 'map'>('select')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [mapData, setMapData] = useState<KnowledgeMapData | null>(null)
  const [mapTitle, setMapTitle] = useState('')
  const [showFileSelect, setShowFileSelect] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [title, setTitle] = useState('')
  const [deletingMapId, setDeletingMapId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })
  const [activeDepth, setActiveDepth] = useState<number | null>(null)

  // ── data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setLoadingHistory(true)
        const [docsRes, histRes] = await Promise.all([
          api.getDocuments(token),
          api.getKnowledgeMaps(token)
        ])
        setDocuments(docsRes.documents || [])
        setHistory(histRes.maps || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không tải được dữ liệu')
      } finally {
        setLoading(false)
        setLoadingHistory(false)
      }
    }
    loadData()
  }, [token])

  // ── actions ───────────────────────────────────────────────────────────────

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id],
    )
  }

  const selectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(documents.map((d) => d._id))
    }
  }

  const handleGenerate = async () => {
    if (selectedDocs.length === 0) return
    setError('')
    setGenerating(true)
    try {
      const res = await api.generateKnowledgeMap(token, selectedDocs, title)
      setMapData(res.mapData)
      setMapTitle(res.title || title || 'Bản đồ kiến thức')
      setActiveDepth(null)
      setStep('map')
      const histRes = await api.getKnowledgeMaps(token)
      setHistory(histRes.maps || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo bản đồ thất bại')
    } finally {
      setGenerating(false)
    }
  }

  const loadFromHistory = async (id: string) => {
    try {
      setLoading(true)
      const res = await api.getKnowledgeMapById(token, id)
      setMapData(res.mapData)
      setMapTitle(res.title || 'Bản đồ kiến thức')
      setActiveDepth(null)
      setStep('map')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải bản đồ')
    } finally {
      setLoading(false)
    }
  }

  const prepareDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingMapId(id)
  }

  const confirmDelete = async (id: string) => {
    try {
      await api.deleteKnowledgeMap(token, id)
      setHistory(prev => prev.filter(m => m._id !== id))
      setDeletingMapId(null)
    } catch (e) {
      alert('Xóa thất bại')
    }
  }

  // ── pan/zoom handlers ─────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsPanning(true)
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }

  const handleMouseUp = () => setIsPanning(false)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.max(0.3, Math.min(2.5, z - e.deltaY * 0.001)))
  }

  // ── render selection step ─────────────────────────────────────────────────

  if (step === 'select') {
    const tier = user?.role === 'admin' ? 'Premium' : (user as any)?.subscriptionTier || 'Basic'
    const limits = { 'Basic': 10, 'Pro': 30, 'Premium': Infinity }
    const userLimit = limits[tier as keyof typeof limits] || 10
    const used = history.length
    const isOverLimit = used >= userLimit

    return (
      <div className="flex-1 flex flex-col pb-10 h-full overflow-hidden">
        <div className="mb-6 flex justify-between items-end flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sơ đồ tri thức động</h1>
            <p className="text-slate-500">Chọn từ 1-8 tài liệu để AI xây dựng bản đồ kiến thức</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Giới hạn lưu trữ</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all ${used / userLimit > 0.8 ? 'bg-amber-500' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, (used / userLimit) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-black text-slate-700">
                {used}/{userLimit === Infinity ? '∞' : userLimit}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-200 text-sm flex-shrink-0">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
          {/* History Sidebar */}
          <div className="w-full lg:w-80 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden lg:h-full max-h-[300px] lg:max-h-none">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-slate-900 font-bold">
              <div className="flex items-center gap-2">
                <History size={18} className="text-primary" /> Bản đồ đã lưu
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {loadingHistory ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse mx-2" />)
              ) : history.length === 0 ? (
                <div className="text-center py-10 px-4 text-slate-400">
                  <Clock size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Chưa có bản đồ nào được lưu</p>
                </div>
              ) : (
                history.map(map => (
                  <div
                    key={map._id}
                    onClick={() => loadFromHistory(map._id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadFromHistory(map._id) }}
                    className="w-full group p-3 rounded-2xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all text-left cursor-pointer relative"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">
                        {map.title}
                      </p>
                      <div className="relative">
                        <button
                          onClick={(e) => prepareDelete(e, map._id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                        <AnimatePresence>
                          {deletingMapId === map._id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, x: 10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.9, x: 10 }}
                              className="absolute right-full top-0 mr-3 z-[60] bg-slate-900 text-white p-3 rounded-2xl shadow-2xl min-w-[180px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-[11px] font-bold mb-3 leading-tight">Xóa bản đồ kiến thức đã tạo?</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeletingMapId(null) }}
                                  className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-[10px] font-bold transition-colors"
                                >Hủy</button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); confirmDelete(map._id) }}
                                  className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 rounded-xl text-[10px] font-bold transition-colors"
                                >Xóa</button>
                              </div>
                              <div className="absolute top-3 -right-1.5 w-3 h-3 bg-slate-900 rotate-45" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1"><BookOpen size={10} /> {map.documentIds?.length || 0} tài liệu</span>
                      <span>{new Date(map.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Document Selection */}
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileBox size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Tạo bản đồ mới</h2>
                  <p className="text-xs text-slate-500">
                    {loading ? 'Đang tải...' : `Đã chọn ${selectedDocs.length} tài liệu (Tối đa 8)`}
                  </p>
                </div>
              </div>
              <button
                onClick={selectAll}
                disabled={loading || documents.length === 0}
                className="text-sm font-medium text-primary hover:text-primary-light transition-colors disabled:opacity-50"
              >
                {selectedDocs.length === documents.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
              {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />)}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <FileBox size={40} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Bạn chưa có tài liệu nào.</p>
                  <button onClick={() => window.location.href = '/documents'} className="text-primary text-sm font-bold mt-2">Tải lên ngay</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {documents.map((doc) => {
                    const isSelected = selectedDocs.includes(doc._id)
                    const isLimit = selectedDocs.length >= 8 && !isSelected
                    return (
                      <button
                        key={doc._id}
                        onClick={() => !isLimit && toggleDoc(doc._id)}
                        disabled={isLimit}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'} ${isLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <BookOpen size={20} />
                        </div>
                        <div className="flex-1 truncate">
                          <p className={`text-sm font-bold truncate ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{doc.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{doc.type}</p>
                        </div>
                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <Check size={14} className="text-white" />
                          </motion.div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center gap-3 flex-shrink-0">
              <input
                type="text"
                placeholder="Đặt tên cho bản đồ này (Tùy chọn)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full max-w-md px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-center"
              />
              <button
                onClick={handleGenerate}
                disabled={selectedDocs.length === 0 || generating || isOverLimit}
                className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all shadow-lg ${selectedDocs.length > 0 && !isOverLimit
                  ? 'bg-gradient-to-r from-primary to-primary-light text-white hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
              >
                {generating ? <Loader2 className="animate-spin" size={22} /> : <Network size={22} />}
                Tạo bản đồ tri thức mới
                {!generating && selectedDocs.length > 0 && <ArrowRight size={20} />}
              </button>
              {isOverLimit ? (
                <p className="text-xs text-red-500 font-bold flex items-center gap-1"><AlertCircle size={14} /> Bạn đã đạt giới hạn lưu trữ. Vui lòng xóa bớt bản đồ cũ.</p>
              ) : (
                <p className="text-xs text-slate-400">Chi phí: 10 Credit</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── render map step ───────────────────────────────────────────────────────

  const treeData: TreeNode | null = mapData?.tree || null
  const aiInsight = mapData?.aiInsight || null
  const documentSources: string[] = mapData?.documentSources || []

  // Count depth levels for filter buttons
  const getMaxDepth = (node: TreeNode, d = 0): number => {
    if (!node.children || node.children.length === 0) return d
    return Math.max(...node.children.map(c => getMaxDepth(c, d + 1)))
  }
  const maxDepth = treeData ? getMaxDepth(treeData) : 3
  const depthLabels = ['Gốc', 'Chương', 'Mục', 'Chi tiết']

  return (
    <div className="flex-1 flex flex-col h-full relative" style={{ cursor: 'default' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4 z-10 flex-shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{mapTitle || 'Sơ đồ tri thức'}</h1>
          {documentSources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {documentSources.map((src, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full border border-primary/20">
                  <FileText size={10} /> {src}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {/* Depth filter buttons */}
          {treeData && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1">
              <button
                onClick={() => setActiveDepth(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${activeDepth === null ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Tất cả
              </button>
              {Array.from({ length: Math.min(maxDepth + 1, 4) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveDepth(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${activeDepth === i ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                  style={activeDepth === i ? { backgroundColor: getBranchColor(i).node } : {}}
                >
                  {depthLabels[i] || `Tầng ${i}`}
                </button>
              ))}
            </div>
          )}

          {/* Source badge */}
          <div className="relative">
            <button
              onClick={() => setShowFileSelect(!showFileSelect)}
              className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-50"
            >
              <FileText size={15} /> Nguồn ({documentSources.length || selectedDocs.length})
            </button>
            <AnimatePresence>
              {showFileSelect && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-3 z-50">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Nguồn tạo sơ đồ</p>
                    <button onClick={() => setShowFileSelect(false)}><X size={14} /></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {documentSources.length > 0 ? documentSources.map((src, i) => (
                      <div key={i} className="px-3 py-2 text-sm rounded-lg flex items-center gap-2 text-slate-700 bg-slate-50">
                        <FileText size={14} className="text-primary flex-shrink-0" />
                        <span className="font-medium">{src}</span>
                      </div>
                    )) : documents.filter((d) => selectedDocs.includes(d._id)).map((f) => (
                      <div key={f._id} className="px-3 py-2 text-sm rounded-lg flex items-center gap-2 text-slate-700 bg-slate-50">
                        <Check size={14} className="text-primary flex-shrink-0" />
                        <span className="font-medium">{f.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 text-center">{documentSources.length || selectedDocs.length} tài liệu nguồn</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setStep('select')}
            className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={16} /> Tài liệu
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Thu nhỏ">
              <ZoomOut size={17} />
            </button>
            <span className="text-xs font-bold text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2.5, z + 0.15))} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Phóng to">
              <ZoomIn size={17} />
            </button>
            <button onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }) }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500" title="Reset">
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-inner relative overflow-hidden select-none touch-none"
        style={{
          backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          cursor: isPanning ? 'grabbing' : 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'black\' stroke=\'white\' stroke-width=\'1\'%3E%3Cpath d=\'M5.5 3.21V20.8c0 .45.54.67.85.35l4.83-4.83 2.3 5.43c.12.28.44.41.72.29l1.64-.69c.28-.12.41-.44.29-.72l-2.3-5.43 6.4-.64c.31-.03.43-.41.2-.64l-14.21-13.9a.4.4 0 0 0-.72.29z\'/%3E%3C/svg%3E"), auto',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        // Add touch events for mobile panning
        onTouchStart={(e) => {
          const touch = e.touches[0];
          setIsPanning(true);
          panStart.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
        }}
        onTouchMove={(e) => {
          if (!isPanning) return;
          const touch = e.touches[0];
          setPan({ x: touch.clientX - panStart.current.x, y: touch.clientY - panStart.current.y });
        }}
        onTouchEnd={() => setIsPanning(false)}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {treeData ? (
            <MindMapSVG
              rootNode={treeData}
              onToggle={() => {}}
              activeDepth={activeDepth}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400 w-[600px]">
              <div className="text-center">
                <Network size={40} className="mx-auto mb-2 opacity-30" />
                <p>Không có dữ liệu sơ đồ</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Insight */}
        {aiInsight && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="absolute bottom-4 left-4 w-72 bg-white rounded-2xl shadow-xl border border-primary/20 p-4 z-10 pointer-events-none">
            <h4 className="font-bold text-primary flex items-center gap-2 mb-2">
              <Sparkles size={16} /> AI Insight
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed italic">"{aiInsight}"</p>
          </motion.div>
        )}

        {/* Color legend */}
        {treeData?.children && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm p-2.5 z-10 flex flex-col gap-1.5 pointer-events-none max-w-[200px]">
            {treeData.children.slice(0, 6).map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getBranchColor(i).node }} />
                <span className="truncate">{c.label}</span>
              </div>
            ))}
            {treeData.children.length > 6 && <p className="text-[10px] text-slate-400 pl-5">+{treeData.children.length - 6} nhánh</p>}
          </div>
        )}

        <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 bg-white/80 px-3 py-1.5 rounded-full border border-slate-100 shadow-sm pointer-events-none">
          Cuộn để zoom · Kéo để di chuyển · Click nút ±, lọc tầng
        </div>
      </div>
    </div>
  )
}
