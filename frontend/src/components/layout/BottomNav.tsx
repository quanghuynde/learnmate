import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileText, 
  Brain, 
  Users, 
  User 
} from 'lucide-react';

interface BottomNavProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'documents', label: 'Tài liệu', icon: FileText },
  { id: 'quiz', label: 'Quiz', icon: Brain },
  { id: 'community', label: 'Cộng đồng', icon: Users },
  { id: 'profile', label: 'Hồ sơ', icon: User },
];

export function BottomNav({ currentPage, setCurrentPage }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 md:hidden z-[100] flex items-center justify-around px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = currentPage === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
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
    </nav>
  );
}
