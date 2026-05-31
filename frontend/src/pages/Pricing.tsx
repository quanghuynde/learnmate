import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Shield, CreditCard, Coins, ArrowRight, Loader2 } from 'lucide-react';
import { api, PackageItem } from '../lib/api';

interface PricingProps {
  setCurrentPage: (page: string) => void;
}

export function Pricing({ setCurrentPage }: PricingProps) {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const token = localStorage.getItem('learnmate_token') || '';

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.getPackages(token);
        setPackages(res.packages);
      } catch (error) {
        console.error('Failed to fetch packages:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, [token]);

  const handlePurchase = async (pkgId: string) => {
    try {
      setBuying(pkgId);
      const res = await api.createCheckout(token, pkgId);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      }
    } catch (error: any) {
      alert(error.message || 'Không thể tạo thanh toán');
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-500 font-medium font-inter">Đang tải các gói Credit...</p>
      </div>
    );
  }

  const icons = {
    Free: <Zap className="text-blue-500" />,
    Basic: <Zap className="text-primary" />,
    Premium: <Crown className="text-amber-500" />
  };

  const colors = {
    Free: 'border-slate-100',
    Basic: 'border-primary-light shadow-lg shadow-primary/10 ring-1 ring-primary/20',
    Premium: 'border-amber-400 bg-amber-50/10'
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold mb-6"
        >
          <Coins size={16} />
          Hỗ trợ học tập bằng AI
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
          Nâng cấp trải nghiệm <span className="text-primary">LearnMate</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto font-inter">
          Tối ưu hóa việc học của bạn với các tính năng AI mạnh mẽ. Chọn gói Credit phù hợp để bắt đầu hành trình chinh phục kiến thức ngay hôm nay.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {packages.map((pkg, idx) => (
          <motion.div
            key={pkg._id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`flex flex-col p-8 rounded-3xl border-2 transition-all relative overflow-hidden bg-white ${colors[pkg.name as keyof typeof colors] || 'border-slate-100'}`}
          >
            {pkg.name === 'Basic' && (
              <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                Phổ biến nhất
              </div>
            )}

            <div className="mb-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">
                {(icons as any)[pkg.name] || <Zap />}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{pkg.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">
                  {pkg.price.toLocaleString('vi-VN')}
                </span>
                <span className="text-slate-500 font-medium">VND</span>
              </div>
            </div>

            <div className="space-y-4 mb-8 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-green-600" />
                </div>
                <span className="text-slate-700 font-medium">
                  <strong>{pkg.credits.toLocaleString()}</strong> Credit sử dụng
                </span>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={12} className="text-green-600" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-inter italic">
                  {pkg.description}
                </p>
              </div>

              {pkg.name === 'Free' && (
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs text-blue-700 font-medium mb-1 flex items-center gap-1">
                    <Zap size={12} /> Cơ chế hồi Credit
                  </p>
                  <p className="text-[11px] text-blue-600 leading-tight">
                    Hồi 100 Credit tự động sau mỗi 1 tuần. Không cộng dồn.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => pkg.price === 0 ? setCurrentPage('dashboard') : handlePurchase(pkg._id)}
              disabled={buying === pkg._id}
              className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                pkg.price === 0
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20'
              } disabled:opacity-50`}
            >
              {buying === pkg._id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {pkg.price === 0 ? 'Dùng gói này' : 'Nâng cấp ngay'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-20 p-8 rounded-3xl bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold mb-4">Bạn cần giải pháp tuỳ chỉnh?</h2>
            <p className="text-slate-400 font-inter">
              Nếu bạn là tổ chức giáo dục hoặc doanh nghiệp cần lượng Credit lớn cho nhiều người dùng, hãy liên hệ với chúng tôi để có chính sách giá ưu đãi.
            </p>
          </div>
          <button className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-100 transition-colors whitespace-nowrap">
            Liên hệ hỗ trợ
          </button>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-center gap-8 text-slate-400 grayscale opacity-60">
        <div className="flex items-center gap-2"><Shield size={20} /> <span className="text-xs font-bold uppercase tracking-widest">Bảo mật VNPay</span></div>
        <div className="flex items-center gap-2"><CreditCard size={20} /> <span className="text-xs font-bold uppercase tracking-widest">Thanh toán an toàn</span></div>
      </div>
    </div>
  );
}
