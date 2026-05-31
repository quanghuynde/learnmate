import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Coins, ArrowRight } from 'lucide-react';

interface PaymentResultProps {
  setCurrentPage: (page: string) => void;
}

export function PaymentResult({ setCurrentPage }: PaymentResultProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [responseCode, setResponseCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('vnp_ResponseCode') || '';
    setResponseCode(code);
    setStatus(code === '00' ? 'success' : 'failed');
  }, []);

  if (status === 'loading') {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center"
      >
        {status === 'success' ? (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-green-500 w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Thanh toán thành công!</h1>
            <p className="text-slate-500 mb-8">Credit đã được nạp vào tài khoản của bạn. Hãy bắt đầu học ngay!</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { window.history.pushState({}, '', '/'); setCurrentPage('dashboard'); }}
                className="w-full py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
              >
                Về Trang chủ <ArrowRight size={16} />
              </button>
              <button
                onClick={() => { window.history.pushState({}, '', '/'); setCurrentPage('history'); }}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <Coins size={16} /> Xem lịch sử Credit
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="text-red-500 w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Thanh toán thất bại</h1>
            <p className="text-slate-500 mb-2">Giao dịch không thành công (mã lỗi: {responseCode || 'Không xác định'}).</p>
            <p className="text-sm text-slate-400 mb-8">Không có khoản phí nào bị trừ. Vui lòng thử lại.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { window.history.pushState({}, '', '/'); setCurrentPage('pricing'); }}
                className="w-full py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
              >
                Thử lại <ArrowRight size={16} />
              </button>
              <button
                onClick={() => { window.history.pushState({}, '', '/'); setCurrentPage('dashboard'); }}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                Về Trang chủ
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
