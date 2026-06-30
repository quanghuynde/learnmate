import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, Users, Star, Plus, X, ExternalLink,
  Loader2, Video, Trash2, CheckCircle, Filter
} from 'lucide-react'
import { api, WorkshopItem, UserItem } from '../lib/api'
import { useNotification } from '../components/ui/Notification'

interface WorkshopTabProps {
  token: string
  user: UserItem | null
}

const TOPICS = ['Toán học', 'Lập trình', 'Tiếng Anh', 'Khoa học', 'Kinh tế', 'Y học', 'Nghệ thuật', 'Khác']
const STATUS_OPTS = [
  { value: '', label: 'Tất cả' },
  { value: 'upcoming', label: 'Sắp diễn ra' },
  { value: 'ended', label: 'Đã kết thúc' },
]
const PLATFORM_LABELS: Record<string, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  other: 'Khác',
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHovered(s)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={`transition-colors ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            size={20}
            className={s <= (hovered || value) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}
          />
        </button>
      ))}
    </div>
  )
}

function WorkshopCard({
  workshop, user, token, onRefresh
}: { workshop: WorkshopItem; user: UserItem | null; token: string; onRefresh: () => void }) {
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [ratingScore, setRatingScore] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [ratingLoading, setRatingLoading] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  const scheduledAt = new Date(workshop.scheduledAt)
  const endAt = new Date(scheduledAt.getTime() + workshop.durationMinutes * 60000)
  const isUpcoming = scheduledAt > now
  const isOngoing = scheduledAt <= now && endAt >= now
  const isEnded = endAt < now

  const isHost = workshop.host._id === user?.id
  const isAttendee = workshop.attendees.some((a) => a._id === user?.id)
  const hasRated = workshop.ratings?.some((r) => r.user._id === user?.id)
  const spotsLeft = workshop.maxAttendees > 0 ? workshop.maxAttendees - workshop.attendees.length : null
  const isFull = spotsLeft !== null && spotsLeft <= 0

  const statusBadge = isOngoing
    ? { label: 'Đang diễn ra', cls: 'bg-green-100 text-green-700' }
    : isEnded
    ? { label: 'Đã kết thúc', cls: 'bg-slate-100 text-slate-500' }
    : { label: 'Sắp diễn ra', cls: 'bg-blue-100 text-blue-700' }

  const handleRegister = async () => {
    setLoading(true); setError('')
    try {
      const res = await api.registerWorkshop(token, workshop._id)
      showNotification(res.message, 'success')
      onRefresh()
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const handleCancel = async () => {
    if (!confirm('Huỷ đăng ký workshop này?')) return
    setLoading(true); setError('')
    try {
      const res = await api.cancelWorkshopRegistration(token, workshop._id)
      showNotification(res.message, 'success')
      onRefresh()
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Xoá workshop này? Tất cả attendees sẽ được hoàn credits.')) return
    setLoading(true); setError('')
    try {
      await api.deleteWorkshop(token, workshop._id)
      onRefresh()
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const handleRate = async () => {
    if (!ratingScore) { setError('Vui lòng chọn số sao'); return }
    setRatingLoading(true); setError('')
    try {
      const res = await api.rateWorkshop(token, workshop._id, ratingScore, ratingComment)
      showNotification(res.message, 'success')
      setShowRating(false)
      onRefresh()
    } catch (e: any) { setError(e.message) } finally { setRatingLoading(false) }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.label}</span>
              <span className="text-[11px] font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">{workshop.topic}</span>
              {workshop.creditCost > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{workshop.creditCost} CR</span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 leading-tight text-sm">{workshop.title}</h3>
          </div>
          {isHost && isUpcoming && (
            <button onClick={handleDelete} disabled={loading} className="text-slate-400 hover:text-red-500 transition-colors p-1 flex-shrink-0">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">{workshop.description}</p>

        {/* Host */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden flex-shrink-0">
            {workshop.host.avatar
              ? <img src={workshop.host.avatar} alt="" className="w-full h-full object-cover" />
              : workshop.host.name.substring(0, 2).toUpperCase()
            }
          </div>
          <span className="text-xs text-slate-600 font-medium">{workshop.host.name}</span>
          {isHost && <span className="text-[10px] px-1.5 py-0.5 bg-primary text-white rounded-full font-bold">Host</span>}
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar size={13} className="text-primary flex-shrink-0" />
            {scheduledAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={13} className="text-primary flex-shrink-0" />
            {scheduledAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: true }).replace('SA', 'AM').replace('CH', 'PM')} ({workshop.durationMinutes}p)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Video size={13} className="text-primary flex-shrink-0" />
            {PLATFORM_LABELS[workshop.platform] || 'Khác'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users size={13} className="text-primary flex-shrink-0" />
            {workshop.attendees.length}{workshop.maxAttendees > 0 ? `/${workshop.maxAttendees}` : ''} người
          </div>
        </div>

        {/* Rating */}
        {workshop.ratings && workshop.ratings.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <StarRating value={Math.round(workshop.averageRating)} />
            <span className="text-xs text-slate-500">{workshop.averageRating} ({workshop.ratings.length} đánh giá)</span>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {(isAttendee || isHost) && (isUpcoming || isOngoing) && (
            <a
              href={workshop.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              <ExternalLink size={13} /> Vào phòng họp
            </a>
          )}

          {!isHost && isUpcoming && !isAttendee && !isFull && (
            <button
              onClick={handleRegister}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              Đăng ký{workshop.creditCost > 0 ? ` (${workshop.creditCost} CR)` : ''}
            </button>
          )}

          {isFull && !isAttendee && !isHost && (
            <span className="flex-1 text-center text-xs text-slate-400 py-2 bg-slate-50 rounded-xl">Đã đầy</span>
          )}

          {!isHost && isAttendee && isUpcoming && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 text-xs text-slate-500 font-medium rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              Huỷ
            </button>
          )}

          {isEnded && (isAttendee || isHost) && !hasRated && (
            <button
              onClick={() => { setShowRating(true); setError('') }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-400 text-white text-xs font-bold rounded-xl hover:bg-amber-500 transition-colors"
            >
              <Star size={13} /> Đánh giá
            </button>
          )}

          {hasRated && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12} /> Đã đánh giá</span>}
        </div>
      </div>

      {/* Rating Modal */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowRating(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Đánh giá workshop</h3>
                <button onClick={() => setShowRating(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              <p className="text-sm text-slate-600 mb-4">"{workshop.title}"</p>
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-700 mb-2">Điểm đánh giá</p>
                <StarRating value={ratingScore} onChange={setRatingScore} />
              </div>
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-700 mb-2">Nhận xét (tuỳ chọn)</p>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Chia sẻ cảm nhận của bạn về workshop..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary resize-none"
                />
              </div>
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <button
                onClick={handleRate}
                disabled={ratingLoading}
                className="w-full py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                {ratingLoading ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                Gửi đánh giá
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CreateWorkshopModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  const { showNotification } = useNotification()
  const [form, setForm] = useState({
    title: '', description: '', topic: TOPICS[0],
    scheduledAt: '', durationMinutes: 60,
    meetingLink: '', platform: 'google_meet' as const,
    maxAttendees: 0, creditCost: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: any) => setForm((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim() || !form.meetingLink.trim() || !form.scheduledAt) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc'); return
    }
    setLoading(true); setError('')
    try {
      const res = await api.createWorkshop(token, {
        ...form, durationMinutes: Number(form.durationMinutes),
        maxAttendees: Number(form.maxAttendees), creditCost: Number(form.creditCost),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      } as any)
      showNotification(res.message, 'success')
      onCreated()
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary transition-colors bg-slate-50 focus:bg-white"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 pt-5 pb-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-lg">Tạo Workshop mới</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Tiêu đề <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="VD: Giải tích nâng cao cho sinh viên năm 2" className={inputCls} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Mô tả <span className="text-red-500">*</span></label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Mô tả nội dung, đối tượng tham dự, yêu cầu trước..." className={inputCls + ' resize-none'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Chủ đề</label>
              <select value={form.topic} onChange={(e) => set('topic', e.target.value)} className={inputCls}>
                {TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Nền tảng</label>
              <select value={form.platform} onChange={(e) => set('platform', e.target.value as any)} className={inputCls}>
                <option value="google_meet">Google Meet</option>
                <option value="zoom">Zoom</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Link phòng họp <span className="text-red-500">*</span></label>
            <input value={form.meetingLink} onChange={(e) => set('meetingLink', e.target.value)} placeholder="https://meet.google.com/..." className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Ngày & giờ tổ chức <span className="text-red-500">*</span></label>
              <input type="datetime-local" value={form.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Thời lượng (phút)</label>
              <input type="number" min={15} value={form.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Số người tối đa</label>
              <input type="number" min={0} value={form.maxAttendees} onChange={(e) => set('maxAttendees', e.target.value)} placeholder="0 = không giới hạn" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Credits để đăng ký</label>
              <input type="number" min={0} value={form.creditCost} onChange={(e) => set('creditCost', e.target.value)} placeholder="0 = miễn phí" className={inputCls} />
            </div>
          </div>

          <div className="bg-primary/5 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle size={14} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600">Bạn sẽ nhận <strong className="text-primary">+20 Credits</strong> khi tạo workshop thành công.</p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Tạo Workshop
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

export function WorkshopTab({ token, user }: WorkshopTabProps) {
  const [workshops, setWorkshops] = useState<WorkshopItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTopic, setFilterTopic] = useState('')

  const fetchWorkshops = async () => {
    setLoading(true)
    try {
      const res = await api.getWorkshops(token, {
        status: filterStatus || undefined,
        topic: filterTopic || undefined,
      })
      setWorkshops(res.workshops)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchWorkshops()
  }, [token, filterStatus, filterTopic])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Video size={18} className="text-primary" /> Hội thảo học thuật
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Học từ người có kinh nghiệm trong lĩnh vực của bạn</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm flex-shrink-0"
        >
          <Plus size={16} /> Tạo Workshop
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-slate-400" />
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filterStatus === opt.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="ml-auto border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 outline-none focus:border-primary bg-white"
        >
          <option value="">Tất cả chủ đề</option>
          {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Workshop list */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm">Đang tải danh sách workshop...</p>
        </div>
      ) : workshops.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
          <Video size={40} className="text-slate-300" />
          <p className="text-sm font-medium">Chưa có workshop nào</p>
          <p className="text-xs">Hãy là người đầu tiên tổ chức workshop!</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors">
            Tạo Workshop ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workshops.map((w) => (
            <WorkshopCard key={w._id} workshop={w} user={user} token={token} onRefresh={fetchWorkshops} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateWorkshopModal token={token} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchWorkshops() }} />
        )}
      </AnimatePresence>
    </div>
  )
}
