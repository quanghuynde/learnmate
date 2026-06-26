import { useEffect, useRef, useState } from 'react';
import {
  Search, Bell, X, Check, Coins, Menu, User, Settings, LogOut,
  LayoutDashboard, Calendar, FileText, Network, Brain, Target,
  TrendingUp, Users, MessageSquare, Gamepad2, Clock, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, NotificationItem, UserItem } from '../../lib/api';
import { Modal } from '../ui/Modal';

interface TopBarProps {
  token: string;
  user: UserItem | null;
  setCurrentPage: (page: string) => void;
  onMenuClick?: () => void;
  onLogout?: () => void;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const searchItems = [
  { id: 'dashboard', label: 'Trang chủ', cat: 'Tính năng', icon: LayoutDashboard },
  { id: 'quiz', label: 'Kiểm tra Quiz AI', cat: 'Tính năng', icon: Brain },
  { id: 'documents', label: 'Quản lý Tài liệu', cat: 'Tính năng', icon: FileText },
  { id: 'knowledge', label: 'Bản đồ kiến thức', cat: 'Tính năng', icon: Network },
  { id: 'planner', label: 'Kế hoạch học tập', cat: 'Tính năng', icon: Calendar },
  { id: 'readiness', label: 'Độ sẵn sàng thi', cat: 'Tính năng', icon: Target },
  { id: 'progress', label: 'Tiến độ học tập', cat: 'Tính năng', icon: TrendingUp },
  { id: 'gamification', label: 'Nhiệm vụ & Đổi thưởng', cat: 'Tham gia', icon: Gamepad2 },
  { id: 'community', label: 'Cộng đồng LearnMate', cat: 'Tham gia', icon: Users },
  { id: 'video', label: 'Đối thoại AI', cat: 'Tính năng', icon: MessageSquare },
  { id: 'pricing', label: 'Nạp Credit / Gói cước', cat: 'Tài khoản', icon: Coins },
  { id: 'history', label: 'Lịch sử Credit', cat: 'Tài khoản', icon: Clock },
  { id: 'profile', label: 'Hồ sơ cá nhân', cat: 'Tài khoản', icon: User },
];

export function TopBar({ token, user, setCurrentPage, onMenuClick, onLogout }: TopBarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchIdx, setActiveSearchIdx] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unread = notifications.filter((n) => !n.isRead).length;
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredResults = searchItems.filter(i =>
    i.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications(token);
      setNotifications(res.notifications || []);
    } catch {}
  };

  useEffect(() => {
    loadNotifications().catch(() => null);
    const interval = setInterval(() => { loadNotifications().catch(() => null); }, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset active index when results change
  useEffect(() => { setActiveSearchIdx(0); }, [searchQuery]);

  const markAll = async () => {
    await api.markAllNotificationsRead(token).catch(() => null);
    await loadNotifications().catch(() => null);
  };

  const markOne = async (id: string) => {
    await api.markNotificationRead(token, id).catch(() => null);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!filteredResults.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSearchIdx(i => Math.min(i + 1, filteredResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSearchIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filteredResults[activeSearchIdx]) {
      setCurrentPage(filteredResults[activeSearchIdx].id);
      setSearchQuery('');
      setIsSearchFocused(false);
    }
    if (e.key === 'Escape') { setSearchQuery(''); setIsSearchFocused(false); }
  };

  const initials = user?.name ? getInitials(user.name) : '?';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-[40] flex-shrink-0 relative">
      {/* Mobile Menu Button & Logo */}
      <div className="flex items-center gap-3 md:hidden mr-2">
        <button onClick={onMenuClick} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('dashboard')}>
          <img src="/lmLogo.png" alt="Logo" className="w-8 h-8 rounded-full border border-primary/20" />
          <span className="font-bold text-sm text-primary tracking-tight">LEARNMATE</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className={`${isSearchFocused ? 'flex' : 'hidden md:flex'} flex-1 max-w-xl relative group`}>
        <div className={`w-full flex items-center bg-bg rounded-full px-4 py-2 border transition-all duration-200 ${isSearchFocused ? 'border-primary-light ring-2 ring-primary-light/20 shadow-sm' : 'border-transparent'}`}>
          <Search size={18} className={`flex-shrink-0 transition-colors ${isSearchFocused ? 'text-primary' : 'text-slate-400'}`} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Tìm chủ đề, tài liệu hoặc câu hỏi..."
            className="bg-transparent border-none outline-none flex-1 ml-2 text-sm text-text-primary placeholder:text-slate-400"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 transition-colors ml-1">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {isSearchFocused && searchQuery.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[100]"
            >
              <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                  {filteredResults.length > 0 ? `${filteredResults.length} kết quả` : 'Kết quả tìm kiếm'}
                </span>
              </div>
              <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-1">
                {filteredResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <Search size={28} className="mb-2 opacity-40" />
                    <p className="text-sm font-medium">Không tìm thấy kết quả</p>
                    <p className="text-xs mt-1">Thử từ khóa khác</p>
                  </div>
                ) : (
                  filteredResults.map((result, idx) => {
                    const Icon = result.icon;
                    return (
                      <button
                        key={result.id}
                        onClick={() => {
                          setCurrentPage(result.id);
                          setSearchQuery('');
                          setIsSearchFocused(false);
                        }}
                        onMouseEnter={() => setActiveSearchIdx(idx)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left group ${idx === activeSearchIdx ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${idx === activeSearchIdx ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                            <Icon size={15} />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold transition-colors ${idx === activeSearchIdx ? 'text-primary' : 'text-text-primary'}`}>{result.label}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{result.cat}</p>
                          </div>
                        </div>
                        <Check size={14} className={`text-primary transition-opacity ${idx === activeSearchIdx ? 'opacity-100' : 'opacity-0'}`} />
                      </button>
                    );
                  })
                )}
              </div>
              <div className="p-2 border-t border-slate-50 bg-slate-50/30 flex items-center gap-3 px-4">
                <span className="text-[10px] text-slate-400">↑↓ Điều hướng</span>
                <span className="text-[10px] text-slate-400">↵ Chọn</span>
                <span className="text-[10px] text-slate-400">Esc Đóng</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 ml-4">
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
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
          >
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

        {/* Avatar with Dropdown Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200 hover:opacity-80 transition-opacity cursor-pointer group"
          >
            <div className="text-right">
              <p className="text-sm font-semibold text-text-primary leading-tight">{user?.name || 'Người dùng'}</p>
              <p className="text-xs text-slate-500 leading-tight">{user?.email || ''}</p>
            </div>
            <div className="relative">
              <div className={`w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm border-2 transition-all ${showUserMenu ? 'border-primary-light ring-2 ring-primary/20 scale-105' : 'border-primary/20 shadow-sm'}`}>
                {initials}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}>
                <ChevronDown size={10} className="text-slate-500" />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100]"
              >
                {/* User brief */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{user?.name || 'Người dùng'}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-1.5">
                  <button
                    onClick={() => { setCurrentPage('profile'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 text-text-primary hover:text-primary transition-colors text-sm font-medium"
                  >
                    <User size={16} />
                    Hồ sơ cá nhân
                  </button>
                  <button
                    onClick={() => { setCurrentPage('pricing'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 text-text-primary hover:text-primary transition-colors text-sm font-medium"
                  >
                    <Coins size={16} />
                    Nạp Credit
                  </button>
                  <button
                    onClick={() => { setCurrentPage('profile'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 text-text-primary hover:text-primary transition-colors text-sm font-medium"
                  >
                    <Settings size={16} />
                    Cài đặt tài khoản
                  </button>
                </div>

                <div className="p-1.5 border-t border-slate-100">
                  <button
                    onClick={() => { setShowUserMenu(false); setShowLogoutConfirm(true); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors text-sm font-medium"
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout Confirmation Modal */}
        <Modal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          title="Xác nhận đăng xuất"
          maxWidth="max-w-md"
        >
          <div className="text-center py-2">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut size={32} />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Bạn chắc chắn muốn đăng xuất?</h4>
            <p className="text-sm text-slate-500 mb-8">Mọi phiên làm việc hiện tại của bạn trên LearnMate sẽ kết thúc.</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout?.();
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-200"
              >
                Đăng xuất ngay
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </header>
  );
}
