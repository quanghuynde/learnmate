import React from 'react';
import { PlayCircle } from 'lucide-react';

export function VideoSummary() {
  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2"><PlayCircle className="text-primary" /> Video tóm tắt</h1>
        <p className="text-slate-500">Chưa có dữ liệu video tóm tắt thật.</p>
      </div>
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
        <p className="font-semibold text-slate-700">Đã bỏ dữ liệu nháp, giữ khung hiển thị cho tích hợp sau.</p>
      </div>
    </div>
  );
}
