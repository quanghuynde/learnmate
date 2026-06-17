import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Home,
  Trophy,
  Sparkles,
  File,
  Presentation,
  Loader2,
  Trash2,
  ChevronRight,
  ClipboardList,
  Target,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api, QuizItem, DocumentItem, UserItem } from '../lib/api';

interface QuizProps {
  token: string;
  user: UserItem | null;
  setCurrentPage?: (page: string) => void;
  refreshUser?: () => Promise<void>;
}

interface LocalQuizHistory {
  id: string;
  title: string;
  date: string;
  score: number;
  total: number;
  format: string;
  questions: QuizItem['questions'];
  pickedAnswers: number[];
  essayAnswers: string[];
}

interface QuizState {
  step: 'setup' | 'playing' | 'result';
  selectedDocIds: string[];
  numQuestions: number;
  format: 'Trắc nghiệm' | 'Đúng/Sai' | 'Tự luận';
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  activeQuestions: QuizItem['questions'];
  activeQuizId: string | null;
  currentQ: number;
  score: number;
  pickedAnswers: number[];
  essayAnswers: string[];
}

function getFileIcon(type: string) {
  if (type === 'pdf') return <FileText size={16} className="text-red-500" />;
  if (type === 'docx') return <File size={16} className="text-blue-500" />;
  if (type === 'pptx') return <Presentation size={16} className="text-orange-500" />;
  return <FileText size={16} className="text-slate-400" />;
}



export function Quiz({ token, user, setCurrentPage }: QuizProps) {
  const userId = user?.id || 'guest';
  const HISTORY_KEY = `learnmate_local_quiz_history_${userId}`;
  const STATE_KEY = `learnmate_quiz_state_${userId}`;

  // Recover state from localStorage
  const savedState = useMemo<QuizState | null>(() => {
    try {
      const saved = localStorage.getItem(STATE_KEY);
      return saved ? (JSON.parse(saved) as QuizState) : null;
    } catch {
      return null;
    }
  }, [STATE_KEY]);

  const [step, setStep] = useState<'setup' | 'playing' | 'result'>(savedState?.step || 'setup');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(savedState?.selectedDocIds || []);
  const [numQuestions, setNumQuestions] = useState<number>(savedState?.numQuestions || 5);
  const [format, setFormat] = useState<'Trắc nghiệm' | 'Đúng/Sai' | 'Tự luận'>(savedState?.format || 'Trắc nghiệm');
  const [difficulty, setDifficulty] = useState<'Dễ' | 'Trung bình' | 'Khó'>(savedState?.difficulty || 'Trung bình');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // Active quiz session state
  const [activeQuestions, setActiveQuestions] = useState<QuizItem['questions']>(savedState?.activeQuestions || []);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(savedState?.activeQuizId || null);
  const activeQuizIdRef = useRef<string | null>(savedState?.activeQuizId || null);

  const [currentQ, setCurrentQ] = useState<number>(savedState?.currentQ || 0);
  const [score, setScore] = useState<number>(savedState?.score || 0);
  const [pickedAnswers, setPickedAnswers] = useState<number[]>(savedState?.pickedAnswers || []);
  const [essayAnswers, setEssayAnswers] = useState<string[]>(savedState?.essayAnswers || []);

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(() => {
    if (savedState && savedState.pickedAnswers && savedState.currentQ !== undefined) {
      return savedState.pickedAnswers[savedState.currentQ] ?? null;
    }
    return null;
  });
  const [isAnswered, setIsAnswered] = useState(selectedAnswer !== null);
  const [generating, setGenerating] = useState(false);
  const [localHistory, setLocalHistory] = useState<LocalQuizHistory[]>(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(localHistory));
  }, [localHistory, HISTORY_KEY]);

  // Sync state to localStorage
  useEffect(() => {
    if (step === 'setup') {
      localStorage.removeItem(STATE_KEY);
    } else {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        step, selectedDocIds, numQuestions, format, difficulty, activeQuestions, activeQuizId, currentQ, score, pickedAnswers, essayAnswers, isReviewing
      }));
    }
  }, [step, selectedDocIds, numQuestions, format, difficulty, activeQuestions, activeQuizId, currentQ, score, pickedAnswers, essayAnswers, isReviewing, STATE_KEY]);

  // Documents list (for dropdown)
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const [history, setHistory] = useState<Array<{ percentage: number; createdAt: string }>>([]);

  useEffect(() => {
    // Load documents & history in parallel
    const loadData = async () => {
      try {
        const [docRes, hRes] = await Promise.all([
          api.getDocuments(token),
          api.getQuizHistory(token),
        ]);
        setDocuments(docRes.documents || []);
        setHistory(hRes.results || []);
      } catch {
        // silently fail
      } finally {
        setDocsLoading(false);
      }
    };
    loadData();
  }, [token]);

  const selectedDocs = useMemo(
    () => documents.filter((d) => selectedDocIds.includes(d._id)),
    [documents, selectedDocIds]
  );



  const chartData = useMemo(() => {
    // Combine backend history and local history, sort by date
    const combined = [
      ...history.map(h => ({ score: h.percentage, date: h.createdAt })),
      ...localHistory.map(l => ({ score: Math.round((l.score / l.total) * 100), date: l.date }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return combined.slice(-5).map((h, i) => ({ name: `Lần ${i + 1}`, score: h.score }));
  }, [history, localHistory]);

  const currentQuestion = activeQuestions[currentQ];

  const handleStartQuiz = async () => {
    if (selectedDocs.length === 0) return;
    executeQuizGeneration();
  };

  const executeQuizGeneration = async () => {
    if (selectedDocs.length === 0) return;

    setGenerating(true);
    try {
      const data = await api.generateQuiz(token, {
        documentIds: selectedDocIds,
        format,
        numQuestions,
        difficulty,
      });

      let textResponse: string = data.text || '';

      if (!textResponse) throw new Error('AI trả về nội dung rỗng.');

      textResponse = textResponse.trim();

      // Repair incomplete JSON helper
      const repairIncompleteJson = (jsonStr: string): string => {
        let str = jsonStr.trim();
        let openBraces = 0;
        let openBrackets = 0;
        let inString = false;
        let escape = false;
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          if (escape) { escape = false; continue; }
          if (char === '\\') { escape = true; continue; }
          if (char === '"') { inString = !inString; continue; }
          if (!inString) {
            if (char === '{') openBraces++;
            if (char === '}') openBraces--;
            if (char === '[') openBrackets++;
            if (char === ']') openBrackets--;
          }
        }
        if (inString) str += '"';
        for (let i = 0; i < openBraces; i++) str += '}';
        for (let i = 0; i < openBrackets; i++) str += ']';
        return str;
      };

      let cleanedText = textResponse.trim();
      if (cleanedText.startsWith('```')) {
        const firstLineEnd = cleanedText.indexOf('\n');
        if (firstLineEnd !== -1) cleanedText = cleanedText.slice(firstLineEnd + 1).trim();
        else cleanedText = cleanedText.replace(/^```[a-zA-Z]*/, '').trim();
      }
      if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3).trim();

      let parsedQuestions;
      try {
        // Try direct parse first
        let parsed = JSON.parse(cleanedText);
        parsedQuestions = extractQuestions(parsed);
      } catch (directErr) {
        // If fail, try repair
        try {
          const repairedText = repairIncompleteJson(cleanedText);
          let parsedRepaired = JSON.parse(repairedText);
          parsedQuestions = extractQuestions(parsedRepaired);
        } catch (repairErr) {
          throw new Error('Lỗi cú pháp JSON từ OpenAI: ' + cleanedText);
        }
      }

      function extractQuestions(obj: any) {
        if (Array.isArray(obj)) return obj;
        if (obj.questions && Array.isArray(obj.questions)) return obj.questions;
        
        // Handle single object (like in user report)
        if (obj.question && obj.options) {
          return [obj];
        }

        // Try to find any array property
        const firstKey = Object.keys(obj)[0];
        if (firstKey && Array.isArray(obj[firstKey])) {
          return obj[firstKey];
        }
        
        throw new Error('Cấu trúc JSON không chứa mảng câu hỏi.');
      }

      setActiveQuestions(parsedQuestions);
      
      try {
        const quizTitle = selectedDocs.map(d => d.name).join(', ').substring(0, 50) + (selectedDocs.length > 1 ? '...' : '');
        const quizRes = await api.createQuiz(token, {
          title: quizTitle,
          subject: quizTitle,
          document: selectedDocs[0]?._id, // Backwards map to first doc

          format: format,
          totalQuestions: parsedQuestions.length,
          questions: parsedQuestions
        });
        
        console.log('Quiz created successfully:', quizRes.quiz);
        // Ensure we handle both _id and id if applicable
        const qId = quizRes.quiz._id || (quizRes.quiz as any).id;
        activeQuizIdRef.current = qId;
        setActiveQuizId(qId);
      } catch (e) {
        console.error('Failed to persist quiz to database:', e);
        setActiveQuizId(null);
      }

      setStep('playing');
      setCurrentQ(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setPickedAnswers([]);
      setEssayAnswers([]);
    } catch (err: any) {
      console.error('API call failed:', err);
      alert(`Lỗi kết nối API: ${err.message || 'Không xác định'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (isAnswered || !currentQuestion) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    setPickedAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = index;
      return next;
    });
    if (index === currentQuestion.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const prevQuestion = () => {
    if (isReviewing) {
      setIsReviewing(false);
      return;
    }
    if (currentQ === 0) return;
    const prevIdx = currentQ - 1;
    setCurrentQ(prevIdx);
    const prevAnswer = pickedAnswers[prevIdx] ?? null;
    setSelectedAnswer(prevAnswer);
    setIsAnswered(prevAnswer !== null);
  };

  const handleSkipQuestion = () => {
    if (activeQuestions.length <= 1) return;
    
    const questions = [...activeQuestions];
    const current = questions[currentQ];
    
    // Move current question to the end
    questions.splice(currentQ, 1);
    questions.push(current);
    
    // Also need to adjust pickedAnswers and essayAnswers
    const nextPicked = [...pickedAnswers];
    const pickedVal = nextPicked[currentQ];
    nextPicked.splice(currentQ, 1);
    nextPicked.push(pickedVal);
    
    const nextEssay = [...essayAnswers];
    const essayVal = nextEssay[currentQ];
    nextEssay.splice(currentQ, 1);
    nextEssay.push(essayVal);
    
    setActiveQuestions(questions);
    setPickedAnswers(nextPicked);
    setEssayAnswers(nextEssay);
    
    // Stay on the same index, but content changed
    const newAnswer = nextPicked[currentQ] ?? null;
    setSelectedAnswer(newAnswer);
    setIsAnswered(newAnswer !== null);
  };

  const nextQuestion = async () => {
    if (currentQ < activeQuestions.length - 1) {
      setCurrentQ((c) => c + 1);
      // Restore state if the next question was already answered
      const nextIdx = currentQ + 1;
      const nextAnswer = pickedAnswers[nextIdx] ?? null;
      setSelectedAnswer(nextAnswer);
      setIsAnswered(nextAnswer !== null);
      return;
    }

    setIsReviewing(true);
  };

  const handleFinishQuiz = async () => {
    const answers = activeQuestions.map((_, idx) => ({
      questionIndex: idx,
      selectedAnswer: pickedAnswers[idx] ?? -1,
      essayAnswer: essayAnswers[idx] || '',
    }));

    // Submit to backend if we have a quiz ID
    if (activeQuizIdRef.current) {
      api.submitQuiz(token, activeQuizIdRef.current, answers).catch(() => null);
    }

    // ALWAYS Save to local history as fallback/instant view
    const finalScore = format === 'Tự luận' 
      ? answers.filter(a => a.selectedAnswer === 0).length 
      : answers.filter(a => activeQuestions[a.questionIndex].correctIndex === a.selectedAnswer).length;

    console.log('Saving quiz result to local history. Score:', finalScore);

    const historyItem: LocalQuizHistory = {
      id: `${activeQuizIdRef.current || 'local'}-${Date.now()}`,
      title: selectedDocs.map(d => d.name).join(', ').substring(0, 50) || 'Quiz',
      date: new Date().toISOString(),
      score: finalScore,
      total: activeQuestions.length,
      format,
      questions: [...activeQuestions],
      pickedAnswers: [...pickedAnswers],
      essayAnswers: [...essayAnswers]
    };

    setLocalHistory(prev => {
      const next = [historyItem, ...prev];
      console.log('Updated local history length:', next.length);
      return next;
    });

    setStep('result');
  };

  const unifiedHistory = useMemo(() => {
    // Map backend results to the same format as LocalQuizHistory
    const backendMapped = history.map(h => ({
      id: (h as any)._id,
      title: (h as any).quiz?.title || (h as any).quiz?.subject || 'Quiz',
      date: (h as any).createdAt,
      score: (h as any).score,
      total: (h as any).totalQuestions,
      format: (h as any).quiz?.format || 'Trắc nghiệm',
      questions: (h as any).quiz?.questions || [],
      pickedAnswers: (h as any).answers?.map((a: any) => a.selectedAnswer) || [],
      essayAnswers: (h as any).answers?.map((a: any) => a.essayAnswer) || [],
    }));

    // Combine and deduplicate if necessary, but here we just merge and sort
    const combined = [...localHistory];
    
    // Add backend items that aren't already in local (prevent duplicates if possible)
    backendMapped.forEach(b => {
      if (!combined.some(l => l.id === b.id)) {
        combined.push(b);
      }
    });

    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [localHistory, history]);

  const handleDeleteQuiz = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingQuizId(id);
  };

  const confirmDeleteQuiz = async (id: string) => {
    try {
      // 1. Delete from backend if possible
      if (!id.startsWith('local-')) {
        await api.deleteQuiz(token, id);
      }
      
      // 2. Delete from local state & storage
      setLocalHistory(prev => prev.filter(l => l.id !== id));
      setHistory(prev => prev.filter(h => (h as any)._id !== id && (h as any).id !== id));
      
      setDeletingQuizId(null);
    } catch (err: any) {
      console.error('Failed to delete quiz:', err);
      alert('Lỗi khi xóa quiz: ' + (err.message || 'Không xác định'));
    }
  };

  const resetQuiz = () => {
    sessionStorage.removeItem(STATE_KEY);
    setStep('setup');
    setScore(0);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setPickedAnswers([]);
    setActiveQuestions([]);
    setActiveQuizId(null);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-2 sm:px-4">
      <AnimatePresence mode="wait">
        {step === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col lg:flex-row gap-6"
          >
            {/* History Sidebar - Moved to top on mobile */}
            <div className="w-full lg:w-80 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden lg:h-[600px] max-h-[400px] lg:max-h-none order-1 lg:order-1">
              <button 
                className="lg:hidden p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-slate-900 font-bold w-full"
                onClick={() => setShowHistoryMobile(!showHistoryMobile)}
              >
                <div className="flex items-center gap-2">
                  <RotateCcw size={18} className="text-primary" /> Lịch sử Quiz
                </div>
                <ChevronRight size={18} className={`transition-transform duration-300 ${showHistoryMobile ? 'rotate-90' : ''}`} />
              </button>
              
              <div className="hidden lg:flex p-4 border-b border-slate-100 bg-slate-50/50 items-center gap-2 text-slate-900 font-bold">
                <RotateCcw size={18} className="text-primary" /> Lịch sử Quiz
              </div>

              <AnimatePresence>
                {(showHistoryMobile || window.innerWidth >= 1024) && (
                  <motion.div 
                    initial={window.innerWidth < 1024 ? { height: 0, opacity: 0 } : undefined}
                    animate={window.innerWidth < 1024 ? { height: 'auto', opacity: 1 } : undefined}
                    exit={window.innerWidth < 1024 ? { height: 0, opacity: 0 } : undefined}
                    className="flex-1 overflow-hidden flex flex-col"
                  >
                    <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 custom-scrollbar min-h-[200px]">
                {unifiedHistory.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-xs">Chưa có lịch sử</p>
                  </div>
                ) : (
                  unifiedHistory.map((item) => (
                      <div 
                        key={item.id}
                        className="bg-slate-50 hover:bg-white p-2 sm:p-3 rounded-xl border border-slate-100 transition-all cursor-pointer group relative"
                      onClick={() => {
                        setActiveQuestions(item.questions);
                        setScore(item.score);
                        setPickedAnswers(item.pickedAnswers);
                        setEssayAnswers(item.essayAnswers);
                        setFormat(item.format as any);
                        setStep('result');
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-slate-900 text-sm truncate group-hover:text-primary flex-1 min-w-0">{item.title}</h4>
                        <div className="relative">
                          <button
                            onClick={(e) => handleDeleteQuiz(e, item.id)}
                            className="p-1 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-all z-10"
                            title="Xóa bài này"
                          >
                            <Trash2 size={14} />
                          </button>
                          <AnimatePresence>
                            {deletingQuizId === item.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, x: 10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9, x: 10 }}
                                className="absolute right-0 top-full mt-2 z-[60] bg-slate-900 text-white p-3 rounded-2xl shadow-2xl min-w-[200px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <p className="text-[11px] font-bold mb-3 leading-tight text-center">Xóa kết quả Quiz này?</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeletingQuizId(null) }}
                                    className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-[10px] font-bold transition-colors"
                                  >Hủy</button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); confirmDeleteQuiz(item.id) }}
                                    className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 rounded-xl text-[10px] font-bold transition-colors"
                                  >Xóa</button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-400">{new Date(item.date).toLocaleDateString('vi-VN')}</span>
                        <span className="text-xs font-black text-primary">{item.total > 0 ? Math.round((item.score / item.total) * 100) : 0}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

            {/* Setup Panel */}
            <div className="flex-1 space-y-6 order-2 lg:order-2">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-2 sm:p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <Brain size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-text-primary">Tạo bản mới</h1>
                    <p className="text-sm text-slate-500">Tạo bài kiểm tra từ tài liệu của bạn</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Document picker */}
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                      <FileText size={18} className="text-primary" /> Chọn tài liệu nguồn
                    </label>
 
                    {docsLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
                        ))}
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                        <p className="text-xs text-amber-700">Chưa có tài liệu. Hãy tải lên trước.</p>
                        <button onClick={() => setCurrentPage?.('documents')} className="text-[10px] font-bold text-amber-700 underline">Tải ngay</button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="🔍 Tìm kiếm tài liệu..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full p-3 mb-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary text-sm transition-all"
                        />
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto custom-scrollbar">
                          {documents
                            .filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((doc) => (
                            <label key={doc._id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-all">
                              <input 
                                type="checkbox" 
                                checked={selectedDocIds.includes(doc._id)}
                                disabled={doc.status !== 'processed'}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedDocIds([...selectedDocIds, doc._id]);
                                  else setSelectedDocIds(selectedDocIds.filter(id => id !== doc._id));
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-primary"
                              />
                              <div className={`flex items-center gap-2 flex-1 min-w-0 ${doc.status !== 'processed' ? 'opacity-50' : ''}`}>
                                 {getFileIcon(doc.type)}
                                 <span className="text-xs text-slate-700 truncate">{doc.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
 
                  {/* Settings grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Số câu hỏi</label>
                      <input
                        type="number"
                        min="1"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                        className="w-full font-bold bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-primary transition-all text-sm"
                      />
                    </div>
                    
                    <div className="sm:col-span-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Định dạng</label>
                            <div className="grid grid-cols-3 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-sm gap-0.5 sm:gap-1">
                             {(['Trắc nghiệm', 'Đúng/Sai', 'Tự luận'] as const).map((f) => (
                               <button
                                 key={f}
                                 onClick={() => setFormat(f)}
                                 className={`flex-1 py-2 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                                   format === f 
                                   ? 'bg-white text-primary shadow-sm ring-1 ring-slate-100' 
                                   : 'text-slate-500 hover:text-slate-700'
                                 }`}
                               >
                                 {f}
                               </button>
                             ))}
                           </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Độ khó</label>
                            <div className="grid grid-cols-3 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-sm gap-0.5 sm:gap-1">
                             {(['Dễ', 'Trung bình', 'Khó'] as const).map((d) => (
                               <button
                                 key={d}
                                 onClick={() => setDifficulty(d)}
                                 className={`flex-1 py-2 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                                   difficulty === d
                                   ? 'bg-white text-primary shadow-sm ring-1 ring-slate-100' 
                                   : 'text-slate-500 hover:text-slate-700'
                                 }`}
                               >
                                 {d}
                               </button>
                             ))}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
 
                  <button
                    onClick={handleStartQuiz}
                    disabled={selectedDocIds.length === 0 || generating}
                    className="w-full bg-gradient-to-r from-primary to-primary-light text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                    {generating ? 'Đang tạo...' : 'Bắt đầu làm bài'}
                  </button>
                </div>
              </div>

              {/* Progress Summary (Desktop) */}
              <div className="hidden lg:grid grid-cols-3 gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                  <Trophy className="text-yellow-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-black text-slate-900">{unifiedHistory.length}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Bài đã hoàn thành</p>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                  <CheckCircle2 className="text-green-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-black text-slate-900">
                    {unifiedHistory.length > 0 
                      ? Math.round(unifiedHistory.reduce((acc, h) => acc + (h.score / h.total), 0) / unifiedHistory.length * 100) 
                      : 0}%
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Điểm trung bình</p>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                  <Brain className="text-primary mx-auto mb-2" size={24} />
                  <p className="text-2xl font-black text-slate-900">{localHistory.length}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Quiz cục bộ</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'playing' && currentQuestion && !isReviewing && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  {selectedDocs.map(d=>d.name).join(', ').substring(0, 50) + (selectedDocs.length > 1 ? '...' : '') || 'Quiz'} • {format} • Cấp độ: {difficulty}
                </h2>
                <div className="flex gap-2 mt-2">
                  {(() => {
                    const q = activeQuestions[currentQ] as any;
                    const level = q?.level;
                    if (level === 'Nhận biết') return <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded">🟢 Nhận biết</span>;
                    if (level === 'Vận dụng') return <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded">🔵 Vận dụng</span>;
                    if (level === 'Nâng cao') return <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded">🔴 Nâng cao</span>;
                    return null;
                  })()}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-slate-500">Câu {currentQ + 1}/{activeQuestions.length}</span>
                <div className="w-32 h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${((currentQ + 1) / activeQuestions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                  <h3 className="text-xl font-semibold text-text-primary leading-relaxed">{currentQuestion.question}</h3>
                </div>

                {format === 'Tự luận' ? (
                  <div className="space-y-4">
                    <textarea
                      className="w-full p-4 rounded-xl border-2 border-slate-200 outline-none focus:border-primary text-base min-h-[180px] transition-all bg-white shadow-inner"
                      placeholder="Nhập câu trả lời của bạn tại đây..."
                      value={essayAnswers[currentQ] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEssayAnswers((prev) => {
                          const next = [...prev];
                          next[currentQ] = val;
                          return next;
                        });
                      }}
                      disabled={isAnswered}
                    />
                    {!isAnswered && (
                      <button
                        onClick={() => {
                          setIsAnswered(true);
                          setPickedAnswers((prev) => {
                            const next = [...prev];
                            next[currentQ] = 0; // Đánh dấu là đã trả lời
                            return next;
                          });
                          setSelectedAnswer(0);
                        }}
                        className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-light hover:shadow-lg transition-all"
                      >
                        Gửi câu trả lời & Xem gợi ý
                      </button>
                    )}
                  </div>
                ) : (
                  currentQuestion.options.map((opt, idx) => {
                    let btnClass = 'bg-white border-slate-200 hover:border-primary hover:bg-primary/5 text-slate-700';
                    let Icon = null;
                    if (isAnswered) {
                      if (idx === currentQuestion.correctIndex) {
                        btnClass = 'bg-success/10 border-success text-success font-semibold';
                        Icon = <CheckCircle2 size={20} className="text-success" />;
                      } else if (idx === selectedAnswer) {
                        btnClass = 'bg-danger/10 border-danger text-danger';
                        Icon = <XCircle size={20} className="text-danger" />;
                      } else {
                        btnClass = 'bg-white border-slate-200 opacity-50';
                      }
                    } else if (selectedAnswer === idx) {
                      btnClass = 'bg-primary/10 border-primary text-primary font-semibold';
                    }
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        className={`w-full p-4 rounded-xl border-2 text-left flex justify-between items-center transition-all ${btnClass}`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-lg bg-bg flex items-center justify-center font-bold text-sm">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {opt}
                        </div>
                        {Icon}
                      </button>
                    );
                  })
                )}

                {/* Fixed bottom navigation for playing mode */}
                <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100">
                  <div className="flex gap-3">
                    {currentQ > 0 ? (
                      <button
                        onClick={prevQuestion}
                        className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-200 transition-colors"
                      >
                        <ArrowLeft size={18} /> Câu trước
                      </button>
                    ) : (
                      <div className="w-10"></div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {!isAnswered && (
                      <button
                        onClick={handleSkipQuestion}
                        className="px-6 py-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl font-semibold hover:bg-amber-100 transition-all flex items-center gap-2"
                      >
                        Bỏ qua <ArrowRight size={18} />
                      </button>
                    )}
                    
                    {(isAnswered || format === 'Tự luận') && (
                      <button
                        onClick={nextQuestion}
                        className="bg-primary text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-primary-light transition-colors shadow-lg shadow-primary/20"
                      >
                        {currentQ < activeQuestions.length - 1 ? 'Câu tiếp theo' : 'Xem lại & Nộp bài'} 
                        <ArrowRight size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <AnimatePresence>
                  {isAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-6 rounded-2xl border ${
                        selectedAnswer === currentQuestion.correctIndex
                          ? 'bg-success/5 border-success/20'
                          : 'bg-danger/5 border-danger/20'
                      }`}
                    >
                      <h4
                        className={`font-bold flex items-center gap-2 mb-3 ${
                          format === 'Tự luận' ? 'text-primary' : (selectedAnswer === currentQuestion.correctIndex ? 'text-success' : 'text-danger')
                        }`}
                      >
                        {format === 'Tự luận' ? (
                          <><Sparkles /> Phân tích đáp án</>
                        ) : (
                          selectedAnswer === currentQuestion.correctIndex ? (
                            <><CheckCircle2 /> Chính xác!</>
                          ) : (
                            <><XCircle /> Sai rồi!</>
                          )
                        )}
                      </h4>
                      <div className="text-sm text-slate-700 leading-relaxed space-y-4">
                        {format === 'Tự luận' && (
                          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                            <p className="font-bold text-primary mb-2 text-xs uppercase tracking-wider">Đáp án gợi ý:</p>
                            <p className="text-slate-800 italic leading-relaxed whitespace-pre-line">{currentQuestion.options[0]}</p>
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-500 mb-1 text-xs uppercase tracking-wider">Giải thích chi tiết:</p>
                          <p>{currentQuestion.explanation || 'Không có giải thích chi tiết.'}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'playing' && isReviewing && (
          <motion.div
            key="reviewing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 bg-slate-50 border-b border-slate-100 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ClipboardList size={32} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Xem lại bài làm</h2>
                <p className="text-slate-500 mt-1">Kiểm tra lại tất cả các câu trả lời trước khi nộp bài.</p>
              </div>

              <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {activeQuestions.map((q, idx) => {
                  const isAnsweredQ = pickedAnswers[idx] !== undefined;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentQ(idx);
                        const ans = pickedAnswers[idx] ?? null;
                        setSelectedAnswer(ans);
                        setIsAnswered(ans !== null);
                        setIsReviewing(false);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                        isAnsweredQ ? 'border-slate-100 bg-white hover:border-primary/50' : 'border-amber-100 bg-amber-50/50 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          isAnsweredQ ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className={`text-sm font-semibold truncate max-w-[400px] ${isAnsweredQ ? 'text-slate-700' : 'text-amber-700'}`}>
                            {q.question}
                          </p>
                          <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                            {isAnsweredQ ? 'Đã trả lời' : 'Chưa trả lời'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                    </button>
                  );
                })}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
                <button
                  onClick={() => setIsReviewing(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all"
                >
                  <ArrowLeft size={18} /> Quay lại
                </button>
                <button
                  onClick={handleFinishQuiz}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-light hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Target size={18} /> Nộp bài ngay
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'result' && (

          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-success/20 to-transparent" />

              <div className="w-20 h-20 bg-success text-white rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg shadow-success/30">
                <Trophy size={40} />
              </div>

              <h2 className="text-3xl font-bold text-text-primary mb-2 relative z-10">Hoàn thành bài kiểm tra! 🎉</h2>
              <p className="text-slate-500 mb-8 relative z-10">Bạn đã hoàn thành phiên luyện tập.</p>

              <div className="flex justify-center gap-8 mb-10">
                <div className="text-center">
                  <p className="text-sm text-slate-500 font-medium mb-1">ĐIỂM SỐ</p>
                  <p className="text-4xl font-bold text-primary">
                    {activeQuestions.length ? Math.round((score / activeQuestions.length) * 100) : 0}%
                  </p>
                </div>
                <div className="w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-sm text-slate-500 font-medium mb-1">SỐ CÂU ĐÚNG</p>
                  <p className="text-4xl font-bold text-success">
                    {score}/{activeQuestions.length}
                  </p>
                </div>
                <div className="w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-sm text-slate-500 font-medium mb-1">XP NHẬN ĐƯỢC</p>
                  <p className="text-4xl font-bold text-accent">+{score * 50}</p>
                </div>
              </div>

              <div className="h-48 mb-8">
                <p className="text-left text-sm font-bold text-slate-500 mb-4">XU HƯỚNG ĐIỂM SỐ</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={resetQuiz}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw size={18} /> Làm lại
                </button>
                <button
                  onClick={() => setCurrentPage?.('dashboard')}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-light flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <Home size={18} /> Về trang chủ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
