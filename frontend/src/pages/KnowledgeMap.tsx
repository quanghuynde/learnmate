import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  Filter,
  FileText,
  Check,
  Sparkles,
  Network,
  ArrowRight,
  Plus,
  Database,
  Code,
  Calculator,
  Cpu,
  Globe,
  Loader2,
  X,
  RefreshCw,
  Upload,
} from 'lucide-react'
import {
  api,
  DocumentItem,
  KnowledgeMapItem,
  KnowledgeMapNode,
} from '../lib/api'

const SUBJECT_ICONS: Record<string, { icon: typeof Database; color: string }> = {
  'Hệ CSDL': { icon: Database, color: 'bg-blue-500' },
  'Thuật toán': { icon: Code, color: 'bg-emerald-500' },
  'Cấu trúc dữ liệu': { icon: Network, color: 'bg-purple-500' },
  'Hệ điều hành': { icon: Cpu, color: 'bg-orange-500' },
  'Toán rời rạc': { icon: Calculator, color: 'bg-pink-500' },
  'Mạng máy tính': { icon: Globe, color: 'bg-cyan-500' },
}

const SUBJECT_RULES: { subject: string; patterns: RegExp[] }[] = [
  { subject: 'Hệ CSDL', patterns: [/sql/i, /database/i, /normalization/i, /csdl/i, /\bdb\b/i] },
  { subject: 'Thuật toán', patterns: [/algorithm/i, /sorting/i, /searching/i, /thuật toán/i] },
  { subject: 'Cấu trúc dữ liệu', patterns: [/data structure/i, /trees/i, /graphs/i, /cấu trúc/i] },
  { subject: 'Hệ điều hành', patterns: [/operating system/i, /process/i, /hệ điều hành/i] },
  { subject: 'Toán rời rạc', patterns: [/discrete/i, /graph theory/i, /toán rời/i] },
  { subject: 'Mạng máy tính', patterns: [/network/i, /tcp/i, /mạng/i] },
]

function inferSubject(doc: DocumentItem): string {
  for (const topic of doc.topics || []) {
    const match = Object.keys(SUBJECT_ICONS).find((s) =>
      topic.toLowerCase().includes(s.toLowerCase().slice(0, 4))
    )
    if (match) return match
  }
  for (const rule of SUBJECT_RULES) {
    if (rule.patterns.some((p) => p.test(doc.name))) return rule.subject
  }
  return 'Hệ CSDL'
}

function docId(doc: string | DocumentItem): string {
  return typeof doc === 'string' ? doc : doc._id
}

interface KnowledgeMapProps {
  token: string
  setCurrentPage?: (page: string) => void
}

export function KnowledgeMap({ token, setCurrentPage }: KnowledgeMapProps) {
  const [step, setStep] = useState<'select' | 'map'>('select')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [activeMap, setActiveMap] = useState<KnowledgeMapItem | null>(null)
  const [nodes, setNodes] = useState<KnowledgeMapNode[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFileSelect, setShowFileSelect] = useState(false)
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [docsRes, mapsRes] = await Promise.all([
        api.getDocuments(token),
        api.getKnowledgeMaps(token),
      ])
      setDocuments(docsRes.documents || [])

      const latest = mapsRes.knowledgeMaps?.[0]
      if (latest) {
        setActiveMap(latest)
        setNodes(latest.nodes || [])
        setStep('map')
        const ids = (latest.documentIds || []).map(docId)
        setSelectedDocs(ids)
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (setCurrentPage) {
      setCurrentPage('knowledge')
    }
  }, [setCurrentPage])

  const groupedDocs = useMemo(() => {
    return documents.reduce<Record<string, DocumentItem[]>>((acc, doc) => {
      const subject = inferSubject(doc)
      if (!acc[subject]) acc[subject] = []
      acc[subject].push(doc)
      return acc
    }, {})
  }, [documents])

  const connections = activeMap?.connections || []
  const crossLinks = activeMap?.crossLinks || []

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([])
    } else {
      setSelectedDocs(documents.map((d) => d._id))
    }
  }

  const handleCreateMap = async () => {
    if (selectedDocs.length < 2) return
    setSaving(true)
    setError(null)
    try {
      const res = await api.createKnowledgeMap(token, selectedDocs)
      setActiveMap(res.knowledgeMap)
      setNodes(res.knowledgeMap.nodes || [])
      setStep('map')
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo bản đồ kiến thức')
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!activeMap) return
    setSaving(true)
    setError(null)
    try {
      const res = await api.regenerateKnowledgeMap(token, activeMap._id)
      setActiveMap(res.knowledgeMap)
      setNodes(res.knowledgeMap.nodes || [])
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật bản đồ')
    } finally {
      setSaving(false)
    }
  }

  const persistNodes = useCallback(
    (nextNodes: KnowledgeMapNode[]) => {
      if (!activeMap) return
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        try {
          const res = await api.updateKnowledgeMap(token, activeMap._id, { nodes: nextNodes })
          setActiveMap(res.knowledgeMap)
        } catch {
          // silent — positions are still in local state
        }
      }, 700)
    },
    [activeMap, token]
  )

  const handleNodeDragEnd = (nodeId: string, point: { x: number; y: number }) => {
    const parent = canvasRef.current
    if (!parent) return

    const parentRect = parent.getBoundingClientRect()
    const cx = (point.x - parentRect.left) / zoom
    const cy = (point.y - parentRect.top) / zoom
    const x = Math.max(5, Math.min(95, (cx / (parentRect.width / zoom)) * 100))
    const y = Math.max(5, Math.min(95, (cy / (parentRect.height / zoom)) * 100))

    const nextNodes = nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n))
    setNodes(nextNodes)
    persistNodes(nextNodes)
  }

  const selectedDocItems = documents.filter((d) => selectedDocs.includes(d._id))
  const subjectCount = useMemo(
    () => new Set(selectedDocItems.map(inferSubject)).size,
    [selectedDocItems]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">Đang tải bản đồ kiến thức...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex justify-between items-center">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 'select' ? (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col"
          >
            <div className="mb-6 flex justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Sơ đồ tri thức động</h1>
                <p className="text-slate-500">
                  Chọn tài liệu đã upload — AI xây dựng bản đồ kiến thức liên ngành và lưu vào Atlas
                </p>
              </div>
              {activeMap && (
                <button
                  type="button"
                  onClick={() => setStep('map')}
                  className="text-sm font-medium text-primary hover:text-primary-light whitespace-nowrap"
                >
                  Xem bản đồ gần nhất →
                </button>
              )}
            </div>

            {documents.length === 0 ? (
              <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                <Upload size={48} className="text-slate-300 mb-4" />
                <h2 className="font-bold text-slate-900 mb-2">Chưa có tài liệu</h2>
                <p className="text-slate-500 text-sm mb-6 max-w-md">
                  Upload tài liệu học tập trước, sau đó quay lại đây để tạo bản đồ kiến thức từ MongoDB Atlas.
                </p>
                {setCurrentPage && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage('documents')}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-light transition-colors"
                  >
                    Đi tới Tài liệu
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <FileText size={20} className="text-primary" />
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-900">Tài liệu của bạn</h2>
                        <p className="text-xs text-slate-500">
                          Đã chọn {selectedDocs.length} / {documents.length} tài liệu
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-sm font-medium text-primary hover:text-primary-light transition-colors"
                    >
                      {selectedDocs.length === documents.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  </div>

                  <div className="space-y-6">
                    {Object.entries(groupedDocs).map(([subject, docs]) => {
                      const meta = SUBJECT_ICONS[subject] || SUBJECT_ICONS['Hệ CSDL']
                      const Icon = meta.icon
                      return (
                        <div key={subject}>
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Icon size={14} /> {subject}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {docs.map((doc) => {
                              const isSelected = selectedDocs.includes(doc._id)
                              return (
                                <button
                                  key={doc._id}
                                  type="button"
                                  onClick={() => toggleDoc(doc._id)}
                                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                                >
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? meta.color + ' text-white' : 'bg-slate-100 text-slate-400'}`}
                                  >
                                    <Icon size={20} />
                                  </div>
                                  <span
                                    className={`text-sm font-medium flex-1 truncate ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}
                                  >
                                    {doc.name}
                                  </span>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0"
                                    >
                                      <Check size={14} className="text-white" />
                                    </motion.div>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 flex flex-col items-center"
                >
                  <button
                    type="button"
                    onClick={handleCreateMap}
                    disabled={selectedDocs.length < 2 || saving}
                    className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all shadow-lg ${selectedDocs.length >= 2 && !saving ? 'bg-gradient-to-r from-primary to-primary-light text-white hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                  >
                    {saving ? (
                      <Loader2 size={22} className="animate-spin" />
                    ) : (
                      <Network size={22} />
                    )}
                    {saving ? 'Đang tạo & lưu Atlas...' : 'Tạo bản đồ kiến thức'}
                    {selectedDocs.length >= 2 && !saving && <ArrowRight size={20} />}
                  </button>
                  {selectedDocs.length < 2 && (
                    <p className="text-xs text-slate-400 mt-2">Chọn ít nhất 2 tài liệu để tạo bản đồ</p>
                  )}
                </motion.div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex justify-between items-center mb-4 z-10 flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Sơ đồ tri thức động</h1>
                <p className="text-slate-500">
                  Bản đồ từ {selectedDocs.length} tài liệu — {subjectCount} ngành
                  {activeMap?._id && (
                    <span className="text-xs text-slate-400 ml-2">· Đã lưu Atlas</span>
                  )}
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors"
                >
                  <Plus size={16} /> Chọn lại tài liệu
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFileSelect(!showFileSelect)}
                    className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-50"
                  >
                    <FileText size={16} /> Nguồn ({selectedDocs.length})
                  </button>
                  {showFileSelect && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
                      <p className="text-xs font-bold text-slate-500 mb-2 px-2 uppercase">
                        Tài liệu đã chọn
                      </p>
                      {selectedDocItems.map((f) => (
                        <div
                          key={f._id}
                          className="px-3 py-2 text-sm rounded-lg flex items-center gap-2 text-slate-700"
                        >
                          <Check size={14} className="text-primary flex-shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
                    className="p-1.5 hover:bg-slate-100 rounded-lg"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <span className="text-xs text-slate-500 w-10 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                    className="p-1.5 hover:bg-slate-100 rounded-lg"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={saving}
                    className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                    title="Tái tạo bản đồ"
                  >
                    <RefreshCw size={18} className={saving ? 'animate-spin' : ''} />
                  </button>
                  <button type="button" className="p-1.5 hover:bg-slate-100 rounded-lg">
                    <Filter size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-inner relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-100 shadow-sm flex gap-4 text-xs font-medium z-10">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-success" /> Nắm vững
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-accent" /> Đang học
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-danger" /> Yếu
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-4 left-4 w-64 bg-white rounded-2xl shadow-lg border border-primary/20 p-4 z-10"
              >
                <h4 className="font-bold text-primary flex items-center gap-2 mb-2">
                  <Sparkles size={16} /> AI Phát hiện liên kết
                </h4>
                <p className="text-sm text-slate-600 mb-3">
                  {activeMap?.aiInsight ||
                    'Bản đồ được tạo từ tài liệu và kết quả quiz của bạn.'}
                </p>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={saving}
                  className="w-full bg-primary/10 text-primary font-semibold py-1.5 rounded-lg text-sm hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Đang cập nhật...' : 'Cập nhật từ tài liệu'}
                </button>
              </motion.div>

              <div
                ref={canvasRef}
                className="absolute inset-0 w-full h-full origin-center transition-transform"
                style={{ transform: `scale(${zoom})` }}
              >
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {connections.map((line, i) => {
                    const fromNode = nodes.find((n) => n.id === line.from)
                    const toNode = nodes.find((n) => n.id === line.to)
                    if (!fromNode || !toNode) return null
                    const isCross = crossLinks.some(
                      (cl) => cl.from === line.from && cl.to === line.to
                    )
                    return (
                      <line
                        key={i}
                        x1={`${fromNode.x}%`}
                        y1={`${fromNode.y}%`}
                        x2={`${toNode.x}%`}
                        y2={`${toNode.y}%`}
                        stroke={isCross ? '#3b82f6' : '#cbd5e1'}
                        strokeWidth={isCross ? 2.5 : 1.5}
                        strokeDasharray={isCross ? '6 3' : '4'}
                        opacity={isCross ? 0.8 : 0.5}
                      />
                    )
                  })}
                </svg>

                {nodes.map((node, idx) => (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: idx * 0.03,
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                    }}
                    drag
                    dragMomentum={false}
                    onDragEnd={(_, info) => handleNodeDragEnd(node.id, info.point)}
                    className={`absolute flex items-center justify-center rounded-full shadow-lg cursor-grab active:cursor-grabbing font-bold text-center leading-tight whitespace-pre-line ${node.color} ${node.size}`}
                    style={{
                      left: `calc(${node.x}% - 2rem)`,
                      top: `calc(${node.y}% - 2rem)`,
                    }}
                    whileHover={{ scale: 1.1, zIndex: 50 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {node.label}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}