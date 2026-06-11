import React, { useEffect, useState, useCallback } from 'react'
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
  Video,
  HelpCircle,
  X,
  Trash2,
  CheckCircle2,
  Circle,
  CalendarDays,
  AlertCircle,
} from 'lucide-react'
import { api, StudyPlanItem, StudyPlanTask, WeeklyGoal } from '../lib/api'

interface StudyPlannerProps {
  token: string
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(base: Date): Date {
  const d = new Date(base)
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // shift so Mon = 0
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toInputDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const month = weekEnd.getMonth() + 1
  // find ISO week number
  const startOfYear = new Date(weekStart.getFullYear(), 0, 1)
  const weekNo = Math.ceil(
    ((weekStart.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7
  )
  return `Tuần ${weekNo} Tháng ${month}`
}

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const TASK_TYPE_STYLES: Record<
  string,
  { color: string; icon: React.ElementType }
> = {
  'Đọc tài liệu': { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: BookOpen },
  'Thực hành': { color: 'bg-green-50 text-green-700 border-green-200', icon: PenTool },
  'Ôn tập': { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: RefreshCw },
  'Xem video': { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Video },
  'Khác': { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: HelpCircle },
}

const TASK_TYPES = ['Đọc tài liệu', 'Thực hành', 'Ôn tập', 'Xem video', 'Khác'] as const

const INTENSITY_OPTIONS = [
  { value: 'light', label: 'Nhẹ nhàng', sub: '1-2h/ngày' },
  { value: 'moderate', label: 'Vừa phải', sub: '2-4h/ngày' },
  { value: 'intense', label: 'Cao độ', sub: '>4h/ngày' },
] as const

// ─── empty task/goal templates ────────────────────────────────────────────────

type NewTask = { title: string; time: string; duration: string; type: typeof TASK_TYPES[number] }
type NewGoal = { text: string }

const emptyTask = (): NewTask => ({ title: '', time: '09:00', duration: '60 phút', type: 'Đọc tài liệu' })
const emptyGoal = (): NewGoal => ({ text: '' })

// ─── component ────────────────────────────────────────────────────────────────

export function StudyPlanner({ token }: StudyPlannerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(today))
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(() => {
    const dow = today.getDay()
    return dow === 0 ? 6 : dow - 1 // 0=Mon
  })
  const [allPlans, setAllPlans] = useState<StudyPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // create-form state
  const [formSubject, setFormSubject] = useState('')
  const [formDate, setFormDate] = useState(toInputDate(today))
  const [formExamDate, setFormExamDate] = useState('')
  const [formIntensity, setFormIntensity] = useState<'light' | 'moderate' | 'intense'>('moderate')
  const [formGoals, setFormGoals] = useState<NewGoal[]>([emptyGoal()])
  const [formTasks, setFormTasks] = useState<NewTask[]>([emptyTask()])
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  // ── data loading ──────────────────────────────────────────────────────────

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.getStudyPlans(token)
      setAllPlans(res.studyPlans || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được kế hoạch')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  // ── derived data ──────────────────────────────────────────────────────────

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  /** Plans whose `date` falls within this week */
  const weekPlans = allPlans.filter((p) => {
    const pd = new Date(p.date)
    pd.setHours(0, 0, 0, 0)
    return pd >= weekStart && pd <= addDays(weekStart, 6)
  })

  /** Plans for the currently selected day */
  const selectedDate = weekDays[selectedDayIdx]
  const dayPlans = weekPlans.filter((p) => isSameDay(new Date(p.date), selectedDate))

  /** Flat list of tasks for the selected day, sorted by time */
  const dayTasks: Array<{ plan: StudyPlanItem; task: StudyPlanTask }> = dayPlans
    .flatMap((p) => p.tasks.map((t) => ({ plan: p, task: t })))
    .sort((a, b) => a.task.time.localeCompare(b.task.time))

  /** Collect weekly goals from ALL plans this week */
  const weeklyGoals: Array<{ planId: string; goal: WeeklyGoal; goalIdx: number }> = weekPlans
    .flatMap((p) =>
      p.weeklyGoals.map((g, idx) => {
        // auto-complete if examDate has passed
        const isExpired = p.examDate ? new Date(p.examDate) < today : false
        return { planId: p._id, goal: { ...g, completed: g.completed || isExpired }, goalIdx: idx }
      })
    )

  // ── actions ───────────────────────────────────────────────────────────────

  const toggleTask = async (planId: string, taskId: string, current: StudyPlanTask['status']) => {
    const next: StudyPlanTask['status'] = current === 'done' ? 'todo' : 'done'
    try {
      await api.updateTaskStatus(token, planId, taskId, next)
      loadPlans()
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const toggleGoal = async (
    planId: string,
    goalIdx: number,
    goals: WeeklyGoal[],
    current: boolean
  ) => {
    const updated = goals.map((g, i) =>
      i === goalIdx ? { ...g, completed: !current } : g
    )
    try {
      await api.updateStudyPlan(token, planId, { weeklyGoals: updated })
      loadPlans()
    } catch (error) {
      console.error('Error occurred:', error);
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Xoá kế hoạch này?')) return
    try {
      await api.deleteStudyPlan(token, planId)
      loadPlans()
    } catch (error) {
      console.error('Error occurred:', error);
    }
  }

  const handleCreatePlan = async () => {
    if (!formSubject.trim()) {
      setFormError('Vui lòng nhập tên môn học')
      return
    }
    if (!formDate) {
      setFormError('Vui lòng chọn ngày học')
      return
    }
    setFormError('')
    setCreating(true)
    try {
      await api.createStudyPlan(token, {
        subject: formSubject.trim(),
        date: new Date(formDate).toISOString(),
        examDate: formExamDate ? new Date(formExamDate).toISOString() : undefined,
        intensity: formIntensity,
        weakTopics: [],
        weeklyGoals: formGoals.filter((g) => g.text.trim()).map((g) => ({ text: g.text.trim(), completed: false })),
        tasks: formTasks
          .filter((t) => t.title.trim())
          .map((t) => ({ title: t.title.trim(), time: t.time, duration: t.duration, type: t.type, status: 'todo' })),
      })
      // jump to the week/day of the new plan
      const planDate = new Date(formDate)
      planDate.setHours(0, 0, 0, 0)
      const newWeekStart = getWeekStart(planDate)
      setWeekStart(newWeekStart)
      const dow = planDate.getDay()
      setSelectedDayIdx(dow === 0 ? 6 : dow - 1)
      // reset form
      setFormSubject('')
      setFormDate(toInputDate(today))
      setFormExamDate('')
      setFormIntensity('moderate')
      setFormGoals([emptyGoal()])
      setFormTasks([emptyTask()])
      setIsCreating(false)
      loadPlans()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Tạo kế hoạch thất bại')
    } finally {
      setCreating(false)
    }
  }

  // ── form helpers ──────────────────────────────────────────────────────────

  const updateTask = (i: number, field: keyof NewTask, val: string) =>
    setFormTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)))

  const updateGoal = (i: number, val: string) =>
    setFormGoals((prev) => prev.map((g, idx) => (idx === i ? { text: val } : g)))

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Kế hoạch học tập</h1>
          <p className="text-slate-500">Tổ chức thời gian hiệu quả</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Week navigator */}
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <button
              className="text-slate-400 hover:text-text-primary transition-colors"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-medium text-sm min-w-[130px] text-center">
              {formatWeekLabel(weekStart)}
            </span>
            <button
              className="text-slate-400 hover:text-text-primary transition-colors"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-primary-light transition-colors shadow-sm"
          >
            <Plus size={18} /> Tạo kế hoạch mới
          </button>
        </div>
      </div>

      {/* AI banner */}
      <div className="bg-gradient-to-r from-purple-600 to-primary rounded-2xl p-5 text-white flex flex-wrap justify-between items-center gap-4 shadow-md">
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <Sparkles size={18} /> Lộ trình thích ứng "Vết dầu loang"
          </h3>
          <p className="text-sm text-white/80 mt-1">
            {weekPlans.length > 0
              ? `Đang theo dõi ${weekPlans.length} kế hoạch học tuần này. Tiếp tục duy trì nhé!`
              : 'Tạo kế hoạch đầu tiên để AI bắt đầu theo dõi lộ trình của bạn.'}
          </p>
        </div>
        {weekPlans.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{weekPlans.reduce((s, p) => s + p.tasks.filter(t => t.status === 'done').length, 0)}</p>
              <p className="text-xs text-white/70">Nhiệm vụ xong</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{weekPlans.reduce((s, p) => s + p.tasks.length, 0)}</p>
              <p className="text-xs text-white/70">Tổng nhiệm vụ</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-200 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Main card */}
      <div className="bg-card rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Day tabs */}
        <div className="flex border-b border-slate-200">
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, today)
            const hasPlan = weekPlans.some((p) => isSameDay(new Date(p.date), day))
            return (
              <button
                key={idx}
                onClick={() => setSelectedDayIdx(idx)}
                className={`flex-1 py-4 flex flex-col items-center relative transition-colors ${
                  selectedDayIdx === idx ? 'text-primary' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-medium mb-1">{DAY_LABELS[idx]}</span>
                <span
                  className={`text-lg font-bold ${
                    isToday
                      ? 'bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center'
                      : selectedDayIdx === idx
                      ? 'text-primary'
                      : 'text-text-primary'
                  }`}
                >
                  {day.getDate()}
                </span>
                {hasPlan && selectedDayIdx !== idx && (
                  <span className="absolute bottom-2 w-1.5 h-1.5 bg-primary rounded-full" />
                )}
                {selectedDayIdx === idx && (
                  <motion.div
                    layoutId="activeDay"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline */}
          <div className="lg:col-span-2 relative">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : dayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays size={48} className="text-slate-300 mb-3" />
                <p className="font-semibold text-slate-500">Không có nhiệm vụ nào hôm nay</p>
                <p className="text-sm text-slate-400 mt-1">Nhấn "Tạo kế hoạch mới" để thêm</p>
              </div>
            ) : (
              <>
                {/* Timeline vertical line */}
                <div className="absolute left-[8.5rem] top-0 bottom-0 w-px bg-slate-200" />
                <div className="space-y-5 relative">
                  {dayTasks.map(({ plan, task }, i) => {
                    const style = TASK_TYPE_STYLES[task.type] ?? TASK_TYPE_STYLES['Khác']
                    const Icon = style.icon
                    const isDone = task.status === 'done'
                    return (
                      <motion.div
                        key={task._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex gap-6 items-start group"
                      >
                        {/* Time */}
                        <div className="w-28 text-right pt-3 flex-shrink-0">
                          <span className="text-sm font-bold text-text-primary">{task.time}</span>
                          <span className="text-xs text-slate-400 block">{plan.subject}</span>
                        </div>
                        {/* Dot */}
                        <div
                          className={`relative z-10 w-4 h-4 rounded-full border-2 mt-3.5 flex-shrink-0 transition-all ${
                            isDone ? 'bg-primary border-primary' : 'bg-white border-primary'
                          } group-hover:scale-125`}
                        />
                        {/* Card */}
                        <div
                          className={`flex-1 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${style.color} ${isDone ? 'opacity-60' : ''}`}
                          onClick={() => toggleTask(plan._id, task._id, task.status)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                              <Icon size={12} /> {task.type}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-xs font-medium opacity-80">
                                <Clock size={12} /> {task.duration}
                              </span>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                                onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan._id) }}
                                title="Xoá kế hoạch"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <h4 className={`font-bold text-base leading-snug ${isDone ? 'line-through' : ''}`}>
                            {task.title}
                          </h4>
                          {isDone && (
                            <span className="inline-flex items-center gap-1 text-xs mt-1 font-medium">
                              <CheckCircle2 size={12} /> Hoàn thành
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Subjects this week */}
            {weekPlans.length > 0 && (
              <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
                  <BookOpen size={16} className="text-blue-600" /> Môn học tuần này
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(weekPlans.map((p) => p.subject))].map((sub) => (
                    <span key={sub} className="px-3 py-1 bg-white text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                      {sub}
                    </span>
                  ))}
                </div>
                {weekPlans.some((p) => p.examDate) && (
                  <div className="mt-3 pt-3 border-t border-blue-200 space-y-1">
                    {weekPlans.filter((p) => p.examDate).map((p) => {
                      const exam = new Date(p.examDate!)
                      const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000)
                      return (
                        <p key={p._id} className="text-xs text-blue-800">
                          📅 <strong>{p.subject}</strong>:{' '}
                          {diff > 0 ? `còn ${diff} ngày tới khi thi` : 'Đã thi'}
                        </p>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Weekly goals */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <h3 className="font-bold text-text-primary mb-4">Mục tiêu tuần</h3>
              {weeklyGoals.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  Chưa có mục tiêu nào. Thêm khi tạo kế hoạch.
                </p>
              ) : (
                <div className="space-y-3">
                  {weeklyGoals.map(({ planId, goal, goalIdx }) => {
                    const planGoals = weekPlans.find((p) => p._id === planId)?.weeklyGoals ?? []
                    return (
                      <label key={`${planId}-${goalIdx}`} className="flex items-start gap-3 cursor-pointer group">
                        <button
                          className="mt-0.5 flex-shrink-0 transition-transform group-hover:scale-110"
                          onClick={() => toggleGoal(planId, goalIdx, planGoals, goal.completed)}
                        >
                          {goal.completed ? (
                            <CheckCircle2 size={18} className="text-primary" />
                          ) : (
                            <Circle size={18} className="text-slate-300" />
                          )}
                        </button>
                        <div>
                          <span className={`text-sm text-slate-700 leading-snug ${goal.completed ? 'line-through text-slate-400' : 'font-medium'}`}>
                            {goal.text}
                          </span>
                          <span className="block text-xs text-slate-400">
                            {weekPlans.find((p) => p._id === planId)?.subject}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Create Plan Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isCreating && (
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
                  onClick={() => { setIsCreating(false); setFormError('') }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-200">
                    {formError}
                  </p>
                )}

                {/* Subject */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Môn học <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary text-sm"
                    placeholder="Ví dụ: Hệ cơ sở dữ liệu"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Ngày học <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Ngày thi (nếu có)</label>
                    <input
                      type="date"
                      value={formExamDate}
                      onChange={(e) => setFormExamDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary text-sm"
                    />
                  </div>
                </div>

                {/* Intensity */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Cường độ tập trung</label>
                  <div className="grid grid-cols-3 gap-3">
                    {INTENSITY_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`border rounded-xl p-3 text-center cursor-pointer transition-colors ${
                          formIntensity === opt.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 hover:border-primary hover:bg-primary/5'
                        }`}
                        onClick={() => setFormIntensity(opt.value)}
                      >
                        <span className="text-sm font-medium block">{opt.label}</span>
                        <span className="text-xs text-slate-500">{opt.sub}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Weekly goals */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-700">Mục tiêu tuần</label>
                    <button
                      onClick={() => setFormGoals((prev) => [...prev, emptyGoal()])}
                      className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                    >
                      <Plus size={12} /> Thêm
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formGoals.map((g, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          value={g.text}
                          onChange={(e) => updateGoal(i, e.target.value)}
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
                          placeholder={`Mục tiêu ${i + 1}...`}
                        />
                        {formGoals.length > 1 && (
                          <button
                            onClick={() => setFormGoals((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-slate-300 hover:text-red-400 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tasks */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-slate-700">Nhiệm vụ trong ngày</label>
                    <button
                      onClick={() => setFormTasks((prev) => [...prev, emptyTask()])}
                      className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                    >
                      <Plus size={12} /> Thêm
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formTasks.map((t, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex gap-2 items-center">
                          <input
                            value={t.title}
                            onChange={(e) => updateTask(i, 'title', e.target.value)}
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary bg-white"
                            placeholder="Tên nhiệm vụ..."
                          />
                          {formTasks.length > 1 && (
                            <button
                              onClick={() => setFormTasks((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-slate-300 hover:text-red-400 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="time"
                            value={t.time}
                            onChange={(e) => updateTask(i, 'time', e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary bg-white"
                          />
                          <input
                            value={t.duration}
                            onChange={(e) => updateTask(i, 'duration', e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary bg-white"
                            placeholder="60 phút"
                          />
                          <select
                            value={t.type}
                            onChange={(e) => updateTask(i, 'type', e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary bg-white"
                          >
                            {TASK_TYPES.map((tp) => (
                              <option key={tp} value={tp}>{tp}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => { setIsCreating(false); setFormError('') }}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreatePlan}
                  disabled={creating}
                  className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-light transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {creating ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  Tạo kế hoạch
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
