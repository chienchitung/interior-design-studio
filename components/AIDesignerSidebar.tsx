import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Wand2, RefreshCw, CheckCircle2, Loader2, LayoutDashboard, AlertCircle, ImageIcon, Paperclip, FileText, X } from 'lucide-react';
import {
  chatWithDesigner,
  summarizeHistory,
  analyzeFloorPlanRooms,
  ChatMessage,
  DesignContext,
  RoomInfo,
} from '../services/geminiService';
import { ProjectBrief } from '../types';
import Button from './Button';

interface Props {
  isActive: boolean;
  floorPlan: File | null;
  realScenes: File[];
  context: DesignContext;
  onGenerate: (renderPrompt: string, projectBrief?: ProjectBrief | null, aiSummary?: string) => void;
  onProjectBriefChange?: (brief: ProjectBrief | null) => void;
  isGenerating: boolean;
}

// Extract [渲染指令: ...] tag from AI response
const extractRenderPrompt = (text: string): string | null => {
  const match = text.match(/\[渲染指令:([\s\S]+?)\][\s]*$/);
  return match ? match[1].trim() : null;
};

const extractProjectBrief = (text: string): ProjectBrief | null => {
  const match = text.match(/\[專案資料:\s*({[\s\S]*?})\s*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return {
      household: String(parsed.household || ''),
      area: String(parsed.area || ''),
      budget: String(parsed.budget || ''),
      painPoints: String(parsed.painPoints || ''),
      stylePreference: String(parsed.stylePreference || ''),
      rejectedElements: String(parsed.rejectedElements || ''),
      targetRoom: String(parsed.targetRoom || ''),
      constructionLimits: String(parsed.constructionLimits || ''),
      storageNeeds: String(parsed.storageNeeds || ''),
      lifestyleNotes: String(parsed.lifestyleNotes || ''),
      summary: String(parsed.summary || ''),
    };
  } catch {
    return null;
  }
};

const stripRenderTag = (text: string) =>
  text
    .replace(/\n?\[專案資料:\s*{[\s\S]*?}\s*\]/g, '')
    .replace(/\n?\[渲染指令:[\s\S]+?\][\s]*$/, '')
    .trim();

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: '你好，我是你的 AI 室內設計師。可以直接告訴我你的設計想法，也可以上傳平面圖、報價單或補充資料，我會陪你一起梳理生活需求、預算與風格方向。',
};

const MAX_REFERENCE_FILES = 6;
const MAX_REFERENCE_FILE_SIZE = 12 * 1024 * 1024;
const REFERENCE_FILE_ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'text/markdown',
  'text/rtf',
  'image/png',
  'image/jpeg',
  'image/webp',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.md',
  '.rtf',
].join(',');

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const summarizeReferenceFiles = (files: File[]) =>
  files.map(file => `${file.name}（${formatFileSize(file.size)}）`).join('、');

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
  isActive,
  floorPlan,
  realScenes,
  context,
  onGenerate,
  onProjectBriefChange,
  isGenerating,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false); // track IME composition
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);

  // Floor plan analysis
  const [analyzingRooms, setAnalyzingRooms] = useState(false);
  const [roomList, setRoomList] = useState<RoomInfo[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomInfo | null>(null);

  // Final render prompt (extracted from AI [渲染指令: ...] tag)
  const [renderPrompt, setRenderPrompt] = useState('');
  const [projectBrief, setProjectBrief] = useState<ProjectBrief | null>(null);

  // AI mode context: strip style/roomType so AI discovers them through conversation
  const aiContext: DesignContext = {
    style: '',
    roomType: '',
    hasFloorPlan: context.hasFloorPlan,
    hasRealScene: context.hasRealScene,
  };

  // ConversationSummaryBufferMemory: compress history after 10 rounds (20 messages)
  const SUMMARY_THRESHOLD = 20;
  const KEEP_RECENT = 6; // keep last 3 rounds verbatim
  const [conversationSummary, setConversationSummary] = useState('');
  const isSummarizingRef = useRef(false);

  // Typewriter animation for the initial assistant message.
  // Triggered when the AI tab becomes active for the first time — the component is
  // always mounted (CSS hidden), so mount-time effects fire before the user sees the tab.
  type TypingPhase = 'dots' | 'typing' | 'done';
  const [typingPhase, setTypingPhase] = useState<TypingPhase>('done');
  const [typedText, setTypedText] = useState(INITIAL_MESSAGE.content);
  const hasPlayedRef = useRef(false);
  const [animatedAssistantIndex, setAnimatedAssistantIndex] = useState<number | null>(null);
  const [animatedAssistantText, setAnimatedAssistantText] = useState('');
  const assistantTypingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    setTypingPhase('dots');
    setTypedText('');

    const dotTimer = setTimeout(() => {
      setTypingPhase('typing');
      const fullText = INITIAL_MESSAGE.content;
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setTypedText(fullText.slice(0, i));
        if (i >= fullText.length) {
          clearInterval(interval);
          setTypingPhase('done');
        }
      }, 18);
      return () => clearInterval(interval);
    }, 650);

    return () => clearTimeout(dotTimer);
  }, [isActive]);

  const animateAssistantMessage = useCallback((messageIndex: number, text: string) => {
    if (assistantTypingIntervalRef.current) {
      window.clearInterval(assistantTypingIntervalRef.current);
      assistantTypingIntervalRef.current = null;
    }

    setAnimatedAssistantIndex(messageIndex);
    setAnimatedAssistantText('');

    let i = 0;
    assistantTypingIntervalRef.current = window.setInterval(() => {
      i += 1;
      setAnimatedAssistantText(text.slice(0, i));
      if (i >= text.length) {
        if (assistantTypingIntervalRef.current) {
          window.clearInterval(assistantTypingIntervalRef.current);
          assistantTypingIntervalRef.current = null;
        }
        setAnimatedAssistantIndex(null);
        setAnimatedAssistantText('');
      }
    }, 12);
  }, []);

  useEffect(() => {
    return () => {
      if (assistantTypingIntervalRef.current) {
        window.clearInterval(assistantTypingIntervalRef.current);
      }
    };
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  const prevFloorPlanName = useRef('');
  const prevRealScenesCount = useRef(0);
  const chatInFlightRef = useRef(false);

  // Auto-resize textarea to content (max 5 lines)
  const adjustTextareaHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  };

  const addReferenceFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setError(null);

    const currentKeySet = new Set(referenceFiles.map(file => `${file.name}-${file.size}-${file.lastModified}`));
    const nextFiles = [...referenceFiles];
    const rejected: string[] = [];

    Array.from(fileList).forEach(file => {
      const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
      if (currentKeySet.has(fileKey)) return;
      if (nextFiles.length >= MAX_REFERENCE_FILES) {
        rejected.push(`${file.name}（已達 ${MAX_REFERENCE_FILES} 個上限）`);
        return;
      }
      if (file.size > MAX_REFERENCE_FILE_SIZE) {
        rejected.push(`${file.name}（超過 12MB）`);
        return;
      }

      currentKeySet.add(fileKey);
      nextFiles.push(file);
    });

    setReferenceFiles(nextFiles);
    if (rejected.length > 0) {
      setError(`部分檔案未加入：${rejected.join('、')}`);
    }
  };

  const handleReferenceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addReferenceFiles(e.target.files);
    if (referenceFileInputRef.current) referenceFileInputRef.current.value = '';
  };

  const removeReferenceFile = (index: number) => {
    setReferenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Background compression: fold messages older than KEEP_RECENT into a running summary.
  // Runs silently after each AI response — user never sees a loading state.
  const compressHistory = useCallback(async (snapshot: ChatMessage[], currentSummary: string) => {
    if (snapshot.length <= SUMMARY_THRESHOLD || isSummarizingRef.current) return;
    isSummarizingRef.current = true;
    const recentBuffer = snapshot.slice(-KEEP_RECENT);
    const toCompress  = snapshot.slice(0, -KEEP_RECENT);
    try {
      const newSummary = await summarizeHistory(currentSummary, toCompress);
      setConversationSummary(newSummary);
      // Preserve recentBuffer + any messages that arrived during compression
      setMessages(prev => {
        const addedDuring = prev.slice(snapshot.length);
        return [...recentBuffer, ...addedDuring];
      });
    } catch {
      // Silent failure — full history remains, no disruption to UX
    } finally {
      isSummarizingRef.current = false;
    }
  }, []);
  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, analyzingRooms]);

  // When floor plan changes → analyze rooms
  useEffect(() => {
    if (!isActive || !floorPlan || floorPlan.name === prevFloorPlanName.current) return;
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

        const roomNames = rooms.map(r => r.zhName).join('、');
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: roomNames
              ? `我已識別到：${roomNames}。請選擇想先渲染的空間，接著我會幫你整理視角、採光與風格需求。`
              : '我已讀取平面圖，但沒有穩定識別到房間名稱。你可以直接輸入想渲染的空間，例如客廳、主臥或廚房。',
          },
        ]);
      } catch (e: any) {
        setError('平面圖分析失敗：' + (e.message || '請再試一次'));
      } finally {
        setAnalyzingRooms(false);
      }
    };
    analyze();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, floorPlan]);

  // When real scenes change (and floor plan already present), notify AI
  useEffect(() => {
    if (!isActive || realScenes.length === 0 || !floorPlan) return;
    if (prevRealScenesCount.current === realScenes.length) return;
    prevRealScenesCount.current = realScenes.length;
    if (messages.length === 0) return;

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `已加入 ${realScenes.length} 張實景照片作為參考。下一步請選擇空間或描述你的設計偏好。`,
      },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, realScenes.length]);

  // Handle room selection from quick buttons
  const handleSelectRoom = useCallback(async (room: RoomInfo) => {
    if (chatInFlightRef.current || isLoading) return;

    setSelectedRoom(room);
    const attachmentNote = referenceFiles.length > 0 ? `\n\n已附加參考資料：${summarizeReferenceFiles(referenceFiles)}` : '';
    const userMsg = `我想渲染${room.zhName}。`;
    const userChatMsg: ChatMessage = { role: 'user', content: `${userMsg}${attachmentNote}` };
    const newHistory = [...messages, userChatMsg];
    setMessages(newHistory);
    chatInFlightRef.current = true;
    setIsLoading(true);
    try {
      const reply = await chatWithDesigner(
        messages,
        userMsg,
        referenceFiles.length > 0 ? referenceFiles : undefined,
        aiContext,
        roomList,
        conversationSummary || undefined
      );
      const extracted = extractRenderPrompt(reply);
      const brief = extractProjectBrief(reply);
      const displayed = stripRenderTag(reply);
      const nextMessages = [...newHistory, { role: 'assistant' as const, content: displayed }];
      setMessages(nextMessages);
      animateAssistantMessage(nextMessages.length - 1, displayed);
      if (extracted) setRenderPrompt(extracted);
      if (brief) {
        setProjectBrief(brief);
        onProjectBriefChange?.(brief);
      }
      compressHistory(nextMessages, conversationSummary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      chatInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [messages, aiContext, roomList, isLoading, referenceFiles, conversationSummary, compressHistory, animateAssistantMessage]);

  // Send user message
  const send = useCallback(async (text: string) => {
    const cleanText = text.trim();
    const hasReferences = referenceFiles.length > 0;
    if ((!cleanText && !hasReferences) || isLoading || chatInFlightRef.current) return;
    setInput('');
    // Reset textarea height after clearing
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setError(null);

    const messageText = cleanText || '請先閱讀我上傳的報價單或參考資料，整理重點並告訴我還缺哪些資訊。';
    const attachmentNote = hasReferences ? `\n\n已附加參考資料：${summarizeReferenceFiles(referenceFiles)}` : '';
    const userMsg: ChatMessage = { role: 'user', content: `${messageText}${attachmentNote}` };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    chatInFlightRef.current = true;
    setIsLoading(true);

    try {
      const reply = await chatWithDesigner(
        messages,
        messageText,
        hasReferences ? referenceFiles : undefined,
        aiContext,
        roomList.length > 0 ? roomList : undefined,
        conversationSummary || undefined
      );
      const extracted = extractRenderPrompt(reply);
      const brief = extractProjectBrief(reply);
      const displayed = stripRenderTag(reply);
      const nextMessages = [...nextHistory, { role: 'assistant' as const, content: displayed }];
      setMessages(nextMessages);
      animateAssistantMessage(nextMessages.length - 1, displayed);
      if (extracted) setRenderPrompt(extracted);
      if (brief) {
        setProjectBrief(brief);
        onProjectBriefChange?.(brief);
      }
      compressHistory(nextMessages, conversationSummary);
    } catch (e: any) {
      setError(e.message || '回應失敗，請再試一次。');
    } finally {
      chatInFlightRef.current = false;
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, isLoading, referenceFiles, aiContext, roomList, conversationSummary, compressHistory, animateAssistantMessage]);

  const clearAll = () => {
    setMessages([INITIAL_MESSAGE]);
    setRoomList([]);
    setSelectedRoom(null);
    setRenderPrompt('');
    setProjectBrief(null);
    setReferenceFiles([]);
    onProjectBriefChange?.(null);
    setAnimatedAssistantIndex(null);
    setAnimatedAssistantText('');
    setConversationSummary('');
    setError(null);
    prevFloorPlanName.current = '';
    prevRealScenesCount.current = 0;
    isSummarizingRef.current = false;
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-0">

      {/* Image status bar — read-only, managed by manual settings */}
      <div className="pb-3 border-b border-neutral-800/60 flex-shrink-0">
        {floorPlan ? (
          <div className="flex items-center gap-2 px-2.5 py-2 bg-neutral-800/60 rounded-lg border border-neutral-700/60">
            <ImageIcon size={11} className="text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-emerald-400 truncate">{floorPlan.name}</p>
              <p className="text-[9px] text-neutral-500">
                平面配置圖已載入
                {realScenes.length > 0 && `・${realScenes.length} 張實景照片`}
                {analyzingRooms && (
                  <span className="ml-1 text-indigo-400 inline-flex items-center gap-0.5">
                    <Loader2 size={8} className="animate-spin" /> 識別中...
                  </span>
                )}
              </p>
            </div>
            <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-2 bg-neutral-900/60 rounded-lg border border-neutral-800 border-dashed">
            <AlertCircle size={11} className="text-neutral-600 flex-shrink-0" />
            <p className="text-[10px] text-neutral-600">請先在「直接設定」上傳平面圖或現場照片</p>
          </div>
        )}
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

          {messages.map((msg, i) => {
            // Initial message — dots bubble → typewriter animation
            if (i === 0 && msg.role === 'assistant') {
              if (typingPhase === 'dots') {
                return (
                  <div key={i} className="flex justify-start gap-1.5 w-full">
                    <DesignerAvatar />
                    <div className="bg-neutral-800 px-3 py-2.5 rounded-xl rounded-bl-sm flex items-center gap-1">
                      {[0, 1, 2].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"
                          style={{ animationDelay: `${d * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className="flex justify-start gap-1.5 w-full">
                  <DesignerAvatar />
                  <div className="max-w-[78%] px-3 py-2 rounded-xl rounded-bl-sm bg-neutral-800 text-neutral-100 text-xs leading-relaxed break-words">
                    {typedText}
                    {typingPhase === 'typing' && (
                      <span className="inline-block w-0.5 h-[1em] bg-neutral-400 ml-0.5 align-middle animate-pulse" />
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-1.5 w-full`}>
                {msg.role === 'assistant' && <DesignerAvatar />}
                <div className={`max-w-[78%] px-3 py-2 rounded-xl text-xs leading-relaxed break-words ${
                  msg.role === 'user'
                    ? 'bg-neutral-700 text-white rounded-br-sm'
                    : 'bg-neutral-800 text-neutral-100 rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' && animatedAssistantIndex === i ? animatedAssistantText : msg.content}
                  {msg.role === 'assistant' && animatedAssistantIndex === i && (
                    <span className="inline-block w-0.5 h-[1em] bg-neutral-400 ml-0.5 align-middle animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}

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

      {projectBrief && (
        <div className="mb-2 bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-300 flex items-center gap-1">
              <CheckCircle2 size={11} className="text-indigo-400" /> 專案資料已整理
            </span>
            <span className="text-[9px] text-neutral-600">{projectBrief.targetRoom || '未指定空間'}</span>
          </div>
          <p className="text-[10px] text-neutral-500 leading-relaxed line-clamp-2">
            {projectBrief.summary || [projectBrief.household, projectBrief.area, projectBrief.stylePreference].filter(Boolean).join(' · ') || '已建立結構化需求資料'}
          </p>
        </div>
      )}

      {/* Input bar */}
      <div className="pt-2 space-y-2 flex-shrink-0 border-t border-neutral-800/60">
        {/* Textarea input — Claude-style: Enter to send, Shift+Enter for newline, IME-safe */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 focus-within:border-neutral-500 transition-all flex flex-col gap-1.5">
          <input
            ref={referenceFileInputRef}
            type="file"
            className="hidden"
            accept={REFERENCE_FILE_ACCEPT}
            multiple
            onChange={handleReferenceFileSelect}
          />

          {referenceFiles.length > 0 && (
            <div className="flex flex-col gap-1 pb-1">
              {referenceFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="flex items-center gap-2 rounded-lg border border-neutral-700/70 bg-neutral-900/70 px-2 py-1.5"
                >
                  <FileText size={12} className="text-indigo-300 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-neutral-200 truncate">{file.name}</p>
                    <p className="text-[9px] text-neutral-500">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReferenceFile(index)}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-neutral-500 hover:text-red-300 hover:bg-red-950/40 transition-all"
                    title="移除此附件"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

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
            placeholder={roomList.length > 0 && !selectedRoom ? '輸入想看的空間，例如客廳...' : '告訴 AI 你的生活需求，或上傳報價單/資料...'}
            disabled={isLoading || analyzingRooms}
            className="w-full bg-transparent text-xs text-white placeholder:text-neutral-600 outline-none resize-none leading-relaxed overflow-y-auto"
            style={{ minHeight: '20px', maxHeight: '110px' }}
          />
          {/* Action row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => referenceFileInputRef.current?.click()}
                disabled={isLoading || analyzingRooms || referenceFiles.length >= MAX_REFERENCE_FILES}
                className="w-6 h-6 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700 disabled:text-neutral-700 disabled:hover:bg-transparent rounded-lg flex items-center justify-center transition-all"
                title="上傳報價單或參考資料"
              >
                <Paperclip size={11} />
              </button>
              <span className="text-[9px] text-neutral-600 select-none truncate">
                {referenceFiles.length > 0
                  ? `${referenceFiles.length} 個附件會送給 AI`
                  : 'Enter 送出　Shift+Enter 換行'}
              </span>
            </div>
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
                disabled={(!input.trim() && referenceFiles.length === 0) || isLoading || analyzingRooms || isComposing}
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
              onGenerate(`[AI_BRIEF]\n${renderPrompt}`, projectBrief, projectBrief?.summary);
            } else if (selectedRoom) {
              // No render brief yet, but room is selected — use room spatial info as minimum context
              const fallback = `生成一張${selectedRoom.zhName}的照片級室內設計渲染圖。空間資訊：${selectedRoom.description}。請選擇最合適的視角和設計風格呈現此空間。`;
              onGenerate(`[AI_BRIEF]\n${fallback}`, projectBrief, projectBrief?.summary);
            } else {
              onGenerate('', projectBrief, projectBrief?.summary);
            }
          }}
          isLoading={isGenerating}
          className="w-full py-3 bg-gradient-to-r from-neutral-200 to-white hover:from-white hover:to-neutral-100 !text-black font-semibold text-sm rounded-full flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.97] transition-all border border-white/20 shadow-lg shadow-white/5"
          icon={<Wand2 size={15} className="text-indigo-600 animate-pulse" />}
        >
          {isGenerating ? '生成渲染中...' : renderPrompt ? '產生 AI 整理的方案' : '產生設計方案'}
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
