import React from 'react';
import { Gamepad2 } from 'lucide-react';

export function Gamification() {
  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Gamepad2 className="text-primary" /> Gamification</h1>
        <p className="text-slate-500">Dữ liệu nhiệm vụ/huy hiệu đang chờ backend.</p>
      </div>
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
        <p className="font-semibold text-slate-700">Đã loại bỏ dữ liệu nháp, giữ sẵn khung để nối dữ liệu thật sau.</p>
      </div>
    </div>
  );
}
