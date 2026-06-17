// BottomNav.tsx - full replacement with "Thêm" drawer
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileText, 
  Brain, 
  Users, 
  MoreHorizontal,
  X,
  Map,
  Target,
  Calendar,
  Trophy,
  TrendingUp,
  CreditCard,
  History,
  User,
  MessageCircle,
} from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const primaryNav = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'documents', label: 'Tài liệu', icon: FileText },
  { id: 'quiz', label: 'Quiz', icon: Brain },
  { id: 'community', label: 'Cộng đồng', icon: Users },
];

const moreItems = [
  { id: 'knowledge', label: 'Bản đồ KT', icon: Map },
  { id: 'readiness', label: 'Độ sẵn sàng', icon: Target },
  { id: 'planner', label: 'Kế hoạch học', icon: Calendar },
  { id: 'gamification', label: 'Thành tích', icon: Trophy },
  { id: 'progress', label: 'Tiến độ', icon: TrendingUp },
  { id: 'video', label: 'AI Hội thoại', icon: MessageCircle },
  { id: 'profile', label: 'Hồ sơ', icon: User },
  { id: 'pricing', label: 'Gói dịch vụ', icon: CreditCard },
  { id: 'history', label: 'Lịch sử GD', icon: History },
];

export function BottomNav({ currentPage, setCurrentPage }: BottomNavProps) {
  const [showMore, setShowMore] = useState(false);

  const handleNav = (id: string) => {
    setCurrentPage(id);
    setShowMore(false);
  };

  return (
    <>
      {/* More Drawer */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 z-[95] md:hidden"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[96] md:hidden pb-4"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Tất cả tính năng</h3>
                <button
                  onClick={() => setShowMore(false)}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                        isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={22} />
                      <span className="text-[10px] font-bold text-center leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 md:hidden z-[100] flex items-center justify-around px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {primaryNav.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full relative transition-colors ${
                isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute top-0 w-8 h-1 bg-primary rounded-b-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon size={20} className={isActive ? 'text-primary' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-tighter truncate max-w-full px-1">
                {item.label}
              </span>
            </button>
          );
        })}
        {/* More button */}
        <button
          onClick={() => setShowMore(!showMore)}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full relative transition-colors ${
            showMore ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {showMore && (
            <motion.div
              layoutId="bottom-nav-active"
              className="absolute top-0 w-8 h-1 bg-primary rounded-b-full"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <MoreHorizontal size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Thêm</span>
        </button>
      </nav>
    </>
  );
}
