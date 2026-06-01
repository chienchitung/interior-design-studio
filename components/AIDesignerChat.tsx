import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, ChevronRight, CheckCircle2, Armchair } from 'lucide-react';
import { chatWithDesigner, ChatMessage } from '../services/geminiService';

interface Props {
  onClose: () => void;
  onApplySummary: (summary: string) => void;
}

const QUICK_REPLIES: Record<number, string[]> = {
  0: ['20坪以下', '20–35坪', '35–50坪', '50坪以上'],
  1: ['單身獨居', '兩人同住', '三口之家', '三代同堂'],
  2: ['收納嚴重不足', '採光通風不佳', '格局浪費空間', '老舊需要翻新'],
  3: ['50萬以內', '50–100萬', '100–200萬', '200萬以上'],
  4: ['北歐簡約', '日式侘寂', '現代輕奢', '工業風'],
};

const SUMMARY_START = '[設計需求摘要開始]';
const SUMMARY_END = '[設計需求摘要結束]';
const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: '你好，我會用幾個問題快速整理你的設計需求。可以直接選下方選項，也可以用文字補充。',
};

const extractSummary = (text: string): string | null => {
  const start = text.indexOf(SUMMARY_START);
  const end = text.indexOf(SUMMARY_END);
  if (start === -1 || end === -1) return null;
  return text.slice(start + SUMMARY_START.length, end).trim();
};

const AIDesignerChat: React.FC<Props> = ({ onClose, onApplySummary }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading || requestInFlightRef.current) return;
    setInput('');
    setError(null);

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    requestInFlightRef.current = true;
    setIsLoading(true);

    try {
      const reply = await chatWithDesigner(
        messages,
        text
      );

      const extracted = extractSummary(reply);
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setMessages([...nextHistory, assistantMsg]);

      if (extracted) {
        setSummary(extracted);
      } else {
        setQuestionIndex(q => Math.min(q + 1, 5));
      }
    } catch (e: any) {
      setError(e.message || '回應失敗，請再試一次。');
    } finally {
      requestInFlightRef.current = false;
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleApply = () => {
    if (summary) {
      onApplySummary(summary);
      onClose();
    }
  };

  const currentQuickReplies = !summary && questionIndex < 5 ? QUICK_REPLIES[questionIndex] : [];

  return (
    <div
      className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-[85vh] max-h-[700px] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Armchair size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">AI 設計師訪談</p>
              <p className="text-[10px] text-neutral-500">回答後自動整理設計需求摘要</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-neutral-800/60 flex-shrink-0">
          {['坪數', '成員', '痛點', '預算', '風格', '摘要'].map((label, i) => {
            const done = summary ? true : i < questionIndex;
            const active = !summary && i === questionIndex;
            return (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-500'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-[8px] font-medium ${active ? 'text-indigo-400' : done ? 'text-emerald-400' : 'text-neutral-600'}`}>
                    {label}
                  </span>
                </div>
                {i < 5 && <div className={`flex-1 h-px mt-[-6px] ${done && !active ? 'bg-emerald-500/40' : 'bg-neutral-800'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.map((msg, i) => {
            const isSummaryMsg = msg.role === 'assistant' && msg.content.includes(SUMMARY_START);
            const displayContent = isSummaryMsg
              ? msg.content.split(SUMMARY_START)[0].trim()
              : msg.content;

            return (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <Sparkles size={12} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-neutral-800 text-neutral-100 rounded-bl-md'
                }`}>
                  {displayContent}
                </div>
              </div>
            );
          })}

          {/* Summary card */}
          {summary && (
            <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">設計需求摘要已完成</span>
              </div>
              <p className="text-xs text-neutral-300 whitespace-pre-line leading-relaxed">{summary}</p>
              <button
                onClick={handleApply}
                className="w-full py-2.5 bg-white hover:bg-neutral-100 text-black text-sm font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <ChevronRight size={15} />
                套用至設計需求並開始生成
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                <Sparkles size={12} className="text-white animate-pulse" />
              </div>
              <div className="bg-neutral-800 px-4 py-2.5 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                {[0, 1, 2].map(d => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        {currentQuickReplies.length > 0 && !isLoading && (
          <div className="flex gap-1.5 px-4 pb-2 flex-wrap flex-shrink-0">
            {currentQuickReplies.map(r => (
              <button
                key={r}
                onClick={() => send(r)}
                className="text-[11px] bg-neutral-800 hover:bg-indigo-900 hover:border-indigo-700 border border-neutral-700 text-neutral-300 hover:text-white px-2.5 py-1 rounded-full transition-all"
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        {!summary && (
          <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-neutral-800/60">
            <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
                placeholder="輸入您的回答..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-600 outline-none"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isLoading}
                className="w-7 h-7 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded-lg flex items-center justify-center transition-all flex-shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIDesignerChat;
