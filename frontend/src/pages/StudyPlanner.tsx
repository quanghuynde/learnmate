import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Clock, BookOpen, X } from 'lucide-react';
import { api, StudyPlanItem } from '../lib/api';

interface StudyPlannerProps {
  token: string;
}

export function StudyPlanner({ token }: StudyPlannerProps) {
  const [plans, setPlans] = useState<StudyPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCreate, setOpenCreate] = useState(false);

  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'intense'>('moderate');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('09:00');
  const [taskDuration, setTaskDuration] = useState('60 phút');

  const loadPlans = async () => {
    try {
      const response = await api.getStudyPlans(token);
      setPlans(response.studyPlans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được kế hoạch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const currentTasks = useMemo(() => plans[0]?.tasks || [], [plans]);

  const createPlan = async () => {
    try {
      setError('');
      await api.createStudyPlan(token, {
        subject,
        date: date || new Date().toISOString(),
        intensity,
        weakTopics: [],
        tasks: taskTitle
          ? [{ title: taskTitle, time: taskTime, duration: taskDuration, type: 'Đọc tài liệu' }]
          : [],
      });
      setOpenCreate(false);
      setSubject('');
      setDate('');
      setTaskTitle('');
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo kế hoạch thất bại');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Kế hoạch học tập</h1>
          <p className="text-slate-500">Tổ chức thời gian hiệu quả</p>
        </div>
        <button onClick={() => setOpenCreate(true)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
          <Plus size={18} /> Tạo kế hoạch mới
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-primary rounded-2xl p-6 text-white flex justify-between items-center shadow-md">
        <div>
          <h3 className="font-bold flex items-center gap-2">
            <Sparkles size={18} /> Lộ trình thích ứng
          </h3>
          <p className="text-sm text-white/80 mt-1">Hiển thị từ kế hoạch học tập thật của tài khoản đăng nhập.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="bg-card rounded-2xl border border-slate-200 shadow-sm p-6">
        {loading ? (
          <p className="text-slate-500">Đang tải...</p>
        ) : currentTasks.length === 0 ? (
          <p className="text-slate-500">Chưa có nhiệm vụ nào từ dữ liệu thật.</p>
        ) : (
          <div className="space-y-4">
            {currentTasks.map((task, i) => (
              <motion.div key={task._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="p-4 rounded-2xl border border-slate-200 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 text-blue-700"><BookOpen size={12} /> {task.type}</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-500"><Clock size={12} /> {task.duration}</span>
                </div>
                <h4 className="font-bold text-lg text-slate-900">{task.title}</h4>
                <p className="text-sm text-slate-500 mt-1">Giờ học: {task.time}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {openCreate && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-lg rounded-2xl border">
              <div className="p-5 border-b flex items-center justify-between">
                <h3 className="font-bold text-lg">Tạo kế hoạch học</h3>
                <button onClick={() => setOpenCreate(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium">Môn học</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full mt-1 border rounded-xl px-3 py-2" placeholder="Ví dụ: Hệ cơ sở dữ liệu" />
                </div>
                <div>
                  <label className="text-sm font-medium">Ngày học</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full mt-1 border rounded-xl px-3 py-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">Cường độ</label>
                  <select value={intensity} onChange={(e) => setIntensity(e.target.value as 'light' | 'moderate' | 'intense')} className="w-full mt-1 border rounded-xl px-3 py-2">
                    <option value="light">Nhẹ</option>
                    <option value="moderate">Vừa</option>
                    <option value="intense">Cao</option>
                  </select>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Nhiệm vụ đầu tiên (tuỳ chọn)</p>
                  <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="w-full border rounded-xl px-3 py-2 mb-2" placeholder="Tên nhiệm vụ" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="w-full border rounded-xl px-3 py-2" placeholder="09:00" />
                    <input value={taskDuration} onChange={(e) => setTaskDuration(e.target.value)} className="w-full border rounded-xl px-3 py-2" placeholder="60 phút" />
                  </div>
                </div>
              </div>
              <div className="p-5 border-t flex justify-end gap-2">
                <button onClick={() => setOpenCreate(false)} className="px-4 py-2 rounded-xl bg-slate-100">Huỷ</button>
                <button onClick={createPlan} disabled={!subject} className="px-4 py-2 rounded-xl bg-primary text-white disabled:opacity-50">Tạo kế hoạch</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
