import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Download, TrendingUp, TrendingDown, Info, Loader2, Coins } from 'lucide-react';
import { api, CreditTransactionItem, UsageLogItem } from '../lib/api';

interface TransactionHistoryProps {
  token?: string;
}

export function TransactionHistory({ token: propToken }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<CreditTransactionItem[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'add' | 'deduct'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const token = propToken || localStorage.getItem('learnmate_token') || '';

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

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filterType === 'all' || tx.type === filterType;
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredUsage = usageLogs.filter(log => {
    const matchesSearch = log.feature.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (log.metadata?.docName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header & Stats */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lịch sử giao dịch</h1>
          <p className="text-slate-500 mt-1 font-medium">Theo dõi hoạt động nạp và sử dụng Credit của bạn.</p>
        </div>
        <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Coins className="text-primary" size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng chi tiêu</p>
            <p className="text-xl font-black text-slate-900">
              {transactions
                .filter(t => t.type === 'deduct')
                .reduce((acc, t) => acc + Math.abs(t.amount), 0)
                .toLocaleString()} Credits
            </p>
          </div>
        </div>
      </motion.div>


      {/* Filters Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3 bg-slate-50/50 p-2 rounded-2xl border border-slate-100"
      >
        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          {(['all', 'add', 'deduct'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === type 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {type === 'all' ? 'Tất cả' : type === 'add' ? 'Nạp tiền' : 'Sử dụng'}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <input 
            type="text"
            placeholder="Tìm kiếm giao dịch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Credit Transactions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 px-1">
            <Clock size={18} className="text-primary" /> Hoạt động Credit
            <span className="text-xs font-bold text-slate-400 ml-auto bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredTransactions.length}
            </span>
          </h2>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-slate-50">
              {filteredTransactions.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="text-slate-300" size={32} />
                  </div>
                  <p className="text-slate-400 font-medium">Không tìm thấy giao dịch nào.</p>
                </div>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <motion.div 
                    key={tx._id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${tx.type === 'add' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                        {tx.type === 'add' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm leading-tight mb-1">{tx.description}</p>
                        <p className="text-[11px] text-slate-400 font-medium tracking-tight">
                          {new Date(tx.createdAt).toLocaleString('vi-VN', { 
                            dateStyle: 'medium', 
                            timeStyle: 'short' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className={`text-sm font-black tabular-nums ${tx.type === 'add' ? 'text-green-600' : 'text-slate-900'}`}>
                      {tx.type === 'add' ? '+' : '-'}{Math.abs(tx.amount).toLocaleString()}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* AI Usage Logs */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 px-1">
            <Download size={18} className="text-blue-500" /> Chi tiết sử dụng AI
            <span className="text-xs font-bold text-slate-400 ml-auto bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredUsage.length}
            </span>
          </h2>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-slate-50">
              {filteredUsage.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Info className="text-slate-300" size={32} />
                  </div>
                  <p className="text-slate-400 font-medium">Không tìm thấy nhật ký sử dụng.</p>
                </div>
              ) : (
                filteredUsage.map((log, idx) => (
                  <motion.div 
                    key={log._id} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="p-5 hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">{log.feature}</span>
                        <span className="text-sm font-bold text-slate-900 line-clamp-1">
                          {log.metadata?.docName || (log.metadata?.documentIds?.length ? `${log.metadata?.documentIds?.length} tệp` : 'Tính năng AI')}
                        </span>
                      </div>
                      <span className="text-[11px] bg-slate-900 text-white px-2.5 py-1 rounded-lg font-black tabular-nums shadow-sm shadow-slate-200">
                        -{log.creditsUsed}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-slate-300" />
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.createdAt).toLocaleString('vi-VN', { 
                            dateStyle: 'medium', 
                            timeStyle: 'short' 
                          })}
                        </p>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.status === 'success' ? 'Thành công' : 'Thất bại'}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
