import React from 'react';
import { Network } from 'lucide-react';

export function KnowledgeMap() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bản đồ kiến thức</h1>
        <p className="text-slate-500">Chưa có dữ liệu thật để dựng bản đồ.</p>
      </div>
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-center">
        <div className="text-center">
          <Network className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">Đang chờ dữ liệu tài liệu và chủ đề.</p>
          <p className="text-sm text-slate-500">UI đã giữ nguyên sẵn sàng cho tích hợp sau.</p>
        </div>
      </div>
    </div>
  );
}
