import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { api, UserItem } from '../lib/api';

interface AuthProps {
  onLogin: (token: string, user?: UserItem) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (mode === 'forgot') {
      try {
        const res = await api.forgotPassword(email);
        setSuccess(res.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể gửi email khôi phục');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      if (mode === 'login') {
        const response = await api.login({ email, password });
        onLogin(response.token, response.user);
      } else {
        const response = await api.register({ name, email, password });
        onLogin(response.token, response.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      setError('');
      if (credentialResponse.credential) {
        const result = await api.googleLogin(credentialResponse.credential);
        onLogin(result.token, result.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại');
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
          <p className="text-slate-500 font-medium">Trợ lý học tập thông minh AI</p>
        </div>

        <motion.div layout className="bg-card p-8 rounded-3xl shadow-xl border border-slate-100">
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
                {mode === 'login' ? 'Chào mừng trở lại' : mode === 'register' ? 'Tạo tài khoản mới' : 'Khôi phục mật khẩu'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-bg border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="Nguyễn Văn A" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-bg border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="ban@email.com" />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
                      {mode === 'login' && (
                        <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary-light hover:underline font-medium">
                          Quên mật khẩu?
                        </button>
                      )}
                    </div>
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
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-xl">{success}</p>}

                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-light text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all mt-6 disabled:opacity-60">
                  {mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Đăng ký' : 'Gửi link khôi phục'}
                  {loading ? '...' : ''}
                  <ArrowRight size={18} />
                </button>
              </form>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-xs text-slate-400">Hoặc</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
              
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Đăng nhập Google thất bại')}
                  useOneTap
                  theme="outline"
                  size="large"
                  shape="pill"
                  width="380"
                />
              </div>

              <div className="mt-6 text-center text-sm text-slate-500">
                {mode === 'login' ? (
                  <p>
                    Chưa có tài khoản?{' '}
                    <button onClick={() => setMode('register')} className="text-primary-light font-semibold hover:underline">
                      Đăng ký ngay
                    </button>
                  </p>
                ) : (
                  <p>
                    Đã có tài khoản?{' '}
                    <button onClick={() => setMode('login')} className="text-primary-light font-semibold hover:underline">
                      Đăng nhập
                    </button>
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
