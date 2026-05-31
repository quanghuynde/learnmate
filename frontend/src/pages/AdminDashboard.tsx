import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, CreditCard, Activity, DollarSign, Loader2, TrendingUp, Calendar, ArrowRight, Brain } from 'lucide-react';
import { api } from '../lib/api';

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('learnmate_token') || '';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.getAdminStats(token);
        setStats(res);
      } catch (error) {
        console.error('Failed to fetch admin stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-20">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: 'Tổng doanh thu', value: `${(stats?.revenue || 0).toLocaleString()} VND`, icon: <DollarSign className="text-green-600" />, trend: '+12%', bg: 'bg-green-50' },
    { label: 'Người dùng mới', value: stats?.usersCount || 0, icon: <Users className="text-blue-600" />, trend: '+5%', bg: 'bg-blue-50' },
    { label: 'Credit đã nạp', value: (stats?.creditsSold || 0).toLocaleString(), icon: <CreditCard className="text-secondary-light" />, trend: '+18%', bg: 'bg-purple-50' },
    { label: 'Lượt sử dụng AI', value: stats?.usageCount || 0, icon: <Brain className="text-amber-600" />, trend: '+24%', bg: 'bg-amber-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Insights</h1>
          <p className="text-slate-500 mt-1 font-inter">Theo dõi hiệu suất hệ thống và doanh thu thời gian thực.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm text-sm font-medium text-slate-600">
          <Calendar size={16} /> Last 30 Days
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                {card.icon}
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp size={10} /> {card.trend}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium font-inter">{card.label}</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900">Hoạt động hệ thống</h3>
            <button className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
              Chi tiết <ArrowRight size={14} />
            </button>
          </div>
          <div className="h-64 flex items-end gap-2 px-2">
            {(stats?.chartData || [40, 60, 45, 90, 65, 80, 50, 70, 85, 60, 40, 55]).map((v: number, i: number) => (
              <div key={i} className="flex-1 bg-primary/20 rounded-t-lg transition-all hover:bg-primary relative group" style={{ height: `${v}%` }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Day {i+1}: {v}%
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2">
            <span>May 01</span>
            <span>May 15</span>
            <span>May 31</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Recent Payments</h3>
          <div className="space-y-4">
            {(stats?.recentPayments || [
              { user: 'Nguyễn Văn A', amount: 49000, status: 'completed' },
              { user: 'Trần Thị B', amount: 69000, status: 'completed' },
              { user: 'Lê Văn C', amount: 49000, status: 'failed' },
              { user: 'Hoàng Minh D', amount: 69000, status: 'completed' },
            ]).map((pay: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {pay.user.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{pay.user}</p>
                    <p className="text-[10px] text-slate-400">Gói {pay.amount === 49000 ? 'Pro' : 'Premium'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{pay.amount.toLocaleString()}đ</p>
                  <p className={`text-[9px] font-bold uppercase ${pay.status === 'completed' ? 'text-green-500' : 'text-red-500'}`}>
                    {pay.status === 'completed' ? 'Success' : 'Failed'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
