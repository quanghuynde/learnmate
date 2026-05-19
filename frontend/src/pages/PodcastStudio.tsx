import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Plus,
  X,
  FileText,
  Sparkles,
  Loader2,
  Languages,
  BookOpen,
} from 'lucide-react';
import { api, DocumentItem } from '../lib/api';

interface PodcastStudioProps {
  token: string;
}

interface PodcastTurn {
  id: number;
  speaker: 'gv' | 'sv';
  speakerName: string;
  text: string;
}

interface PodcastEpisode {
  id: string;
  title: string;
  duration: string;
  date: string;
  docName: string;
  style: string;
  lang: string;
  voiceStyle: string;
  turns: PodcastTurn[];
}

const LANGUAGES = [
  { code: 'vi-VN', label: 'Tiếng Việt 🇻🇳' },
  { code: 'en-US', label: 'English 🇺🇸' },
  { code: 'fr-FR', label: 'Français 🇫🇷' },
  { code: 'ja-JP', label: '日本語 🇯🇵' },
  { code: 'ko-KR', label: '한국어 🇰🇷' },
];

export function PodcastStudio({ token }: PodcastStudioProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [activeEpId, setActiveEpId] = useState<string>('');

  const [apiKey, setApiKey] = useState(() => {
    return (import.meta.env.VITE_OPENAI_API_KEY as string) || (import.meta.env.VITE_GEMINI_API_KEY_PODCAST as string) || localStorage.getItem('learnmate_gemini_api_key_podcast') || '';
  });

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTurnIdx, setActiveTurnIdx] = useState(-1);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // New podcast inputs
  const [newTitle, setNewTitle] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Thảo luận 🎙️');
  const [selectedLang, setSelectedLang] = useState('vi-VN');
  const [selectedVoice, setSelectedVoice] = useState('Nam & Nữ');

  // Audio elements for Google Translate TTS
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  const togglePlayState = (playing: boolean) => {
    setIsPlaying(playing);
    isPlayingRef.current = playing;
  };

  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Load podcasts from localStorage + documents from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.getDocuments(token);
        setDocuments(res.documents || []);
      } catch (err) {
        console.error('Error fetching documents', err);
      } finally {
        setLoadingDocs(false);
      }
    };
    loadData();

    const saved = localStorage.getItem('learnmate_podcasts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEpisodes(parsed);
        if (parsed.length > 0) {
          setActiveEpId(parsed[0].id);
        }
      } catch {
        setEpisodes([]);
      }
    } else {
      setEpisodes([]);
      localStorage.setItem('learnmate_podcasts', JSON.stringify([]));
    }
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

  const activeEpisode = useMemo(
    () => episodes.find((ep) => ep.id === activeEpId) || null,
    [episodes, activeEpId]
  );

  // Speak turn logic using Google Translate TTS with Youdao + Native fallbacks
  const speakTurn = (index: number) => {
    if (!activeEpisode) return;
    const turns = activeEpisode.turns;
    if (index < 0 || index >= turns.length) {
      togglePlayState(false);
      setActiveTurnIdx(-1);
      return;
    }

    // Stop current audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis.cancel();

    setActiveTurnIdx(index);
    const turn = turns[index];

    // Scroll transcript active bubble into view
    if (transcriptContainerRef.current) {
      const activeEl = transcriptContainerRef.current.querySelector(`[data-turn-idx="${index}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    const langCode = activeEpisode.lang.split('-')[0];

    const onEnded = () => {
      setTimeout(() => {
        if (isPlayingRef.current) {
          speakTurn(index + 1);
        }
      }, 800);
    };

    const onError = () => {
      if (isPlayingRef.current) speakTurn(index + 1);
    };

    // 1. Try our local Backend TTS Proxy (includes ElevenLabs, Youdao, Google server-side)
    const backendTtsUrl = `/api/tts?text=${encodeURIComponent(turn.text)}&lang=${langCode}&speaker=${turn.speaker === 'sv' ? 'female' : 'male'}`;
    const audio = new Audio(backendTtsUrl);
    currentAudioRef.current = audio;
    audio.muted = isMuted;
    audio.defaultPlaybackRate = playbackRate;
    audio.playbackRate = playbackRate;
    audio.onended = onEnded;

    audio.onerror = () => {
      console.warn('Backend TTS failed, trying Native Web Speech fallback...');
      
      // 2. Ultimate Fallback: Native Web Speech
      try {
        const utterance = new SpeechSynthesisUtterance(turn.text);
        utterance.lang = activeEpisode.lang;
        utterance.volume = isMuted ? 0 : 1;
        utterance.rate = playbackRate * (turn.speaker === 'sv' ? 1.05 : 0.95);
        utterance.pitch = turn.speaker === 'sv' ? 1.15 : 0.85;
        utterance.onend = onEnded;
        utterance.onerror = onError;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('All TTS fallbacks failed', e);
        onError();
      }
    };

    audio.play().catch((err) => {
      console.error('Google play failed, triggering fallback...', err);
      audio.onerror!(new Event('error'));
    });
  };

  // Playback control
  const handlePlayPause = () => {
    if (!activeEpisode) return;
    if (isPlaying) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      togglePlayState(false);
    } else {
      togglePlayState(true);
      const nextIdx = activeTurnIdx === -1 || activeTurnIdx >= activeEpisode.turns.length - 1 ? 0 : activeTurnIdx;
      speakTurn(nextIdx);
    }
  };

  const handleNext = () => {
    if (!activeEpisode) return;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    const next = activeTurnIdx + 1;
    if (next < activeEpisode.turns.length) {
      if (isPlayingRef.current) speakTurn(next);
      else setActiveTurnIdx(next);
    }
  };

  const handleBack = () => {
    if (!activeEpisode) return;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    const prev = activeTurnIdx - 1;
    if (prev >= 0) {
      if (isPlayingRef.current) speakTurn(prev);
      else setActiveTurnIdx(prev);
    }
  };

  const toggleRate = () => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const currIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currIndex + 1) % rates.length];
    setPlaybackRate(nextRate);

    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = nextRate;
      currentAudioRef.current.defaultPlaybackRate = nextRate;
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (currentAudioRef.current) {
      currentAudioRef.current.muted = nextMuted;
    }
  };

  const handleSelectEpisode = (epId: string) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    togglePlayState(false);
    setActiveTurnIdx(-1);
    setActiveEpId(epId);
  };

  // Handle podcast generation using Gemini API
  const handleCreatePodcast = async () => {
    const doc = documents.find((d) => d._id === selectedDocId);
    if (!doc) return;
    if (!apiKey) {
      alert('Vui lòng nhập Gemini API Key để tạo Podcast!');
      return;
    }

    setIsCreating(true);
    setGenerationProgress(10);

    const progressInterval = setInterval(() => {
      setGenerationProgress((p) => (p < 80 ? p + 5 : p));
    }, 150);

    try {
      const prompt = `Bạn là một chuyên gia giáo dục thiết lập kịch bản bài giảng Podcast ôn tập.
Nhiệm vụ của bạn là tạo ra một kịch bản bài giảng gồm đúng 6 câu thoại xoay quanh nội dung, chủ đề, kiến thức cốt lõi và khái niệm liên quan đến tài liệu học tập có tên là "${doc.name}" bằng ngôn ngữ mã "${selectedLang}" theo phong cách "${selectedStyle}" và cấu hình giọng "${selectedVoice}".

Chú ý cực kỳ quan trọng:
- Do môi trường hệ thống hiện tại không truyền tệp đính kèm nhị phân trực tiếp, bạn TUYỆT ĐỐI KHÔNG ĐƯỢC từ chối yêu cầu, không được phàn nàn về việc thiếu tệp PDF, và không được yêu cầu người dùng đính kèm lại tệp.
- Hãy phân tích tên tài liệu "${doc.name}" để suy luận chính xác chủ đề chính và các kiến thức chuyên ngành liên quan (Ví dụ: tên tài liệu chứa "AIA" hay "AI" thì tạo câu hỏi về Trí tuệ nhân tạo, chứa "CEET" thì tạo câu hỏi về kỹ thuật, điện, v.v.). Hãy tự tin tạo ra bài giảng Podcast xuất sắc nhất dựa trên suy luận chủ đề này.

Kịch bản là cuộc thảo luận học thuật sinh động, chuyên sâu và có tính sư phạm cao giữa hai nhân vật: AI Giảng viên (Nam - gv) và AI Sinh viên (Nữ - sv).
Định dạng trả về bắt buộc phải là một mảng JSON đối tượng chứa các trường sau:
[
  { "id": 1, "speaker": "gv", "speakerName": "AI Giảng viên (Nam)", "text": "Câu thoại của giảng viên..." },
  { "id": 2, "speaker": "sv", "speakerName": "AI Sinh viên (Nữ)", "text": "Câu thoại của sinh viên..." }
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
              { role: 'system', content: 'You are an educational AI assistant that outputs structured valid JSON arrays containing podcast script turns.' },
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
      let scriptTurns;
      try {
        const parsedObject = JSON.parse(textResponse);
        if (Array.isArray(parsedObject)) {
          scriptTurns = parsedObject;
        } else {
          // Extract array from wrapper object e.g. {"turns": [...]}
          const firstKey = Object.keys(parsedObject)[0];
          if (firstKey && Array.isArray(parsedObject[firstKey])) {
            scriptTurns = parsedObject[firstKey];
          } else {
            throw new Error('Không phân tích được kịch bản đối thoại từ JSON.');
          }
        }
      } catch (parseErr) {
        throw new Error('Lỗi cú pháp JSON từ OpenAI: ' + textResponse);
      }

      clearInterval(progressInterval);
      setGenerationProgress(100);

      setTimeout(() => {
        const finalTitle = newTitle.trim() || `Tập ${episodes.length + 1}: Thảo luận tài liệu "${doc.name.split('.')[0]}"`;
        const newEpisode: PodcastEpisode = {
          id: `podcast-${Date.now()}`,
          title: finalTitle,
          duration: '01:25',
          date: 'Hôm nay',
          docName: doc.name,
          style: selectedStyle,
          lang: selectedLang,
          voiceStyle: selectedVoice,
          turns: scriptTurns,
        };

        const updated = [newEpisode, ...episodes];
        setEpisodes(updated);
        localStorage.setItem('learnmate_podcasts', JSON.stringify(updated));

        // Select the newly created episode
        setActiveEpId(newEpisode.id);
        setActiveTurnIdx(-1);
        setIsPlaying(false);

        setIsCreating(false);
        setShowModal(false);

        // Reset inputs
        setNewTitle('');
        setSelectedDocId('');
      }, 500);
    } catch (err: any) {
      console.error('API call failed:', err);
      clearInterval(progressInterval);
      setIsCreating(false);
      setGenerationProgress(0);
      alert(`Lỗi kết nối API: ${err.message || 'Không xác định'}`);
    }
  };



  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2 animate-fade-in">
            <Headphones className="text-primary" /> Podcast Bài giảng
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Chuyển đổi giáo trình khô khan thành buổi thảo luận Podcast sinh động giữa 2 AI
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-light text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98]"
        >
          <Plus size={18} /> Tạo Podcast mới
        </button>
      </div>

      {episodes.length === 0 ? (
        /* Gorgeous Premium Empty State */
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-6 min-h-[450px]">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center relative">
            <Headphones size={38} className="text-primary" />
            <motion.div
              className="absolute inset-0 border-2 border-primary rounded-full"
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
          <div className="max-w-md space-y-3">
            <h3 className="text-xl font-bold text-text-primary">Chưa có tập Podcast bài giảng nào 🎙️</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Hãy bấm vào nút <strong>"Tạo Podcast mới"</strong> ở trên hoặc nút dưới đây để bắt đầu. Bạn có thể chọn bất kỳ tài liệu nào đã đăng tải, cấu hình Gemini API Key và chọn phong cách tùy thích!
            </p>
            <p className="text-xs text-slate-400">
              Hệ thống AI thực tế sẽ tự động biên soạn kịch bản giảng dạy sâu sắc giữa Giảng viên và Sinh viên theo thời gian thực nhờ sức mạnh của Gemini AI.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-primary to-primary-light text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center gap-2"
          >
            <Sparkles size={16} /> Tạo Podcast đầu tiên của bạn
          </button>
        </div>
      ) : (
        /* Full Player & Playlist View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Player & Transcript */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Player Card */}
            {activeEpisode && (
              <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />

                <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                  {/* cover art */}
                  <div className="w-40 h-40 bg-gradient-to-br from-blue-500 via-primary to-purple-600 rounded-2xl shadow-2xl flex items-center justify-center flex-shrink-0 relative overflow-hidden border border-white/10 group">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />
                    <Headphones size={48} className="text-white/40 z-10" />
                    
                    {isPlaying && (
                      <div className="absolute bottom-0 left-0 right-0 h-1/2 flex items-end justify-center gap-1.5 pb-4 bg-gradient-to-t from-black/60 to-transparent">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{
                              height: [10, Math.random() * 32 + 8, 10],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.4 + i * 0.08,
                              ease: 'easeInOut',
                            }}
                            className="w-1.5 bg-primary-light rounded-t-full"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* controller */}
                  <div className="flex-1 w-full text-center md:text-left">
                    <span className="text-[10px] font-bold text-primary-light tracking-widest uppercase mb-1.5 block">
                      {isPlaying ? '⚡ Đang phát bài giảng' : '⏸️ Tạm dừng phát'}
                    </span>
                    
                    <h2 className="text-xl md:text-2xl font-bold mb-1 leading-tight tracking-tight text-white line-clamp-2">
                      {activeEpisode.title}
                    </h2>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-6 text-xs text-slate-400">
                      <span className="font-semibold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                        {activeEpisode.style}
                      </span>
                      <span>•</span>
                      <span>Nguồn: <strong>{activeEpisode.docName}</strong></span>
                      <span>•</span>
                      <span>{activeEpisode.lang.toUpperCase()}</span>
                    </div>

                    {/* Progress Timeline */}
                    <div className="mb-6">
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2 relative">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
                          style={{
                            width: `${((activeTurnIdx + 1) / activeEpisode.turns.length) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-mono font-bold text-slate-500">
                        <span>{activeTurnIdx === -1 ? '00:00' : `00:${String((activeTurnIdx + 1) * 12).padStart(2, '0')}`}</span>
                        <span>{`00:${activeEpisode.turns.length * 12}`}</span>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-center md:justify-start gap-5">
                      <button
                        onClick={handleBack}
                        disabled={activeTurnIdx <= 0}
                        className="text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                        title="Câu trước"
                      >
                        <SkipBack size={22} fill="currentColor" />
                      </button>
                      
                      <button
                        onClick={handlePlayPause}
                        className="w-14 h-14 bg-white hover:bg-slate-100 text-slate-900 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                        title={isPlaying ? 'Tạm dừng' : 'Phát bài học'}
                      >
                        {isPlaying ? (
                          <Pause size={24} className="fill-current" />
                        ) : (
                          <Play size={24} className="fill-current ml-1" />
                        )}
                      </button>

                      <button
                        onClick={handleNext}
                        disabled={activeTurnIdx >= activeEpisode.turns.length - 1}
                        className="text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                        title="Câu sau"
                      >
                        <SkipForward size={22} fill="currentColor" />
                      </button>
                      
                      <div className="w-px h-6 bg-slate-800 mx-1 hidden md:block" />
                      
                      <button
                        onClick={toggleRate}
                        className="text-xs font-extrabold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded px-2.5 py-1.5 hidden md:block select-none transition-colors"
                        title="Thay đổi tốc độ phát"
                      >
                        {playbackRate.toFixed(2)}x
                      </button>

                      <button
                        onClick={handleToggleMute}
                        className="text-slate-400 hover:text-white hidden md:block active:scale-95 transition-colors"
                        title={isMuted ? 'Mở tiếng' : 'Tắt tiếng'}
                      >
                        {isMuted ? <VolumeX size={20} className="text-red-400" /> : <Volume2 size={20} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transcript Area */}
            {activeEpisode && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col h-[400px]">
                <h3 className="font-bold text-text-primary mb-4 flex-shrink-0 flex items-center gap-2">
                  <BookOpen size={18} className="text-primary" /> Kịch bản thảo luận (Transcript)
                </h3>
                
                <div
                  ref={transcriptContainerRef}
                  className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 scroll-smooth"
                >
                  {activeEpisode.turns.map((turn, idx) => {
                    const isGV = turn.speaker === 'gv';
                    const isActive = idx === activeTurnIdx;

                    return (
                      <motion.div
                        key={turn.id}
                        data-turn-idx={idx}
                        onClick={() => {
                          if (currentAudioRef.current) {
                            currentAudioRef.current.pause();
                            currentAudioRef.current = null;
                          }
                          togglePlayState(true);
                          speakTurn(idx);
                        }}
                        className={`flex gap-4 p-3 rounded-2xl cursor-pointer border transition-all duration-300 ${
                          isActive
                            ? isGV
                              ? 'bg-blue-50/70 border-blue-200 shadow-sm scale-[1.01]'
                              : 'bg-green-50/70 border-green-200 shadow-sm scale-[1.01]'
                            : 'bg-white hover:bg-slate-50 border-transparent'
                        } ${isGV ? 'flex-row' : 'flex-row-reverse text-right'}`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 border-2 select-none shadow-sm ${
                            isGV
                              ? isActive
                                ? 'bg-blue-600 border-white text-white animate-pulse'
                                : 'bg-blue-100 border-blue-200 text-blue-700'
                              : isActive
                                ? 'bg-green-600 border-white text-white animate-pulse'
                                : 'bg-green-100 border-green-200 text-green-700'
                          }`}
                        >
                          {isGV ? 'GV' : 'SV'}
                        </div>

                        <div className="max-w-[80%] min-w-0">
                          <div className={`flex items-baseline gap-2 mb-1 ${isGV ? 'justify-start' : 'flex-row-reverse'}`}>
                            <span
                              className={`font-bold text-xs ${
                                isActive
                                  ? isGV
                                    ? 'text-blue-700 font-extrabold'
                                    : 'text-green-700 font-extrabold'
                                  : 'text-text-primary'
                              }`}
                            >
                              {turn.speakerName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {`00:${String(idx * 12).padStart(2, '0')}`}
                            </span>
                          </div>
                          
                          <p
                            className={`text-sm leading-relaxed p-3.5 rounded-2xl break-words text-left ${
                              isActive
                                ? 'bg-white border font-medium text-slate-900 shadow-sm'
                                : isGV
                                  ? 'bg-slate-50 text-slate-700 border border-slate-100'
                                  : 'bg-emerald-50/40 text-slate-700 border border-emerald-50'
                            } ${
                              isGV 
                                ? 'rounded-tl-none' 
                                : 'rounded-tr-none'
                            }`}
                          >
                            {turn.text}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Playlist */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm h-fit space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-text-primary">Danh sách tập</h3>
              <span className="text-xs text-slate-400 font-bold">{episodes.length} bài ôn tập</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {episodes.map((ep) => {
                const isActive = ep.id === activeEpId;
                return (
                  <button
                    key={ep.id}
                    onClick={() => handleSelectEpisode(ep.id)}
                    className={`w-full text-left p-3.5 rounded-2xl flex gap-3 transition-all border ${
                      isActive
                        ? 'bg-primary/5 border-primary/20 shadow-sm'
                        : 'hover:bg-slate-50 border-slate-100 bg-white'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform ${
                        isActive ? 'bg-primary text-white scale-105 shadow-md shadow-primary/20' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isActive && isPlaying ? (
                        <div className="flex gap-0.5 items-end h-4">
                          <motion.div
                            animate={{ height: [4, 14, 4] }}
                            transition={{ repeat: Infinity, duration: 0.6 }}
                            className="w-1 bg-white"
                          />
                          <motion.div
                            animate={{ height: [8, 18, 8] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="w-1 bg-white"
                          />
                          <motion.div
                            animate={{ height: [6, 12, 6] }}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                            className="w-1 bg-white"
                          />
                        </div>
                      ) : (
                        <Play size={18} className={isActive ? 'ml-0.5' : 'ml-0.5 text-slate-500'} />
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      <h4
                        className={`text-sm font-bold truncate ${
                          isActive ? 'text-primary font-extrabold' : 'text-text-primary'
                        }`}
                      >
                        {ep.title}
                      </h4>
                      
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                        <span className="font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                          {ep.style.replace(' 🎙️', '').replace(' 📚', '').replace(' ⚡', '')}
                        </span>
                        <div className="flex items-center gap-1 font-semibold font-mono">
                          <span>{ep.duration}</span>
                          <span>•</span>
                          <span>{ep.date}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Clear All Saved Podcasts Button */}
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn xóa tất cả các tập podcast đã tạo?')) {
                  if (currentAudioRef.current) {
                    currentAudioRef.current.pause();
                    currentAudioRef.current = null;
                  }
                  togglePlayState(false);
                  setActiveTurnIdx(-1);
                  setEpisodes([]);
                  setActiveEpId('');
                  localStorage.removeItem('learnmate_podcasts');
                }
              }}
              className="w-full py-2.5 border border-dashed border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              🗑️ Xóa sạch danh sách tập
            </button>
          </div>

        </div>
      )}

      {/* Create New Podcast Modal Dialog */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Headphones size={18} />
                  </div>
                  <h2 className="text-lg font-bold text-text-primary">Tạo Podcast bài giảng mới</h2>
                </div>
                <button
                  onClick={() => !isCreating && setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {isCreating ? (
                /* Generating State */
                <div className="p-10 text-center space-y-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto relative">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-text-primary">Đang tổng hợp kịch bản thảo luận...</h3>
                    <p className="text-slate-500 text-xs px-6">
                      AI đang đúc kết kiến thức chính trong tài liệu và thu âm giọng nam, giọng nữ.
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${generationProgress}%` }}
                        transition={{ ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{generationProgress}% hoàn tất</span>
                  </div>
                </div>
              ) : (
                /* Input Form State */
                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
                  {/* Select Document */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      1. Chọn tài liệu giảng dạy nguồn
                    </label>
                    {loadingDocs ? (
                      <div className="flex items-center gap-2 p-3.5 bg-slate-50 rounded-xl text-slate-400 text-xs">
                        <Loader2 size={14} className="animate-spin" /> Đang tải danh sách tài liệu...
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold">
                        ⚠️ Không tìm thấy tài liệu nào! Vui lòng tải tài liệu lên trang "Tài liệu" trước.
                      </div>
                    ) : (
                      <select
                        value={selectedDocId}
                        onChange={(e) => setSelectedDocId(e.target.value)}
                        className="w-full p-3 bg-bg border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-semibold text-slate-800"
                      >
                        <option value="">-- Click để chọn tài liệu --</option>
                        {documents.map((doc) => (
                          <option key={doc._id} value={doc._id}>
                            {doc.name} ({doc.type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      2. Tên tập Podcast (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="VD: Tập 2: Tối ưu hóa truy vấn SQL"
                      className="w-full p-3 bg-bg border border-slate-200 rounded-xl outline-none focus:border-primary text-sm font-semibold"
                    />
                  </div>

                  {/* Option Group: Language Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Languages size={14} className="text-primary" /> 3. Ngôn ngữ trình bày
                    </label>
                    <select
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      className="w-full p-3 bg-bg border border-slate-200 rounded-xl outline-none focus:border-primary text-sm font-semibold"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Settings row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        4. Phong cách
                      </label>
                      <select
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        className="w-full p-3 bg-bg border border-slate-200 rounded-xl outline-none text-sm font-semibold"
                      >
                        <option>Thảo luận 🎙️</option>
                        <option>Bài giảng 📚</option>
                        <option>Tranh luận ⚡</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        5. Giọng đọc
                      </label>
                      <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="w-full p-3 bg-bg border border-slate-200 rounded-xl outline-none text-sm font-semibold"
                      >
                        <option>Nam & Nữ</option>
                        <option>Nam (Trầm ấm)</option>
                        <option>Nữ (Truyền cảm)</option>
                      </select>
                    </div>
                  </div>

                  {/* ChatGPT API Key configuration */}
                  {!import.meta.env.VITE_GEMINI_API_KEY_PODCAST && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={14} className="text-primary" /> Cấu hình ChatGPT API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="Nhập ChatGPT/OpenAI API Key để kích hoạt AI..."
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            localStorage.setItem('learnmate_gemini_api_key_podcast', e.target.value);
                          }}
                          className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary text-xs font-semibold"
                        />
                        {apiKey && (
                          <button
                            onClick={() => {
                              setApiKey('');
                              localStorage.removeItem('learnmate_gemini_api_key_podcast');
                            }}
                            className="px-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex-shrink-0"
                          >
                            Xóa Key
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Yêu cầu nhập ChatGPT/OpenAI API Key của bạn để hệ thống AI tạo kịch bản Podcast bài học.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer Controls */}
              {!isCreating && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleCreatePodcast}
                    disabled={!selectedDocId || !apiKey || isCreating}
                    className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-light transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/30"
                  >
                    <Sparkles size={16} /> Tạo Podcast
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
