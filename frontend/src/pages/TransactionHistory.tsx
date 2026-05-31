import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Download, TrendingUp, TrendingDown, Info, Loader2, Coins } from 'lucide-react';
import { api, CreditTransactionItem, UsageLogItem } from '../lib/api';

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<CreditTransactionItem[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('learnmate_token') || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txRes, usageRes] = await Promise.all([
          api.getCreditHistory(token),
          api.getAIUsageLogs(token)
        ]);
        setTransactions(txRes.transactions || []);
        setUsageLogs(usageRes.logs || []);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lịch sử giao dịch</h1>
          <p className="text-slate-500 mt-1">Theo dõi hoạt động nạp và sử dụng Credit của bạn.</p>
        </div>
        <div className="flex items-center gap-3 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
          <Coins className="text-primary" size={20} />
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng chi tiêu</p>
            <p className="text-lg font-bold text-slate-900">
              {transactions
                .filter(t => t.type === 'deduct')
                .reduce((acc, t) => acc + Math.abs(t.amount), 0)
                .toLocaleString()} Credits
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Credit Transactions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock size={18} className="text-primary" /> Hoạt động Credit
          </h2>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <Info className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-400">Chưa có giao dịch nào.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {transactions.map((tx) => (
                  <div key={tx._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'add' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                        {tx.type === 'add' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{tx.description}</p>
                        <p className="text-[11px] text-slate-400">{new Date(tx.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${tx.type === 'add' ? 'text-green-600' : 'text-slate-900'}`}>
                      {tx.type === 'add' ? '+' : '-'}{Math.abs(tx.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Usage Logs */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Download size={18} className="text-blue-500" /> Chi tiết sử dụng AI
          </h2>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {usageLogs.length === 0 ? (
              <div className="p-12 text-center">
                <Info className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-400">Chưa có nhật ký sử dụng nào.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {usageLogs.map((log) => (
                  <div key={log._id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{log.feature}</span>
                        <span className="text-sm font-semibold text-slate-900">
                          {log.metadata?.docName || log.metadata?.documentIds?.length ? `Tài liệu: ${log.metadata?.docName || log.metadata?.documentIds?.length + ' tệp'}` : 'Tính năng AI'}
                        </span>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">-{log.creditsUsed} cr</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString('vi-VN')}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {log.status === 'success' ? 'Hoàn thành' : 'Thất bại'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
