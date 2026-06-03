import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Clock,
  BookOpen,
  PenTool,
  RefreshCw,
  X,
  Video,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { api, StudyPlanItem, StudyPlanTask } from '../lib/api'

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const SUBJECTS = [
  'Hệ cơ sở dữ liệu',
  'Thuật toán và Cấu trúc dữ liệu',
  'Hệ điều hành',
  'Mạng máy tính',
]

const WEAK_TOPICS = [
  'Chuẩn hóa (1NF-BCNF)',
  'SQL Joins & Subqueries',
  'B-Tree Indexing',
  'Transaction & ACID',
  'ER Diagrams',
]

const DEFAULT_WEEKLY_GOALS = [
  { text: 'Hoàn thành 5 bài quiz', completed: false },
  { text: 'Nắm vững Chuẩn hóa', completed: false },
  { text: 'Học tổng cộng 15 giờ', completed: false },
]

const TASK_STYLES: Record<string, { color: string; icon: typeof BookOpen }> = {
  'Đọc tài liệu': {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: BookOpen,
  },
  'Thực hành': {
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: PenTool,
  },
  'Ôn tập': {
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: RefreshCw,
  },
  'Xem video': {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: Video,
  },
  Khác: {
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: BookOpen,
  },
}

const INTENSITY_CONFIG = {
  light: { label: 'Nhẹ nhàng', hours: '1-2h/ngày', duration: '1h' },
  moderate: { label: 'Vừa phải', hours: '2-4h/ngày', duration: '1.5h' },
  intense: { label: 'Cao độ', hours: '>4h/ngày', duration: '2h' },
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatWeekLabel(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })
  return `Tuần ${fmt(weekStart)} – ${fmt(weekEnd)}`
}

function parseTimeSort(time?: string) {
  if (!time) return 0
  const match = time.match(/(\d{1,2}):(\d{2})/)
  if (!match) return 0
  let hour = parseInt(match[1], 10)
  if (time.includes('Chiều') && hour < 12) hour += 12
  if (time.includes('Tối') && hour < 12) hour += 12
  return hour * 60 + parseInt(match[2], 10)
}

function generateTasks(
  topics: string[],
  intensity: 'light' | 'moderate' | 'intense'
): Omit<StudyPlanTask, '_id'>[] {
  const slots = [
    { time: '09:00 Sáng', type: 'Đọc tài liệu' as const },
    { time: '14:30 Chiều', type: 'Thực hành' as const },
    { time: '20:00 Tối', type: 'Ôn tập' as const },
  ]
  const duration = INTENSITY_CONFIG[intensity].duration
  const count =
    intensity === 'light' ? 1 : intensity === 'moderate' ? 2 : Math.min(3, topics.length || 1)

  const source = topics.length > 0 ? topics : ['Ôn tập tổng hợp']
  return source.slice(0, count).map((topic, i) => ({
    title: topic.startsWith('Ôn') ? topic : `Ôn luyện: ${topic}`,
    time: slots[i % slots.length].time,
    duration,
    type: slots[i % slots.length].type,
    status: 'todo',
  }))
}

interface StudyPlannerProps {
  token: string
}

export function StudyPlanner({ token }: StudyPlannerProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date()
    const start = startOfWeek(today)
    return Math.max(0, Math.min(6, Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))))
  })
  const [plans, setPlans] = useState<StudyPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isCreatingPlan, setIsCreatingPlan] = useState(false)
  const [formSubject, setFormSubject] = useState(SUBJECTS[0])
  const [formExamDate, setFormExamDate] = useState('')
  const [formIntensity, setFormIntensity] = useState<'light' | 'moderate' | 'intense'>('moderate')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const selectedDate = weekDates[selectedDay]

  const loadPlans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = weekStart.toISOString()
      const to = addDays(weekStart, 6).toISOString()
      const res = await api.getStudyPlans(token, { from, to })
      setPlans(res.studyPlans || [])
    } catch (err: any) {
      setError(err?.message || 'Không thể tải kế hoạch học tập')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [token, weekStart])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const dayPlan = useMemo(
    () => plans.find((p) => isSameDay(new Date(p.date), selectedDate)) ?? null,
    [plans, selectedDate]
  )

  const sortedTasks = useMemo(() => {
    const tasks = dayPlan?.tasks || []
    return [...tasks].sort((a, b) => parseTimeSort(a.time) - parseTimeSort(b.time))
  }, [dayPlan])

  const weeklyGoals = useMemo(() => {
    const withGoals = plans.find((p) => p.weeklyGoals && p.weeklyGoals.length > 0)
    return withGoals?.weeklyGoals || DEFAULT_WEEKLY_GOALS
  }, [plans])

  const goalsPlanId = useMemo(() => {
    const withGoals = plans.find((p) => p.weeklyGoals && p.weeklyGoals.length > 0)
    return withGoals?._id || dayPlan?._id || plans[0]?._id
  }, [plans, dayPlan])

  const completedGoals = useMemo(
    () => weeklyGoals.filter((goal) => goal.completed).length,
    [weeklyGoals]
  )

  const goalProgress = useMemo(
    () => Math.round((completedGoals / Math.max(weeklyGoals.length, 1)) * 100),
    [completedGoals, weeklyGoals.length]
  )

  const aiSuggestion = useMemo(() => {
    const topics = dayPlan?.weakTopics?.length
      ? dayPlan.weakTopics
      : plans.flatMap((p) => p.weakTopics || [])
    const focus = topics[0] || 'Chuẩn hóa (3NF)'
    return `Dựa trên kết quả quiz gần đây, AI khuyên bạn nên tập trung vào ${focus} tuần này. Bạn đã phân bổ ${sortedTasks.length} nhiệm vụ cho hôm nay.`
  }, [dayPlan, plans, sortedTasks.length])

  const handleToggleGoal = async (index: number) => {
    if (!goalsPlanId) return
    const updated = weeklyGoals.map((g, i) =>
      i === index ? { ...g, completed: !g.completed } : g
    )
    try {
      await api.updateStudyPlan(token, goalsPlanId, { weeklyGoals: updated })
      setPlans((prev) =>
        prev.map((p) => (p._id === goalsPlanId ? { ...p, weeklyGoals: updated } : p))
      )
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật mục tiêu')
    }
  }

  const handleToggleTask = async (task: StudyPlanTask) => {
    if (!dayPlan) return
    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    try {
      const res = await api.updateTaskStatus(token, dayPlan._id, task._id, nextStatus)
      setPlans((prev) =>
        prev.map((p) => (p._id === dayPlan._id ? res.studyPlan : p))
      )
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật nhiệm vụ')
    }
  }

  const handleCreatePlan = async () => {
    setSaving(true)
    setError(null)
    try {
      const tasks = generateTasks(selectedTopics, formIntensity)
      const res = await api.createStudyPlan(token, {
        subject: formSubject,
        examDate: formExamDate || undefined,
        intensity: formIntensity,
        weakTopics: selectedTopics,
        weeklyGoals: DEFAULT_WEEKLY_GOALS,
        tasks,
        date: selectedDate.toISOString(),
      })
      setPlans((prev) => {
        const filtered = prev.filter((p) => p._id !== res.studyPlan._id)
        return [...filtered, res.studyPlan]
      })
      setIsCreatingPlan(false)
      setSelectedTopics([])
      setFormExamDate('')
      setFormIntensity('moderate')
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo kế hoạch')
    } finally {
      setSaving(false)
    }
  }

  const handleOptimizeSchedule = async () => {
    if (!dayPlan) {
      setError('Chưa có kế hoạch cho ngày này. Hãy tạo kế hoạch mới trước.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const topics =
        dayPlan.weakTopics?.length ? dayPlan.weakTopics : WEAK_TOPICS.slice(0, 3)
      const tasks = generateTasks(topics, dayPlan.intensity || 'moderate')
      const res = await api.updateStudyPlan(token, dayPlan._id, { tasks })
      setPlans((prev) => prev.map((p) => (p._id === dayPlan._id ? res.studyPlan : p)))
    } catch (err: any) {
      setError(err?.message || 'Không thể tối ưu lịch')
    } finally {
      setSaving(false)
    }
  }

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    )
  }

  if (loading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">Đang tải kế hoạch học tập...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Kế hoạch học tập</h1>
            <p className="text-slate-500 mt-2">Tổ chức thời gian hiệu quả — đồng bộ MongoDB Atlas</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={18} /> Tuần trước
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Tuần sau <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingPlan(true)}
              className="bg-primary text-white px-5 py-2 rounded-2xl text-sm font-medium flex items-center gap-2 hover:bg-primary-light transition-colors shadow-sm"
            >
              <Plus size={18} /> Tạo kế hoạch mới
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tuần hiện tại</p>
            <p className="mt-3 text-lg font-semibold text-text-primary">{formatWeekLabel(weekStart)}</p>
          </div>
          <div className="bg-gradient-to-r from-primary to-primary-light text-white rounded-3xl p-5 shadow-lg overflow-hidden">
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Nhiệm vụ hôm nay</p>
            <p className="mt-3 text-3xl font-bold">{sortedTasks.length}</p>
            <p className="mt-2 text-sm text-white/80">{dayPlan ? 'Dựa trên lịch học hiện tại' : 'Chưa có kế hoạch hôm nay'}</p>
          </div>
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tiến độ mục tiêu</p>
                <p className="mt-3 text-2xl font-semibold text-text-primary">{goalProgress}%</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-slate-100 grid place-items-center text-sm font-bold text-primary">
                {completedGoals}/{weeklyGoals.length}
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${goalProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex justify-between items-center">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-gradient-to-r from-purple-600 to-primary rounded-2xl p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <Sparkles size={18} /> Lộ trình thích ứng &quot;Vết dầu loang&quot;
          </h3>
          <p className="text-sm text-white/80 mt-1">
            {dayPlan?.subject
              ? `Đang theo dõi môn ${dayPlan.subject}${dayPlan.examDate ? ` — thi ${new Date(dayPlan.examDate).toLocaleDateString('vi-VN')}` : ''}.`
              : 'AI sẽ tự động điều chỉnh lịch học dựa trên kết quả Quiz gần nhất của bạn.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOptimizeSchedule}
          disabled={saving}
          className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Đang xử lý...' : 'Tối ưu lịch hôm nay'}
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {DAYS.map((day, index) => {
            const date = weekDates[index]
            const hasPlan = plans.some((p) => isSameDay(new Date(p.date), date))
            const isToday = isSameDay(date, new Date())
            return (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedDay(index)}
                className={`flex-1 min-w-[4rem] py-4 flex flex-col items-center relative transition-colors ${selectedDay === index ? 'text-primary' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <span className="text-xs font-medium mb-1">{day}</span>
                <span
                  className={`text-lg font-bold ${selectedDay === index ? 'text-primary' : 'text-text-primary'} ${isToday ? 'ring-2 ring-primary/30 rounded-full w-9 h-9 flex items-center justify-center' : ''}`}
                >
                  {date.getDate()}
                </span>
                {hasPlan && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
                {selectedDay === index && (
                  <motion.div
                    layoutId="activeDay"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-primary"
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 relative">
            <div className="absolute left-[8.5rem] top-12 bottom-0 w-px bg-slate-200" />

            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
                <Loader2 className="animate-spin" size={20} />
                Đang tải...
              </div>
            ) : sortedTasks.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="mb-2">Chưa có nhiệm vụ cho ngày này.</p>
                <button
                  type="button"
                  onClick={() => setIsCreatingPlan(true)}
                  className="text-primary font-medium hover:underline text-sm"
                >
                  Tạo kế hoạch mới
                </button>
              </div>
            ) : (
              <div className="space-y-6 relative">
                {sortedTasks.map((task, i) => {
                  const style = TASK_STYLES[task.type] || TASK_STYLES['Khác']
                  const Icon = style.icon
                  const timeParts = (task.time || '00:00').split(' ')
                  const isDone = task.status === 'done'

                  return (
                    <motion.div
                      key={task._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="relative flex gap-6 items-start group"
                    >
                      <div className="absolute left-0 top-4 h-full w-0.5 bg-slate-200" />
                      <div className="relative z-10 w-24 text-right pt-3 flex-shrink-0">
                        <span className="text-sm font-bold text-text-primary">
                          {timeParts[0]}
                        </span>
                        {timeParts[1] && (
                          <span className="text-xs text-slate-500 block">{timeParts[1]}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleTask(task)}
                        className={`relative z-20 mt-3.5 h-5 w-5 rounded-full border-2 transition-transform ${
                          isDone
                            ? 'bg-primary border-primary'
                            : 'bg-white border-slate-300 shadow-sm'
                        }`}
                        title={isDone ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
                      />

                      <div
                        className={`relative z-10 flex-1 p-5 rounded-3xl border ${style.color} bg-opacity-60 hover:shadow-xl transition-all cursor-pointer ${isDone ? 'opacity-70' : ''}`}
                        onClick={() => handleToggleTask(task)}
                        onKeyDown={(e) => e.key === 'Enter' && handleToggleTask(task)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] flex items-center gap-2 text-slate-600">
                            <Icon size={14} /> {task.type}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                            <Clock size={12} /> {task.duration}
                          </span>
                        </div>
                        <h4 className={`font-bold text-xl ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {task.title}
                        </h4>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
                <Sparkles size={18} className="text-blue-600" /> Gợi ý từ AI
              </h3>
              <p className="text-sm text-blue-800 leading-relaxed mb-4">{aiSuggestion}</p>
              <button
                type="button"
                onClick={handleOptimizeSchedule}
                disabled={saving || !dayPlan}
                className="w-full bg-white text-blue-600 font-medium py-2 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors text-sm disabled:opacity-50"
              >
                Tự động tối ưu lịch
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <h3 className="font-bold text-text-primary mb-4">Mục tiêu tuần</h3>
              <div className="space-y-3">
                {weeklyGoals.map((goal, index) => (
                  <label
                    key={index}
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={goal.completed}
                      onChange={() => handleToggleGoal(index)}
                      disabled={!goalsPlanId}
                      className="mt-1 rounded text-primary focus:ring-primary"
                    />
                    <span
                      className={`text-sm ${goal.completed ? 'text-slate-500 line-through' : 'text-slate-700 font-medium'}`}
                    >
                      {goal.text}
                    </span>
                  </label>
                ))}
                {!goalsPlanId && (
                  <p className="text-xs text-slate-400">Tạo kế hoạch để lưu mục tiêu vào Atlas.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isCreatingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900">Tạo kế hoạch học tập mới</h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingPlan(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <p className="text-xs text-slate-500">
                  Ngày áp dụng:{' '}
                  <strong>
                    {selectedDate.toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </strong>
                </p>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Bạn muốn ôn thi môn nào?
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary text-sm bg-white"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Ngày thi dự kiến
                  </label>
                  <input
                    type="date"
                    value={formExamDate}
                    onChange={(e) => setFormExamDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Cường độ tập trung mong muốn
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      Object.entries(INTENSITY_CONFIG) as [
                        keyof typeof INTENSITY_CONFIG,
                        (typeof INTENSITY_CONFIG)['light'],
                      ][]
                    ).map(([key, cfg]) => (
                      <label
                        key={key}
                        className="border border-slate-200 rounded-xl p-3 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
                      >
                        <input
                          type="radio"
                          name="intensity"
                          className="sr-only"
                          checked={formIntensity === key}
                          onChange={() => setFormIntensity(key)}
                        />
                        <span className="text-sm font-medium">{cfg.label}</span>
                        <span className="block text-xs text-slate-500 mt-1">{cfg.hours}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Chọn các chủ đề còn yếu
                  </label>
                  <div className="space-y-2">
                    {WEAK_TOPICS.map((topic) => (
                      <label
                        key={topic}
                        className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTopics.includes(topic)}
                          onChange={() => toggleTopic(topic)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                        />
                        <span className="text-sm font-medium text-slate-700">{topic}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingPlan(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreatePlan}
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-light transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {saving ? 'Đang lưu...' : 'Tạo lộ trình AI'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}