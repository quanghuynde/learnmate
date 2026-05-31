import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Shield, CreditCard, Coins, ArrowRight, Loader2, Brain, Star } from 'lucide-react';
import { api, PackageItem } from '../lib/api';

interface PricingProps {
  setCurrentPage: (page: string) => void;
}

// Static tier definitions - always show these 3
const TIERS = [
  {
    key: 'Basic',
    name: 'Miễn phí',
    price: 0,
    credits: 100,
    icon: <Zap className="text-slate-500" size={22} />,
    badge: null,
    color: 'border-slate-200',
    bg: 'bg-white',
    btnClass: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    btnLabel: 'Dùng gói này',
    features: [
      '100 Credit mỗi tuần (tự động hồi)',
      'Tải & tóm tắt tài liệu',
      'Tạo Quiz AI cơ bản',
      'Lưu trữ tối đa 5 tài liệu',
    ],
  },
  {
    key: 'Pro',
    name: 'Pro',
    price: 49000,
    credits: 1000,
    icon: <Star className="text-primary" size={22} />,
    badge: 'Phổ biến nhất',
    color: 'border-primary shadow-xl shadow-primary/10 ring-2 ring-primary/20',
    bg: 'bg-white',
    btnClass: 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/30',
    btnLabel: 'Nâng cấp ngay',
    features: [
      '1.000 Credit sử dụng',
      'Tải & tóm tắt không giới hạn',
      'Tạo Quiz AI nâng cao',
      'Tạo hội thoại AI',
      'Lịch sử giao dịch',
      'Ưu tiên hỗ trợ',
    ],
  },
  {
    key: 'Premium',
    name: 'Premium',
    price: 69000,
    credits: 5000,
    icon: <Crown className="text-amber-500" size={22} />,
    badge: 'Tốt nhất',
    color: 'border-amber-400',
    bg: 'bg-gradient-to-br from-white to-amber-50/30',
    btnClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 shadow-lg shadow-amber-400/30',
    btnLabel: 'Nâng cấp ngay',
    features: [
      '5.000 Credit sử dụng',
      'Tất cả tính năng Pro',
      'Chat AI không giới hạn',
      'Tạo đề thi toàn diện',
      'AI Postcard & Podcast',
      'Không giới hạn tài liệu',
    ],
  },
];

const AI_COSTS = [
  { label: 'Tải tài liệu', cost: 10, unit: 'lần' },
  { label: 'Tóm tắt tài liệu', cost: 10, unit: 'lần' },
  { label: 'Tạo Quiz AI', cost: 5, unit: 'lần' },
  { label: 'Chat với AI', cost: 1, unit: 'tin nhắn' },
];

export function Pricing({ setCurrentPage }: PricingProps) {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const token = localStorage.getItem('learnmate_token') || '';

  useEffect(() => {
    api.getPackages(token)
      .then(res => setPackages(res.packages || []))
      .catch(() => {}); // Silently fail — UI works without this
  }, [token]);

  const handlePurchase = async (tierKey: string) => {
    if (tierKey === 'Basic') {
      setCurrentPage('dashboard');
      return;
    }

    // Attempt to find by name, fallback to price matching
    const currentTier = TIERS.find(t => t.key === tierKey);
    let pkg = packages.find(p => p.name === tierKey);
    
    if (!pkg && currentTier) {
      pkg = packages.find(p => p.price === currentTier.price);
    }

    if (!pkg) {
      console.error('Package matching failed:', { tierKey, availablePackages: packages });
      alert(`Không tìm thấy cấu hình cho gói ${tierKey}. Vui lòng tải lại trang.`);
      return;
    }

    try {
      setBuying(tierKey);
      const res = await api.createCheckout(token, pkg._id);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      }
    } catch (error: any) {
      alert(error.message || 'Không thể tạo thanh toán. Vui lòng thử lại.');
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 md:px-6">
      {/* Header */}
      <div className="text-center mb-14">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold mb-5"
        >
          <Coins size={15} /> Hệ thống Credit
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
          Nâng cấp trải nghiệm <span className="text-primary">LearnMate</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Dùng Credit để mở khoá các tính năng AI mạnh mẽ. Chọn gói phù hợp và bắt đầu ngay hôm nay.
        </p>
      </div>

      {/* 3 Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {TIERS.map((tier, idx) => (
          <motion.div
            key={tier.key}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`relative flex flex-col rounded-3xl border-2 p-8 ${tier.color} ${tier.bg} transition-all`}
          >
            {/* Badge */}
            {tier.badge && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow">
                {tier.badge}
              </div>
            )}

            {/* Icon + Name */}
            <div className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center mb-5">
              {tier.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{tier.name}</h3>

            {/* Price */}
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-black text-slate-900">
                {tier.price === 0 ? 'Miễn phí' : tier.price.toLocaleString('vi-VN')}
              </span>
              {tier.price > 0 && <span className="text-slate-400 font-medium text-sm">đ</span>}
            </div>

            {/* Credits */}
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl mb-6">
              <Coins size={16} className="text-primary flex-shrink-0" />
              <span className="text-sm font-bold text-primary">
                {tier.credits.toLocaleString()} Credits
                {tier.key === 'Basic' ? ' / tuần (tự hồi)' : ''}
              </span>
            </div>

            {/* Features */}
            <ul className="space-y-3 flex-1 mb-8">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={10} className="text-green-600" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={() => handlePurchase(tier.key)}
              disabled={buying === tier.key}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${tier.btnClass}`}
            >
              {buying === tier.key ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {tier.btnLabel}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* AI Cost Breakdown */}
      <div className="mt-16 p-8 rounded-3xl bg-slate-50 border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
          <Brain size={18} className="text-primary" /> Chi phí sử dụng AI (Credits)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {AI_COSTS.map((item) => (
            <div key={item.label} className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className="text-xl font-black text-primary">{item.cost}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">cr/{item.unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Trust Badges */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <Shield size={18} /> Bảo mật VNPay
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <CreditCard size={18} /> Thanh toán an toàn
        </div>
      </div>
    </div>
  );
}
