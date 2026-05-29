import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { api, UserItem } from '../lib/api';
import lmLogo from '../assest/lmLogo.jpg';

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
  
  // 2FA states
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

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
        if (response.requires2FA && response.tempToken) {
          setTempToken(response.tempToken);
          setRequires2FA(true);
          return;
        }
        if (response.token) {
          onLogin(response.token, response.user);
        }
      } else {
        const response = await api.register({ name, email, password });
        if (response.token) {
          onLogin(response.token, response.user);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.verify2FALogin(tempToken, otpCode);
      if (response.token) {
        onLogin(response.token, response.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xác thực OTP thất bại');
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
        if (result.requires2FA && result.tempToken) {
          setTempToken(result.tempToken);
          setRequires2FA(true);
          return;
        }
        if (result.token) {
          onLogin(result.token, result.user);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans bg-white overflow-hidden relative">
      {/* Left Section: Visuals */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative overflow-hidden flex-col items-center justify-center p-12 bg-gradient-to-br from-[#1565c0] via-[#1e88e5] to-[#42a5f5] text-white">
        {/* Animated Background Waves */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
          <svg className="absolute bottom-0 left-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
            <path fill="#ffffff" fillOpacity="0.2" d="M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,112C672,107,768,149,864,154.7C960,160,1056,128,1152,112C1248,96,1344,96,1392,96L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
          <svg className="absolute bottom-10 left-0 w-full h-full opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
            <path fill="#ffffff" fillOpacity="0.1" d="M0,64L48,80C96,96,192,128,288,122.7C384,117,480,75,576,85.3C672,96,768,160,864,186.7C960,213,1056,203,1152,181.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
        
        {/* Animated Particles */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full opacity-20 animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 6}px`,
                height: `${Math.random() * 6}px`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center flex flex-col items-center"
        >
          {/* Circular Logo */}
          <div className="w-64 h-64 lg:w-80 lg:h-80 mb-10 relative group">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-all duration-500" />
            <img 
              src={lmLogo} 
              alt="Learnmate Logo" 
              className="w-full h-full object-cover rounded-full shadow-[0_0_50px_rgba(255,255,255,0.3)] border-4 border-white/20 relative z-10" 
            />
          </div>

          <h1 className="text-4xl lg:text-6xl font-bold mb-4 text-white tracking-tight font-outfit drop-shadow-md">Chào mừng bạn</h1>
          <p className="text-lg lg:text-2xl text-white/90 font-medium font-outfit max-w-sm mx-auto leading-relaxed drop-shadow-sm">
            Khám phá tri thức mới và bứt phá giới hạn cùng <span className="text-white font-extrabold underline decoration-white/30 underline-offset-8">Learnmate</span>
          </p>
        </motion.div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-bold tracking-[0.4em] uppercase font-outfit">
          WWW.LEARNMATE.COM
        </div>
      </div>

      {/* Right Section: Form Container */}
      <div className="w-full md:w-7/12 lg:w-1/2 min-h-screen flex items-center justify-center p-6 md:p-12 lg:p-16 relative z-10 bg-white">
        <motion.div 
          layout
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md bg-white p-8 md:p-10 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-100"
        >
          <div className="mb-10 text-center">
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2 font-outfit">{getGreeting()}</h3>
            <h2 className="text-[#1565c0] text-3xl font-bold mb-3 font-outfit tracking-tight">
              {mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Đăng ký' : 'Khôi phục'}
            </h2>
            <div className="h-1.5 w-14 bg-gradient-to-r from-[#1565c0]/40 to-[#42a5f5]/40 mx-auto rounded-full" />
          </div>

          <form onSubmit={requires2FA ? handleVerifyOTP : handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {requires2FA ? (
                <motion.div
                  key="otp-fields"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield size={32} />
                    </div>
                    <h4 className="font-bold text-slate-800">Xác thực 2 bước</h4>
                    <p className="text-xs text-slate-500">Vui lòng nhập mã OTP 6 số từ ứng dụng xác thực của bạn để tiếp tục.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-700 ml-1 font-outfit">Mã OTP</label>
                    <div className="relative group">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1565c0] transition-colors" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#1565c0]/10 focus:border-[#1565c0] transition-all text-center text-xl font-bold tracking-[0.5em]"
                        placeholder="000000"
                        autoFocus
                      />
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="w-full bg-primary text-white py-4 rounded-2xl shadow-xl shadow-primary/25 font-bold uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 font-outfit"
                  >
                    {loading ? 'Đang xác thực...' : 'Xác nhận OTP'}
                    {!loading && <ArrowRight size={18} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRequires2FA(false);
                      setOtpCode('');
                      setTempToken('');
                    }}
                    className="w-full py-2 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
                  >
                    Quay lại Đăng nhập
                  </button>
                </motion.div>
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    {mode === 'register' && (
                      <motion.div
                        key="name-field"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5"
                      >
                        <label className="block text-sm font-bold text-slate-700 ml-1 font-outfit">Họ và tên</label>
                        <div className="relative group">
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1565c0] transition-colors" />
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#1565c0]/10 focus:border-[#1565c0] transition-all text-sm font-medium"
                            placeholder="Nhập tên của bạn..."
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-700 ml-1 font-outfit">Địa chỉ Email</label>
                    <div className="relative group">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1565c0] transition-colors" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#1565c0]/10 focus:border-[#1565c0] transition-all text-sm font-medium"
                        placeholder="name@email.com"
                      />
                    </div>
                  </div>

                  {mode !== 'forgot' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-sm font-bold text-slate-700 ml-1 font-outfit">Mật khẩu</label>
                        {mode === 'login' && (
                          <button 
                            type="button" 
                            onClick={() => setMode('forgot')} 
                            className="text-xs text-[#1565c0] hover:underline font-bold font-outfit"
                          >
                            Quên mật khẩu?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1565c0] transition-colors" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#1565c0]/10 focus:border-[#1565c0] transition-all text-sm font-medium"
                          placeholder="••••••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)} 
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#1565c0] transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
                  {success && <p className="text-xs text-green-600 font-bold bg-green-50 p-4 rounded-xl border border-green-100">{success}</p>}

                  {mode === 'login' && (
                    <div className="flex items-center gap-2 py-1">
                      <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-[#1565c0] focus:ring-[#1565c0]/20 cursor-pointer" />
                      <label htmlFor="remember" className="text-xs text-slate-500 font-bold cursor-pointer select-none font-outfit">Ghi nhớ đăng nhập</label>
                    </div>
                  )}

                  <div className="pt-4 space-y-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-[#1565c0] to-[#1e88e5] text-white py-4 rounded-2xl shadow-xl shadow-[#1565c0]/25 font-bold uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 font-outfit"
                    >
                      {loading ? 'Đang xử lý...' : mode === 'login' ? 'Tiếp tục' : mode === 'register' ? 'Đăng ký' : 'Khôi phục'}
                      {!loading && <ArrowRight size={18} />}
                    </button>

                    <div className="flex items-center gap-4">
                      <div className="h-px bg-slate-100 flex-1" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] font-outfit">Hoặc kết nối</span>
                      <div className="h-px bg-slate-100 flex-1" />
                    </div>
                    
                    <div className="flex justify-center -mt-2">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => {
                          setError('Đăng nhập Google thất bại. Nếu bạn thấy lỗi "Origin not allowed" trong Console, vui lòng kiểm tra lại cấu hình Client ID trong Google Cloud Console.');
                        }}
                        theme="outline"
                        size="large"
                        shape="pill"
                        width="100%"
                      />
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode(mode === 'login' ? 'register' : 'login');
                          setError('');
                          setSuccess('');
                        }}
                        className="text-sm font-bold text-slate-400 hover:text-[#1565c0] transition-colors font-outfit"
                      >
                        {mode === 'login' ? (
                          <>Chưa có tài khoản? <span className="text-[#1565c0] underline decoration-2 underline-offset-4">Đăng ký ngay</span></>
                        ) : (
                          <>Đã có tài khoản? <span className="text-[#1565c0] underline decoration-2 underline-offset-4">Đăng nhập</span></>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </AnimatePresence>
          </form>
        </motion.div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.02); }
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
        .font-outfit {
          font-family: 'Outfit', sans-serif;
        }
      `}</style>
    </div>
  );
}
