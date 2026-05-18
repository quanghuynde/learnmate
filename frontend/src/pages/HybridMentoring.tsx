import React from 'react';
import { UserCheck } from 'lucide-react';

export function HybridMentoring() {
  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2"><UserCheck className="text-primary" /> Hỗ trợ Mentor</h1>
        <p className="text-slate-500">Chưa có dữ liệu mentor/lịch hẹn thật.</p>
      </div>
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
        <p className="font-semibold text-slate-700">Khung giao diện đã giữ lại, sẵn sàng kết nối dữ liệu thật sau này.</p>
      </div>
    </div>
  );
}
