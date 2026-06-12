import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Send, RefreshCw, CheckCircle2, Loader2, LayoutDashboard, AlertCircle, ImageIcon, Paperclip, FileText, X, Maximize2, Minimize2, Armchair, Sparkles, ChevronDown, Archive } from 'lucide-react';
import {
  chatWithDesigner,
  summarizeHistory,
  analyzeFloorPlanRooms,
  ChatMessage,
  DesignContext,
  RoomInfo,
} from '../services/geminiService';
import { ProjectBrief } from '../types';

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

type TypingPhase = 'dots' | 'typing' | 'done';
type ChatSurface = 'sidebar' | 'expanded';

const compactText = (value: string, maxLength = 34) => {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1)}…`;
};

const getDesignDirectionSummary = (
  brief: ProjectBrief | null,
  renderPrompt: string,
  selectedRoom: RoomInfo | null
) => {
  const briefSummary = brief?.summary?.trim();
  if (briefSummary) return briefSummary;

  const readableBrief = [
    brief?.targetRoom,
    brief?.stylePreference,
    brief?.storageNeeds,
    brief?.lifestyleNotes,
  ].filter(Boolean).join('，');
  if (readableBrief) return readableBrief;

  const promptSummary = renderPrompt
    .replace(/^生成一張/, '')
    .replace(/照片級室內設計渲染圖。?/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (promptSummary) return promptSummary;

  return selectedRoom
    ? `已依 ${selectedRoom.zhName} 的討論內容整理設計方向。`
    : '已依 AI 對話整理設計方向。';
};

const getDesignDirectionTags = (
  brief: ProjectBrief | null,
  selectedRoom: RoomInfo | null
) => {
  const tags = [
    brief?.targetRoom || selectedRoom?.zhName,
    brief?.stylePreference,
    brief?.budget,
    brief?.storageNeeds,
    brief?.constructionLimits,
  ]
    .filter((tag): tag is string => Boolean(tag?.trim()))
    .map(tag => compactText(tag, 12));

  return Array.from(new Set(tags)).slice(0, 4);
};

// AI designer avatar
const DesignerAvatar = () => (
  <div className="w-6 h-6 bg-neutral-700 border border-neutral-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
      <rect x="3" y="6" width="18" height="14" rx="3"/>
      <circle cx="8.5" cy="13" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="15.5" cy="13" r="1.5" fill="currentColor" stroke="none"/>
      <path d="M9 17h6"/>
      <path d="M12 6V4"/>
      <path d="M10 2.5l2 1.5 2-1.5" strokeWidth="1.8"/>
    </svg>
  </div>
);

const TypingDots = ({ surface }: { surface: ChatSurface }) => (
  <div className={`${surface === 'expanded' ? 'px-4 py-3 rounded-2xl' : 'px-3 py-2.5 rounded-xl'} bg-neutral-800 rounded-bl-sm flex items-center gap-1`}>
    {[0, 1, 2].map(d => (
      <span
        key={d}
        className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce"
        style={{ animationDelay: `${d * 0.15}s` }}
      />
    ))}
  </div>
);

const BrandLockup = ({ surface }: { surface: ChatSurface }) => (
  <div className="flex min-w-0 items-center gap-3">
    <div className={`${surface === 'expanded' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl'} flex flex-shrink-0 items-center justify-center bg-white text-black shadow-lg shadow-white/5`}>
      <Armchair size={surface === 'expanded' ? 24 : 22} strokeWidth={2.5} />
    </div>
    <div className="flex min-w-0 flex-col justify-center">
      <h1 className={`brand-wordmark brand-wordmark--chat ${surface === 'expanded' ? 'brand-wordmark--chat-expanded' : ''}`}>
        <span className="brand-room">Room</span><span className="brand-wise">Wise</span>
      </h1>
      <span className={`${surface === 'expanded' ? 'mt-1 text-[11px]' : 'mt-1 text-[10px]'} truncate font-bold uppercase leading-none tracking-[0.08em] text-neutral-500`}>
        回答問題，上傳照片，就能開始規劃
      </span>
    </div>
  </div>
);

const prepareReadableText = (text: string, role: ChatMessage['role']) => {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (role !== 'assistant') return normalized.trim();

  return normalized
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.+?)\*\*/g, '**$1**')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+((?:\d+|[一二三四五六七八九十]+)[.)、]\s+)/g, '\n$1')
    .replace(/\s+[•●]\s+/g, '\n• ')
    .replace(/([：:])\s+[*-]\s+/g, '$1\n• ')
    .replace(/(^|\n)\s*[*+-]\s+/g, '$1• ')
    .replace(/\s+[*+-]\s+(?=(?:\*\*)?\S)/g, '\n• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const renderInlineText = (text: string) => {
  const nodes: React.ReactNode[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushPlainText = (value: string) => {
    const cleaned = value.replace(/\*/g, '');
    if (cleaned) nodes.push(cleaned);
  };

  while ((match = boldPattern.exec(text)) !== null) {
    pushPlainText(text.slice(lastIndex, match.index));
    const boldText = match[1].replace(/\*/g, '').trim();
    if (boldText) {
      nodes.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-white">
          {boldText}
        </strong>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  pushPlainText(text.slice(lastIndex));
  return nodes.length > 0 ? nodes : text.replace(/\*/g, '');
};

const renderTextWithLabel = (text: string) => {
  const cleaned = text.replace(/\*/g, '');
  const labelMatch = cleaned.match(/^([^：:]{2,14}[：:])(.+)$/);
  if (!labelMatch) return renderInlineText(text);

  return (
    <>
      <strong className="font-semibold text-white">{labelMatch[1]}</strong>
      {labelMatch[2].trimStart()}
    </>
  );
};

const ReadableMessageText = ({
  content,
  role,
  surface,
}: {
  content: string;
  role: ChatMessage['role'];
  surface: ChatSurface;
}) => {
  const prepared = prepareReadableText(content, role);
  const lines = prepared.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul
        key={`list-${blocks.length}`}
        className={`${surface === 'expanded' ? 'ml-5 space-y-1.5 leading-7' : 'ml-4 space-y-1 leading-relaxed'} list-disc marker:text-neutral-500`}
      >
        {listItems}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    const listMatch = role === 'assistant'
      ? line.match(/^(?:[•●*+-]|\d+[.)、]|[一二三四五六七八九十]+[.)、])\s*(.+)$/)
      : null;

    if (listMatch) {
      listItems.push(
        <li key={`li-${index}`} className="pl-1">
          {renderTextWithLabel(listMatch[1])}
        </li>
      );
      return;
    }

    flushList();
    blocks.push(
      <p key={`p-${index}`} className={surface === 'expanded' ? 'leading-7' : 'leading-relaxed'}>
        {role === 'assistant' ? renderTextWithLabel(line) : renderInlineText(line)}
      </p>
    );
  });

  flushList();

  return (
    <div className={surface === 'expanded' ? 'space-y-3' : 'space-y-2'}>
      {blocks.length > 0 ? blocks : renderInlineText(prepared)}
    </div>
  );
};

const CompactionBanner = ({ summary, surface }: { summary: string; surface: ChatSurface }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`flex flex-col items-center gap-2 ${surface === 'expanded' ? 'py-4' : 'py-2 mr-1'}`}>
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 h-px bg-neutral-700/50" />
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800/80 border border-neutral-700/60 text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 transition-colors text-[10px] whitespace-nowrap select-none"
        >
          <Archive size={10} />
          <span>已自動壓縮對話上下文</span>
          <ChevronDown size={10} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex-1 h-px bg-neutral-700/50" />
      </div>
      {expanded && summary && (
        <div className={`w-full text-neutral-400 bg-neutral-800/50 border border-neutral-700/40 rounded-lg leading-relaxed ${surface === 'expanded' ? 'text-xs px-4 py-3' : 'text-[10px] px-3 py-2'}`}>
          <p className="text-neutral-500 font-semibold mb-1">對話摘要</p>
          {summary}
        </div>
      )}
    </div>
  );
};

const ChatBubble = ({
  message,
  content,
  surface,
  showCursor = false,
}: {
  message: ChatMessage;
  content: string;
  surface: ChatSurface;
  showCursor?: boolean;
}) => {
  const isUser = message.role === 'user';
  const attachmentMarker = '\n\n已附加參考資料：';
  const attachmentIndex = isUser ? content.indexOf(attachmentMarker) : -1;
  const visibleContent = attachmentIndex >= 0 ? content.slice(0, attachmentIndex).trim() : content;
  const attachmentSummary = attachmentIndex >= 0 ? content.slice(attachmentIndex + attachmentMarker.length).trim() : '';
  const bubbleWidth = surface === 'expanded'
    ? isUser
      ? 'max-w-[min(720px,82%)]'
      : 'max-w-[min(820px,88%)]'
    : isUser
      ? 'max-w-[82%]'
      : 'max-w-[84%]';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${surface === 'expanded' ? 'gap-3' : 'gap-1.5'} w-full`}>
      {!isUser && <DesignerAvatar />}
      <div className={`${bubbleWidth} ${surface === 'expanded' ? 'px-5 py-4 rounded-2xl text-[15px] sm:text-base' : 'px-3 py-2 rounded-xl text-xs'} break-words ${
        isUser
          ? 'bg-neutral-700 text-white rounded-br-sm'
          : 'bg-neutral-900 text-neutral-100 rounded-bl-sm border border-neutral-800'
      }`}>
        {visibleContent && (
          <ReadableMessageText content={visibleContent} role={message.role} surface={surface} />
        )}
        {attachmentSummary && (
          <div className={`${visibleContent ? 'mt-2' : ''} flex items-start gap-2 rounded-lg border border-neutral-600/70 bg-neutral-900/70 px-2.5 py-2 text-neutral-300`}>
            <FileText size={surface === 'expanded' ? 15 : 12} className="mt-0.5 flex-shrink-0 text-indigo-300" />
            <span className={`${surface === 'expanded' ? 'text-sm' : 'text-[10px]'} leading-relaxed`}>
              {attachmentSummary}
            </span>
          </div>
        )}
        {showCursor && (
          <span className="inline-block w-0.5 h-[1em] bg-neutral-400 ml-0.5 align-middle animate-pulse" />
        )}
      </div>
    </div>
  );
};

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
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [showRenderPromptDetails, setShowRenderPromptDetails] = useState(false);

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
  const [compactionBanner, setCompactionBanner] = useState<{ summary: string } | null>(null);

  // Typewriter animation for the initial assistant message.
  // Triggered when the AI tab becomes active for the first time — the component is
  // always mounted (CSS hidden), so mount-time effects fire before the user sees the tab.
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
  const expandedBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const expandedInputRef = useRef<HTMLTextAreaElement>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  const expandedReferenceFileInputRef = useRef<HTMLInputElement>(null);
  const prevFloorPlanName = useRef('');
  const prevRealScenesCount = useRef(0);
  const chatInFlightRef = useRef(false);

  // Auto-resize textarea to content (max 5 lines)
  const adjustTextareaHeight = (ref: React.RefObject<HTMLTextAreaElement | null> = inputRef) => {
    const el = ref.current;
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
      setCompactionBanner({ summary: newSummary });
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
    expandedBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, analyzingRooms]);

  useEffect(() => {
    if (!isChatExpanded) return;

    const timer = window.setTimeout(() => {
      expandedBottomRef.current?.scrollIntoView({ behavior: 'auto' });
      expandedInputRef.current?.focus();
      adjustTextareaHeight(expandedInputRef);
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsChatExpanded(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatExpanded]);

  // When floor plan changes → analyze rooms
  useEffect(() => {
    if (!isActive || !floorPlan || floorPlan.name === prevFloorPlanName.current) return;
    prevFloorPlanName.current = floorPlan.name;

    const analyze = async () => {
      setAnalyzingRooms(true);
      setRoomList([]);
      setSelectedRoom(null);
      setRenderPrompt('');
      setShowRenderPromptDetails(false);
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
        const message = String(e?.message || '');
        const friendlyMessage = message.includes('503') || message.includes('UNAVAILABLE') || message.includes('high demand')
          ? 'AI 平面圖分析暫時繁忙，稍後可再試。你仍可先用 3D 空間配置中的「平面圖空屋」建立空屋模型。'
          : message || '請再試一次';
        setError('平面圖分析失敗：' + friendlyMessage);
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
      if (extracted) {
        setRenderPrompt(extracted);
        setShowRenderPromptDetails(false);
      }
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
    if (expandedInputRef.current) {
      expandedInputRef.current.style.height = 'auto';
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
      if (extracted) {
        setRenderPrompt(extracted);
        setShowRenderPromptDetails(false);
      }
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
      (isChatExpanded ? expandedInputRef.current : inputRef.current)?.focus();
    }
  }, [messages, isLoading, referenceFiles, aiContext, roomList, conversationSummary, compressHistory, animateAssistantMessage, isChatExpanded]);

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
    setShowRenderPromptDetails(false);
    prevFloorPlanName.current = '';
    prevRealScenesCount.current = 0;
    isSummarizingRef.current = false;
  };

  const renderChatThread = (
    surface: ChatSurface,
    anchorRef: React.RefObject<HTMLDivElement | null>
  ) => (
    <div className={`${surface === 'expanded' ? 'gap-4 py-6 sm:py-8 px-1 sm:px-2' : 'gap-2.5 py-3 pr-3 pl-0.5'} flex flex-col min-h-full`}>
      {messages.length === 0 && !isLoading && !analyzingRooms && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-8">
          <div className={`${surface === 'expanded' ? 'w-14 h-14 rounded-2xl' : 'w-11 h-11 rounded-2xl'} bg-neutral-800 border border-neutral-700 flex items-center justify-center`}>
            <svg width={surface === 'expanded' ? 26 : 22} height={surface === 'expanded' ? 26 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
              <rect x="3" y="6" width="18" height="14" rx="3"/>
              <circle cx="8.5" cy="13" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="15.5" cy="13" r="1.5" fill="currentColor" stroke="none"/>
              <path d="M9 17h6"/>
              <path d="M12 6V4"/>
              <path d="M10 2.5l2 1.5 2-1.5" strokeWidth="1.5"/>
            </svg>
          </div>
          <p className={`${surface === 'expanded' ? 'text-sm' : 'text-xs'} text-neutral-500 text-center leading-relaxed`}>
            上傳平面圖後 AI 自動識別空間<br />選擇房間 → 討論設計 → 精準渲染
          </p>
        </div>
      )}

      {compactionBanner && (
        <CompactionBanner summary={compactionBanner.summary} surface={surface} />
      )}

      {messages.map((msg, i) => {
        if (i === 0 && msg.role === 'assistant') {
          if (typingPhase === 'dots') {
            return (
              <div key={i} className={`flex justify-start ${surface === 'expanded' ? 'gap-3' : 'gap-1.5'} w-full`}>
                <DesignerAvatar />
                <TypingDots surface={surface} />
              </div>
            );
          }
          return (
            <ChatBubble
              key={i}
              message={msg}
              content={typedText}
              surface={surface}
              showCursor={typingPhase === 'typing'}
            />
          );
        }

        const content = msg.role === 'assistant' && animatedAssistantIndex === i
          ? animatedAssistantText
          : msg.content;

        return (
          <ChatBubble
            key={i}
            message={msg}
            content={content}
            surface={surface}
            showCursor={msg.role === 'assistant' && animatedAssistantIndex === i}
          />
        );
      })}

      {(isLoading || analyzingRooms) && (
        <div className={`flex justify-start ${surface === 'expanded' ? 'gap-3' : 'gap-1.5'}`}>
          <DesignerAvatar />
          <TypingDots surface={surface} />
        </div>
      )}

      {error && (
        <div className={`${surface === 'expanded' ? 'text-sm px-3 py-2 max-w-3xl' : 'text-[10px] px-2.5 py-1.5 mr-1'} text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg`}>
          {error}
        </div>
      )}

      <div ref={anchorRef} className="h-1" />
    </div>
  );

  const renderChatComposer = (
    surface: ChatSurface,
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    fileInputRef: React.RefObject<HTMLInputElement | null>
  ) => (
    <div className={`${surface === 'expanded' ? 'bg-neutral-900 border-neutral-700 rounded-2xl px-4 py-3 gap-2 shadow-2xl shadow-black/30' : 'bg-neutral-800 border-neutral-700 rounded-xl px-3 py-2 gap-1.5'} border focus-within:border-neutral-500 transition-all flex flex-col`}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={REFERENCE_FILE_ACCEPT}
        multiple
        onChange={handleReferenceFileSelect}
      />

      {referenceFiles.length > 0 && (
        <div className={`${surface === 'expanded' ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-col gap-1'} pb-1`}>
          {referenceFiles.map((file, index) => (
            <div
              key={`${surface}-${file.name}-${file.size}-${file.lastModified}`}
              className={`${surface === 'expanded' ? 'px-3 py-2 rounded-xl' : 'px-2 py-1.5 rounded-lg'} flex items-center gap-2 border border-neutral-700/70 bg-neutral-950/70`}
            >
              <FileText size={surface === 'expanded' ? 15 : 12} className="text-indigo-300 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className={`${surface === 'expanded' ? 'text-sm' : 'text-[10px]'} font-medium text-neutral-200 truncate`}>{file.name}</p>
                <p className={`${surface === 'expanded' ? 'text-xs' : 'text-[9px]'} text-neutral-500`}>{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeReferenceFile(index)}
                className={`${surface === 'expanded' ? 'w-7 h-7 rounded-lg' : 'w-5 h-5 rounded-md'} flex items-center justify-center text-neutral-500 hover:text-red-300 hover:bg-red-950/40 transition-all`}
                title="移除此附件"
              >
                <X size={surface === 'expanded' ? 15 : 11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={e => {
          setInput(e.target.value);
          adjustTextareaHeight(textareaRef);
        }}
        onKeyDown={e => {
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
        className={`${surface === 'expanded' ? 'text-sm sm:text-base min-h-[28px]' : 'text-xs min-h-[20px]'} w-full bg-transparent text-white placeholder:text-neutral-600 outline-none resize-none leading-relaxed overflow-y-auto`}
        style={{ maxHeight: surface === 'expanded' ? '160px' : '110px' }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || analyzingRooms || referenceFiles.length >= MAX_REFERENCE_FILES}
            className={`${surface === 'expanded' ? 'w-8 h-8 rounded-xl' : 'w-6 h-6 rounded-lg'} text-neutral-500 hover:text-neutral-200 hover:bg-neutral-700 disabled:text-neutral-700 disabled:hover:bg-transparent flex items-center justify-center transition-all`}
            title="上傳報價單或參考資料"
          >
            <Paperclip size={surface === 'expanded' ? 15 : 11} />
          </button>
          <span className={`${surface === 'expanded' ? 'text-xs' : 'text-[9px]'} text-neutral-600 select-none truncate`}>
            {referenceFiles.length > 0
              ? `${referenceFiles.length} 個附件會送給 AI`
              : 'Enter 送出　Shift+Enter 換行'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearAll}
            className={`${surface === 'expanded' ? 'w-8 h-8 rounded-xl' : 'w-6 h-6 rounded-lg'} text-neutral-600 hover:text-neutral-400 hover:bg-neutral-700 flex items-center justify-center transition-all`}
            title="清除所有對話"
          >
            <RefreshCw size={surface === 'expanded' ? 14 : 10} />
          </button>
          <button
            onClick={() => send(input)}
            disabled={(!input.trim() && referenceFiles.length === 0) || isLoading || analyzingRooms || isComposing}
            className={`${surface === 'expanded' ? 'w-9 h-9 rounded-xl' : 'w-6 h-6 rounded-lg'} bg-neutral-600 hover:bg-neutral-500 disabled:bg-neutral-700 disabled:text-neutral-600 text-white flex items-center justify-center transition-all`}
            title="送出"
          >
            <Send size={surface === 'expanded' ? 16 : 11} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderGenerateButton = (surface: ChatSurface) => {
    if (!renderPrompt) return null;

    return (
      <button
        onClick={() => onGenerate(`[AI_BRIEF]\n${renderPrompt}`, projectBrief, projectBrief?.summary)}
        disabled={isGenerating}
        className={`group relative w-full overflow-hidden ${
          surface === 'expanded' ? 'py-4 rounded-2xl text-[15px]' : 'py-3.5 rounded-xl text-sm'
        } bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 disabled:from-neutral-700 disabled:to-neutral-700 disabled:text-neutral-400 text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-950/60 hover:shadow-xl hover:shadow-indigo-900/40 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 border border-indigo-400/20 animate-in fade-in slide-in-from-bottom-2 duration-500 select-none`}
      >
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
        {isGenerating ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
            生成渲染中...
          </>
        ) : (
          <>
            <Sparkles size={surface === 'expanded' ? 18 : 15} className="flex-shrink-0" />
            {surface === 'expanded' ? '依 AI 討論產生設計方案' : '產生設計方案'}
          </>
        )}
      </button>
    );
  };

  const renderDesignDirectionCard = () => {
    if (!renderPrompt) return null;

    const directionSummary = getDesignDirectionSummary(projectBrief, renderPrompt, selectedRoom);
    const directionTags = getDesignDirectionTags(projectBrief, selectedRoom);

    return (
      <div className="mb-2 flex-shrink-0 rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-3.5 shadow-lg shadow-emerald-950/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="flex-shrink-0 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300">AI 已整理好設計方向</span>
            </div>
            {directionTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {directionTags.map(tag => (
                  <span
                    key={tag}
                    className="rounded-full border border-emerald-700/40 bg-neutral-950/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setRenderPrompt('');
              setProjectBrief(null);
              onProjectBriefChange?.(null);
              setShowRenderPromptDetails(false);
            }}
            className="flex-shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-neutral-300"
            title="清除 AI 整理結果"
          >
            清除整理
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-neutral-300">
          {compactText(directionSummary, 76)}
        </p>

        <button
          type="button"
          onClick={() => setShowRenderPromptDetails(prev => !prev)}
          className="mt-3 inline-flex items-center rounded-lg border border-neutral-800 bg-neutral-950/50 px-2.5 py-1.5 text-[10px] font-bold text-neutral-400 transition-all hover:border-neutral-700 hover:text-white"
        >
          {showRenderPromptDetails ? '收合渲染指令' : '查看渲染指令'}
        </button>

        {showRenderPromptDetails && (
          <div className="mt-2 max-h-28 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950/70 p-2.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-700">
            <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-neutral-500">
              {renderPrompt}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-0">

      {/* Image status bar — read-only, managed by manual settings */}
      <div className="pb-3 border-b border-neutral-800/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-[0.12em] text-neutral-600 uppercase">AI 對話</span>
          <button
            type="button"
            onClick={() => setIsChatExpanded(true)}
            className="h-7 px-2.5 rounded-lg border border-neutral-800 bg-neutral-950 text-[10px] font-bold text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-neutral-800 flex items-center gap-1.5 transition-all"
            title="展開全幅對話"
          >
            <Maximize2 size={12} />
            展開
          </button>
        </div>
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
        {renderChatThread('sidebar', bottomRef)}
      </div>

      {renderDesignDirectionCard()}

      {/* Input bar */}
      <div className="pt-2 space-y-2 flex-shrink-0 border-t border-neutral-800/60">
        {renderChatComposer('sidebar', inputRef, referenceFileInputRef)}
        {renderGenerateButton('sidebar')}
      </div>

      {isChatExpanded && createPortal(
        <div className="fixed inset-0 z-[220] flex flex-col bg-neutral-950">
          <div className="flex-shrink-0 border-b border-neutral-800 bg-neutral-950">
            <div className="mx-auto flex min-h-[88px] w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
              <BrandLockup surface="expanded" />
              <button
                type="button"
                onClick={() => setIsChatExpanded(false)}
                className="flex h-11 flex-shrink-0 items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 text-sm font-bold text-neutral-300 transition-all hover:border-neutral-600 hover:bg-neutral-800 hover:text-white"
                title="收合對話"
              >
                <Minimize2 size={14} />
                收合
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-700">
            <div className="mx-auto min-h-full w-full max-w-4xl px-5 sm:px-8">
              {renderChatThread('expanded', expandedBottomRef)}
            </div>
          </div>

          <div className="flex-shrink-0 border-t border-neutral-800 bg-neutral-950">
            <div className="mx-auto w-full max-w-4xl px-5 py-4 sm:px-8 space-y-3">
              {renderChatComposer('expanded', expandedInputRef, expandedReferenceFileInputRef)}
              {renderGenerateButton('expanded')}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AIDesignerSidebar;
