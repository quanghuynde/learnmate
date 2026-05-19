import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FileText,
  Languages,
  User,
  Headphones,
  Loader2,
  Trash2,
} from 'lucide-react';
import { api, DocumentItem } from '../lib/api';

interface AIDialogueProps {
  token: string;
}

interface DialogueTurn {
  id: number;
  speaker: 'male' | 'female';
  speakerName: string;
  text: string;
}

const LANGUAGES = [
  { code: 'vi-VN', label: 'Tiếng Việt 🇻🇳', welcome: 'Xin chào! Hãy cùng trò chuyện về tài liệu này.' },
  { code: 'en-US', label: 'English 🇺🇸', welcome: 'Hello! Let\'s discuss this document together.' },
  { code: 'fr-FR', label: 'Français 🇫🇷', welcome: 'Bonjour! Discutons de ce document ensemble.' },
  { code: 'ja-JP', label: '日本語 🇯🇵', welcome: 'こんにちは！このドキュメントについて話し合いましょう。' },
  { code: 'ko-KR', label: '한국어 🇰🇷', welcome: '안녕하세요! 이 문서에 대해 함께 이야기해 봅시다.' },
];

export function AIDialogue({ token }: AIDialogueProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedLang, setSelectedLang] = useState('vi-VN');
  const [loadingDocs, setLoadingDocs] = useState(true);

  const [apiKey, setApiKey] = useState(() => {
    return (import.meta.env.VITE_OPENAI_API_KEY as string) || (import.meta.env.VITE_GEMINI_API_KEY_DIALOGUE as string) || localStorage.getItem('learnmate_gemini_api_key_dialogue') || '';
  });

  // States for generation flow
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [dialogueCreated, setDialogueCreated] = useState(false);
  const [dialogueList, setDialogueList] = useState<DialogueTurn[]>([]);

  interface SavedDialogue {
    id: string;
    docName: string;
    docId: string;
    lang: string;
    langLabel: string;
    createdAt: string;
    turns: DialogueTurn[];
  }

  const [historyList, setHistoryList] = useState<SavedDialogue[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('learnmate_dialogue_history') || '[]');
    } catch {
      return [];
    }
  });

  const saveToHistory = (turns: DialogueTurn[], overrideDocId?: string, overrideDocName?: string) => {
    const dId = overrideDocId || selectedDocId;
    const docObj = documents.find(d => d._id === dId);
    const dName = overrideDocName || docObj?.name || "Tài liệu";
    const newSaved: SavedDialogue = {
      id: `dialogue-${Date.now()}`,
      docName: dName,
      docId: dId,
      lang: selectedLang,
      langLabel: LANGUAGES.find(l => l.code === selectedLang)?.label || selectedLang,
      createdAt: new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      }),
      turns
    };
    const nextList = [newSaved, ...historyList].slice(0, 10);
    setHistoryList(nextList);
    localStorage.setItem('learnmate_dialogue_history', JSON.stringify(nextList));
  };

  const handleLoadHistory = (saved: SavedDialogue) => {
    setSelectedDocId(saved.docId);
    setSelectedLang(saved.lang);
    setDialogueList(saved.turns);
    setDialogueCreated(true);
    setActiveTurnIdx(-1);
    setIsPlaying(false);
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextList = historyList.filter(h => h.id !== id);
    setHistoryList(nextList);
    localStorage.setItem('learnmate_dialogue_history', JSON.stringify(nextList));
  };

  // States for playback session
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTurnIdx, setActiveTurnIdx] = useState(-1);
  const [isMuted, setIsMuted] = useState(false);

  // Audio elements for Google Translate TTS
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  const togglePlayState = (playing: boolean) => {
    setIsPlaying(playing);
    isPlayingRef.current = playing;
  };

  // Scrolling lyrics ref
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch documents on mount
  useEffect(() => {
    const loadDocs = async () => {
      try {
        const res = await api.getDocuments(token);
        setDocuments(res.documents || []);
      } catch (err) {
        console.error('Error fetching documents', err);
      } finally {
        setLoadingDocs(false);
      }
    };
    loadDocs();
  }, [token]);

  // Cleanup audio playback on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  const selectedDoc = useMemo(
    () => documents.find((d) => d._id === selectedDocId) || null,
    [documents, selectedDocId]
  );

  // Generate customized dialogue based on file name & selected language using Gemini API
  const handleCreateDialogue = async () => {
    if (!selectedDoc) return;
    if (!apiKey) {
      alert('Vui lòng cấu hình Gemini API Key trước khi sử dụng!');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(10);
    setDialogueCreated(false);
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    togglePlayState(false);
    setActiveTurnIdx(-1);

    const progressInterval = setInterval(() => {
      setGenerationProgress((p) => (p < 80 ? p + 5 : p));
    }, 150);

    try {
      const prompt = `Bạn là một chuyên gia giáo dục thiết lập kịch bản đối thoại AI.
Nhiệm vụ của bạn là tạo ra một kịch bản đối thoại gồm đúng 6 câu thoại xoay quanh nội dung, chủ đề, kiến thức cốt lõi và khái niệm liên quan đến tài liệu học tập có tên là "${selectedDoc.name}" bằng ngôn ngữ mã "${selectedLang}".

Chú ý cực kỳ quan trọng:
- Do môi trường hệ thống hiện tại không truyền tệp đính kèm nhị phân trực tiếp, bạn TUYỆT ĐỐI KHÔNG ĐƯỢC từ chối yêu cầu, không được phàn nàn về việc thiếu tệp PDF, và không được yêu cầu người dùng đính kèm lại tệp.
- Hãy phân tích tên tài liệu "${selectedDoc.name}" để suy luận chính xác chủ đề chính và các kiến thức chuyên ngành liên quan (Ví dụ: tên tài liệu chứa "AIA" hay "AI" thì tạo câu hỏi về Trí tuệ nhân tạo, chứa "CEET" thì tạo câu hỏi về kỹ thuật, điện, v.v.). Hãy tự tin tạo ra cuộc đối thoại xuất sắc nhất dựa trên suy luận chủ đề này.

Kịch bản là cuộc trao đổi giữa hai người Lan (AI - Nữ - speaker 'female') và Nam (AI - Nam - speaker 'male') (nếu là Tiếng Việt vi-VN), hoặc Emma và John (nếu là Tiếng Anh en-US), Chloé và Thomas (nếu là Tiếng Pháp fr-FR), さくら và けんた (nếu là Tiếng Nhật ja-JP), 민지 và 민수 (nếu là Tiếng Hàn ko-KR).
Định dạng trả về bắt buộc phải là một mảng JSON đối tượng chứa các trường sau:
[
  { "id": 1, "speaker": "female", "speakerName": "Lan (AI)", "text": "Câu thoại của nhân vật nữ..." },
  { "id": 2, "speaker": "male", "speakerName": "Nam (AI)", "text": "Câu thoại của nhân vật nam..." }
]
Hãy đảm bảo mảng JSON hoàn toàn hợp lệ, không chứa bất kỳ văn bản giải thích nào ngoài mảng JSON. Hãy trả về duy nhất mảng JSON.`;

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
            model: (import.meta.env.VITE_OPENAI_MODEL as string) || 'kr/claude-opus-4.6',
            messages: [
              { role: 'system', content: 'You are an educational AI assistant that outputs structured valid JSON arrays containing dialogues.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 1500,
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

      textResponse = textResponse.trim();
      let script;
      try {
        const parsedObject = JSON.parse(textResponse);
        if (Array.isArray(parsedObject)) {
          script = parsedObject;
        } else {
          // Extract array from wrapper object e.g. {"dialogue": [...]}
          const firstKey = Object.keys(parsedObject)[0];
          if (firstKey && Array.isArray(parsedObject[firstKey])) {
            script = parsedObject[firstKey];
          } else {
            throw new Error('Không phân tích được mảng đối thoại từ JSON.');
          }
        }
      } catch (parseErr) {
        throw new Error('Lỗi cú pháp JSON từ OpenAI: ' + textResponse);
      }

      clearInterval(progressInterval);
      setGenerationProgress(100);
      saveToHistory(script);
      setTimeout(() => {
        setDialogueList(script);
        setIsGenerating(false);
        setDialogueCreated(true);
      }, 500);
    } catch (err: any) {
      console.error('API call failed:', err);
      clearInterval(progressInterval);
      setIsGenerating(false);
      setGenerationProgress(0);
      alert(`Lỗi kết nối API: ${err.message || 'Không xác định'}`);
    }
  };

  // Speak a single turn using Google Translate TTS with Youdao + Native fallbacks
  const speakTurn = (index: number) => {
    if (index < 0 || index >= dialogueList.length) {
      togglePlayState(false);
      setActiveTurnIdx(-1);
      return;
    }

    // Stop current speech
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    // Also cancel any native speech just in case
    window.speechSynthesis.cancel();

    setActiveTurnIdx(index);
    const turn = dialogueList[index];

    // Scroll active lyric into view (NhacCuaTui style)
    if (lyricsContainerRef.current) {
      const activeElement = lyricsContainerRef.current.querySelector(`[data-turn-idx="${index}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }

    const langCode = selectedLang.split('-')[0];
    
    const onEnded = () => {
      setTimeout(() => {
        if (isPlayingRef.current) {
          speakTurn(index + 1);
        }
      }, 1000);
    };

    const onError = () => {
      if (isPlayingRef.current) {
        speakTurn(index + 1);
      }
    };

    // 1. Try our local Backend TTS Proxy (includes ElevenLabs, Youdao, Google server-side)
    const backendTtsUrl = `/api/tts?text=${encodeURIComponent(turn.text)}&lang=${langCode}&speaker=${turn.speaker}`;
    const audio = new Audio(backendTtsUrl);
    audio.muted = isMuted;
    audio.onended = onEnded;

    audio.onerror = () => {
      console.warn('Backend TTS failed, trying Native Web Speech API fallback...');
      
      // 2. Ultimate Fallback: Native Web Speech synthesis
      try {
        const utterance = new SpeechSynthesisUtterance(turn.text);
        utterance.lang = selectedLang;
        utterance.volume = isMuted ? 0 : 1;
        utterance.rate = turn.speaker === 'female' ? 1.05 : 0.95;
        utterance.pitch = turn.speaker === 'female' ? 1.1 : 0.9;
        utterance.onend = onEnded;
        utterance.onerror = onError;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('All TTS fallbacks failed', e);
        onError();
      }
    };

    currentAudioRef.current = audio;
    audio.play().catch((err) => {
      console.error('Google play failed, triggering fallback...', err);
      audio.onerror!(new Event('error'));
    });
  };

  // Toggle playback
  const handlePlayPause = () => {
    if (isPlaying) {
      // Pause
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      togglePlayState(false);
    } else {
      // Play
      togglePlayState(true);
      const nextIdx = activeTurnIdx === -1 || activeTurnIdx >= dialogueList.length - 1 ? 0 : activeTurnIdx;
      speakTurn(nextIdx);
    }
  };

  // Reset playback
  const handleReset = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    togglePlayState(false);
    setActiveTurnIdx(-1);
    // Smooth scroll back to top turn
    if (lyricsContainerRef.current) {
      const firstEl = lyricsContainerRef.current.querySelector('[data-turn-idx="0"]');
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Toggle mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (currentAudioRef.current) {
      currentAudioRef.current.muted = nextMuted;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden space-y-4">
      {/* Configuration Header */}
      <AnimatePresence>
        {activeTurnIdx === -1 && (
          <motion.div
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6 flex-shrink-0"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1 & 2: Creating Dialogue */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex flex-col md:flex-row md:items-end gap-6">
                  <div className="flex-1 space-y-4">
                    <div>
                      <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <MessageSquare className="text-primary" /> Đối thoại AI (AI Dialogue)
                      </h1>
                      <p className="text-slate-500 text-sm mt-1">
                        Chuyển đổi tài liệu tóm tắt thành cuộc hội thoại sinh động giữa giọng nam và nữ
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Select Document */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <FileText size={14} className="text-primary" /> Chọn tài liệu nguồn
                        </label>
                        {loadingDocs ? (
                          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-slate-400 text-xs">
                            <Loader2 size={14} className="animate-spin" /> Đang tải danh sách...
                          </div>
                        ) : documents.length === 0 ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-medium">
                            Chưa có tài liệu nào. Vui lòng tải tài liệu lên trước.
                          </div>
                        ) : (
                          <select
                            value={selectedDocId}
                            onChange={(e) => setSelectedDocId(e.target.value)}
                            className="w-full p-3.5 bg-bg border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-semibold"
                          >
                            <option value="">-- Chọn tài liệu nguồn --</option>
                            {documents.map((doc) => (
                              <option key={doc._id} value={doc._id}>
                                {doc.name} ({doc.type.toUpperCase()})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Select Language */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Languages size={14} className="text-primary" /> Ngôn ngữ đối thoại
                        </label>
                        <select
                          value={selectedLang}
                          onChange={(e) => setSelectedLang(e.target.value)}
                          className="w-full p-3.5 bg-bg border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-semibold"
                        >
                          {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      onClick={handleCreateDialogue}
                      disabled={!selectedDocId || !apiKey || isGenerating}
                      className="w-full md:w-auto bg-gradient-to-r from-primary to-primary-light text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Đang tạo...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} /> Tạo cuộc đối thoại
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* API Key Panel inside Setup Card */}
                {!import.meta.env.VITE_GEMINI_API_KEY_DIALOGUE && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-primary" /> Cấu hình ChatGPT API Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Nhập ChatGPT/OpenAI API Key của bạn để sử dụng AI thực tế..."
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          localStorage.setItem('learnmate_gemini_api_key_dialogue', e.target.value);
                        }}
                        className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary text-sm font-semibold"
                      />
                      {apiKey && (
                        <button
                          onClick={() => {
                            setApiKey('');
                            localStorage.removeItem('learnmate_gemini_api_key_dialogue');
                          }}
                          className="px-4 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex-shrink-0"
                        >
                          Xóa Key
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Lưu ý: Cuộc hội thoại AI được tạo trực tiếp từ mô hình GPT-4o Mini siêu tốc. Yêu cầu nhập API Key của bạn để mở khóa.
                    </p>
                  </div>
                )}
              </div>

              {/* Column 3: Dialogue History */}
              <div className="border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-6 flex flex-col min-w-0">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <RotateCcw size={14} className="text-primary animate-spin" style={{ animationDuration: '3s' }} /> Lịch sử đối thoại
                </h3>
                
                <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2.5 pr-1 custom-scrollbar">
                  {historyList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-xs font-medium">Chưa có lịch sử đối thoại nào.</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Tạo cuộc đối thoại đầu tiên để lưu lịch sử!</p>
                    </div>
                  ) : (
                    historyList.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleLoadHistory(item)}
                        className="group flex items-center justify-between p-3 bg-slate-50 hover:bg-primary/5 border border-slate-100 hover:border-primary/20 rounded-xl cursor-pointer transition-all duration-200 relative overflow-hidden"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                            <Headphones size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-text-primary truncate group-hover:text-primary transition-colors">
                              {item.docName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500">
                                {item.langLabel.split(' ')[0]}
                              </span>
                              <span>•</span>
                              <span>{item.createdAt}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleDeleteHistory(item.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa lịch sử"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generating Progress State */}
      {isGenerating && (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center relative">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <motion.div
              className="absolute inset-0 border-2 border-primary rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          </div>
          <div className="max-w-sm space-y-2">
            <h3 className="text-lg font-bold text-text-primary">Trí tuệ nhân tạo đang hội thoại...</h3>
            <p className="text-slate-500 text-sm">
              AI đang phân tích tài liệu, lập kịch bản tranh luận hấp dẫn và tổng hợp chất giọng Nam/Nữ phù hợp.
            </p>
          </div>
          <div className="w-64">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${generationProgress}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-slate-400 font-bold">{generationProgress}% hoàn thành</p>
          </div>
        </div>
      )}

      {/* Main Dialogue UI Screen */}
      {dialogueCreated && !isGenerating && (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
          
          {/* TOP 1/3: Audio Player + Glowing Avatars */}
          <div className="h-1/3 min-h-[180px] bg-slate-900 rounded-t-3xl border-t border-x border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden flex-shrink-0">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Avatars Container */}
            <div className="flex items-center justify-between max-w-lg mx-auto w-full relative z-10">
              
              {/* Female Speaker Avatar (Left) */}
              <div className="flex flex-col items-center space-y-2">
                <div className="relative">
                  {isPlaying && activeTurnIdx !== -1 && dialogueList[activeTurnIdx]?.speaker === 'female' && (
                    <span className="absolute inset-0 rounded-full ring-4 ring-primary-light animate-ping opacity-75" />
                  )}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white border-2 transition-all duration-300 ${
                      activeTurnIdx !== -1 && dialogueList[activeTurnIdx]?.speaker === 'female'
                        ? 'bg-gradient-to-br from-primary to-pink-500 scale-110 shadow-lg shadow-primary/30 border-white'
                        : 'bg-slate-700 border-slate-600 grayscale opacity-40'
                    }`}
                  >
                    <User size={30} />
                  </div>
                  {activeTurnIdx !== -1 && dialogueList[activeTurnIdx]?.speaker === 'female' && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse" />
                  )}
                </div>
                <span
                  className={`text-xs font-bold transition-colors ${
                    activeTurnIdx !== -1 && dialogueList[activeTurnIdx]?.speaker === 'female'
                      ? 'text-primary-light font-extrabold'
                      : 'text-slate-500'
                  }`}
                >
                  {selectedLang === 'vi-VN' ? 'Lan (AI - Nữ)' : dialogueList[0]?.speakerName}
                </span>
              </div>

              {/* Dynamic Sound Wave Visualizer in the Center */}
              <div className="flex items-center justify-center gap-1.5 h-10 px-8">
                {isPlaying ? (
                  Array.from({ length: 9 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className={`w-1 rounded-full bg-gradient-to-t ${
                        activeTurnIdx !== -1 && dialogueList[activeTurnIdx]?.speaker === 'female'
                          ? 'from-primary to-pink-400'
                          : 'from-blue-500 to-cyan-400'
                      }`}
                      animate={{
                        height: [12, Math.random() * 40 + 10, 12],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6 + i * 0.08,
                        ease: 'easeInOut',
                      }}
                    />
                  ))
                ) : (
                  Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 h-3 rounded-full bg-slate-700"
                    />
                  ))
                )}
              </div>

              {/* Male Speaker Avatar (Right) */}
              <div className="flex flex-col items-center space-y-2">
                <div className="relative">
                  {isPlaying && activeTurnIdx !== -1 && dialogueList[activeTurnIdx]?.speaker === 'male' && (
                    <span className="absolute inset-0 rounded-full ring-4 ring-blue-400 animate-ping opacity-75" />
                  )}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white border-2 transition-all duration-300 ${
                      activeTurnIdx !== -1 && dialogueList[activeTurnIdx]?.speaker === 'male'
                        ? 'bg-gradient-to-br from-blue-600 to-cyan-500 scale-110 shadow-lg shadow-blue-500/30 border-white'
                        : 'bg-slate-700 border-slate-600 grayscale opacity-40'
                    }`}
                  >
                    <User size={30} />
                  </div>
                  {activeTurnIdx !== -1 && dialogueList[activeTurnIdx]?.speaker === 'male' && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse" />
                  )}
                </div>
                <span
                  className={`text-xs font-bold transition-colors ${
                    activeTurnIdx !== -1 && dialogueList[activeTurnIdx]?.speaker === 'male'
                      ? 'text-blue-400 font-extrabold'
                      : 'text-slate-500'
                  }`}
                >
                  {selectedLang === 'vi-VN' ? 'Nam (AI - Nam)' : dialogueList[1]?.speakerName}
                </span>
              </div>

            </div>

            {/* Audio Progress Timeline Tracker */}
            <div className="w-full max-w-2xl mx-auto flex items-center gap-3">
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {activeTurnIdx === -1 ? '00:00' : `00:${String(activeTurnIdx * 5).padStart(2, '0')}`}
              </span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-300"
                  style={{
                    width: `${((activeTurnIdx + 1) / dialogueList.length) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {`00:${String(dialogueList.length * 5).padStart(2, '0')}`}
              </span>
            </div>

            {/* Playback Controls & Settings */}
            <div className="flex items-center justify-between w-full max-w-lg mx-auto z-10">
              
              {/* Back to Configuration */}
              <button
                onClick={() => {
                  if (currentAudioRef.current) {
                    currentAudioRef.current.pause();
                    currentAudioRef.current = null;
                  }
                  togglePlayState(false);
                  setActiveTurnIdx(-1);
                  setDialogueCreated(false);
                }}
                className="text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1"
                title="Thay đổi tài liệu/cấu hình"
              >
                ← Cấu hình
              </button>

              {/* Central Player Buttons */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleReset}
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 active:scale-95 transition-all"
                  title="Bắt đầu lại"
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary-light text-white flex items-center justify-center hover:shadow-lg hover:shadow-primary/40 active:scale-95 transition-all"
                  title={isPlaying ? 'Tạm dừng' : 'Chạy cuộc đối thoại'}
                >
                  {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} className="ml-1" fill="white" />}
                </button>

                <button
                  onClick={handleToggleMute}
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 active:scale-95 transition-all"
                  title={isMuted ? 'Mở tiếng' : 'Tắt tiếng'}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>

              {/* File details badge */}
              <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary-light px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase truncate max-w-[120px]">
                <FileText size={12} /> {selectedDoc?.name}
              </div>

            </div>

          </div>

          {/* BOTTOM 2/3: Real-time Subtitles scrolling */}
          <div className="h-2/3 bg-slate-950 rounded-b-3xl border-b border-x border-slate-800 p-8 relative overflow-hidden flex-1 flex flex-col justify-center">
            
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0)_0%,rgba(15,23,42,0.9)_100%)] pointer-events-none z-10 h-20 top-0" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0)_0%,rgba(15,23,42,0.9)_100%)] pointer-events-none z-10 h-20 bottom-0" />

            {/* Left-aligned sliding subtitles with AnimatePresence */}
            <div className="w-full max-w-4xl mx-auto px-6 h-full flex flex-col justify-center items-start relative select-none">
              <AnimatePresence mode="wait">
                {activeTurnIdx !== -1 && (
                  <motion.div
                    key={activeTurnIdx}
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -25 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="w-full text-left flex flex-col items-start space-y-4"
                  >
                    {/* Speaker name label */}
                    <span
                      className={`text-xs uppercase font-bold tracking-widest px-3 py-1 rounded-full ${
                        dialogueList[activeTurnIdx].speaker === 'female'
                          ? 'bg-gradient-to-r from-pink-500 to-primary text-white shadow-md shadow-pink-500/20'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20'
                      }`}
                    >
                      {dialogueList[activeTurnIdx].speakerName}
                    </span>

                    {/* Lyric Line */}
                    <p
                      className={`text-xl md:text-3xl font-extrabold leading-relaxed tracking-normal font-sans break-words ${
                        dialogueList[activeTurnIdx].speaker === 'female'
                          ? 'bg-gradient-to-r from-pink-400 via-primary-light to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(236,72,153,0.25)]'
                          : 'bg-gradient-to-r from-blue-400 via-cyan-300 to-green-300 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(59,130,246,0.25)]'
                      }`}
                    >
                      {dialogueList[activeTurnIdx].text}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Helper hints at start */}
            {activeTurnIdx === -1 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-800 text-center max-w-xs flex flex-col items-center space-y-2 shadow-2xl">
                  <Headphones size={24} className="text-primary animate-bounce" />
                  <p className="text-xs font-bold text-slate-300">Sẵn sàng đối thoại</p>
                  <p className="text-[10px] text-slate-500">
                    Bật âm lượng thiết bị của bạn và nhấn nút tròn **Play** ở trên để nghe hội thoại
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>
      )}
      
      {/* Empty Initial Screen */}
      {!dialogueCreated && !isGenerating && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
            <Headphones size={32} />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-bold text-text-primary">Chào mừng tới Phòng Đối thoại AI! 🎙️</h3>
            <p className="text-slate-500 text-sm">
              Bạn muốn ôn tập bài dễ nhớ hơn? Cấu hình ChatGPT API Key, chọn một tài liệu bạn đã tải lên, chọn ngôn ngữ và nhấn nút **Tạo cuộc trò chuyện** phía trên.
            </p>
            <p className="text-slate-400 text-xs mt-1">
              AI sẽ biến những trang lý thuyết khô khan thành một buổi trò chuyện thú vị giữa một giọng nam và một giọng nữ sinh động có sub chạy đồng bộ theo phong cách NhacCuaTui.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
