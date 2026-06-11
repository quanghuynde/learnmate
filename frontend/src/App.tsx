import { lazy, Suspense, useEffect, useState, Component, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AICompanion } from './components/ui/AICompanion';
import { googleLogout } from '@react-oauth/google';
import { Auth } from './pages/Auth';
import { api, UserItem } from './lib/api';
import { NotificationProvider } from './components/ui/Notification';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const StudyPlanner = lazy(() => import('./pages/StudyPlanner').then(m => ({ default: m.StudyPlanner })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const KnowledgeMap = lazy(() => import('./pages/KnowledgeMap').then(m => ({ default: m.KnowledgeMap })));
const Quiz = lazy(() => import('./pages/Quiz').then(m => ({ default: m.Quiz })));
const ExamReadiness = lazy(() => import('./pages/ExamReadiness').then(m => ({ default: m.ExamReadiness })));
const Progress = lazy(() => import('./pages/Progress').then(m => ({ default: m.Progress })));
const Community = lazy(() => import('./pages/Community').then(m => ({ default: m.Community })));
const AIDialogue = lazy(() => import('./pages/AIDialogue').then(m => ({ default: m.AIDialogue })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Gamification = lazy(() => import('./pages/Gamification').then(m => ({ default: m.Gamification })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const PaymentResult = lazy(() => import('./pages/PaymentResult').then(m => ({ default: m.PaymentResult })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const TransactionHistory = lazy(() => import('./pages/TransactionHistory').then(m => ({ default: m.TransactionHistory })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

const LoadingPage = () => (
  <div className="h-full w-full flex items-center justify-center p-20 text-slate-400">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-sm font-medium">Đang tải trang...</p>
    </div>
  </div>
);

// Fallback for page errors
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="h-full w-full flex items-center justify-center p-10 bg-red-50 rounded-3xl border border-red-100">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Đã có lỗi xảy ra khi tải trang</h2>
      <p className="text-sm text-slate-600 mb-6">{error.message || 'Vui lòng thử tải lại trang hoặc nhấn nút bên dưới.'}</p>
      <button 
        onClick={() => {
          resetErrorBoundary();
          window.location.reload();
        }}
        className="px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-light transition-colors"
      >
        Tải lại trang
      </button>
    </div>
  </div>
);



// Custom Error Boundary Class
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} resetErrorBoundary={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}

// Global error handler for ChunkLoadError (common in production)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.message?.includes('Loading chunk') || e.message?.includes('CSS chunk')) {
      console.warn('Chunk load error detected, reloading page...');
      window.location.reload();
    }
  }, true);
}


export function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('learnmate_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(token));
  const [checkingAuth, setCheckingAuth] = useState(Boolean(token));
  const [currentPage, setCurrentPage] = useState(() => sessionStorage.getItem('learnmate_current_page') || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('learnmate_current_page', currentPage);
    setIsMobileMenuOpen(false); // Close mobile menu on page change
  }, [currentPage]);
  const [user, setUser] = useState<UserItem | null>(null);

  // Simple routing for reset password
  const path = window.location.pathname;
  const isResetPath = path.startsWith('/reset-password/');
  const isPaymentResultPath = path.startsWith('/payment-result');
  const resetToken = isResetPath ? path.split('/').pop() || '' : '';

  useEffect(() => {
    if (isPaymentResultPath && currentPage !== 'payment-result') {
      setCurrentPage('payment-result');
    }
  }, [isPaymentResultPath]);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const res = await api.getMe(token);
        setUser(res.user);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('learnmate_token');
        setToken('');
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    };
    validateToken();
  }, [token]);

  if (checkingAuth) return <div className="min-h-screen flex items-center justify-center text-slate-500">Đang kiểm tra đăng nhập...</div>;

  if (!isAuthenticated) {
    if (isResetPath && resetToken) {
      return (
        <ResetPassword
          token={resetToken}
          onComplete={() => {
            window.history.pushState({}, '', '/');
            window.location.reload();
          }}
        />
      );
    }

    return (
      <Auth
        onLogin={(nextToken, nextUser) => {
          localStorage.setItem('learnmate_token', nextToken);
          setToken(nextToken);
          setUser(nextUser ?? null);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  const handleLogout = () => {
    googleLogout();
    localStorage.removeItem('learnmate_token');
    sessionStorage.removeItem('learnmate_current_page');
    setToken('');
    setUser(null);
    setCurrentPage('dashboard');
    setIsAuthenticated(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setCurrentPage={setCurrentPage} token={token} user={user} />;
      case 'planner':
        return <StudyPlanner token={token} />;
      case 'documents':
        return <Documents token={token} />;
      case 'knowledge':
        return <KnowledgeMap token={token} user={user} />;
      case 'quiz':
        return <Quiz token={token} setCurrentPage={setCurrentPage} />;
      case 'readiness':
        return <ExamReadiness token={token} />;
      case 'progress':
        return <Progress token={token} />;
case 'community':
         return <Community token={token} user={user} />;
      case 'video':
        return <AIDialogue token={token} />;
      case 'profile':
        return <Profile token={token} user={user} onLogout={handleLogout} />;
      case 'gamification':
        return <Gamification token={token} />;
      case 'pricing':
        return <Pricing setCurrentPage={setCurrentPage} />;
      case 'payment-result':
        return <PaymentResult setCurrentPage={setCurrentPage} />;
      case 'history':
        return <TransactionHistory />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} token={token} user={user} />;
    }
  };

  return (
    <NotificationProvider>
      <div className="flex h-screen w-full bg-bg overflow-hidden font-sans text-text-primary relative">
        {/* Sidebar for Desktop */}
        {!isMobile && (
          <Sidebar
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            user={user}
          />
        )}

        {/* Mobile Sidebar/Drawer Overlay */}
        <AnimatePresence>
          {isMobile && isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-[280px] bg-sidebar z-[70] shadow-2xl"
              >
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src="/lmLogo.png" alt="Logo" className="w-8 h-8 rounded-full" />
                      <span className="font-bold text-white">LEARNMATE</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto py-4">
                    <Sidebar
                      isOpen={true}
                      setIsOpen={() => {}}
                      currentPage={currentPage}
                      setCurrentPage={setCurrentPage}
                      user={user}
                      mobileMode={true}
                    />
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="relative z-[50]">
            <TopBar 
              token={token} 
              user={user} 
              setCurrentPage={setCurrentPage} 
              onMenuClick={() => setIsMobileMenuOpen(true)} 
            />
          </div>
          <main className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-6 lg:p-8 relative z-0">
            <AnimatePresence mode="wait">
              <motion.div key={currentPage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="h-full max-w-7xl mx-auto">
                <ErrorBoundary>
                  <Suspense fallback={<LoadingPage />}>
                    {renderPage()}
                  </Suspense>
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        {!isMobile && <AICompanion token={token} currentPage={currentPage} />}
      </div>
    </NotificationProvider>
  );
}
