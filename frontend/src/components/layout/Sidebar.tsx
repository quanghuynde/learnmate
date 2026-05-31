import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Network,
  Brain,
  Target,
  TrendingUp,
  Users,
  MessageSquare,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gamepad2,
  User,
  Coins,
} from 'lucide-react';
import { UserItem } from '../../lib/api';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: UserItem | null;
}

const navItems = [
  { id: 'dashboard', label: 'Trang chủ', icon: LayoutDashboard },
  { id: 'planner', label: 'Kế hoạch học', icon: Calendar },
  { id: 'documents', label: 'Tài liệu', icon: FileText },
  { id: 'knowledge', label: 'Bản đồ kiến thức', icon: Network },
  { id: 'quiz', label: 'Kiểm tra', icon: Brain },
  { id: 'readiness', label: 'Độ sẵn sàng thi', icon: Target },
  { id: 'gamification', label: 'Gamification', icon: Gamepad2 },
  { id: 'progress', label: 'Tiến độ', icon: TrendingUp },
  { id: 'community', label: 'Cộng đồng', icon: Users },
  { id: 'video', label: 'Đối thoại AI', icon: MessageSquare },
  { id: 'mentor', label: 'Hỗ trợ Mentor', icon: UserCheck },
  { id: 'pricing', label: 'Gói Credit', icon: Coins },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Sidebar({ isOpen, setIsOpen, currentPage, setCurrentPage, user }: SidebarProps) {
  const initials = user?.name ? getInitials(user.name) : '?';

  return (
    <motion.aside animate={{ width: isOpen ? 256 : 80 }} className="h-full bg-sidebar text-white flex flex-col relative z-20 flex-shrink-0 transition-all duration-300">
      {/* Logo */}
      <div className="p-4 flex items-center justify-between h-16 border-b border-slate-800">
        <div className={`flex items-center gap-3 overflow-hidden ${!isOpen && 'justify-center w-full'}`}>
          <img src="/pasted-image.jpg" alt="LearnMate Logo" className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-primary-light" />
          {isOpen && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-lg tracking-wide whitespace-nowrap">
              LEARNMATE
            </motion.span>
          )}
        </div>
      </div>

      {/* Toggle button */}
      <button onClick={() => setIsOpen(!isOpen)} className="absolute -right-3 top-6 bg-slate-800 text-white rounded-full p-1 border border-slate-700 hover:bg-slate-700 z-30">
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl relative group transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title={!isOpen ? item.label : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/20 rounded-xl border-l-4 border-primary-light"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon size={20} className={`relative z-10 flex-shrink-0 ${isActive ? 'text-primary-light' : ''}`} />
              {isOpen && <span className="relative z-10 text-sm font-medium whitespace-nowrap flex-1 text-left">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom: User profile + AI button */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        {/* User profile link — shows real user data */}
        <button
          onClick={() => setCurrentPage('profile')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
          title={!isOpen ? (user?.name || 'Hồ sơ') : undefined}
        >
          {/* Avatar with initials */}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white font-bold text-xs border border-primary-light/40">
            {user?.name ? initials : <User size={15} />}
          </div>

          {isOpen && (
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {user?.name || 'Người dùng'}
              </p>
              <p className="text-xs text-slate-400 truncate leading-tight">
                {user?.email || 'Tài khoản'}
              </p>
            </div>
          )}
        </button>

        {/* AI button */}
        <button className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-light text-white rounded-xl py-2.5 hover:shadow-lg hover:shadow-primary/20 transition-all ${!isOpen && 'px-0'}`}>
          <Sparkles size={18} />
          {isOpen && <span className="text-sm font-medium">Trợ lý AI</span>}
        </button>
      </div>
    </motion.aside>
  );
}
