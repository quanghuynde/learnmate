import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AICompanion } from './components/ui/AICompanion';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { StudyPlanner } from './pages/StudyPlanner';
import { Documents } from './pages/Documents';
import { KnowledgeMap } from './pages/KnowledgeMap';
import { Quiz } from './pages/Quiz';
import { ExamReadiness } from './pages/ExamReadiness';
import { Progress } from './pages/Progress';
import { Community } from './pages/Community';
import { AIDialogue } from './pages/AIDialogue';
import { HybridMentoring } from './pages/HybridMentoring';
import { Profile } from './pages/Profile';
import { Gamification } from './pages/Gamification';
import { Pricing } from './pages/Pricing';
import { ResetPassword } from './pages/ResetPassword';
import { api, UserItem } from './lib/api';

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
    localStorage.removeItem('learnmate_token');
    setToken('');
    setUser(null);
    setIsAuthenticated(false);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setCurrentPage={setCurrentPage} token={token} />;
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
        return <Community />;
      case 'video':
        return <AIDialogue token={token} />;
      case 'mentor':
        return <HybridMentoring />;
      case 'profile':
        return <Profile token={token} user={user} onLogout={handleLogout} />;
      case 'gamification':
        return <Gamification />;
      case 'pricing':
        return <Pricing setCurrentPage={setCurrentPage} />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} token={token} />;
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
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AICompanion />
    </div>
  );
}
