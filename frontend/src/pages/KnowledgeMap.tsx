import { useEffect, useState, useMemo } from 'react'
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
  BookOpen,
  AlertCircle,
  Loader2,
  ChevronLeft,
  X,
  FileBox,
  Trash2,
  History,
  Clock,
} from 'lucide-react'
import { api, DocumentItem, KnowledgeMapData, KnowledgeMapNode, UserItem } from '../lib/api'

interface KnowledgeMapProps {
  token: string
  user: UserItem | null
}

type NodeWithPos = KnowledgeMapNode & { x: number; y: number; isRoot?: boolean; size: string }

export function KnowledgeMap({ token, user }: KnowledgeMapProps) {
  const [step, setStep] = useState<'select' | 'map'>('select')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [mapData, setMapData] = useState<KnowledgeMapData | null>(null)
  const [showFileSelect, setShowFileSelect] = useState(false)
  const [viewState, setViewState] = useState({ scale: 1, x: 0, y: 0 })
  const [filter, setFilter] = useState<'all' | 'done' | 'doing' | 'todo'>('all')
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [title, setTitle] = useState('')

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
      setStep('map')
      // Refresh history
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
      setStep('map')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải bản đồ')
    } finally {
      setLoading(false)
    }
  }

  const deleteMap = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!window.confirm('Bạn có chắc muốn xóa bản đồ này?')) return
    try {
      await api.deleteKnowledgeMap(token, id)
      setHistory(prev => prev.filter(m => m._id !== id))
    } catch (e) {
      alert('Xóa thất bại')
    }
  }

  // ── map logic ─────────────────────────────────────────────────────────────

  const processedNodes = useMemo(() => {
    if (!mapData) return []
    const nodes: NodeWithPos[] = []
    
    // 1. Root node
    nodes.push({
      id: 'root',
      label: 'Kiến thức\ntổng hợp',
      x: 50,
      y: 50,
      color: 'bg-slate-900 text-white',
      size: 'w-28 h-28 text-sm',
      isRoot: true,
    })

    const { subjects, topics } = mapData
    const subjectAngleStep = (2 * Math.PI) / (subjects.length || 1)
    const subjectRadius = 38 // Spread out subjects more

    subjects.forEach((s, i) => {
      const sAngle = subjectAngleStep * i - Math.PI / 2
      const sx = 50 + subjectRadius * Math.cos(sAngle)
      const sy = 50 + subjectRadius * Math.sin(sAngle)
      
      nodes.push({
        ...s,
        x: sx,
        y: sy,
        size: 'w-24 h-24 text-xs',
      })

      const sTopics = topics.filter(t => t.subjectId === s.id)
      const tAngleStep = (Math.PI * 1.5) / (sTopics.length || 1) // Less than full circle to avoid inward overlap
      const tRadius = 15

      sTopics.forEach((t, j) => {
        // Offset topics to point outwards from center
        const tAngle = sAngle - (tAngleStep * (sTopics.length - 1)) / 2 + tAngleStep * j
        let tx = sx + tRadius * Math.cos(tAngle)
        let ty = sy + tRadius * Math.sin(tAngle)
        
        // Avoid bottom-left area (AI Insight card)
        if (tx < 30 && ty > 70) {
          tx += 10
          ty -= 10
        }

        nodes.push({
          ...t,
          x: Math.max(5, Math.min(95, tx)),
          y: Math.max(5, Math.min(95, ty)),
          size: 'w-20 h-20 text-[10px]',
          color: t.status === 'done' ? 'bg-emerald-500 text-white' : 
                 t.status === 'doing' ? 'bg-amber-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-600'
        })
      })
    })

    if (filter === 'all') return nodes
    return nodes.filter(n => n.id === 'root' || subjects.some(s => s.id === n.id) || (n as any).status === filter)
  }, [mapData, filter])

  const allConnections = useMemo(() => {
    if (!mapData) return []
    const conn: Array<{ from: string; to: string; isCross?: boolean }> = []
    
    // Core connections
    mapData.subjects.forEach(s => {
      if (processedNodes.some(n => n.id === s.id)) {
        conn.push({ from: 'root', to: s.id })
      }
    })
    
    mapData.topics.forEach(t => {
      if (processedNodes.some(n => n.id === t.id)) {
        conn.push({ from: t.subjectId, to: t.id })
      }
    })

    // Cross connections
    if (mapData.connections) {
      mapData.connections.forEach(c => {
        const fromExists = processedNodes.some(n => n.id === c.from)
        const toExists = processedNodes.some(n => n.id === c.to)
        if (fromExists && toExists) {
          const isExisting = conn.some(existing => (existing.from === c.from && existing.to === c.to) || (existing.from === c.to && existing.to === c.from))
          if (!isExisting) conn.push({ ...c, isCross: true })
        }
      })
    }
    return conn
  }, [mapData, processedNodes])

  const getLineCoords = (fromId: string, toId: string) => {
    const from = processedNodes.find(n => n.id === fromId)
    const to = processedNodes.find(n => n.id === toId)
    if (!from || !to) return null

    const getRadius = (size: string) => {
      if (size.includes('w-28')) return 5.8 
      if (size.includes('w-24')) return 4.8
      return 4.0
    }

    const r1 = getRadius(from.size)
    const r2 = getRadius(to.size)
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist === 0) return null

    return {
      x1: from.x + (dx * r1) / dist,
      y1: from.y + (dy * r1) / dist,
      x2: to.x - (dx * r2) / dist,
      y2: to.y - (dy * r2) / dist,
    }
  }

  // ── render selection step ─────────────────────────────────────────────────

  if (step === 'select') {
    const tier = user?.role === 'admin' ? 'Premium' : (user as any)?.subscriptionTier || 'Basic'
    const limits = { 'Basic': 5, 'Pro': 20, 'Premium': Infinity }
    const userLimit = limits[tier as keyof typeof limits] || 5
    const used = history.length
    const isOverLimit = used >= userLimit

    return (
      <div className="flex-1 flex flex-col pb-10 h-full overflow-hidden">
        <div className="mb-6 flex justify-between items-end flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sơ đồ tri thức động</h1>
            <p className="text-slate-500">
              Chọn từ 1-8 tài liệu để AI xây dựng bản đồ kiến thức liên ngành
            </p>
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

        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          {/* History Sidebar */}
          <div className="w-80 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 text-slate-900 font-bold">
              <History size={18} className="text-primary" /> Bản đồ đã lưu
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
                  <button
                    key={map._id}
                    onClick={() => loadFromHistory(map._id)}
                    className="w-full group p-3 rounded-2xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">
                        {map.title}
                      </p>
                      <button 
                        onClick={(e) => deleteMap(e, map._id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <BookOpen size={10} /> {map.documentIds?.length || 0} tài liệu
                      </span>
                      <span>{new Date(map.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </button>
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
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <FileBox size={40} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Bạn chưa có tài liệu nào.</p>
                  <button onClick={() => window.location.href='/documents'} className="text-primary text-sm font-bold mt-2">Tải lên ngay</button>
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
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                          isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        } ${isLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <BookOpen size={20} />
                        </div>
                        <div className="flex-1 truncate">
                          <p className={`text-sm font-bold truncate ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                            {doc.name}
                          </p>
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
                className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all shadow-lg ${
                  selectedDocs.length > 0 && !isOverLimit
                    ? 'bg-gradient-to-r from-primary to-primary-light text-white hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {generating ? <Loader2 className="animate-spin" size={22} /> : <Network size={22} />}
                Tạo bản đồ tri thức mới
                {!generating && selectedDocs.length > 0 && <ArrowRight size={20} />}
              </button>
              {isOverLimit ? (
                <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                  <AlertCircle size={14} /> Bạn đã đạt giới hạn lưu trữ. Vui lòng xóa bớt bản đồ cũ.
                </p>
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

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div className="flex justify-between items-center mb-4 z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sơ đồ tri thức động</h1>
          <p className="text-slate-500">
            Dựa trên {selectedDocs.length} tài liệu — {mapData?.subjects.length} lĩnh vực
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setStep('select')}
            className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={16} /> Chọn lại tài liệu
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowFileSelect(!showFileSelect)}
              className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-50"
            >
              <FileText size={16} /> Nguồn ({selectedDocs.length})
            </button>
            <AnimatePresence>
              {showFileSelect && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
                  <div className="flex justify-between items-center px-2 mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Tài liệu phân tích</p>
                    <button onClick={() => setShowFileSelect(false)}><X size={14}/></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {documents.filter((d) => selectedDocs.includes(d._id)).map((f) => (
                      <div key={f._id} className="px-3 py-2 text-sm rounded-lg flex items-center gap-2 text-slate-700 bg-slate-50 mb-1">
                        <Check size={14} className="text-primary flex-shrink-0" />
                        <span className="truncate font-medium">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setViewState(v => ({ ...v, scale: Math.max(0.5, v.scale - 0.1) }))}
              className="p-1.5 hover:bg-slate-100 rounded-lg"
            >
              <ZoomOut size={18} />
            </button>
            <button 
              onClick={() => setViewState(v => ({ ...v, scale: Math.min(2, v.scale + 0.1) }))}
              className="p-1.5 hover:bg-slate-100 rounded-lg"
            >
              <ZoomIn size={18} />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <div className="relative group">
              <button className="p-1.5 hover:bg-slate-100 rounded-lg text-primary">
                <Filter size={18} />
              </button>
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 w-32">
                {(['all', 'done', 'doing', 'todo'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${filter === f ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50 text-slate-600'}`}
                  >
                    {f === 'all' ? 'Tất cả' : f === 'done' ? 'Nắm vững' : f === 'doing' ? 'Đang học' : 'Yếu'}
                  </button>
                )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-inner relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] cursor-default">
        <motion.div 
          className="absolute inset-0 w-full h-full"
          drag
          dragMomentum={false}
          dragConstraints={{ left: -2000, right: 2000, top: -2000, bottom: 2000 }}
          onDrag={(_, info) => setViewState(v => ({ ...v, x: v.x + info.delta.x, y: v.y + info.delta.y }))}
          style={{ scale: viewState.scale, x: viewState.x, y: viewState.y, cursor: 'default' }}
        >
          {/* Legend */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-100 shadow-lg flex gap-4 text-xs font-bold z-10 transition-all hover:scale-105 pointer-events-none">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Nắm vững</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Đang học</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-400"></div> Yếu</div>
          </div>

          {/* AI Insight Card */}
          {mapData?.aiInsight && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="absolute bottom-4 left-4 w-72 bg-white rounded-2xl shadow-xl border border-primary/20 p-4 z-10 pointer-events-none">
              <h4 className="font-bold text-primary flex items-center gap-2 mb-2">
                <Sparkles size={16} /> AI Insight
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "{mapData.aiInsight}"
              </p>
            </motion.div>
          )}

          {/* Canvas */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {allConnections.map((line, i) => {
              const coords = getLineCoords(line.from, line.to)
              if (!coords) return null
              const isCross = line.isCross
              return (
                <motion.line
                  key={`${line.from}-${line.to}-${i}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.05, duration: 1 }}
                  x1={`${coords.x1}%`}
                  y1={`${coords.y1}%`}
                  x2={`${coords.x2}%`}
                  y2={`${coords.y2}%`}
                  stroke={isCross ? '#8b5cf6' : '#cbd5e1'}
                  strokeWidth={isCross ? 3 : 2}
                  strokeDasharray={isCross ? '8 4' : 'none'}
                  opacity={isCross ? 0.8 : 0.6}
                />
              )
            })}
          </svg>

          {processedNodes.map((node, idx) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + idx * 0.03, type: 'spring', stiffness: 200 }}
              className={`absolute flex items-center justify-center rounded-full shadow-lg border border-black/5 font-bold text-center leading-tight transition-transform ${node.color} ${node.size}`}
              style={{ 
                left: `calc(${node.x}% - 3.5rem)`, 
                top: `calc(${node.y}% - 3.5rem)`,
                zIndex: node.isRoot ? 40 : 10 
              }}
              whileHover={{ 
                scale: 1.1, 
                zIndex: 50, 
                shadow: '0 25px 30px -10px rgb(0 0 0 / 0.15)' 
              }}
            >
              <span className="p-2 select-none overflow-hidden text-ellipsis line-clamp-3 break-words w-full h-full flex items-center justify-center px-4 pointer-events-auto">
                {node.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
