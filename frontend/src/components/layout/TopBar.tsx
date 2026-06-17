import { useEffect, useState } from 'react';
import { Search, Bell, X, Check, Coins, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, NotificationItem, UserItem } from '../../lib/api';

interface TopBarProps {
  token: string;
  user: UserItem | null;
  setCurrentPage: (page: string) => void;
  onMenuClick?: () => void;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TopBar({ token, user, setCurrentPage, onMenuClick }: TopBarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unread = notifications.filter((n) => !n.isRead).length;

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications(token);
      console.log(`[Frontend] Loaded ${res.notifications?.length || 0} notifications`);
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error('[Frontend] Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications().catch(() => null);
    
    // Set up polling interval (every 10 seconds)
    const interval = setInterval(() => {
      loadNotifications().catch(() => null);
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  const markAll = async () => {
    await api.markAllNotificationsRead(token).catch(() => null);
    await loadNotifications().catch(() => null);
  };

  const markOne = async (id: string) => {
    await api.markNotificationRead(token, id).catch(() => null);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
  };

  const initials = user?.name ? getInitials(user.name) : '?';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-[40] flex-shrink-0 relative">
      {/* Mobile Menu Button & Logo */}
      <div className="flex items-center gap-3 md:hidden mr-2">
        <button 
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2" onClick={() => setCurrentPage('dashboard')}>
          <img src="/lmLogo.png" alt="Logo" className="w-8 h-8 rounded-full border border-primary/20" />
          <span className="font-bold text-sm text-primary tracking-tight">LEARNMATE</span>
        </div>
      </div>

      <div className={`${isSearchFocused ? 'flex' : 'hidden md:flex'} flex-1 max-w-xl relative group`}>
        <div className={`w-full flex items-center bg-bg rounded-full px-4 py-2 border transition-colors ${isSearchFocused ? 'border-primary-light ring-2 ring-primary-light/20' : 'border-transparent'}`}>
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Tìm chủ đề, tài liệu hoặc câu hỏi..."
            className="bg-transparent border-none outline-none flex-1 ml-2 text-sm text-text-primary placeholder:text-slate-400"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Global Search Results */}
        <AnimatePresence>
          {isSearchFocused && searchQuery.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[100]"
            >
              <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Kết quả tìm kiếm</span>
              </div>
              <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-1">
                {[
                  { id: 'dashboard', label: 'Trang chủ', cat: 'Tính năng' },
                  { id: 'quiz', label: 'Bắt đầu Quiz AI', cat: 'Tính năng' },
                  { id: 'documents', label: 'Quản lý Tài liệu', cat: 'Tính năng' },
                  { id: 'knowledge', label: 'Bản đồ kiến thức', cat: 'Tính năng' },
                  { id: 'planner', label: 'Kế hoạch học tập', cat: 'Tính năng' },
                  { id: 'pricing', label: 'Nạp Credit / Gói cước', cat: 'Tài khoản' },
                  { id: 'gamification', label: 'Nhiệm vụ & Đổi thưởng', cat: 'Tham gia' },
                  { id: 'community', label: 'Cộng đồng LearnMate', cat: 'Tham gia' },
                ].filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                        setCurrentPage(result.id);
                        setSearchQuery('');
                        setIsSearchFocused(false);
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-primary/5 rounded-xl transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Search size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">{result.label}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{result.cat}</p>
                      </div>
                    </div>
                    <Check size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-4 ml-4">
        {/* Credit Balance */}
        <div className="hidden sm:flex items-center gap-1">
          <button 
            onClick={() => setCurrentPage('pricing')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${
              (user?.currentCredits ?? 0) < 20
                ? 'bg-red-50 text-red-600 border-red-200 ring-2 ring-red-200 animate-pulse'
                : (user?.currentCredits ?? 0) < 50
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
            }`}
          >
            <Coins size={16} />
            <span className="text-sm font-bold">{user?.currentCredits?.toLocaleString() || 0}</span>
            <span className="text-[10px] opacity-70">Credit</span>
            {(user?.currentCredits ?? 0) < 50 && (
              <span className="text-[10px] font-black">
                {(user?.currentCredits ?? 0) < 20 ? '🔴 Sắp hết!' : '⚠️ Thấp'}
              </span>
            )}
          </button>

        </div>
        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
            <Bell size={20} />
            {unread > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border-2 border-card" />}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100]"
              >
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-semibold text-text-primary">Thông báo</h3>
                  <button onClick={markAll} className="text-xs text-primary-light hover:underline flex items-center gap-1">
                    <Check size={14} /> Đánh dấu đã đọc
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 && <p className="p-4 text-sm text-slate-500">Chưa có thông báo nào.</p>}
                  {notifications.map((notif) => (
                    <button
                      key={notif._id}
                      onClick={() => markOne(notif._id)}
                      className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${notif.isRead ? '' : 'bg-primary/5'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm ${notif.isRead ? 'font-medium text-text-primary' : 'font-semibold text-primary'}`}>{notif.title}</h4>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(notif.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                      <p className="text-xs text-slate-500">{notif.message}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User info — real data from API */}
        <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right">
            <p className="text-sm font-semibold text-text-primary leading-tight">
              {user?.name || 'Người dùng'}
            </p>
            <p className="text-xs text-slate-500 leading-tight">
              {user?.email || ''}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm border-2 border-primary/20 shadow-sm">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
