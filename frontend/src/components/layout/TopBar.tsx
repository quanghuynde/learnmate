import { useEffect, useState } from 'react';
import { Search, Bell, X, Check, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, NotificationItem, UserItem } from '../../lib/api';
// react-router-dom is not installed

interface TopBarProps {
  token: string;
  user: UserItem | null;
  setCurrentPage: (page: string) => void;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TopBar({ token, user, setCurrentPage }: TopBarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unread = notifications.filter((n) => !n.isRead).length;

  const loadNotifications = async () => {
    const res = await api.getNotifications(token);
    setNotifications(res.notifications || []);
  };

  useEffect(() => {
    loadNotifications().catch(() => null);
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
      <div className="flex-1 max-w-xl relative">
        <div className={`flex items-center bg-bg rounded-full px-4 py-2 border transition-colors ${isSearchFocused ? 'border-primary-light ring-2 ring-primary-light/20' : 'border-transparent'}`}>
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Tìm chủ đề, tài liệu hoặc câu hỏi..."
            className="bg-transparent border-none outline-none flex-1 ml-2 text-sm text-text-primary placeholder:text-slate-400"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 ml-4">
        {/* Credit Balance */}
        <button 
          onClick={() => setCurrentPage('pricing')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-all border border-primary/20"
        >
          <Coins size={16} />
          <span className="text-sm font-bold">{user?.currentCredits?.toLocaleString() || 0}</span>
          <span className="text-[10px] opacity-70">Credit</span>
        </button>
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
