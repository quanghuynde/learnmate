import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AICompanion } from './components/ui/AICompanion';
import { googleLogout } from '@react-oauth/google';
import { Auth } from './pages/Auth';
import { api, UserItem } from './lib/api';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const StudyPlanner = lazy(() => import('./pages/StudyPlanner').then(m => ({ default: m.StudyPlanner })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const KnowledgeMap = lazy(() => import('./pages/KnowledgeMap').then(m => ({ default: m.KnowledgeMap })));
const Quiz = lazy(() => import('./pages/Quiz').then(m => ({ default: m.Quiz })));
const ExamReadiness = lazy(() => import('./pages/ExamReadiness').then(m => ({ default: m.ExamReadiness })));
const Progress = lazy(() => import('./pages/Progress').then(m => ({ default: m.Progress })));
const Community = lazy(() => import('./pages/Community').then(m => ({ default: m.Community })));
const AIDialogue = lazy(() => import('./pages/AIDialogue').then(m => ({ default: m.AIDialogue })));
const HybridMentoring = lazy(() => import('./pages/HybridMentoring').then(m => ({ default: m.HybridMentoring })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Gamification = lazy(() => import('./pages/Gamification').then(m => ({ default: m.Gamification })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));

const LoadingPage = () => (
  <div className="h-full w-full flex items-center justify-center p-20 text-slate-400">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-sm font-medium">Đang tải trang...</p>
    </div>
  </div>
);

export function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('learnmate_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(token));
  const [checkingAuth, setCheckingAuth] = useState(Boolean(token));
  const [currentPage, setCurrentPage] = useState(() => sessionStorage.getItem('learnmate_current_page') || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    sessionStorage.setItem('learnmate_current_page', currentPage);
  }, [currentPage]);
  const [user, setUser] = useState<UserItem | null>(null);

  // Simple routing for reset password
  const path = window.location.pathname;
  const isResetPath = path.startsWith('/reset-password/');
  const resetToken = isResetPath ? path.split('/').pop() || '' : '';

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
        return <KnowledgeMap />;
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
      case 'mentor':
        return <HybridMentoring />;
      case 'profile':
        return <Profile token={token} user={user} onLogout={handleLogout} />;
      case 'gamification':
        return <Gamification token={token} />;
      case 'pricing':
        return <Pricing setCurrentPage={setCurrentPage} />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} token={token} user={user} />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-bg overflow-hidden font-sans text-text-primary">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        user={user}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="relative z-[50]">
          <TopBar token={token} user={user} />
        </div>
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8 relative z-0">
          <AnimatePresence mode="wait">
            <motion.div key={currentPage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="h-full max-w-7xl mx-auto">
              <Suspense fallback={<LoadingPage />}>
                {renderPage()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AICompanion />
    </div>
  );
}
