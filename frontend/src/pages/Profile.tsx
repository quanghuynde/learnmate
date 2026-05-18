import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Shield,
  Download,
  LogOut,
  Edit2,
  Plus,
  Clock,
  BookOpen,
  ChevronRight,
  Target,
  X,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { api, UserItem } from '../lib/api';

interface ProfileProps {
  onLogout: () => void;
  token: string;
  user: UserItem | null;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Profile({ onLogout, token, user: propUser }: ProfileProps) {
  const [user, setUser] = useState<UserItem | null>(propUser);
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<'info' | 'preferences' | 'logout' | 'feature' | null>(null);
  
  // States for Editing Info
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');

  // States for Editing Preferences
  const [prefTime, setPrefTime] = useState('');
  const [prefGoal, setPrefGoal] = useState(3);
  const [prefDifficulty, setPrefDifficulty] = useState('');
  const [prefNotif, setPrefNotif] = useState('');

  const [message, setMessage] = useState({ text: '', type: 'success' });

  useEffect(() => {
    refreshUser();
  }, [token]);

  useEffect(() => {
    if (propUser) {
      setUser(propUser);
      resetEditStates(propUser);
    }
  }, [propUser]);

  const refreshUser = async () => {
    try {
      const res = await api.getMe(token);
      setUser(res.user);
      resetEditStates(res.user);
    } catch (err) {
      console.error(err);
    }
  };

  const resetEditStates = (u: UserItem) => {
    setEditName(u.name);
    setEditGoal(u.studyGoal || '');
    setEditSubjects(u.subjects || []);
    setPrefTime(u.preferences?.studyTime || 'Buổi sáng (6h - 12h)');
    setPrefGoal(u.preferences?.dailyGoal || 3);
    setPrefDifficulty(u.preferences?.quizDifficulty || 'Thích ứng');
    setPrefNotif(u.preferences?.notificationType || 'Nhắc nhở thông minh');
  };

  const handleUpdateInfo = async () => {
    setLoading(true);
    try {
      const res = await api.updateProfile(token, {
        name: editName,
        studyGoal: editGoal,
        subjects: editSubjects,
      });
      setUser(res.user);
      setActiveModal(null);
      showToast('Cập nhật thông tin thành công');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi cập nhật', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    setLoading(true);
    try {
      const res = await api.updateProfile(token, {
        preferences: {
          studyTime: prefTime,
          dailyGoal: prefGoal,
          quizDifficulty: prefDifficulty,
          notificationType: prefNotif,
        },
      });
      setUser(res.user);
      setActiveModal(null);
      showToast('Cập nhật tùy chọn thành công');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi cập nhật', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: 'success' }), 3000);
  };

  const addSubject = () => {
    if (newSubject.trim() && !editSubjects.includes(newSubject.trim())) {
      setEditSubjects([...editSubjects, newSubject.trim()]);
      setNewSubject('');
    }
  };

  const removeSubject = (s: string) => {
    setEditSubjects(editSubjects.filter((item) => item !== s));
  };

  const handleExportData = () => {
    if (!user) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `learnmate_data_${user.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast('Đang xuất dữ liệu...');
  };

  const initials = user?.name ? getInitials(user.name) : '?';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 relative">
      {/* Toast Message */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg z-[100] flex items-center gap-2 text-white font-medium ${
              message.type === 'success' ? 'bg-success' : 'bg-danger'
            }`}
          >
            {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Profile Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6 items-center md:items-start relative">
        <div className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold flex-shrink-0 shadow-md">
          {initials}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{user?.name || 'Người dùng'}</h1>
          <p className="text-slate-500 text-sm mb-3">
            {user?.studyGoal || 'Học viên LearnMate'} • {user?.subjects?.join(', ') || 'Chưa thêm môn học'}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              ✉️ {user?.email}
            </span>
            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              🔥 Level {user?.level} • {user?.xp} XP
            </span>
          </div>
        </div>
        <button 
          onClick={() => setActiveModal('info')}
          className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Edit2 size={14} /> Chỉnh sửa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: My Courses - Only show real subjects from user data */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <BookOpen size={18} className="text-primary" /> Khóa học của tôi
            </h2>
            <button 
              onClick={() => setActiveModal('info')}
              className="text-sm font-medium text-primary flex items-center gap-1 hover:text-primary-light transition-colors"
            >
              <Plus size={16} /> Quản lý môn học
            </button>
          </div>

          <div className="space-y-3">
            {user?.subjects && user.subjects.length > 0 ? (
              user.subjects.map((sub, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-100 hover:border-primary/30 transition-colors flex justify-between items-center group cursor-pointer">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">{sub}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} /> Cập nhật gần đây
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg group-hover:bg-blue-100 transition-colors">
                    Đang học
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Chưa có khóa học nào. Hãy thêm ở phần Chỉnh sửa.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Learning Preferences */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Target size={18} className="text-primary" /> Tùy chọn học tập
            </h2>
            <button 
              onClick={() => setActiveModal('preferences')}
              className="text-sm font-medium text-primary hover:text-primary-light transition-colors"
            >
              Sửa
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <span className="text-sm text-slate-600">Thời gian học ưa thích</span>
              <span className="text-sm font-bold text-slate-900">{user?.preferences?.studyTime || 'Chưa thiết lập'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <span className="text-sm text-slate-600">Mục tiêu học hàng ngày</span>
              <span className="text-sm font-bold text-slate-900">{user?.preferences?.dailyGoal || 0} Giờ</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <span className="text-sm text-slate-600">Độ khó Quiz</span>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                {user?.preferences?.quizDifficulty || 'Thích ứng'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Thông báo</span>
              <span className="text-sm font-bold text-slate-900">{user?.preferences?.notificationType || 'Mặc định'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Settings List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-100">
          <button 
            onClick={() => setActiveModal('feature')}
            className="w-full p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Bell size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 text-sm">Cài đặt thông báo</h4>
              <p className="text-xs text-slate-500">Quản lý email và thông báo đẩy</p>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600" />
          </button>

          <button 
            onClick={() => setActiveModal('feature')}
            className="w-full p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <Shield size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 text-sm">Quyền riêng tư & Bảo mật</h4>
              <p className="text-xs text-slate-500">Mật khẩu, xác thực 2 bước và chia sẻ dữ liệu</p>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600" />
          </button>

          <button 
            onClick={handleExportData}
            className="w-full p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Download size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 text-sm">Xuất dữ liệu</h4>
              <p className="text-xs text-slate-500">Tải lịch sử học tập và ghi chú (.json)</p>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600" />
          </button>

          <button
            onClick={() => setActiveModal('logout')}
            className="w-full p-5 flex items-center gap-4 hover:bg-red-50 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-100 transition-colors">
              <LogOut size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-red-600 text-sm">Đăng xuất</h4>
              <p className="text-xs text-red-400">Đăng xuất khỏi tài khoản</p>
            </div>
          </button>
        </div>
      </div>

      {/* Modal Components */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setActiveModal(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-[120] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">
                  {activeModal === 'info' && 'Chỉnh sửa thông tin'}
                  {activeModal === 'preferences' && 'Tùy chọn học tập'}
                  {activeModal === 'logout' && 'Xác nhận đăng xuất'}
                  {activeModal === 'feature' && 'Thông báo'}
                </h3>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {activeModal === 'info' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 text-left">Họ và tên</label>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full p-3 bg-bg border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 text-left">Mục tiêu / Trường học</label>
                      <input 
                        type="text" 
                        value={editGoal} 
                        onChange={(e) => setEditGoal(e.target.value)}
                        className="w-full p-3 bg-bg border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        placeholder="VD: Đại học Bách Khoa"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 text-left">Môn học đang theo đuổi</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {editSubjects.map((s, i) => (
                          <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg">
                            {s} <X size={12} className="cursor-pointer" onClick={() => removeSubject(s)} />
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newSubject} 
                          onChange={(e) => setNewSubject(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                          className="flex-1 p-3 bg-bg border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                          placeholder="Thêm môn học mới..."
                        />
                        <button onClick={addSubject} className="p-3 bg-primary text-white rounded-xl hover:bg-primary-light transition-colors">
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === 'preferences' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 text-left">Thời gian học ưa thích</label>
                      <select 
                        value={prefTime} 
                        onChange={(e) => setPrefTime(e.target.value)}
                        className="w-full p-3 bg-bg border border-slate-200 rounded-xl outline-none"
                      >
                        <option>Buổi sáng (6h - 12h)</option>
                        <option>Buổi chiều (13h - 18h)</option>
                        <option>Buổi tối (19h - 24h)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 text-left">Mục tiêu học (Giờ/Ngày)</label>
                      <input 
                        type="number" 
                        value={prefGoal} 
                        onChange={(e) => setPrefGoal(Number(e.target.value))}
                        className="w-full p-3 bg-bg border border-slate-200 rounded-xl outline-none"
                        min="1" max="24"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 text-left">Độ khó Quiz</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Thích ứng', 'Dễ', 'Trung bình', 'Khó'].map((d) => (
                          <button 
                            key={d}
                            onClick={() => setPrefDifficulty(d)}
                            className={`p-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                              prefDifficulty === d ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-500'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === 'logout' && (
                  <div className="text-center py-4">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LogOut size={40} />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">Bạn chắc chắn muốn đăng xuất?</h4>
                    <p className="text-slate-500">Mọi phiên làm việc hiện tại sẽ kết thúc.</p>
                  </div>
                )}

                {activeModal === 'feature' && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info size={32} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">Tính năng đang phát triển</h4>
                    <p className="text-slate-500 text-sm">Chức năng này sẽ sớm có mặt trong các phiên bản cập nhật tiếp theo. Cảm ơn bạn đã quan tâm!</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Đóng
                </button>
                {activeModal === 'info' && (
                  <button 
                    onClick={handleUpdateInfo}
                    disabled={loading}
                    className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-light transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                )}
                {activeModal === 'preferences' && (
                  <button 
                    onClick={handleUpdatePreferences}
                    disabled={loading}
                    className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-light transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                )}
                {activeModal === 'logout' && (
                  <button 
                    onClick={onLogout}
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    Đăng xuất ngay
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
