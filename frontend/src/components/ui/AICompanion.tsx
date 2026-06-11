import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AICompanionProps {
  token: string;
  currentPage: string;
}

export function AICompanion({ token, currentPage }: AICompanionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Chào bạn! Tôi có thể giúp gì cho bạn?',
      isAi: true
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      text: input,
      isAi: false
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const uiContext = {
        currentPage,
        semanticTargets: {} // Backend will handle heuristics
      };

      const response = await api.askAssistantGuide(token, input, uiContext, messages.slice(-10));
      
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          text: response.message,
          isAi: true
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          text: 'Rất tiếc, mình đang gặp chút trục trặc. Bạn thử lại sau nhé!',
          isAi: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-card w-[350px] rounded-2xl shadow-2xl border border-slate-100 mb-4 overflow-hidden flex flex-col h-[450px]"
          >
            <div className="bg-gradient-to-r from-primary to-primary-light p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-white p-0.5 rounded-lg overflow-hidden w-8 h-8 flex items-center justify-center">
                  <img src="/lmLogo.png" alt="LM Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Trợ lý AI LEARNMATE</h3>
                  <p className="text-xs text-white/80">Luôn sẵn sàng hỗ trợ</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isAi ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.isAi
                        ? 'bg-white border border-slate-100 text-text-primary rounded-tl-sm shadow-sm'
                        : 'bg-primary text-white rounded-tr-sm shadow-sm'
                    }`}
                  >
                    <div className="format-markdown leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <Loader2 size={16} className="animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2 bg-bg rounded-full px-4 py-2 border border-slate-200 focus-within:border-primary-light focus-within:ring-2 focus-within:ring-primary-light/20 transition-all">
                <input
                  type="text"
                  placeholder="Hỏi AI bất cứ điều gì..."
                  className="bg-transparent border-none outline-none flex-1 text-sm text-text-primary"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className={`p-1.5 rounded-full transition-colors ${
                    input.trim() && !loading ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/30 flex items-center justify-center relative"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 rounded-full bg-primary-light/30"
        />
        {isOpen ? (
          <X size={24} />
        ) : (
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 shadow-inner">
            <img 
              src="/lmLogo.png" 
              alt="AI" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </motion.button>
    </div>
  );
}