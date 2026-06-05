import { useState, useEffect } from 'react';
import { useNotification } from '../components/ui/Notification';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, Zap, Crown, Shield, CreditCard, Coins, ArrowRight, 
  Loader2, Brain, Star, X, Copy, CheckCircle2 
} from 'lucide-react';
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
    credits: 800,
    icon: <Zap className="text-slate-500" size={22} />,
    badge: null,
    color: 'border-slate-200',
    bg: 'bg-white',
    btnClass: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    btnLabel: 'Dùng gói này',
    features: [
      '800 Credit mỗi 2 tuần (tự động hồi)',
      'Tải & tóm tắt tài liệu',
      'Tạo tối đa 30 Quiz AI',
      'Lưu trữ tối đa 40 tài liệu',
      'Tạo tối đa 10 đối thoại AI',
      'Tạo tối đa 10 bản đồ kiến thức'
    ],
  },
  {
    key: 'Pro', 
    name: 'Pro',
    price: 49000,
    credits: 2500,
    icon: <Star className="text-primary" size={22} />,
    badge: 'Phổ biến nhất',
    color: 'border-primary shadow-xl shadow-primary/10 ring-2 ring-primary/20',
    bg: 'bg-white',
    btnClass: 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/30',
    btnLabel: 'Nâng cấp ngay',
    features: [
      '2.500 Credit mỗi 2 tuần (tự động hồi)',
      'Sử dụng trong 30 ngày',
      'Lưu trữ tối đa 80 tài liệu',
      'Tạo tối đa 60 Quiz AI',
      'Tạo tối đa 30 đối thoại AI',
      'Tạo tối đa 30 bản đồ kiến thức',
      'Lịch sử giao dịch'
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
      '5.000 Credit mỗi 2 tuần (tự động hồi)',
      'Sử dụng trong 30 ngày',
      'Tất cả tính năng Pro',
      'Chat & Quiz AI không giới hạn',
      'Bản đồ kiến thức không giới hạn',
      'Tạo đề thi toàn diện',
      'AI Postcard & Podcast',
    ],
  },
];

const AI_COSTS = [
  { label: 'Tải tài liệu', cost: 10, unit: 'lần' },
  { label: 'Tóm tắt tài liệu', cost: 10, unit: 'lần' },
  { label: 'Tạo bản đồ kiến thức', cost: 10, unit: 'lần' },
  { label: 'Tạo Quiz AI', cost: 5, unit: 'lần' },
  { label: 'Chat với AI', cost: 1, unit: 'tin nhắn' },
];

export function Pricing({ setCurrentPage }: PricingProps) {
  const { showNotification } = useNotification();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

    const currentTier = TIERS.find(t => t.key === tierKey);
    let pkg = packages.find(p => p.name === tierKey);
    if (!pkg && currentTier) {
      pkg = packages.find(p => p.price === currentTier.price);
    }

    if (!pkg) {
      showNotification(`Không tìm thấy cấu hình cho gói ${tierKey}. Vui lòng tải lại trang.`, 'warning');
      return;
    }

    try {
      setBuying(tierKey);
      const res = await api.createManualCheckout(token, pkg._id);
      setPaymentData(res);
      setShowQRModal(true);
    } catch (error: any) {
      showNotification(error.message || 'Không thể tạo thanh toán. Vui lòng thử lại.', 'error');
    } finally {
      setBuying(null);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
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
          Dùng Credit để mở khoá các tính năng AI mạnh mẽ. Chọn gói phù hợp và bắt đầu ngay hôm nay. Hàng tháng sẽ có phần thưởng Credit cho TOP 3 bảng xếp hạng!
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
                {tier.credits.toLocaleString()} Credits / 2 tuần (tự hồi)
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {AI_COSTS.map((item) => (
            <div key={item.label} className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-sm">
              <p className="text-[10px] text-slate-500 mb-1 font-bold whitespace-nowrap">{item.label}</p>
              <p className="text-xl font-black text-primary">{item.cost}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">cr/{item.unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Trust Badges */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <Shield size={18} /> Chuyển khoản an toàn
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <CreditCard size={18} /> Tự động kích hoạt
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showQRModal && paymentData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQRModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 mb-1">Thanh toán chuyển khoản</h2>
                    <p className="text-sm text-slate-500">Quét mã QR để nâng cấp gói tài khoản</p>
                  </div>
                  <button 
                    onClick={() => setShowQRModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center">
                  {/* QR Code */}
                  <div className="w-full md:w-1/2 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                    <img 
                      src={paymentData.qrUrl} 
                      alt="VietQR Payment" 
                      className="w-full aspect-square object-contain"
                    />
                    <div className="mt-4 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quét mã bằng app Bank/Ví</p>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="w-full md:w-1/2 space-y-4">
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                      <p className="text-xs text-slate-500 mb-1 uppercase font-bold">Số tiền cần chuyển</p>
                      <p className="text-2xl font-black text-primary">
                        {paymentData.amount.toLocaleString('vi-VN')}đ
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Ngân hàng</p>
                          <p className="text-sm font-bold text-slate-800">{paymentData.bankInfo.bankId}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Số tài khoản</p>
                          <p className="text-sm font-bold text-slate-800">{paymentData.bankInfo.accountNo}</p>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(paymentData.bankInfo.accountNo, 'stk')}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                          {copied === 'stk' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        </button>
                      </div>

                      <div className="flex justify-between items-center p-3 rounded-xl bg-amber-50 border border-amber-100 group">
                        <div className="flex-1">
                          <p className="text-[10px] text-amber-600 uppercase font-bold">Nội dung (Quan trọng)</p>
                          <p className="text-base font-black text-amber-700 tracking-wider">{paymentData.memo}</p>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(paymentData.memo, 'memo')}
                          className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-all"
                        >
                          {copied === 'memo' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Loader2 size={16} className="text-primary animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Đang chờ thanh toán...</p>
                      <p className="text-xs text-slate-500">Hệ thống sẽ tự động kích hoạt gói sau 30s - 1 phút ngay khi nhận được tiền.</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowQRModal(false)}
                  className="w-full mt-6 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
