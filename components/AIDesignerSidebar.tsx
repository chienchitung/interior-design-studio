import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Wand2, RefreshCw, CheckCircle2, Loader2, LayoutDashboard } from 'lucide-react';
import {
  chatWithDesigner,
  analyzeFloorPlanRooms,
  ChatMessage,
  DesignContext,
  RoomInfo,
} from '../services/geminiService';
import ImageUpload from './ImageUpload';
import Button from './Button';

interface Props {
  floorPlan: File | null;
  realScenes: File[];
  onFloorPlanChange: (f: File | null) => void;
  onRealScenesChange: (files: File[]) => void;
  context: DesignContext;
  onGenerate: (renderPrompt: string) => void;
  isGenerating: boolean;
}

// Extract [渲染指令: ...] tag from AI response
const extractRenderPrompt = (text: string): string | null => {
  const match = text.match(/\[渲染指令:([\s\S]+?)\][\s]*$/);
  return match ? match[1].trim() : null;
};
const stripRenderTag = (text: string) =>
  text.replace(/\n?\[渲染指令:[\s\S]+?\][\s]*$/, '').trim();

// AI designer avatar
const DesignerAvatar = () => (
  <div className="w-6 h-6 bg-neutral-700 border border-neutral-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
      <circle cx="12" cy="8" r="3.5"/>
      <path d="M5 20v-1a7 7 0 0 1 14 0v1"/>
      <path d="M18.5 4l1 1-1 1-1-1Z" strokeWidth="1.5" fill="currentColor"/>
    </svg>
  </div>
);

const AIDesignerSidebar: React.FC<Props> = ({
  floorPlan,
  realScenes,
  onFloorPlanChange,
  onRealScenesChange,
  context,
  onGenerate,
  isGenerating,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false); // track IME composition

  // Floor plan analysis
  const [analyzingRooms, setAnalyzingRooms] = useState(false);
  const [roomList, setRoomList] = useState<RoomInfo[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomInfo | null>(null);

  // Final render prompt (extracted from AI [渲染指令: ...] tag)
  const [renderPrompt, setRenderPrompt] = useState('');

  // AI mode context: strip style/roomType so AI discovers them through conversation
  const aiContext: DesignContext = {
    style: '',
    roomType: '',
    hasFloorPlan: context.hasFloorPlan,
    hasRealScene: context.hasRealScene,
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevFloorPlanName = useRef('');

  // Auto-resize textarea to content (max 5 lines)
  const adjustTextareaHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  };
  const initialized = useRef(false);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, analyzingRooms]);

  // Greet once on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const greet = async () => {
      setIsLoading(true);
      try {
        const reply = await chatWithDesigner(
          [],
          '你好，請先引導我開始空間設計流程。',
          undefined,
          aiContext,
          roomList.length > 0 ? roomList : undefined
        );
        setMessages([{ role: 'assistant', content: reply }]);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    greet();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When floor plan changes → analyze rooms
  useEffect(() => {
    if (!floorPlan || floorPlan.name === prevFloorPlanName.current) return;
    prevFloorPlanName.current = floorPlan.name;

    const analyze = async () => {
      setAnalyzingRooms(true);
      setRoomList([]);
      setSelectedRoom(null);
      setRenderPrompt('');
      setError(null);

      try {
        const files = [floorPlan, ...realScenes];
        const rooms = await analyzeFloorPlanRooms(files);
        setRoomList(rooms);

        // Notify AI about what was found
        const roomNames = rooms.map(r => r.zhName).join('、');
        const userMsg: ChatMessage = {
          role: 'user',
          content: `我已上傳平面配置圖，系統識別到：${roomNames}。`
        };
        const newHistory = [...messages, userMsg];
        setMessages(newHistory);

        const reply = await chatWithDesigner(
          messages,
          `我已上傳平面配置圖，系統識別到：${roomNames}。請問我應該先渲染哪個空間？`,
          undefined,
          aiContext,
          rooms
        );
        setMessages([...newHistory, { role: 'assistant', content: reply }]);
      } catch (e: any) {
        setError('平面圖分析失敗：' + (e.message || '請再試一次'));
      } finally {
        setAnalyzingRooms(false);
      }
    };
    analyze();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorPlan]);

  // When real scenes change (and floor plan already present), notify AI
  useEffect(() => {
    if (realScenes.length === 0 || !floorPlan) return;
    if (messages.length === 0) return;

    const notify = async () => {
      const userMsg: ChatMessage = {
        role: 'user',
        content: `我另外上傳了 ${realScenes.length} 張實景照片作為參考。`
      };
      const newHistory = [...messages, userMsg];
      setMessages(newHistory);
      setIsLoading(true);
      try {
        const reply = await chatWithDesigner(
          messages,
          `我另外上傳了 ${realScenes.length} 張實景照片作為參考。`,
          realScenes,
          aiContext,
          roomList.length > 0 ? roomList : undefined
        );
        setMessages([...newHistory, { role: 'assistant', content: reply }]);
      } catch {
        // silent fail for scene upload notification
      } finally {
        setIsLoading(false);
      }
    };
    notify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realScenes.length]);

  // Handle room selection from quick buttons
  const handleSelectRoom = useCallback(async (room: RoomInfo) => {
    setSelectedRoom(room);
    const userMsg = `我想渲染${room.zhName}。`;
    const userChatMsg: ChatMessage = { role: 'user', content: userMsg };
    const newHistory = [...messages, userChatMsg];
    setMessages(newHistory);
    setIsLoading(true);
    try {
      const reply = await chatWithDesigner(
        messages,
        userMsg,
        undefined,
        aiContext,
        roomList
      );
      const extracted = extractRenderPrompt(reply);
      const displayed = extracted ? stripRenderTag(reply) : reply;
      setMessages([...newHistory, { role: 'assistant', content: displayed }]);
      if (extracted) setRenderPrompt(extracted);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [messages, aiContext, roomList]);

  // Send user message
  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput('');
    // Reset textarea height after clearing
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setError(null);

    const userMsg: ChatMessage = { role: 'user', content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setIsLoading(true);

    try {
      const reply = await chatWithDesigner(
        messages,
        text,
        undefined,
        aiContext,
        roomList.length > 0 ? roomList : undefined
      );
      const extracted = extractRenderPrompt(reply);
      const displayed = extracted ? stripRenderTag(reply) : reply;
      setMessages([...nextHistory, { role: 'assistant', content: displayed }]);
      if (extracted) setRenderPrompt(extracted);
    } catch (e: any) {
      setError(e.message || '回應失敗，請再試一次。');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, isLoading, aiContext, roomList]);

  const clearAll = () => {
    setMessages([]);
    setRoomList([]);
    setSelectedRoom(null);
    setRenderPrompt('');
    setError(null);
    prevFloorPlanName.current = '';
    initialized.current = false;
    setTimeout(() => { initialized.current = false; }, 0);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-0">

      {/* Image upload strip */}
      <div className="pb-3 border-b border-neutral-800/60 flex-shrink-0 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          上傳圖片
          {analyzingRooms && (
            <span className="ml-2 text-indigo-400 font-normal flex-shrink-0 inline-flex items-center gap-1 normal-case">
              <Loader2 size={9} className="animate-spin" /> 正在識別空間...
            </span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ImageUpload label="平面配置圖" description="AI 自動識別空間"
            file={floorPlan} onFileChange={onFloorPlanChange} compact />
          <ImageUpload label="實景照片" description="可多張"
            multiple files={realScenes} onFilesChange={onRealScenesChange} compact />
        </div>
      </div>

      {/* Room selection chips (shown after floor plan analysis) */}
      {roomList.length > 0 && !selectedRoom && (
        <div className="py-2.5 border-b border-neutral-800/60 flex-shrink-0">
          <p className="text-[10px] font-bold text-neutral-500 mb-2 flex items-center gap-1">
            <LayoutDashboard size={10} />
            已識別 {roomList.length} 個空間，選擇要渲染的房間：
          </p>
          <div className="flex flex-wrap gap-1.5">
            {roomList.map(room => (
              <button
                key={room.key}
                onClick={() => handleSelectRoom(room)}
                disabled={isLoading}
                className="text-[11px] font-semibold px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-500 text-neutral-200 rounded-lg transition-all disabled:opacity-50"
              >
                {room.zhName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected room badge */}
      {selectedRoom && !renderPrompt && (
        <div className="py-1.5 border-b border-neutral-800/60 flex-shrink-0 flex items-center gap-2">
          <span className="text-[10px] text-neutral-500">渲染目標：</span>
          <span className="text-[11px] font-bold text-white bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-md">
            {selectedRoom.zhName}
          </span>
          <button
            onClick={() => setSelectedRoom(null)}
            className="text-[9px] text-neutral-600 hover:text-neutral-400 ml-auto"
          >
            更換
          </button>
        </div>
      )}

      {/* Chat messages — scrollable region with proper padding so scrollbar never overlaps content */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
        <div className="flex flex-col gap-2.5 py-3 pr-3 pl-0.5 min-h-full">

          {messages.length === 0 && !isLoading && !analyzingRooms && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 py-8">
              <div className="w-11 h-11 bg-neutral-800 border border-neutral-700 rounded-2xl flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                  <circle cx="12" cy="8" r="3.5"/>
                  <path d="M5 20v-1a7 7 0 0 1 14 0v1"/>
                  <path d="M18.5 4l1 1-1 1-1-1Z" strokeWidth="1.5" fill="currentColor"/>
                </svg>
              </div>
              <p className="text-xs text-neutral-500 text-center leading-relaxed">
                上傳平面圖後 AI 自動識別空間<br />選擇房間 → 討論設計 → 精準渲染
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-1.5 w-full`}>
              {msg.role === 'assistant' && <DesignerAvatar />}
              <div className={`max-w-[78%] px-3 py-2 rounded-xl text-xs leading-relaxed break-words ${
                msg.role === 'user'
                  ? 'bg-neutral-700 text-white rounded-br-sm'
                  : 'bg-neutral-800 text-neutral-100 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {(isLoading || analyzingRooms) && (
            <div className="flex justify-start gap-1.5">
              <DesignerAvatar />
              <div className="bg-neutral-800 px-3 py-2.5 rounded-xl rounded-bl-sm flex items-center gap-1">
                {[0, 1, 2].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${d * 0.16}s` }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-[10px] text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-2.5 py-1.5 mr-1">
              {error}
            </div>
          )}

          {/* Scroll anchor — sits inside the padded inner div */}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Render prompt ready indicator */}
      {renderPrompt && (
        <div className="mb-2 bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={11} /> 精準渲染指令已就緒
            </span>
            <button onClick={() => setRenderPrompt('')}
              className="text-[9px] text-neutral-600 hover:text-neutral-400">清除</button>
          </div>
          <p className="text-[10px] text-neutral-400 leading-relaxed line-clamp-3">{renderPrompt}</p>
        </div>
      )}

      {/* Input bar */}
      <div className="pt-2 space-y-2 flex-shrink-0 border-t border-neutral-800/60">
        {/* Textarea input — Claude-style: Enter to send, Shift+Enter for newline, IME-safe */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 focus-within:border-neutral-500 transition-all flex flex-col gap-1.5">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={e => {
              // Only send on Enter when: not composing IME, not pressing Shift
              if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              setInput((e.target as HTMLTextAreaElement).value);
            }}
            placeholder={roomList.length > 0 && !selectedRoom ? '輸入想渲染的空間名稱...' : '詢問 AI 設計師...'}
            disabled={isLoading || analyzingRooms}
            className="w-full bg-transparent text-xs text-white placeholder:text-neutral-600 outline-none resize-none leading-relaxed overflow-y-auto"
            style={{ minHeight: '20px', maxHeight: '110px' }}
          />
          {/* Action row */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-neutral-600 select-none">
              Enter 送出　Shift+Enter 換行
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={clearAll}
                className="w-6 h-6 text-neutral-600 hover:text-neutral-400 hover:bg-neutral-700 rounded-lg flex items-center justify-center transition-all"
                title="清除所有對話"
              >
                <RefreshCw size={10} />
              </button>
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isLoading || analyzingRooms || isComposing}
                className="w-6 h-6 bg-neutral-600 hover:bg-neutral-500 disabled:bg-neutral-700 disabled:text-neutral-600 text-white rounded-lg flex items-center justify-center transition-all"
              >
                <Send size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={() => {
            if (renderPrompt) {
              // Full AI brief — most accurate
              onGenerate(`[AI_BRIEF]\n${renderPrompt}`);
            } else if (selectedRoom) {
              // No render brief yet, but room is selected — use room spatial info as minimum context
              const fallback = `生成一張${selectedRoom.zhName}的照片級室內設計渲染圖。空間資訊：${selectedRoom.description}。請選擇最合適的視角和設計風格呈現此空間。`;
              onGenerate(`[AI_BRIEF]\n${fallback}`);
            } else {
              onGenerate('');
            }
          }}
          isLoading={isGenerating}
          className="w-full py-3 bg-gradient-to-r from-neutral-200 to-white hover:from-white hover:to-neutral-100 !text-black font-semibold text-sm rounded-full flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.97] transition-all border border-white/20 shadow-lg shadow-white/5"
          icon={<Wand2 size={15} className="text-indigo-600 animate-pulse" />}
        >
          {isGenerating ? '生成渲染中...' : renderPrompt ? '依 AI 設計指令渲染' : '渲染設計方案'}
        </Button>

        {!renderPrompt && (
          <p className="text-[10px] text-neutral-600 text-center">
            {roomList.length > 0 && !selectedRoom
              ? '↑ 點選上方空間或輸入房間名稱以開始'
              : '與 AI 完成討論後可獲得精準渲染指令'}
          </p>
        )}
      </div>
    </div>
  );
};

export default AIDesignerSidebar;
