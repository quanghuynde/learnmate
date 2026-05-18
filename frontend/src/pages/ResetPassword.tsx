import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

interface ResetPasswordProps {
  token: string;
  onComplete: () => void;
}

export function ResetPassword({ token, onComplete }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-bg flex items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-light/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[100px]" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <img src="/pasted-image.jpg" alt="LEARNMATE Logo" className="h-20 mx-auto mb-4 object-contain mix-blend-multiply" />
          <h2 className="text-2xl font-bold text-text-primary">Đặt lại mật khẩu</h2>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-8 rounded-3xl shadow-xl border border-slate-100">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Thành công!</h3>
              <p className="text-slate-500">Mật khẩu của bạn đã được cập nhật. Đang chuyển hướng về trang đăng nhập...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-bg border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-bg border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-light text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all mt-6 disabled:opacity-60">
                {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                <ArrowRight size={18} />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
