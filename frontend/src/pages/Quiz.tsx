import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  FileText,
  Settings,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Home,
  Trophy,
  Sparkles,
  File,
  Presentation,
  Loader2,
  Upload,
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
import { api, QuizItem, DocumentItem } from '../lib/api';

interface QuizProps {
  token: string;
  setCurrentPage?: (page: string) => void;
}

function getFileIcon(type: string) {
  if (type === 'pdf') return <FileText size={16} className="text-red-500" />;
  if (type === 'docx') return <File size={16} className="text-blue-500" />;
  if (type === 'pptx') return <Presentation size={16} className="text-orange-500" />;
  return <FileText size={16} className="text-slate-400" />;
}

/** Tạo câu hỏi mẫu khi chưa có AI thực */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateDemoQuestions(docName: string, _format: string, count: number) {
  const base = [
    {
      question: `Đây là câu hỏi mẫu được tạo từ tài liệu "${docName}". AI sẽ phân tích và tạo câu hỏi thực tế sau khi xử lý xong.`,
      options: ['Đáp án A (mẫu)', 'Đáp án B (mẫu)', 'Đáp án C (mẫu)', 'Đáp án D (mẫu)'],
      correctIndex: 0,
      explanation: 'Đây là giải thích mẫu. Hệ thống AI sẽ tạo giải thích chi tiết từ nội dung tài liệu thực tế.',
    },
    {
      question: `Câu 2 mẫu từ "${docName}": Nội dung nào sau đây được đề cập trong tài liệu?`,
      options: ['Phần đầu tiên', 'Chương giới thiệu', 'Kết luận', 'Tất cả các phần trên'],
      correctIndex: 3,
      explanation: 'Tài liệu bao gồm nhiều phần nội dung khác nhau được AI phân tích tổng hợp.',
    },
    {
      question: `Câu 3 mẫu: Mục tiêu chính của tài liệu "${docName}" là gì?`,
      options: ['Cung cấp kiến thức nền tảng', 'Giải thích các khái niệm nâng cao', 'Hướng dẫn thực hành', 'Tổng hợp tài liệu tham khảo'],
      correctIndex: 0,
      explanation: 'AI sẽ phân tích mục tiêu thực tế của tài liệu dựa trên nội dung được tải lên.',
    },
    {
      question: `Câu 4 mẫu từ "${docName}": Phương pháp được đề xuất trong tài liệu?`,
      options: ['Phương pháp A', 'Phương pháp B', 'Phương pháp C', 'Không có phương pháp nào'],
      correctIndex: 1,
      explanation: 'Câu trả lời đúng sẽ được xác định từ nội dung cụ thể trong tài liệu.',
    },
    {
      question: `Câu 5 mẫu: Ứng dụng thực tiễn của kiến thức trong "${docName}"?`,
      options: ['Ứng dụng trong học tập', 'Ứng dụng trong nghiên cứu', 'Ứng dụng trong công việc', 'Tất cả các ứng dụng trên'],
      correctIndex: 2,
      explanation: 'Tài liệu cung cấp các ứng dụng thực tiễn được AI trích xuất và tổng hợp.',
    },
  ];
  return base.slice(0, Math.max(1, Math.min(count, base.length)));
}

export function Quiz({ token, setCurrentPage }: QuizProps) {
  const [step, setStep] = useState<'setup' | 'playing' | 'result'>('setup');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [format, setFormat] = useState<'Trắc nghiệm' | 'Đúng/Sai' | 'Tự luận'>('Trắc nghiệm');

  // Documents list (for dropdown)
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  // Quiz data (for quizzes that were already created)
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [history, setHistory] = useState<Array<{ percentage: number; createdAt: string }>>([]);

  // Active quiz session state
  const [activeQuestions, setActiveQuestions] = useState<QuizItem['questions']>([]);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [pickedAnswers, setPickedAnswers] = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // Load documents & quizzes in parallel
    const loadData = async () => {
      try {
        const [docRes, qRes, hRes] = await Promise.all([
          api.getDocuments(token),
          api.getQuizzes(token),
          api.getQuizHistory(token),
        ]);
        setDocuments(docRes.documents || []);
        setQuizzes(qRes.quizzes || []);
        setHistory(hRes.results || []);
      } catch {
        // silently fail
      } finally {
        setDocsLoading(false);
      }
    };
    loadData();
  }, [token]);

  const selectedDoc = useMemo(
    () => documents.find((d) => d._id === selectedDocId) || null,
    [documents, selectedDocId]
  );

  // Find existing quiz linked to this document + format
  const existingQuiz = useMemo(
    () => quizzes.find((q) => q.format === format) || null,
    [quizzes, format]
  );

  const chartData = useMemo(
    () =>
      history
        .slice(0, 5)
        .reverse()
        .map((h, i) => ({ name: `Lần ${i + 1}`, score: h.percentage })),
    [history]
  );

  const currentQuestion = activeQuestions[currentQ];

  const handleStartQuiz = async () => {
    if (!selectedDoc) return;

    setGenerating(true);
    try {
      // If there's an existing quiz for this format, use it
      if (existingQuiz && existingQuiz.questions.length >= numQuestions) {
        setActiveQuestions(existingQuiz.questions.slice(0, numQuestions));
        setActiveQuizId(existingQuiz._id);
      } else {
        // Generate demo questions from document (mock, real AI would call backend)
        const demoQs = generateDemoQuestions(selectedDoc.name, format, numQuestions);
        setActiveQuestions(demoQs);
        setActiveQuizId(null);
      }
    } finally {
      setGenerating(false);
    }

    setStep('playing');
    setCurrentQ(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setPickedAnswers([]);
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

  const nextQuestion = async () => {
    if (currentQ < activeQuestions.length - 1) {
      setCurrentQ((c) => c + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      return;
    }

    if (activeQuizId) {
      const answers = activeQuestions.map((_, idx) => ({
        questionIndex: idx,
        selectedAnswer: pickedAnswers[idx] ?? -1,
      }));
      await api.submitQuiz(token, activeQuizId, answers).catch(() => null);
    }
    setStep('result');
  };

  const resetQuiz = () => {
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
    <div className="max-w-4xl mx-auto pb-20">
      <AnimatePresence mode="wait">
        {step === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Brain size={32} />
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Kiểm tra thích ứng AI</h1>
              <p className="text-slate-500">Tạo bài kiểm tra tùy chỉnh từ tài liệu bạn đã tải lên</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
              <div className="space-y-6">
                {/* Document picker */}
                <div>
                  <label className="block text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <FileText size={18} className="text-primary" /> Chọn tài liệu nguồn
                  </label>

                  {docsLoading ? (
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl text-slate-500 text-sm">
                      <Loader2 size={16} className="animate-spin" /> Đang tải danh sách tài liệu...
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-3 text-amber-700 text-sm">
                        <Upload size={18} />
                        <div>
                          <p className="font-semibold">Chưa có tài liệu nào</p>
                          <p className="text-xs mt-0.5">Hãy tải lên tài liệu trước để tạo quiz</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setCurrentPage?.('documents')}
                        className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-2 rounded-lg transition-colors"
                      >
                        Tải tài liệu →
                      </button>
                    </div>
                  ) : (
                    <>
                      <select
                        className="w-full p-4 bg-bg border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                        value={selectedDocId}
                        onChange={(e) => setSelectedDocId(e.target.value)}
                      >
                        <option value="">-- Chọn tài liệu --</option>
                        {documents.map((doc) => (
                          <option key={doc._id} value={doc._id}>
                            {doc.name}
                            {doc.status !== 'processed' ? ' (đang xử lý...)' : ''}
                          </option>
                        ))}
                      </select>

                      {/* Selected doc info */}
                      <AnimatePresence>
                        {selectedDoc && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-3 flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl"
                          >
                            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                              {getFileIcon(selectedDoc.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-text-primary truncate">{selectedDoc.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5 uppercase">{selectedDoc.type} • {selectedDoc.status === 'processed' ? '✅ Đã xử lý' : '⏳ Đang xử lý'}</p>
                            </div>
                            {selectedDoc.status !== 'processed' && (
                              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                <Loader2 size={11} className="animate-spin" /> Đang phân tích
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Recent documents quick-select */}
                      {documents.length > 0 && !selectedDocId && (
                        <div className="mt-3">
                          <p className="text-xs text-slate-400 mb-2 font-medium">Tài liệu gần đây:</p>
                          <div className="flex flex-wrap gap-2">
                            {documents.slice(0, 3).map((doc) => (
                              <button
                                key={doc._id}
                                onClick={() => setSelectedDocId(doc._id)}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-100 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors font-medium"
                              >
                                {getFileIcon(doc.type)}
                                <span className="max-w-[120px] truncate">{doc.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Settings row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                      <Settings size={18} className="text-primary" /> Số lượng câu hỏi
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <span className="font-bold text-lg w-12 text-center bg-bg py-1 rounded-lg">{numQuestions}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-text-primary mb-3">Định dạng</label>
                    <div className="flex gap-2">
                      {(['Trắc nghiệm', 'Đúng/Sai', 'Tự luận'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFormat(f)}
                          className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-colors ${
                            format === f
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartQuiz}
                  disabled={!selectedDocId || generating}
                  className="w-full mt-4 bg-gradient-to-r from-primary to-primary-light text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> Đang tạo câu hỏi...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} /> Tạo & bắt đầu làm bài
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'playing' && currentQuestion && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  {selectedDoc?.name || 'Quiz'} • {format}
                </h2>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded">Phân tích</span>
                  <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded">Xác suất cao</span>
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

                {currentQuestion.options.map((opt, idx) => {
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
                })}
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
                          selectedAnswer === currentQuestion.correctIndex ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {selectedAnswer === currentQuestion.correctIndex ? (
                          <><CheckCircle2 /> Chính xác!</>
                        ) : (
                          <><XCircle /> Sai rồi!</>
                        )}
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed mb-4">
                        {currentQuestion.explanation || 'Không có giải thích chi tiết.'}
                      </p>
                      <button
                        onClick={nextQuestion}
                        className="w-full bg-primary text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-light transition-colors"
                      >
                        {currentQ < activeQuestions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}{' '}
                        <ArrowRight size={18} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
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
