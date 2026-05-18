import React, { useEffect, useState } from 'react';
import { Sparkles, Crown, Zap } from 'lucide-react';

interface PricingProps {
  setCurrentPage: (page: string) => void;
}

type PlanType = 'free' | 'pro' | 'premium';

export function Pricing({ setCurrentPage }: PricingProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(() => (localStorage.getItem('learnmate_plan') as PlanType) || 'pro');

  useEffect(() => {
    localStorage.setItem('learnmate_plan', selectedPlan);
  }, [selectedPlan]);

  const features = [
    { name: 'Số môn học', free: '1 môn', pro: '5 môn', premium: 'Không giới hạn' },
    { name: 'Quiz mỗi ngày', free: '5 câu', pro: '50 câu', premium: 'Không giới hạn' },
    { name: 'AI Podcast', free: '—', pro: '10 tập/tháng', premium: 'Không giới hạn' },
    { name: 'Video tóm tắt', free: '3 video', pro: 'Tất cả', premium: 'Tất cả + Tùy chỉnh' },
    { name: 'Mentor hỗ trợ', free: '—', pro: 'AI + 2 buổi/tháng', premium: 'AI + Không giới hạn' },
  ];

  const selectPlan = (plan: PlanType) => {
    setSelectedPlan(plan);
    setCurrentPage('dashboard');
  };

  const cardBase = 'rounded-3xl p-8 border shadow-sm transition-all';

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-12 pt-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-900">Nâng cấp LearnMate</h1>
        <p className="text-slate-500 text-lg">Mở khóa toàn bộ tính năng để ôn thi hiệu quả hơn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className={`${cardBase} ${selectedPlan === 'free' ? 'border-primary' : 'border-slate-100'}`}>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Miễn phí</h3>
          <div className="flex items-baseline gap-1 mb-2"><span className="text-6xl font-bold text-slate-900">0đ</span><span className="text-slate-500 text-3xl">/tháng</span></div>
          <p className="text-slate-500 text-sm mb-8">Bắt đầu ôn thi cơ bản</p>
          <button onClick={() => selectPlan('free')} className={`w-full py-3 px-4 font-bold rounded-xl ${selectedPlan === 'free' ? 'bg-primary text-white' : 'bg-slate-50 text-slate-700'}`}>{selectedPlan === 'free' ? 'Đã chọn' : 'Chọn gói'}</button>
        </div>

        <div className={`${cardBase} ${selectedPlan === 'pro' ? 'border-2 border-primary shadow-xl' : 'border-slate-100'}`}>
          <div className="absolute" />
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">Pro <Sparkles size={18} className="text-orange-400" /></h3>
          <div className="flex items-baseline gap-1 mb-2"><span className="text-6xl font-bold text-slate-900">99.000đ</span><span className="text-slate-500 text-3xl">/tháng</span></div>
          <p className="text-slate-500 text-sm mb-8">Ôn thi toàn diện với AI</p>
          <button onClick={() => selectPlan('pro')} className={`w-full py-3 px-4 font-bold rounded-xl ${selectedPlan === 'pro' ? 'bg-primary text-white shadow-md' : 'bg-slate-900 text-white'}`}>{selectedPlan === 'pro' ? 'Đã chọn Pro' : 'Nâng cấp Pro'}</button>
        </div>

        <div className={`${cardBase} ${selectedPlan === 'premium' ? 'border-primary' : 'border-slate-100'}`}>
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">Premium <Crown size={18} className="text-yellow-500" /></h3>
          <div className="flex items-baseline gap-1 mb-2"><span className="text-6xl font-bold text-slate-900">199.000đ</span><span className="text-slate-500 text-3xl">/tháng</span></div>
          <p className="text-slate-500 text-sm mb-8">Trải nghiệm không giới hạn</p>
          <button onClick={() => selectPlan('premium')} className={`w-full py-3 px-4 font-bold rounded-xl ${selectedPlan === 'premium' ? 'bg-primary text-white' : 'bg-slate-900 text-white'}`}>{selectedPlan === 'premium' ? 'Đã chọn Premium' : 'Nâng cấp Premium'}</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-slate-900">So sánh tính năng</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-medium">
                <th className="p-4 pl-6 w-1/4">Tính năng</th>
                <th className="p-4 w-1/4 text-center">Miễn phí</th>
                <th className="p-4 w-1/4 text-center">Pro</th>
                <th className="p-4 w-1/4 text-center">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {features.map((feature) => (
                <tr key={feature.name} className="hover:bg-slate-50/50">
                  <td className="p-4 pl-6 text-slate-700 font-medium">{feature.name}</td>
                  <td className="p-4 text-center text-slate-500">{feature.free}</td>
                  <td className="p-4 text-center text-primary font-medium">{feature.pro}</td>
                  <td className="p-4 text-center text-slate-900 font-medium">{feature.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
