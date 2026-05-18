import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, MessageSquare } from 'lucide-react';

export function Community() {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'posts'>('leaderboard');

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Trophy className="text-accent" /> Cộng đồng
        </h1>
        <p className="text-slate-500">Dữ liệu cộng đồng sẽ hiển thị khi backend cung cấp.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: 'leaderboard', label: 'Bảng xếp hạng' },
          { id: 'posts', label: 'Bài viết' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'leaderboard' | 'posts')}
            className={`px-6 py-3 font-medium text-sm relative transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
            {activeTab === tab.id && <motion.div layoutId="communityTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
        <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-slate-700">
          {activeTab === 'leaderboard' ? 'Chưa có dữ liệu bảng xếp hạng.' : 'Chưa có dữ liệu bài viết cộng đồng.'}
        </p>
        <p className="text-sm text-slate-500 mt-1">Khung giao diện đã sẵn sàng để kết nối dữ liệu thật.</p>
      </div>
    </div>
  );
}
