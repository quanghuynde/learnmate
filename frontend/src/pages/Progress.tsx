import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { TrendingUp, Sun, Moon, Zap, Trophy, Target, Clock, History, Brain } from 'lucide-react';
import { api } from '../lib/api';

interface ProgressProps {
  token: string;
}

export function Progress({ token }: ProgressProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [progressRes, historyRes] = await Promise.all([
          api.getProgressOverview(token),
          api.getQuizHistory(token),
        ]);
        setOverview(progressRes);
        setQuizHistory(historyRes.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được dữ liệu tiến độ');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Đang tổng hợp dữ liệu tiến độ...</div>;
  if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-3xl border border-red-100">{error}</div>;
  if (!overview) return <div className="text-slate-500 text-center py-20">Chưa có đủ dữ liệu để hiển thị tiến độ.</div>;

  const distributionData = [
    { name: 'Sáng', value: overview.distribution.morning, color: '#fb923c', icon: Sun },
    { name: 'Chiều', value: overview.distribution.afternoon, color: '#facc15', icon: Sun },
    { name: 'Tối', value: overview.distribution.evening, color: '#6366f1', icon: Moon },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <TrendingUp className="text-primary" /> Tiến độ học tập
          </h1>
          <p className="text-slate-500">Toàn bộ hoạt động của bạn được ghi nhận tại đây</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-2xl font-bold text-sm">
          <Zap size={18} /> Cập nhật thời gian thực
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Clock size={20} />
          </div>
          <p className="text-xs text-slate-500 font-medium">Tổng thời gian học</p>
          <p className="text-2xl font-bold text-slate-900">{overview.totalHours}h</p>
          <p className="text-[10px] text-success font-bold mt-1">+12% so với tuần trước</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
            <Target size={20} />
          </div>
          <p className="text-xs text-slate-500 font-medium">Trung bình hàng ngày</p>
          <p className="text-2xl font-bold text-slate-900">{overview.avgDaily}h</p>
          <p className="text-[10px] text-slate-400 mt-1">Mục tiêu: 3h/ngày</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3">
            <Brain size={20} />
          </div>
          <p className="text-xs text-slate-500 font-medium">Bài kiểm tra đã làm</p>
          <p className="text-2xl font-bold text-slate-900">{overview.totalQuizzes}</p>
          <p className="text-[10px] text-success font-bold mt-1">Tỉ lệ đạt: 85%</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Trophy size={20} />
          </div>
          <p className="text-xs text-slate-500 font-medium">Thành tích mới</p>
          <p className="text-2xl font-bold text-slate-900">12</p>
          <p className="text-[10px] text-purple-400 mt-1">Đang dẫn đầu bảng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-text-primary">Giờ học 30 ngày gần đây</h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                <div className="w-2 h-2 rounded-full bg-primary" /> Tập trung
              </span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorHours)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-text-primary mb-6">Phân bổ thời gian</h3>
          <div className="h-48 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            {distributionData.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-8 rounded-full" style={{ backgroundColor: item.color }} />
                    <div>
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Icon size={12} style={{ color: item.color }} /> {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400">Năng suất học tập</p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">{item.value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <History size={18} className="text-primary" /> Lịch sử Quiz gần đây
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Thời gian</th>
                <th className="p-4">Kết quả</th>
                <th className="p-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {quizHistory.length > 0 ? (
                quizHistory.slice(0, 5).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 text-slate-600 font-medium">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.percentage >= 80 ? 'bg-success' : item.percentage >= 50 ? 'bg-accent' : 'bg-danger'}`} 
                            style={{ width: `${item.percentage}%` }} 
                          />
                        </div>
                        <span className="font-bold text-slate-900">{item.percentage}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        item.percentage >= 80 ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
                      }`}>
                        {item.percentage >= 80 ? 'Hoàn thành tốt' : 'Cần cố gắng'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400 italic">
                    Bạn chưa thực hiện bài kiểm tra nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
