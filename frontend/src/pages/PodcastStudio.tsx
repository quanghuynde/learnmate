import React from 'react';
import { Headphones } from 'lucide-react';

export function PodcastStudio() {
  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2"><Headphones className="text-primary" /> Podcast bài giảng</h1>
        <p className="text-slate-500">Chưa có dữ liệu podcast thật từ tài khoản.</p>
      </div>
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
        <p className="font-semibold text-slate-700">UI giữ sẵn, sẽ hiển thị danh sách/tệp audio khi có dữ liệu thật.</p>
      </div>
    </div>
  );
}
