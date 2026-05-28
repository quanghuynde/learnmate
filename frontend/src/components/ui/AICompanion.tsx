import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot } from 'lucide-react';
import { api } from '../../lib/api';

type MessageItem = {
  id: number;
  text: string;
  isAi: boolean;
};

interface AICompanionProps {
  token: string;
  currentPage: string;
}

export function AICompanion({ token, currentPage }: AICompanionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 1,
      text: 'Chào bạn, mình có thể hướng dẫn trực tiếp trên màn hình hiện tại.',
      isAi: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const triggerHighlight = (selector: string, durationMs = 5000) => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    el.classList.add('learnmate-ai-highlight');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      el.classList.remove('learnmate-ai-highlight');
    }, Math.max(1200, durationMs));
  };

  const cssEscape = (value: string) => {
    if (typeof (window as any).CSS?.escape === 'function') return (window as any).CSS.escape(value);
    return value.replace(/([^\w-])/g, '\\$1');
  };

  const toSelector = (el: Element): string | null => {
    if (!(el instanceof HTMLElement)) return null;
    if (el.id) return `#${cssEscape(el.id)}`;
    const aiId = el.getAttribute('data-ai-id');
    if (aiId) return `[data-ai-id="${aiId}"]`;
    if (el.getAttribute('name')) return `${el.tagName.toLowerCase()}[name="${el.getAttribute('name')}"]`;
    return null;
  };

  const collectUIContext = () => {
    const targets = Array.from(
      document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')
    ).slice(0, 40);
    const visibleActions = targets
      .map((el) => {
        const selector = toSelector(el);
        if (!selector) return null;
        const rect = (el as HTMLElement).getBoundingClientRect();
        const inViewport = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
        if (!inViewport) return null;
        const label =
          (el as HTMLElement).innerText?.trim() ||
          (el as HTMLInputElement).placeholder?.trim() ||
          el.getAttribute('aria-label') ||
          el.getAttribute('name') ||
          el.tagName.toLowerCase();
        return {
          selector,
          kind: el.tagName.toLowerCase(),
          label: label.slice(0, 80),
        };
      })
      .filter(Boolean) as Array<{ selector: string; kind: string; label: string }>;

    const semanticTargets: Record<string, string> = {
      knowledge_map: '[data-tour="knowledge-map"], main',
      today_tasks: '[data-tour="today-tasks"], main',
      dashboard_overview: '[data-tour="dashboard-overview"], main',
      planner_list: '[data-tour="planner-list"], main',
      documents_list: '[data-tour="documents-list"], main',
      quiz_builder: '[data-tour="quiz-builder"], main',
      exam_readiness: '[data-tour="exam-readiness"], main',
      progress_overview: '[data-tour="progress-overview"], main',
    };

    return {
      currentPage,
      pageTitle: document.title,
      path: window.location.pathname,
      semanticTargets,
      visibleActions,
    };
  };

  const resolveSelector = (action: { target: string; selector?: string }, semanticTargets: Record<string, string>) => {
    if (action.selector) return action.selector;
    return semanticTargets[action.target] || action.target;
  };

  const runAction = (
    action: { type: 'highlight' | 'click' | 'focus' | 'scroll_to'; target: string; selector?: string; durationMs?: number },
    semanticTargets: Record<string, string>
  ) => {
    const selector = resolveSelector(action, semanticTargets);
    if (!selector) return;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    triggerHighlight(selector, action.durationMs || 5000);
    if (action.type === 'scroll_to') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (action.type === 'focus' && typeof el.focus === 'function') {
      el.focus();
      return;
    }
    if (action.type === 'click') {
      el.click();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const userText = input.trim();

    setMessages((prev) => [...prev, { id: Date.now(), text: userText, isAi: false }]);
    setInput('');
    setIsSending(true);

    try {
      const uiContext = collectUIContext();
      const res = await api.askAiAssistant(token, {
        message: userText,
        uiContext,
      });
      const actionNote = (res.actions || [])
        .map((x) => x.instruction)
        .filter(Boolean)
        .join('\n');
      const replyText = actionNote ? `${res.message}\n${actionNote}` : res.message;
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: replyText, isAi: true }]);
      (res.actions || []).forEach((action) => runAction(action, uiContext.semanticTargets || {}));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể gọi trợ lý AI';
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: message, isAi: true }]);
    } finally {
      setIsSending(false);
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
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Trợ lý AI LEARNMATE</h3>
                  <p className="text-xs text-white/80">Hướng dẫn theo màn hình bạn đang mở</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isAi ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2 text-sm ${
                      msg.isAi
                        ? 'bg-white border border-slate-100 text-text-primary rounded-tl-sm shadow-sm'
                        : 'bg-primary text-white rounded-tr-sm shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2 bg-bg rounded-full px-4 py-2 border border-slate-200 focus-within:border-primary-light focus-within:ring-2 focus-within:ring-primary-light/20 transition-all">
                <input
                  type="text"
                  placeholder="Mô tả việc bạn muốn làm..."
                  className="bg-transparent border-none outline-none flex-1 text-sm text-text-primary"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  className={`p-1.5 rounded-full transition-colors ${
                    input.trim() && !isSending ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
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
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </motion.button>
    </div>
  );
}
