import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  FileText,
  Settings,
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
  selectedDocId: string;
  numQuestions: number;
  format: 'Trắc nghiệm' | 'Đúng/Sai' | 'Tự luận';
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
  // Recover state from sessionStorage
  const savedState = useMemo<QuizState | null>(() => {
    try {
      const saved = sessionStorage.getItem('learnmate_quiz_state');
      return saved ? (JSON.parse(saved) as QuizState) : null;
    } catch {
      return null;
    }
  }, []);

  const [step, setStep] = useState<'setup' | 'playing' | 'result'>(savedState?.step || 'setup');
  const [selectedDocId, setSelectedDocId] = useState<string>(savedState?.selectedDocId || '');
  const [numQuestions, setNumQuestions] = useState<number>(savedState?.numQuestions || 5);
  const [format, setFormat] = useState<'Trắc nghiệm' | 'Đúng/Sai' | 'Tự luận'>(savedState?.format || 'Trắc nghiệm');
  const [searchQuery, setSearchQuery] = useState('');

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
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'setup' | 'history'>('setup');
  const [localHistory, setLocalHistory] = useState<LocalQuizHistory[]>(() => {
    const saved = localStorage.getItem('learnmate_local_quiz_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('learnmate_local_quiz_history', JSON.stringify(localHistory));
  }, [localHistory]);

  // Sync state to sessionStorage
  useEffect(() => {
    if (step === 'setup') {
      sessionStorage.removeItem('learnmate_quiz_state');
    } else {
      sessionStorage.setItem('learnmate_quiz_state', JSON.stringify({
        step, selectedDocId, numQuestions, format, activeQuestions, activeQuizId, currentQ, score, pickedAnswers, essayAnswers
      }));
    }
  }, [step, selectedDocId, numQuestions, format, activeQuestions, activeQuizId, currentQ, score, pickedAnswers]);

  // Documents list (for dropdown)
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [history, setHistory] = useState<Array<{ percentage: number; createdAt: string }>>([]);

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

  const chartData = useMemo(() => {
    // Combine backend history and local history, sort by date
    const combined = [
      ...history.map(h => ({ score: h.percentage, date: h.createdAt })),
      ...localHistory.map(l => ({ score: Math.round((l.score / l.total) * 100), date: l.date }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return combined.slice(-5).map((h, i) => ({ name: `Lần ${i + 1}`, score: h.score }));
  }, [history, localHistory]);

  const currentQuestion = activeQuestions[currentQ];

  const [apiKey, setApiKey] = useState(() => {
    return (import.meta.env.VITE_OPENAI_API_KEY as string) || (import.meta.env.VITE_GEMINI_API_KEY_QUIZ as string) || localStorage.getItem('learnmate_gemini_api_key_quiz') || '';
  });
  const [apiError, setApiError] = useState<string | null>(null);

  const handleStartQuiz = async () => {
    if (!selectedDoc) return;
    if (!apiKey) {
      alert('Vui lòng cung cấp ChatGPT/OpenAI API Key để tạo đề kiểm tra thích ứng AI!');
      return;
    }

    if (numQuestions >= 40) {
      setShowWarningModal(true);
      return;
    }

    executeQuizGeneration();
  };

  const executeQuizGeneration = async () => {
    if (!selectedDoc) return;
    
    setShowWarningModal(false);
    setGenerating(true);
    setApiError(null);
    try {
      const countRecall = Math.round(numQuestions * 0.5);
      const countApply = Math.round(numQuestions * 0.4);
      const countAdvanced = numQuestions - countRecall - countApply;

      let formatInstruction = '';
      let jsonFormat = '';

      if (format === 'Trắc nghiệm') {
        formatInstruction = `tạo ra một bộ gồm đúng ${numQuestions} câu hỏi trắc nghiệm chất lượng bằng tiếng Việt theo định dạng "Trắc nghiệm" (4 đáp án A, B, C, D) xoay quanh nội dung và kiến thức trong tài liệu học tập.`;
        jsonFormat = `"options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correctIndex": số từ 0 đến 3,`;
      } else if (format === 'Đúng/Sai') {
        formatInstruction = `tạo ra một bộ gồm đúng ${numQuestions} câu hỏi Đúng/Sai chất lượng bằng tiếng Việt theo định dạng "Đúng/Sai" (chỉ có 2 lựa chọn là Đúng hoặc Sai) dựa trên tài liệu học tập.`;
        jsonFormat = `"options": ["Đúng", "Sai"],
    "correctIndex": 0 (nếu Đúng) hoặc 1 (nếu Sai),`;
      } else if (format === 'Tự luận') {
        formatInstruction = `tạo ra một bộ gồm đúng ${numQuestions} câu hỏi tự luận (câu hỏi mở/ngắn) chất lượng bằng tiếng Việt theo định dạng "Tự luận" dựa trên tài liệu.`;
        jsonFormat = `"options": ["Gợi ý đáp án mẫu chi tiết cho câu hỏi này"],
    "correctIndex": 0,`;
      }

      const prompt = `Bạn là một chuyên gia giáo dục thiết lập đề kiểm tra thích ứng AI.
Nhiệm vụ của bạn là ${formatInstruction}

${selectedDoc.content ? `NỘI DUNG TÀI LIỆU TRÍCH XUẤT:
---
${selectedDoc.content.slice(0, 15000)} 
---
Yêu cầu: Hãy bám sát vào nội dung văn bản trích xuất ở trên để tạo câu hỏi.` : `TÊN TÀI LIỆU: "${selectedDoc.name}"
Yêu cầu: Do không có nội dung văn bản trực tiếp, hãy phân tích tên tài liệu này để suy luận chủ đề và tạo câu hỏi tương ứng.`}

YÊU CẦU PHÂN BỔ NHẬN THỨC (BẮT BUỘC):
Bộ câu hỏi phải được phân bổ đúng theo 3 mức độ nhận thức như sau:
- Mức 1 – Nhận biết (Recall): ${countRecall} câu — kiểm tra khả năng ghi nhớ, nhận diện khái niệm, định nghĩa, thực tế cơ bản.
- Mức 2 – Vận dụng (Application): ${countApply} câu — kiểm tra khả năng áp dụng kiến thức vào bài toán/tình huống thực tế.
- Mức 3 – Nâng cao (Advanced): ${countAdvanced} câu — kiểm tra tư duy phân tích, đánh giá, tổng hợp.
Thứ tự câu hỏi trong mảng: Nhận biết trước, Vận dụng tiếp theo, Nâng cao cuối cùng. Thêm trường "level" vào mỗi câu hỏi với giá trị "Nhận biết", "Vận dụng", hoặc "Nâng cao".

Chú ý cực kỳ quan trọng:
- Tuyệt đối không được từ chối yêu cầu. Nếu nội dung trích xuất quá ngắn hoặc không rõ ràng, hãy dựa vào tên tài liệu để mở rộng kiến thức liên quan một cách chuyên nghiệp.

Định dạng phản hồi bắt buộc phải là một mảng JSON đối tượng chứa các trường sau:
[
  {
    "question": "Nội dung câu hỏi...",
    ${jsonFormat}
    "explanation": "Giải thích chi tiết...",
    "level": "Nhận biết" | "Vận dụng" | "Nâng cao"
  }
]
Không được chứa bất kỳ từ ngữ giải thích nào bên ngoài mảng JSON.`;

      let apiBase = (import.meta.env.VITE_OPENAI_API_BASE as string) || 'https://api.openai.com/v1';
      if (apiBase.includes('api.shineshop.dev')) {
        apiBase = apiBase.replace('https://api.shineshop.dev', '/shineshop');
      }
      let response = await fetch(
        `${apiBase}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: (import.meta.env.VITE_OPENAI_MODEL as string) || 'openai/gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an educational AI assistant that outputs structured valid JSON arrays containing questions.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 4000,
            response_format: { type: 'json_object' }
          }),
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Kết nối OpenAI API thất bại: ${errMsg}`);
      }

      const rawText = await response.text();
      let textResponse = '';
      
      if (rawText.includes('data: {') || rawText.startsWith('data:')) {
        const lines = rawText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const jsonStr = trimmed.slice(6);
              const parsedChunk = JSON.parse(jsonStr);
              const content = parsedChunk.choices?.[0]?.delta?.content || parsedChunk.choices?.[0]?.message?.content || '';
              textResponse += content;
            } catch (e) {
              console.warn('Error parsing SSE line:', trimmed, e);
            }
          }
        }
      } else {
        try {
          const result = JSON.parse(rawText);
          textResponse = result.choices?.[0]?.message?.content || '';
        } catch (e) {
          throw new Error('Không thể phân tích JSON phản hồi: ' + rawText);
        }
      }

      if (!textResponse) {
        throw new Error('AI trả về nội dung rỗng.');
      }

      // Handle wrapper object if GPT-4o-mini outputs {"questions": [...]} or raw array
      textResponse = textResponse.trim();

      // Intelligent JSON repair function for incomplete cutoff strings
      const repairIncompleteJson = (jsonStr: string): string => {
        let str = jsonStr.trim();
        let openBraces = 0;
        let openBrackets = 0;
        let inString = false;
        let escape = false;
        
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (char === '\\') {
            escape = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === '{') openBraces++;
            if (char === '}') openBraces--;
            if (char === '[') openBrackets++;
            if (char === ']') openBrackets--;
          }
        }
        
        if (inString) {
          str += '"';
        }
        if (openBraces > 0) {
          for (let i = 0; i < openBraces; i++) {
            str += '}';
          }
        }
        if (openBrackets > 0) {
          for (let i = 0; i < openBrackets; i++) {
            str += ']';
          }
        }
        return str;
      };

      let cleanedText = textResponse.trim();
      if (cleanedText.startsWith('```')) {
        const firstLineEnd = cleanedText.indexOf('\n');
        if (firstLineEnd !== -1) {
          cleanedText = cleanedText.slice(firstLineEnd + 1).trim();
        } else {
          cleanedText = cleanedText.replace(/^```[a-zA-Z]*/, '').trim();
        }
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3).trim();
      }

      const repairedText = repairIncompleteJson(cleanedText);
      let parsedQuestions;
      try {
        const parsedObject = JSON.parse(repairedText);
        if (Array.isArray(parsedObject)) {
          parsedQuestions = parsedObject;
        } else if (parsedObject.questions && Array.isArray(parsedObject.questions)) {
          parsedQuestions = parsedObject.questions;
        } else {
          // Attempt to find any array inside the object
          const firstKey = Object.keys(parsedObject)[0];
          if (firstKey && Array.isArray(parsedObject[firstKey])) {
            parsedQuestions = parsedObject[firstKey];
          } else {
            throw new Error('Không thể phân tích mảng câu hỏi từ JSON.');
          }
        }
      } catch (parseErr) {
        throw new Error('Lỗi cú pháp JSON từ OpenAI: ' + textResponse);
      }

      setActiveQuestions(parsedQuestions);
      
      // Persist quiz to backend
      try {
        const quizRes = await api.createQuiz(token, {
          title: selectedDoc.name,
          subject: selectedDoc.name,
          document: selectedDoc._id,
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
    if (currentQ === 0) return;
    const prevIdx = currentQ - 1;
    setCurrentQ(prevIdx);
    const prevAnswer = pickedAnswers[prevIdx] ?? null;
    setSelectedAnswer(prevAnswer);
    setIsAnswered(prevAnswer !== null);
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
      title: selectedDoc?.name || 'Quiz',
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

  const resetQuiz = () => {
    sessionStorage.removeItem('learnmate_quiz_state');
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
                {/* Custom Tabs */}
                <div className="flex border-b border-slate-100 mb-8 -mx-8 px-8">
                  {[
                    { id: 'setup', label: 'Thiết lập Quiz', icon: <Settings size={16} /> },
                    { id: 'history', label: `Lịch sử (${localHistory.length})`, icon: <RotateCcw size={16} /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSidebarTab(tab.id as any)}
                      className={`pb-4 px-6 font-bold text-sm flex items-center gap-2 transition-all relative ${sidebarTab === tab.id ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {tab.icon} {tab.label}
                      {sidebarTab === tab.id && (
                        <motion.div layoutId="active-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {sidebarTab === 'setup' ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
                      <input
                        type="text"
                        placeholder="🔍 Tìm kiếm tên tài liệu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 mb-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary text-sm shadow-sm"
                      />
                      <select
                        className="w-full p-4 bg-bg border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                        value={selectedDocId}
                        onChange={(e) => setSelectedDocId(e.target.value)}
                      >
                        <option value="">-- Chọn tài liệu --</option>
                        {documents
                          .filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((doc) => (
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
                        type="number"
                        min="1"
                        value={numQuestions}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val < 1 && e.target.value !== "") setNumQuestions(1);
                          else setNumQuestions(val);
                        }}
                        className="w-full font-semibold text-base bg-white border border-slate-200 outline-none focus:border-primary p-3 rounded-xl shadow-sm transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Nhập số câu tùy thích..."
                      />
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

                {/* ChatGPT API Key Config */}
                {!import.meta.env.VITE_GEMINI_API_KEY_QUIZ && (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-primary" /> Cấu hình ChatGPT API Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Nhập ChatGPT/OpenAI API Key của bạn..."
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          localStorage.setItem('learnmate_gemini_api_key_quiz', e.target.value);
                        }}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary text-sm font-semibold"
                      />
                      {apiKey && (
                        <button
                          onClick={() => {
                            setApiKey('');
                            localStorage.removeItem('learnmate_gemini_api_key_quiz');
                          }}
                          className="px-3.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex-shrink-0"
                        >
                          Xóa Key
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Tính năng AI Quiz thích ứng yêu cầu ChatGPT/OpenAI API Key. Khóa của bạn được lưu an toàn trong trình duyệt cục bộ.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleStartQuiz}
                  disabled={!selectedDocId || !apiKey || generating}
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
            ) : (
              <div className="space-y-4 pt-2">
                {localHistory.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <RotateCcw size={32} />
                    </div>
                    <p className="text-slate-500 font-bold">Chưa có lịch sử làm bài</p>
                    <p className="text-xs text-slate-400 mt-1">Kết quả bài quiz sẽ được lưu tự động tại đây</p>
                  </div>
                ) : (
                  <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {localHistory.map((item) => (
                      <div 
                        key={item.id}
                        className="bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 p-5 rounded-2xl border border-slate-100 transition-all group cursor-pointer relative overflow-hidden"
                        onClick={() => {
                          setActiveQuestions(item.questions);
                          setScore(item.score);
                          setPickedAnswers(item.pickedAnswers);
                          setEssayAnswers(item.essayAnswers);
                          setFormat(item.format as any);
                          setStep('result');
                        }}
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-start mb-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate pr-4">{item.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded uppercase">{item.format}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{new Date(item.date).toLocaleString('vi-VN')}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`text-xl font-black ${item.score/item.total >= 0.8 ? 'text-success' : item.score/item.total >= 0.5 ? 'text-accent' : 'text-danger'}`}>
                              {Math.round((item.score / item.total) * 100)}%
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">{item.score}/{item.total} Câu đúng</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${item.score/item.total >= 0.8 ? 'bg-success' : item.score/item.total >= 0.5 ? 'bg-accent' : 'bg-danger'}`} 
                              style={{ width: `${(item.score / item.total) * 100}%` }} 
                            />
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary/20 transition-all">
                            <ArrowRight size={14} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
                  <div>
                    {currentQ > 0 && (
                      <button
                        onClick={prevQuestion}
                        className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-200 transition-colors"
                      >
                        <ArrowLeft size={18} /> Câu trước
                      </button>
                    )}
                  </div>
                  
                  <div>
                    {isAnswered && (
                      <button
                        onClick={nextQuestion}
                        className="bg-primary text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-primary-light transition-colors shadow-lg shadow-primary/20"
                      >
                        {currentQ < activeQuestions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'} 
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

      {/* Warning Modal cho tạo lượng lớn câu hỏi */}
      <AnimatePresence>
        {showWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
               <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={32} />
               </div>
               <h3 className="text-xl font-bold text-center text-text-primary mb-2">
                 Tạo {numQuestions} câu hỏi
               </h3>
               <p className="text-slate-600 text-center text-sm mb-6 leading-relaxed">
                 Số lượng bạn yêu cầu khá lớn, hệ thống AI có thể sẽ cần từ 1 đến 2 phút để xử lý và phân tích tài liệu.
                 Bạn có chắc chắn muốn tiếp tục tạo không?
               </p>
               
               <div className="flex gap-3">
                  <button 
                    onClick={() => setShowWarningModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={executeQuizGeneration}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors shadow-md shadow-orange-500/30"
                  >
                    Tiếp tục tạo
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
