import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Wand2, Download, Maximize2, RefreshCw, Key, ChevronRight, CheckCircle2, Sparkles, Send, Armchair, X, Undo2, Redo2, History, Eye, EyeOff, Box, Lightbulb, SlidersHorizontal, ClipboardCheck, AlertTriangle, CircleDashed, ScanLine } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import Button from './components/Button';
import AIDesignerSidebar from './components/AIDesignerSidebar';
import { FloorPlanAnalysisWorkbench } from './components/FloorPlanAnalysisWorkbench';
import { DesignConfig, DesignStyle, RoomType, ROOM_TYPE_LABELS, DESIGN_STYLE_LABELS, DesignVersionRecord, ProjectBrief, EmptySpaceLayout } from './types';
import { DESIGN_STYLES, ROOM_TYPES } from './constants';
import { generateDesign, editDesignImage, extractSpatialContextForRendering, evaluateDesignChecklist } from './services/geminiService';
import { analyzeFloorPlanForEmptySpace, rescaleEmptySpaceLayout } from './services/floorPlanLayoutService';

const ThreeRoomViewer = lazy(() =>
  import('./components/ThreeRoomViewer').then(m => ({ default: m.ThreeRoomViewer }))
);

const FloorPlanEmptyViewer = lazy(() =>
  import('./components/FloorPlanEmptyViewer').then(m => ({ default: m.FloorPlanEmptyViewer }))
);

class ThreeViewerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.error('[ThreeRoomViewer]', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-neutral-500 h-full">
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl text-center space-y-3">
            <p className="text-sm text-neutral-300">3D 場景載入失敗</p>
            <p className="text-xs text-neutral-600">可能是 WebGL 不支援或 GPU 資源不足</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
            >
              重新嘗試
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const REFINE_PRESETS_BY_ROOM: Record<string, { label: string; prompt: string }[]> = {
  [RoomType.LIVING_ROOM]: [
    { label: "🛋️ 頂級皮革沙發", prompt: "將主沙發更換為溫潤色澤的頂級棕色皮革沙發，增添空間沉穩感與奢華質感" },
    { label: "🪵 北歐拼木地板", prompt: "將地板全數鋪設為溫暖質樸的北歐橡木人字拼木地板，提升自然層次" },
    { label: "💡 溫馨落日氣氛燈", prompt: "在角落或天花板邊緣導入柔和的暖黃色落日落地燈與隱藏式線性光源" },
    { label: "🪴 琴葉榕室內綠植", prompt: "在房間光照良好的角落佈置高大的琴葉榕盆栽與部分蔓綠絨垂吊綠植，營造生命氣息" },
    { label: "🎨 現代幾何抽象畫", prompt: "在主牆面懸掛一幅以黑、白、金為主軸的現代極簡手繪幾何抽象藝術畫作" },
    { label: "🧱 清水混凝土背景", prompt: "將電視迎光面的背牆材質改為乾淨、優雅的清水混凝土模板牆，呈現侘寂風格" },
  ],
  [RoomType.BEDROOM]: [
    { label: "🛏️ 亞麻質感床頭板", prompt: "將床頭板更換為柔軟圓弧形的亞麻布包覆床頭板，增添臥室溫柔層次" },
    { label: "🪟 雪紡飄逸窗簾", prompt: "將窗簾更換為半透明白色雪紡飄逸窗簾，讓晨光柔和灑入空間" },
    { label: "🕯️ 北歐原木床邊燈", prompt: "在床的兩側各擺放一盞線條簡約的北歐原木床頭燈，增添暖意" },
    { label: "🎀 奶油色系寢具", prompt: "將床組更換為奶油白亞麻質感被套與抱枕組合，提升整體清新質感" },
    { label: "🖼️ 療癒系水彩掛畫", prompt: "在床頭牆面掛上一組粉彩水彩風格的植物或山水插畫，增添臥室療癒感" },
    { label: "🪴 空氣鳳梨擺設", prompt: "在窗台或床頭櫃上佈置幾株無土小型植物與苔球，自然清新" },
  ],
  [RoomType.KITCHEN]: [
    { label: "🏺 義式花磚牆面", prompt: "將廚房料理台上方牆面貼上鮮豔對比的義式手繪幾何花磚，提升視覺焦點" },
    { label: "🔆 黃銅吊掛燈具", prompt: "在廚房中島或料理台上方加入一排復古黃銅吊燈，增添輕奢氛圍" },
    { label: "🪨 深色石材檯面", prompt: "將廚房檯面更換為沉穩低調的深灰色石英石或大理石材，提升高級質感" },
    { label: "🔩 黑色霧面五金", prompt: "將所有把手、水龍頭更換為統一的黑色霧面金屬五金，現代感倍增" },
    { label: "🗃️ 玻璃門吊櫃", prompt: "將部分上吊櫃門更換為透明玻璃門，展示精美器皿並讓空間更通透" },
    { label: "🌿 香草植物小花園", prompt: "在窗台旁設置羅勒、迷迭香等香草植物小盆栽牆，實用且充滿生活感" },
  ],
  [RoomType.BATHROOM]: [
    { label: "🛁 獨立式浴缸", prompt: "在浴室角落或窗邊加入一個白色橢圓形獨立浴缸，提升奢華感" },
    { label: "🪨 天然石材牆面", prompt: "將淋浴區牆面更換為米白色天然大理石磚，呈現高端 spa 質感" },
    { label: "🔆 鏡前暖白燈帶", prompt: "在洗手台鏡子四周加入柔和的暖白色 LED 燈帶，提供均勻美妝照明" },
    { label: "🧴 黃銅水龍頭升級", prompt: "將所有水龍頭更換為優雅復古的拉絲黃銅款式，提升整體精緻度" },
    { label: "🌱 浴室綠植佈置", prompt: "在浴室窗邊擺放喜濕的蕨類植物與白鶴芋盆栽，增添自然氣息" },
    { label: "🪥 木質置物架", prompt: "加入一組竹製或橡木製的壁掛置物架，收納毛巾與保養品兼具美觀" },
  ],
  [RoomType.DINING_ROOM]: [
    { label: "🪑 天鵝絨坐墊餐椅", prompt: "將餐椅更換為北歐風格原木椅腳搭配天鵝絨坐墊，色彩可跳色對比" },
    { label: "🕯️ 幾何感吊燈", prompt: "在餐桌正上方加入一盞造型獨特的幾何鐵件吊燈，成為視覺焦點" },
    { label: "🌺 鮮花中心擺設", prompt: "在餐桌中央置入一個插著新鮮花卉的極簡花器作為餐桌中心擺件" },
    { label: "🪞 大型裝飾掛鏡", prompt: "在餐廳側牆加入一面大型圓形或方形裝飾鏡，視覺放大空間感" },
    { label: "🍷 酒架展示牆", prompt: "在餐廳背牆設計一組木質開放式酒瓶展示架，兼具展示與收納功能" },
    { label: "🎨 大型主題壁畫", prompt: "在主要牆面貼上一幅大型風景或抽象手繪壁畫，豐富空間層次" },
  ],
  [RoomType.OFFICE]: [
    { label: "📚 頂天立地書牆", prompt: "沿辦公室主牆設計一整面頂天立地的開放式書架，展示書籍與收藏品" },
    { label: "💡 護眼工作檯燈", prompt: "在書桌角落加入一盞可調色溫的設計感北歐風工作檯燈，兼具美感與功能" },
    { label: "🪴 大型垂吊綠植", prompt: "在辦公區角落吊掛多盆垂吊綠植如黃金葛或鐵線蕨，增加自然活力" },
    { label: "🎨 激勵系手寫板牆", prompt: "在工作區一面牆改為黑板漆牆，方便記錄靈感與日程" },
    { label: "🖼️ 藝術掛畫牆", prompt: "在辦公室牆面設計一組多幅不同尺寸的藝術裝飾畫組合，提升空間品味" },
    { label: "🪑 人體工學椅升級", prompt: "將辦公椅更換為符合人體工學設計的高背皮質辦公椅，提升舒適度" },
  ],
  [RoomType.STUDIO]: [
    { label: "🛋️ 模組化沙發床", prompt: "將主臥區沙發更換為可折疊展開的高質感模組化沙發床，兼顧睡眠與起居" },
    { label: "📐 玻璃隔屏分區", prompt: "加入一組半透明鐵件玻璃隔屏，在不阻隔光線的前提下區分睡眠與客廳空間" },
    { label: "🪵 懸浮牆面收納", prompt: "沿主牆設計一排懸浮式木質層板與收納格，提升垂直空間利用率" },
    { label: "🪞 大型落地鏡", prompt: "在靠近門口的牆面加入一面全身落地鏡，視覺放大整體空間感" },
    { label: "💡 軌道燈彈性照明", prompt: "天花板導入可旋轉調向的黑色軌道燈組，靈活照亮不同生活區域" },
    { label: "🌿 角落植栽牆", prompt: "在窗邊或角落設計一組多層次的植栽展示架，引入自然生命感" },
  ],
};

// Convert API-returned base64 data URL to a Blob URL to save JS heap memory.
// Each generated image is ~1–2 MB as base64; a Blob URL is just a short reference.
const base64ToBlobUrl = (dataUrl: string): string => {
  if (dataUrl.startsWith('blob:')) return dataUrl;
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
};

const USER_API_KEY_STORAGE_KEY = 'interior-design-studio.geminiApiKey';

const getStoredApiKey = () => {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(USER_API_KEY_STORAGE_KEY) || '';
};

const App: React.FC = () => {
  const [apiKeyReady, setApiKeyReady] = useState(Boolean(process.env.API_KEY || getStoredApiKey()));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const generatingRef = useRef(false);
  const editingRef = useRef(false);
  const spatialContextCache = useRef<Map<string, string>>(new Map());
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Revoke all Blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => { blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  type VersionRecordDraft = Omit<DesignVersionRecord, 'id' | 'imageUrl' | 'createdAt' | 'checklist' | 'checklistStatus'>;

  const createVersionRecord = (imageUrl: string, draft: VersionRecordDraft): DesignVersionRecord => ({
    id: globalThis.crypto?.randomUUID?.() ?? `version-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    imageUrl,
    createdAt: Date.now(),
    checklistStatus: 'idle',
    ...draft,
  });

  const replaceDesignHistory = (imageSource: string, draft: VersionRecordDraft) => {
    const blobUrl = base64ToBlobUrl(imageSource);
    blobUrlsRef.current.forEach(url => {
      if (url !== blobUrl) URL.revokeObjectURL(url);
    });
    blobUrlsRef.current.clear();
    blobUrlsRef.current.add(blobUrl);
    const record = createVersionRecord(blobUrl, draft);
    setHistory([blobUrl]);
    setHistoryIndex(0);
    setVersionRecords([record]);
    runDesignChecklist(record);
  };

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getStoredApiKey);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'manual' | 'ai'>('manual');
  
  // Lighting time-of-day for render quality
  type LightingTime = 'morning' | 'afternoon' | 'evening';
  const LIGHTING_OPTIONS: { key: LightingTime; label: string; desc: string }[] = [
    { key: 'morning',   label: '晨光', desc: 'soft golden morning light from the east' },
    { key: 'afternoon', label: '日光', desc: 'bright neutral daylight' },
    { key: 'evening',   label: '暮光', desc: 'warm amber sunset lighting' },
  ];
  const [lightingTime, setLightingTime] = useState<LightingTime>('afternoon');

  // View mode & Refinement state for Solution A (3D Sandbox)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [threeDSpaceSource, setThreeDSpaceSource] = useState<'manual' | 'floor_plan' | null>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showTipsPopover, setShowTipsPopover] = useState(false);
  const [resultInfoTab, setResultInfoTab] = useState<'version' | 'check'>('check');
  const [appliedRefinements, setAppliedRefinements] = useState<string[]>([]);

  // History State for Undo/Redo
  const [history, setHistory] = useState<string[]>([]);
  const [versionRecords, setVersionRecords] = useState<DesignVersionRecord[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isComparing, setIsComparing] = useState(false);
  const [currentProjectBrief, setCurrentProjectBrief] = useState<ProjectBrief | null>(null);

  // Optional room dimensions injected into the render prompt
  const [roomDimensions, setRoomDimensions] = useState({ length: '', width: '', height: '' });

  // Synchronize activeWorkflowStep with viewMode and display state
  useEffect(() => {
    if (viewMode === '3d') {
      setActiveWorkflowStep(4);
    } else if (viewMode === '2d') {
      if (history.length > 0) {
        setActiveWorkflowStep(3);
      } else if (sidebarMode === 'ai') {
        setActiveWorkflowStep(2);
      } else {
        setActiveWorkflowStep(1);
      }
    }
  }, [viewMode, history, sidebarMode]);
  
  const [editPrompt, setEditPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  // Determine which image to show (Current or Previous for comparison)
  const displayImage = isComparing && historyIndex > 0 
    ? history[historyIndex - 1] 
    : (historyIndex >= 0 ? history[historyIndex] : null);

  const [config, setConfig] = useState<DesignConfig>({
    style: DesignStyle.MODERN,
    roomType: RoomType.LIVING_ROOM,
    prompt: '',
    floorPlan: null,
    realScenes: []
  });
  const [floorPlanLayout, setFloorPlanLayout] = useState<EmptySpaceLayout | null>(null);
  const [isAnalyzingFloorPlan, setIsAnalyzingFloorPlan] = useState(false);
  const [floorPlanLayoutError, setFloorPlanLayoutError] = useState<string | null>(null);

  const hasSpaceReference = Boolean(config.floorPlan || config.realScenes.length > 0);
  const hasBrief = Boolean(currentProjectBrief?.summary || config.prompt.trim());
  const hasTargetRoom = Boolean(config.roomType);
  const setupChecklist = [
    { label: '現況照片或平面圖', done: hasSpaceReference },
    { label: '裝修需求', done: hasBrief },
    { label: '目標空間', done: hasTargetRoom },
  ];
  const readyCount = setupChecklist.filter(item => item.done).length;
  const briefFacts = [
    currentProjectBrief?.area,
    currentProjectBrief?.household,
    currentProjectBrief?.budget,
    currentProjectBrief?.stylePreference,
    currentProjectBrief?.targetRoom,
  ].filter(Boolean);

  const nextStepGuide = {
    1: {
      title: '上傳現況',
      now: '上傳平面圖、格局圖或現場照片；如果手邊資料不完整，也可以先放一張最清楚的照片開始。',
      ai: 'AI 會讀取格局、門窗、採光和主要牆面，並提醒哪些資料可能還不夠。',
      result: '完成後會得到可用於設計討論的空間基礎，後續生成比較不容易偏離現況。',
    },
    2: {
      title: '整理需求',
      now: '用 AI 引導回答家庭成員、預算、生活痛點、風格偏好和不能接受的元素。',
      ai: 'AI 會把零散回答整理成 ProjectBrief，並轉成可用於生成的設計指令。',
      result: '完成後會得到需求摘要與渲染指令，不需要自己寫 prompt。',
    },
    3: {
      title: '看設計圖',
      now: '先看整體風格、色調、主家具比例和空間氛圍，暫時不用糾結每個小物件。',
      ai: 'AI 會依你的現況與需求生成第一版設計圖，也可以依一句話做局部微調。',
      result: '完成後會得到設計圖、版本紀錄，以及好不好住的初步檢查。',
    },
    4: {
      title: '3D 空間配置',
      now: '切到 3D 空間配置，從平面、正面和自由視角看家具大小、走道寬度與門窗位置。',
      ai: 'AI 會保留你的設計方向，協助把漂亮的圖回到可居住的尺寸與動線。',
      result: '完成後會得到更接近可溝通、可估價的家具配置參考。',
    },
  }[activeWorkflowStep];

  const displayedVersionIndex = isComparing && historyIndex > 0 ? historyIndex - 1 : historyIndex;
  const currentVersion = displayedVersionIndex >= 0 ? versionRecords[displayedVersionIndex] : null;
  const sourceLabels: Record<DesignVersionRecord['source'], string> = {
    manual_generate: '手動生成',
    ai_generate: 'AI 訪談生成',
    import: '匯入圖',
    magic_edit: '局部微調',
  };

  const runDesignChecklist = async (record: DesignVersionRecord) => {
    setVersionRecords(prev => prev.map(item =>
      item.id === record.id ? { ...item, checklistStatus: 'checking' } : item
    ));

    try {
      const checklist = await evaluateDesignChecklist(record.imageUrl, {
        roomType: record.roomType,
        style: record.style,
        prompt: record.prompt,
        projectBrief: record.projectBrief,
      });

      setVersionRecords(prev => prev.map(item =>
        item.id === record.id ? { ...item, checklist, checklistStatus: 'done' } : item
      ));
    } catch {
      setVersionRecords(prev => prev.map(item =>
        item.id === record.id ? { ...item, checklistStatus: 'error' } : item
      ));
    }
  };

  // Check for API Key on mount
  useEffect(() => {
    setApiKeyReady(Boolean(process.env.API_KEY || getStoredApiKey()));
  }, []);

  const handleSelectKey = async () => {
    setApiKeyInput(getStoredApiKey());
    setError(null);
    setShowApiKeyModal(true);
  };

  const handleSaveApiKey = () => {
    const nextKey = apiKeyInput.trim();
    if (!nextKey) {
      setError("請輸入 Gemini API Key。");
      return;
    }

    localStorage.setItem(USER_API_KEY_STORAGE_KEY, nextKey);
    setApiKeyReady(true);
    setShowApiKeyModal(false);
    setShowApiKeyInput(false);
    setError(null);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem(USER_API_KEY_STORAGE_KEY);
    setApiKeyInput('');
    setError('已清除 API Key。請輸入新的 Key 後儲存，或點擊取消。');
  };

  const handleCancelApiKey = () => {
    setApiKeyInput(getStoredApiKey());
    setShowApiKeyInput(false);
    setShowApiKeyModal(false);
    setError(null);
  };

  const handleError = (err: any) => {
      console.error("Operation failed:", err);
      let msg = "An unexpected error occurred.";
      const errorString = err.toString();
      const errorMessage = err.message || JSON.stringify(err);

      if (
        errorMessage.includes("403") ||
        errorString.includes("403") ||
        errorMessage.includes("permission") ||
        errorMessage.includes("Requested entity was not found")
      ) {
          msg = "權限被拒絕。此 API Key 所屬專案沒有存取 Gemini 圖像模型的權限，請確認已啟用付費方案並選擇正確的 API Key。";
          setApiKeyReady(false);
          setTimeout(() => setShowApiKeyModal(true), 100);
      } else if (
        errorMessage.includes("500") ||
        errorString.includes("500") ||
        errorMessage.includes("Internal error")
      ) {
          msg = "AI 模型發生暫時性內部錯誤（500）。請簡化需求描述或稍後再試。";
      } else {
          msg = err.message || msg;
      }
      setError(msg);
  };

  const handleFloorPlanFileChange = (file: File | null) => {
    setConfig(prev => ({ ...prev, floorPlan: file }));
    setFloorPlanLayout(null);
    setFloorPlanLayoutError(null);
  };

  const handleAnalyzeFloorPlanLayout = async () => {
    if (!config.floorPlan || isAnalyzingFloorPlan) return;

    setIsAnalyzingFloorPlan(true);
    setFloorPlanLayoutError(null);
    try {
      const layout = await analyzeFloorPlanForEmptySpace(config.floorPlan);
      setFloorPlanLayout(layout);
    } catch (err: any) {
      setFloorPlanLayout(null);
      setFloorPlanLayoutError(err?.message || '平面圖解析失敗，請換一張更清楚的圖。');
    } finally {
      setIsAnalyzingFloorPlan(false);
    }
  };

  const handleCalibrateFloorPlanScale = (wallId: string, actualLengthCm: number) => {
    setFloorPlanLayout(prev => {
      if (!prev) return prev;
      const wall = prev.walls.find(item => item.id === wallId);
      if (!wall) return prev;
      const estimatedLength = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
      if (!Number.isFinite(actualLengthCm) || actualLengthCm <= 0 || estimatedLength <= 0) return prev;
      return rescaleEmptySpaceLayout(prev, actualLengthCm / estimatedLength);
    });
  };

  const handleRemoveFloorPlanWall = (wallId: string) => {
    setFloorPlanLayout(prev => {
      if (!prev) return prev;
      const walls = prev.walls.filter(wall => wall.id !== wallId);
      const averageWallConfidence = walls.reduce((sum, wall) => sum + (wall.confidence ?? 0), 0) / Math.max(1, walls.length);
      return {
        ...prev,
        generatedAt: Date.now(),
        walls,
        issues: prev.issues.filter(issue => issue.targetId !== wallId),
        diagnostics: {
          ...prev.diagnostics,
          averageWallConfidence,
        },
      };
    });
  };

  const handleGenerate = async () => {
    if (generatingRef.current || isGenerating) return;

    if (!config.floorPlan && config.realScenes.length === 0) {
      setError("請至少上傳一張平面配置圖或實景照片，才能開始生成。");
      return;
    }

    generatingRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      const lightingDesc = LIGHTING_OPTIONS.find(o => o.key === lightingTime)?.desc ?? '';
      const { length, width, height } = roomDimensions;
      const dimTag = (length && width && height)
        ? `Room dimensions: ${length}m × ${width}m, ceiling height ${height}m.`
        : (length && width) ? `Room dimensions: ${length}m × ${width}m.` : '';
      const extras = [dimTag, `Lighting: ${lightingDesc}.`].filter(Boolean).join(' ');
      let enrichedConfig = {
        ...config,
        prompt: config.prompt ? `${config.prompt}\n${extras}` : extras,
      };

      // If floor plan is provided, pre-analyse spatial layout for the target room.
      // Cache the result by floor plan identity + room type to avoid a redundant
      // API call when the user re-generates without changing inputs.
      if (config.floorPlan) {
        try {
          const cacheKey = `${config.floorPlan.name}|${config.floorPlan.size}|${config.roomType}`;
          let spatialContext = spatialContextCache.current.get(cacheKey);
          if (!spatialContext) {
            spatialContext = await extractSpatialContextForRendering(
              config.floorPlan,
              config.roomType,
              config.realScenes.length > 0 ? config.realScenes : undefined
            );
            if (spatialContext) spatialContextCache.current.set(cacheKey, spatialContext);
          }
          if (spatialContext) {
            const spatialTag = `[平面圖空間語境: ${spatialContext}]`;
            enrichedConfig = {
              ...enrichedConfig,
              prompt: enrichedConfig.prompt
                ? `${enrichedConfig.prompt}\n\n${spatialTag}`
                : spatialTag,
            };
          }
        } catch {
          // Spatial analysis failed — continue with original config, not a blocker
        }
      }

      const resultImage = await generateDesign(enrichedConfig);
      // Only reset history after a successful generation — preserves last image on failure
      replaceDesignHistory(resultImage, {
        source: 'manual_generate',
        title: '手動設定生成',
        prompt: enrichedConfig.prompt,
        style: enrichedConfig.style,
        roomType: enrichedConfig.roomType,
        changeReason: `以${ROOM_TYPE_LABELS[enrichedConfig.roomType]}與${DESIGN_STYLE_LABELS[enrichedConfig.style]}作為視覺定調。`,
        aiSummary: currentProjectBrief?.summary,
        projectBrief: currentProjectBrief,
      });
      setEditPrompt("");
      setIsComparing(false);
      setAppliedRefinements([]);
    } catch (err: any) {
      handleError(err);
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  };

  const handleImportDesign = (file: File | null) => {
    if (!file) return;
    // Use Blob URL directly — no base64 roundtrip needed for imported files
    const blobUrl = URL.createObjectURL(file);
    replaceDesignHistory(blobUrl, {
      source: 'import',
      title: '匯入既有設計圖',
      prompt: file.name,
      style: config.style,
      roomType: config.roomType,
      changeReason: '以既有圖片作為版本起點，便於後續局部微調與檢核。',
      aiSummary: currentProjectBrief?.summary,
      projectBrief: currentProjectBrief,
    });
    setIsComparing(false);
    setEditPrompt("");
    setError(null);
    setAppliedRefinements([]);
  };

  const handleMagicEdit = async () => {
    if (editingRef.current || isEditing) return;
    if (!displayImage || !editPrompt.trim()) return;

    editingRef.current = true;
    setIsEditing(true);
    setError(null);

    try {
      // Always edit based on the CURRENT (latest) image in the stack
      const sourceImage = history[historyIndex];
      const newImage = await editDesignImage(sourceImage, editPrompt);
      const newBlobUrl = base64ToBlobUrl(newImage);
      blobUrlsRef.current.add(newBlobUrl);

      // Add to history and remove any future history (if we were in the middle of the stack)
      const newHistory = history.slice(0, historyIndex + 1);
      // Revoke any discarded future Blob URLs
      history.slice(historyIndex + 1).forEach(url => {
        URL.revokeObjectURL(url);
        blobUrlsRef.current.delete(url);
      });
      newHistory.push(newBlobUrl);

      const nextRecords = versionRecords.slice(0, historyIndex + 1);
      const editRecord = createVersionRecord(newBlobUrl, {
        source: 'magic_edit',
        title: `局部微調 V${nextRecords.length + 1}`,
        prompt: editPrompt,
        style: config.style,
        roomType: config.roomType,
        changeReason: editPrompt,
        aiSummary: currentProjectBrief?.summary,
        projectBrief: currentProjectBrief,
      });

      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setVersionRecords([...nextRecords, editRecord]);
      runDesignChecklist(editRecord);
      
      // Record 3D refinement sync
      if (!appliedRefinements.includes(editPrompt)) {
        setAppliedRefinements(prev => [...prev, editPrompt]);
      }
      
      setEditPrompt(""); // Clear prompt after success
    } catch (err) {
      handleError(err);
    } finally {
      editingRef.current = false;
      setIsEditing(false);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
    }
  };

  const downloadImage = () => {
    if (displayImage) {
      const link = document.createElement('a');
      link.href = displayImage;
      link.download = `interior-design-v${historyIndex + 1}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!apiKeyReady) {
    return (
      <>
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
             <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-neutral-900/50 rounded-full blur-3xl"></div>
             <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-neutral-800/30 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-md w-full bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white text-black mb-6 shadow-lg shadow-white/10">
            <Armchair size={32} />
          </div>
          <h1 className="brand-wordmark">
            <span className="brand-room">Room</span><span className="brand-wise">Wise</span>
          </h1>
          <p className="brand-subtitle">
            專業級 AI 空間視覺化工具
          </p>

          {/* Feature highlights */}
          <div className="mt-6 mb-6 grid grid-cols-3 gap-2 text-left">
            {([
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 2H4a2 2 0 0 0-2 2v14l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>
                    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>
                    <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/>
                    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>
                  </svg>
                ),
                label: 'AI 設計訪談',
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="16" rx="2"/>
                    <path d="M2 14l5-5 4 4 3-3 6 5"/>
                    <circle cx="7.5" cy="7.5" r="1.5"/>
                  </svg>
                ),
                label: '生成居家圖',
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    {/* 3D box / room cube */}
                    <path d="M12 3l9 5v8l-9 5-9-5V8z"/>
                    <path d="M12 3v13"/>
                    <path d="M3 8l9 5 9-5"/>
                  </svg>
                ),
                label: '3D 空間配置',
              },
            ] as { icon: React.ReactNode; label: string }[]).map(f => (
              <div key={f.label} className="bg-neutral-800/60 border border-neutral-700/50 rounded-xl p-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-700/50 flex items-center justify-center mb-2 text-neutral-200">
                  {f.icon}
                </div>
                <p className="text-[11px] font-semibold text-neutral-200 leading-tight">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Why API key */}
          <div className="mb-5 text-left bg-neutral-800/40 border border-neutral-700/40 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-neutral-300">為什麼需要 Gemini API Key？</p>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              RoomWise 所有 AI 功能皆由 Google Gemini 驅動。為保護您的隱私，我們不代管任何 API Key——您使用自己的金鑰直接呼叫 AI，費用透明、資料不經第三方。
            </p>
            <p className="text-[11px] text-neutral-600">
              🔒 Key 僅存於您的瀏覽器本機，不上傳任何伺服器。
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-sm text-red-200">
              {error}
            </div>
          )}

          <Button onClick={handleSelectKey} className="w-full py-4 text-lg bg-white hover:bg-neutral-200 shadow-none font-semibold transition-all" style={{ color: '#000000' }}>
            設定 API Key 並開始
          </Button>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            還沒有 API Key？前往 Google AI Studio 免費取得 →
          </a>
        </div>
      </div>

      {showApiKeyModal && (
        <div
          className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={handleCancelApiKey}
        >
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/10 flex-shrink-0">
                <Key size={20} className="text-black" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">Gemini API Key 設定</h2>
                <p className="text-xs text-neutral-500 mt-0.5">設定您的 API Key 以啟用 AI 室內設計功能</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-xs text-red-200 leading-relaxed">
                {error}
              </div>
            )}

            <div className="space-y-2 mb-6">
              <label className="text-xs font-semibold text-neutral-400">API Key</label>
              <div className="relative">
                <input
                  type={showApiKeyInput ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
                  placeholder="AIzaSy..."
                  autoFocus
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-white/20 focus:border-white/50 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200 transition-colors"
                  tabIndex={-1}
                >
                  {showApiKeyInput ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-neutral-600 leading-relaxed">
                  🔒 僅存於本機瀏覽器，不上傳任何伺服器。
                </p>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors whitespace-nowrap ml-2"
                >
                  免費取得 Key →
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveApiKey}
                className="flex-1 py-2.5 bg-white hover:bg-neutral-100 text-black text-sm font-semibold rounded-lg transition-all active:scale-[0.97]"
              >
                儲存
              </button>
              <button
                onClick={handleCancelApiKey}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-lg transition-all active:scale-[0.97]"
              >
                取消
              </button>
              <button
                onClick={handleClearApiKey}
                className="py-2.5 px-4 bg-transparent hover:bg-red-950/50 text-red-500 hover:text-red-400 border border-neutral-700 hover:border-red-800 text-sm font-medium rounded-lg transition-all active:scale-[0.97]"
                title="清除已儲存的 API Key"
              >
                清除
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-neutral-950 text-white overflow-hidden font-sans">
      
      {/* API Key Settings Modal */}
      {showApiKeyModal && (
        <div
          className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={handleCancelApiKey}
        >
          <div
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/10 flex-shrink-0">
                <Key size={20} className="text-black" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">Gemini API Key 設定</h2>
                <p className="text-xs text-neutral-500 mt-0.5">設定您的 API Key 以啟用 AI 室內設計功能</p>
              </div>
            </div>

            {/* Error / Info */}
            {error && (
              <div className="mb-5 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-xs text-red-200 leading-relaxed">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-semibold text-neutral-400">API Key</label>
              <div className="relative">
                <input
                  type={showApiKeyInput ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
                  placeholder="AIzaSy..."
                  autoFocus
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-white/20 focus:border-white/50 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200 transition-colors"
                  tabIndex={-1}
                >
                  {showApiKeyInput ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-neutral-600 leading-relaxed">
                  🔒 僅存於本機瀏覽器，不上傳任何伺服器。
                </p>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors whitespace-nowrap ml-2"
                >
                  免費取得 Key →
                </a>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveApiKey}
                className="flex-1 py-2.5 bg-white hover:bg-neutral-100 text-black text-sm font-semibold rounded-lg transition-all active:scale-[0.97]"
              >
                儲存
              </button>
              <button
                onClick={handleCancelApiKey}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-lg transition-all active:scale-[0.97]"
              >
                取消
              </button>
              <button
                onClick={handleClearApiKey}
                className="py-2.5 px-4 bg-transparent hover:bg-red-950/50 text-red-500 hover:text-red-400 border border-neutral-700 hover:border-red-800 text-sm font-medium rounded-lg transition-all active:scale-[0.97]"
                title="清除已儲存的 API Key"
              >
                清除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {showLightbox && displayImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setShowLightbox(false)}
        >
          <button 
            className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowLightbox(false);
            }}
          >
            <X size={32} />
          </button>
          <img 
            src={displayImage} 
            alt="Full Scale Interior Design" 
            className="max-w-full max-h-full object-contain shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Designer Guide Tips Modal */}
      {showTipsPopover && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowTipsPopover(false)}
        >
          <div 
            className="max-w-md w-full max-h-[85vh] flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 text-neutral-200 select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 p-6 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-950 border border-indigo-800 rounded-xl">
                  <Lightbulb size={18} className="text-indigo-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">下一步提醒</div>
                  <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                    {nextStepGuide.title}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setShowTipsPopover(false)}
                className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-805 rounded-lg transition-all text-xs w-6 h-6 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 space-y-3 pr-5">
              {[
                ['你現在要做什麼', nextStepGuide.now],
                ['AI 會幫你做什麼', nextStepGuide.ai],
                ['完成後會得到什麼', nextStepGuide.result],
              ].map(([label, text], idx) => (
                <div key={label} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-neutral-200">{label}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-800 flex justify-end bg-neutral-950/40 rounded-b-2xl flex-shrink-0">
              <button 
                onClick={() => setShowTipsPopover(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Controls */}
      <aside className={`flex-shrink-0 bg-neutral-900/95 flex flex-col overflow-y-auto z-10 transition-all duration-300 ${
        isSidebarCollapsed 
          ? 'w-full lg:w-0 h-0 lg:h-full opacity-0 pointer-events-none border-b-0 lg:border-r-0 overflow-hidden' 
          : 'w-full lg:w-[380px] xl:w-[400px] h-[40%] lg:h-full border-b lg:border-b-0 lg:border-r border-neutral-800 opacity-100'
      }`}>
	        <div className="p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10">
	          <div className="flex items-center gap-3 mb-1">
	            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/5">
	              <Armchair size={22} className="text-black" strokeWidth={2.5} />
	            </div>
	            <div className="flex flex-col justify-center h-10">
	              <h1 className="brand-wordmark brand-wordmark--sidebar mb-1">
                <span className="brand-room">Room</span><span className="brand-wise">Wise</span>
              </h1>
	              <span className="font-['Manrope'] text-[10px] font-bold tracking-[0.08em] text-neutral-500 uppercase leading-none">回答問題，上傳照片，就能開始規劃</span>
	            </div>
	          </div>
	          {/* Mode toggle */}
	          <div className="flex items-center gap-1 mt-3 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
	            <button
	              onClick={() => setSidebarMode('manual')}
	              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${sidebarMode === 'manual' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'}`}
	            >
	              <SlidersHorizontal size={12} />
	              直接設定
	            </button>
	            <button
	              onClick={() => setSidebarMode('ai')}
	              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${sidebarMode === 'ai' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'}`}
	            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="14" rx="3"/>
                <circle cx="8.5" cy="13" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="15.5" cy="13" r="1.5" fill="currentColor" stroke="none"/>
                <path d="M9 17h6"/>
                <path d="M12 6V3.5"/>
                <circle cx="12" cy="2.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
	              AI 引導
	            </button>
	          </div>
	        </div>

        {/* AI Designer mode — always mounted (CSS hidden when inactive) to preserve chat state */}
        <div className={`flex-1 min-h-0 p-4 flex flex-col overflow-hidden ${sidebarMode === 'ai' ? '' : 'hidden'}`}>
            <AIDesignerSidebar
              isActive={sidebarMode === 'ai'}
              floorPlan={config.floorPlan}
              realScenes={config.realScenes}
              context={{
                style: config.style,
                roomType: config.roomType,
                hasFloorPlan: !!config.floorPlan,
                hasRealScene: config.realScenes.length > 0,
              }}
              onProjectBriefChange={(brief) => {
                setCurrentProjectBrief(brief);
                if (brief?.summary) {
                  setConfig(prev => ({ ...prev, prompt: brief.summary }));
                }
              }}
              onGenerate={async (aiPrompt, projectBrief, aiSummary) => {
                if (generatingRef.current || isGenerating) return;

                // Generate using images from config + AI-collected prompt
                // Does NOT modify config.prompt — fully isolated
                if (!config.floorPlan && config.realScenes.length === 0) {
                  setError('請先上傳平面配置圖或實景照片。');
                  return;
                }
                generatingRef.current = true;
                setIsGenerating(true);
                setError(null);
                setEditPrompt('');
                setIsComparing(false);
                setAppliedRefinements([]);
                try {
                  if (projectBrief) setCurrentProjectBrief(projectBrief);
                  const promptForGeneration = aiPrompt || config.prompt;
                  const resultImage = await generateDesign({
                    ...config,
                    prompt: promptForGeneration,
                  });
                  replaceDesignHistory(resultImage, {
                    source: 'ai_generate',
                    title: 'AI 引導生成',
                    prompt: promptForGeneration,
                    style: config.style,
                    roomType: config.roomType,
                    changeReason: '依 AI 引導整理出的空間需求與渲染指令產生版本。',
                    aiSummary,
                    projectBrief: projectBrief ?? currentProjectBrief,
                  });
                } catch (err: any) {
                  handleError(err);
                } finally {
                  generatingRef.current = false;
                  setIsGenerating(false);
                }
              }}
              isGenerating={isGenerating}
            />
          </div>

	        {/* Manual mode */}
	        <div className={`p-6 space-y-6 pb-8 flex-1 ${sidebarMode === 'manual' ? '' : 'hidden'}`}>

          {/* Section 0: Import Existing */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              已有圖片可直接開始
            </h2>
            <ImageUpload 
              label="匯入設計圖" 
              description="有舊圖或參考圖時使用"
              file={null} // Keep null so it acts as a permanent upload button
              onFileChange={handleImportDesign}
            />
          </div>

          <div className="h-px bg-neutral-800" />

	          {/* Section 1: Inputs */}
	          <div className="space-y-4">
	            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
	              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
	              1. 上傳現況
	            </h2>
	            <ImageUpload 
	              label="平面圖或格局圖" 
	              description="有尺寸最好，沒有也可以先上傳"
	              file={config.floorPlan} 
	              onFileChange={handleFloorPlanFileChange} 
	            />
	            <ImageUpload
	              label="現場照片"
	              description="建議拍門口、窗邊、主要牆面，最多 3 張"
              multiple={true}
              maxFiles={3}
              files={config.realScenes}
              onFilesChange={(files) => setConfig(prev => ({ ...prev, realScenes: files }))}
            />
	          </div>

          <div className="h-px bg-neutral-800" />

	          {/* Section 2: Config */}
	          <div className="space-y-5">
	            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
	              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
	              2. 選擇想看的方案方向
	            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
	                <label className="text-xs font-medium text-neutral-400">想先看哪個空間</label>
                <select 
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-white/20 focus:border-white/50 outline-none transition-all"
                  value={config.roomType}
                  onChange={(e) => setConfig(prev => ({ ...prev, roomType: e.target.value as RoomType }))}
                >
                  {ROOM_TYPES.map(t => <option key={t} value={t}>{ROOM_TYPE_LABELS[t as RoomType] || t}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
	                <label className="text-xs font-medium text-neutral-400">喜歡的風格</label>
                <select 
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-white/20 focus:border-white/50 outline-none transition-all"
                  value={config.style}
                  onChange={(e) => setConfig(prev => ({ ...prev, style: e.target.value as DesignStyle }))}
                >
                  {DESIGN_STYLES.map(s => <option key={s} value={s}>{DESIGN_STYLE_LABELS[s as DesignStyle] || s}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-400">設計需求</label>
              </div>
              <textarea
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-white/20 focus:border-white/50 outline-none min-h-[100px] resize-y placeholder:text-neutral-600 transition-all"
                placeholder="補充需求，例如：明亮、收納多、不要深色、預算有限..."
                value={config.prompt}
                onChange={(e) => setConfig(prev => ({ ...prev, prompt: e.target.value }))}
              />
            </div>
          </div>

	          {/* Optional room dimensions */}
	          <div className="space-y-1.5">
	            <label className="text-xs font-medium text-neutral-400">補充尺寸 <span className="text-neutral-600 font-normal">(選填・公尺)</span></label>
            <div className="grid grid-cols-3 gap-2">
              {(['length', 'width', 'height'] as const).map((dim, i) => (
                <div key={dim} className="space-y-0.5">
                  <span className="text-[9px] text-neutral-600">{['長', '寬', '天花高'][i]}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder={['5', '4', '2.8'][i]}
                    value={roomDimensions[dim]}
                    onChange={e => setRoomDimensions(prev => ({ ...prev, [dim]: e.target.value }))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:ring-1 focus:ring-white/20 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

	          {/* Lighting time-of-day selector */}
	          <div className="space-y-2">
	            <label className="text-xs font-medium text-neutral-400">希望呈現的光線</label>
            <div className="flex gap-1.5">
              {LIGHTING_OPTIONS.map(o => (
                <button
                  key={o.key}
                  onClick={() => setLightingTime(o.key)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    lightingTime === o.key
                      ? 'bg-white text-black border-white'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white hover:border-neutral-500'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

	          {/* Action Section - Inline & Focused (No longer a full width footer) */}
	          <div className="pt-6 border-t border-neutral-800/80 flex flex-col items-center justify-center">
	            {error && (
	              <div className="w-full mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-100">
	                {error}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="group relative w-full overflow-hidden py-3.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 disabled:from-neutral-700 disabled:to-neutral-700 disabled:text-neutral-400 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-950/60 hover:shadow-xl hover:shadow-indigo-900/40 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 border border-indigo-400/20 select-none"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                  生成渲染中...
                </>
              ) : (
                <>
                  <Sparkles size={15} className="flex-shrink-0" />
                  依直接設定產生方案
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace / Preview */}
      <main className="flex-1 bg-neutral-950 relative overflow-hidden flex flex-col">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ 
               backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }}>
        </div>

        {/* Header/Toolbar */}
        <div className="h-16 flex-shrink-0 border-b border-neutral-850 flex items-center justify-between px-6 bg-neutral-900/60 backdrop-blur-md z-15 relative gap-4">
            <div className="flex items-center gap-3 min-w-0">
                 <span className="text-sm font-semibold tracking-wider text-neutral-300 hidden md:inline flex-shrink-0">方案預覽</span>
                 
                 {/* Collapse/Expand Sidebar Trigger Button */}
                 <button
                   onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                   className="p-1 px-2.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white flex items-center gap-1.5 transition-all text-[11px] font-medium cursor-pointer"
                   title={isSidebarCollapsed ? "展開左側面板" : "收合左側面板"}
                 >
                   <ChevronRight size={13} className={`transform transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
                   <span>{isSidebarCollapsed ? "顯示左側資料" : "收合左側資料"}</span>
                 </button>
                 
                 <div className="h-4 w-[1px] bg-neutral-800 hidden md:block"></div>
                 
                 {/* 2D vs 3D Mode Tab Selector */}
                 <div className="flex items-center bg-neutral-950 p-1 rounded-full border border-neutral-800/80 shadow-inner scale-95 origin-left flex-shrink-0">
                   <button 
                     onClick={() => setViewMode('2d')}
                     className={`px-2.5 py-1 text-[11px] rounded-full font-bold select-none flex items-center gap-1.5 transition-all duration-300 ${viewMode === '2d' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'}`}
                   >
                     <Eye size={12} />
                     看風格圖
                   </button>
                   <button 
                     onClick={() => setViewMode('3d')}
                     className={`px-2.5 py-1 text-[11px] rounded-full font-bold select-none flex items-center gap-1.5 transition-all duration-300 ${viewMode === '3d' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'}`}
                   >
                     <Box size={12} />
                     3D 空間配置
                   </button>
                 </div>

                 {viewMode === '3d' && threeDSpaceSource && (
                   <button
                     onClick={() => setThreeDSpaceSource(null)}
                     className="px-2.5 py-1 text-[11px] rounded-full font-bold border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-700 transition-colors flex-shrink-0"
                   >
                     更換方式
                   </button>
                 )}

                 {displayImage && (
                    <div className="flex items-center gap-2 min-w-0 xs:flex">
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] border border-green-500/20 flex items-center gap-1 flex-shrink-0">
                            <CheckCircle2 size={10} /> 
                            <span className="hidden sm:inline">空間渲染完成</span>
                            <span className="sm:hidden">已完成</span>
                        </span>
                        <div className="h-3 w-px bg-neutral-800 flex-shrink-0 hidden xs:block"></div>
                        <span className="text-[10px] text-neutral-500 flex items-center gap-1 truncate flex-shrink-0 hidden xs:flex">
                             <History size={11} />
                             V{historyIndex + 1}/{history.length}
                        </span>
                    </div>
                 )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                    variant="outline"
                    className="!py-1 !px-2.5 !text-[11px] !border-neutral-700 flex items-center gap-1.5"
                    onClick={handleSelectKey}
                    title="設定 Gemini API 金鑰"
                >
                    <Key size={11} />
                    API Key
                </Button>
                {displayImage && (
	                    <Button 
	                        variant="ghost" 
	                        onClick={() => { setHistory([]); setVersionRecords([]); setHistoryIndex(-1); }}
	                        title="清除本次結果"
                        className="!py-1 !px-2.5"
                    >
                        <RefreshCw size={14} />
                    </Button>
                )}
            </div>
        </div>

          {/* Homeowner-friendly planning steps */}
          <div className="bg-neutral-900/80 border-b border-neutral-850 p-2.5 px-4 md:px-6 flex items-center justify-between gap-4 select-none flex-shrink-0 z-35 shadow-sm relative backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-shrink-0 relative">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase flex items-center gap-1">
                裝修規劃進度
              </span>
            </div>

            {/* Interactive Designer Popover Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowTipsPopover(true)}
                className="flex items-center gap-1 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-800/50 hover:border-indigo-700/80 px-2.5 py-1 rounded-full text-[10px] text-indigo-300 font-bold cursor-pointer transition-all leading-none shadow-md active:scale-95 select-none"
              >
                <Lightbulb size={10} className="text-indigo-400" />
                <span>下一步提醒</span>
              </button>
            </div>
          </div>

          {/* Connected homeowner steps */}
          <div className="flex flex-1 items-center justify-end md:justify-center gap-2 xl:gap-4 overflow-x-auto scrollbar-none py-1">
            {([
              {
                step: 1 as const,
                title: "上傳現況",
                subtitle: "平面圖與照片",
                active: activeWorkflowStep === 1,
                done: !!config.floorPlan || config.realScenes.length > 0
              },
              {
                step: 2 as const,
                title: "整理需求",
                subtitle: "生活需求與預算",
                active: activeWorkflowStep === 2,
                done: activeWorkflowStep > 2 && (!!config.floorPlan || config.realScenes.length > 0)
              },
              {
                step: 3 as const,
                title: "看設計圖",
                subtitle: "風格與氛圍",
                active: activeWorkflowStep === 3,
                done: !!displayImage
              },
              {
                step: 4 as const,
                title: "3D 空間配置",
                subtitle: "家具大小與走道",
                active: activeWorkflowStep === 4,
                done: viewMode === '3d'
              }
            ]).map((s, i, arr) => (
              <React.Fragment key={s.step}>
                <button
                  onClick={() => {
                    setActiveWorkflowStep(s.step);
                    if (s.step === 1 || s.step === 3) {
                      setViewMode('2d');
                      if (s.step === 1) setSidebarMode('manual');
                    } else if (s.step === 2) {
                      setViewMode('2d');
                      setSidebarMode('ai');
                    } else if (s.step === 4) {
                      setViewMode('3d');
                    }
                  }}
                  className={`flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-left transition-all duration-300 flex-shrink-0 cursor-pointer ${
                    s.active 
                      ? 'bg-neutral-850 border-neutral-600 text-white font-semibold shadow-md shadow-neutral-950/20' 
                      : 'bg-neutral-900/30 border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
                  }`}
                >
                  {s.done ? (
                    <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[9px] bg-emerald-500 rounded-full flex items-center justify-center text-black font-semibold select-none flex-shrink-0">✓</span>
                  ) : (
                    <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-[9px] sm:text-[10px] rounded-full flex items-center justify-center select-none flex-shrink-0 ${s.active ? 'bg-indigo-500 text-white font-bold' : 'bg-neutral-855 text-neutral-500 border border-neutral-800'}`}>{s.step}</span>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] leading-tight font-bold tracking-wide">{s.title}</span>
                    <span className={`text-[8px] sm:text-[9px] text-neutral-500 font-medium leading-normal whitespace-nowrap ${isSidebarCollapsed ? 'hidden sm:block' : 'hidden xl:block'}`}>{s.subtitle}</span>
                  </div>
                </button>
                {i < arr.length - 1 && (
                  <ChevronRight size={11} className="text-neutral-800 flex-shrink-0 hidden md:block" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-5 overflow-hidden relative min-h-0 min-w-0">
          {viewMode === '3d' ? (
             <div className="w-full h-full animate-in fade-in duration-500 min-h-0">
                {!threeDSpaceSource ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 shadow-2xl shadow-black/30">
                      <div className="mb-4 text-center">
                        <p className="text-sm font-bold text-white">建立 3D 空間配置</p>
                        <p className="mt-1 text-xs text-neutral-500">選擇空間來源後再進入配置工具</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          onClick={() => setThreeDSpaceSource('manual')}
                          className="group flex min-h-24 flex-col items-start justify-between rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 text-left transition-all hover:border-neutral-600 hover:bg-neutral-900"
                        >
                          <span className="flex items-center gap-2 text-neutral-200 group-hover:text-white transition-colors">
                            <Box size={16} strokeWidth={1.9} />
                            <span className="text-sm font-bold">自由建立</span>
                          </span>
                          <span className="text-xs leading-relaxed text-neutral-500">直接進入目前的 3D 配置工具</span>
                        </button>
                        <button
                          onClick={() => setThreeDSpaceSource('floor_plan')}
                          className="group flex min-h-24 flex-col items-start justify-between rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 text-left transition-all hover:border-neutral-600 hover:bg-neutral-900"
                        >
                          <span className="flex items-center gap-2 text-neutral-200 group-hover:text-white transition-colors">
                            <ScanLine size={16} strokeWidth={1.9} />
                            <span className="text-sm font-bold">平面圖空屋</span>
                          </span>
                          <span className="text-xs leading-relaxed text-neutral-500">先建立牆、門窗與空屋格局</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : threeDSpaceSource === 'floor_plan' ? (
                  floorPlanLayout ? (
                    <div className="flex h-full w-full flex-col gap-2">
                      <div className="flex flex-shrink-0 items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-xs shadow-lg shadow-black/20">
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">平面圖解析工作台</p>
                          <p className="text-[11px] text-neutral-500 truncate">
                            {floorPlanLayout.imageName} · 牆體 {floorPlanLayout.walls.length} 段 · 平均信心 {Math.round(floorPlanLayout.diagnostics.averageWallConfidence * 100)}% · {floorPlanLayout.scale.confidence === 'calibrated' ? '比例已校正' : '比例待校正'}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => setThreeDSpaceSource(null)}
                            className="rounded-full px-2.5 py-1 text-[11px] font-bold text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-white"
                          >
                            返回
                          </button>
                        </div>
                      </div>
                      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.45fr)]">
                        {config.floorPlan && (
                          <FloorPlanAnalysisWorkbench
                            floorPlan={config.floorPlan}
                            layout={floorPlanLayout}
                            isAnalyzing={isAnalyzingFloorPlan}
                            onCalibrateScale={handleCalibrateFloorPlanScale}
                            onRemoveWall={handleRemoveFloorPlanWall}
                            onReanalyze={handleAnalyzeFloorPlanLayout}
                          />
                        )}
                        <div className="min-h-[280px] xl:min-h-0">
                          <Suspense fallback={
                            <div className="flex h-full items-center justify-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950 text-sm text-neutral-500">
                              <div className="w-4 h-4 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
                              載入空屋 3D...
                            </div>
                          }>
                            <FloorPlanEmptyViewer layout={floorPlanLayout} />
                          </Suspense>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 shadow-2xl shadow-black/30">
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-white">平面圖空屋</p>
                            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                              {config.floorPlan
                                ? '已取得平面圖；先用自動解析建立第一版空屋。'
                                : '上傳平面圖後，才會建立對應的空屋 3D。'}
                            </p>
                          </div>
                          <button
                            onClick={() => setThreeDSpaceSource(null)}
                            className="rounded-full px-2.5 py-1 text-[11px] font-bold text-neutral-500 hover:bg-neutral-900 hover:text-white transition-colors"
                          >
                            返回
                          </button>
                        </div>
                        <ImageUpload
                          compact
                          label="平面圖或格局圖"
                          description="上傳後進行空屋建立"
                          file={config.floorPlan}
                          onFileChange={handleFloorPlanFileChange}
                        />
                        {floorPlanLayoutError && (
                          <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                            {floorPlanLayoutError}
                          </p>
                        )}
                        <button
                          onClick={handleAnalyzeFloorPlanLayout}
                          disabled={!config.floorPlan || isAnalyzingFloorPlan}
                          className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-xs font-bold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
                        >
                          {isAnalyzingFloorPlan ? '解析中...' : '解析平面圖並建立空屋'}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                <div className="w-full h-full min-h-0">
                <ThreeViewerErrorBoundary>
                <Suspense fallback={
                  <div className="flex items-center justify-center gap-3 text-neutral-500 text-sm">
                    <div className="w-4 h-4 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
                    載入 3D 場景中...
                  </div>
                }>
                 <ThreeRoomViewer
                    style={config.style} onRoomTypeChange={(newRoomType) => setConfig(prev => ({ ...prev, roomType: newRoomType }))} isSidebarCollapsed={isSidebarCollapsed}
                    roomType={config.roomType}
                    appliedRefinements={appliedRefinements}
                    onApplyRefinement={(prompt, isToRemove) => {
                       if (isToRemove) {
                          setAppliedRefinements(prev => prev.filter(p => p !== prompt));
                       } else {
                          if (!appliedRefinements.includes(prompt)) {
                             setAppliedRefinements(prev => [...prev, prompt]);
                          }
                       }
                       setEditPrompt(prompt);
                    }}
                 />
                </Suspense>
                </ThreeViewerErrorBoundary>
                </div>
                )}
             </div>
          ) : displayImage ? (
             <div className="relative w-full h-full flex flex-col items-center justify-start animate-in fade-in zoom-in duration-500 min-h-0">
                
                {/* Refine bar — label removed, undo/redo inline with input */}
                <div className="mb-2 w-full max-w-2xl animate-in slide-in-from-top-4 fade-in duration-700 flex flex-col gap-1.5 z-20 flex-shrink-0 px-2">

                     {/* Input bar with undo/redo inline */}
                     <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-700/80 rounded-full p-1 flex items-center shadow-2xl transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:ring-offset-2 focus-within:ring-offset-neutral-950">
                        <div className="pl-3 pr-2 text-neutral-400 flex-shrink-0">
                            <Wand2 size={15} />
                        </div>
                        <input
                            type="text"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleMagicEdit()}
                            placeholder="想調整哪裡？例如：沙發改小一點、牆面改暖白、增加收納櫃..."
                            className="flex-1 bg-transparent border-none text-white placeholder:text-neutral-500 focus:outline-none focus:ring-0 text-xs sm:text-sm py-1.5 min-w-0"
                            disabled={isEditing}
                        />
                        {/* Compare — only when history exists */}
                        {historyIndex > 0 && (
                          <button
                            onMouseDown={() => setIsComparing(true)}
                            onMouseUp={() => setIsComparing(false)}
                            onMouseLeave={() => setIsComparing(false)}
                            className={`p-1.5 rounded-full mr-0.5 transition-colors flex-shrink-0 ${isComparing ? 'text-indigo-400' : 'text-neutral-600 hover:text-neutral-300'}`}
                            title="按住對比原始版本"
                          >
                            {isComparing ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                        )}
                        {/* Undo / Redo — small icon buttons */}
                        <button onClick={handleUndo} disabled={historyIndex <= 0 || isEditing}
                          className="p-1.5 text-neutral-600 hover:text-neutral-300 disabled:opacity-25 transition-colors rounded-full flex-shrink-0" title="還原">
                          <Undo2 size={13} />
                        </button>
                        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1 || isEditing}
                          className="p-1.5 text-neutral-600 hover:text-neutral-300 disabled:opacity-25 transition-colors rounded-full flex-shrink-0 mr-0.5" title="重做">
                          <Redo2 size={13} />
                        </button>
                        <button
                            onClick={handleMagicEdit}
                            disabled={!editPrompt.trim() || isEditing}
                            className="bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600 text-black p-2 rounded-full transition-all flex-shrink-0"
                        >
                            <Send size={13} />
                        </button>
                     </div>

                     {/* Refine preset chips */}
                     <div className="flex items-center gap-1.5 mt-1 px-1 max-w-full overflow-x-auto select-none pb-1 flex-shrink-0 scrollbar-none whitespace-nowrap scroll-smooth">
                         {(REFINE_PRESETS_BY_ROOM[config.roomType] ?? REFINE_PRESETS_BY_ROOM[RoomType.LIVING_ROOM]).map((p, i) => (
                             <button
                                 key={i}
                                 onClick={() => setEditPrompt(p.prompt)}
                                 className="text-[9px] sm:text-[10px] bg-neutral-900 border border-neutral-800/80 hover:border-indigo-500/50 hover:bg-neutral-800 text-neutral-400 hover:text-white px-2.5 py-0.5 rounded-full transition-all duration-300 cursor-pointer active:scale-95 disabled:opacity-50 flex-shrink-0 inline-block"
                                 disabled={isEditing}
                             >
                                  {p.label}
                             </button>
                         ))}
                     </div>
                </div>

                {/* Image Container with precise responsive calculation limit so that it never leaks out of the viewport bounds */}
	                <div className="relative flex-1 min-h-0 w-full max-w-5xl flex items-center justify-center p-1 md:p-1.5">
	                    <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-neutral-800/90 max-h-full max-w-full flex items-center justify-center bg-neutral-900 group">
                        <img 
                            src={displayImage} 
                            alt="Generated Interior Design" 
                            className="max-h-[calc(100vh-210px)] md:max-h-[calc(100vh-220px)] lg:max-h-[calc(100vh-165px)] w-auto max-w-full object-contain select-none transition-transform duration-300 shadow-inner"
                        />
                         {/* Comparison Indicator Overlay */}
                         {isComparing && (
                           <div className="absolute top-4 left-4 bg-indigo-600/90 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg font-medium animate-pulse pointer-events-none">
                              正在看上一版
                           </div>
                         )}

                         {/* Loading Overlay for Edit */}
                        {isEditing && (
                            <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center z-20 animate-in fade-in duration-300">
                                <div className="text-center space-y-4">
                                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                                        {/* Spinning dashed glow ring */}
                                        <div className="absolute inset-0 rounded-full border border-dashed border-indigo-500/40 animate-[spin_6s_linear_infinite]" />
                                        <div className="absolute inset-2 rounded-full border border-dotted border-purple-500/50 animate-[spin_4s_linear_infinite_reverse]" />
                                        <div className="absolute inset-3 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.25)]">
                                            <Sparkles className="animate-pulse text-indigo-400" size={32} />
                                        </div>
                                    </div>
	                                    <p className="text-neutral-200 text-xs sm:text-sm font-medium tracking-wide">正在幫你修改這張圖...</p>
                                </div>
                            </div>
                        )}
                        
                        {/* Overlay Actions */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => setShowLightbox(true)}
                                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-md transition-colors"
                                title="Maximize (Full Screen)"
                            >
                                <Maximize2 size={18} />
                            </button>
                            <button 
                                onClick={downloadImage}
                                className="p-2 bg-white hover:bg-neutral-200 text-black rounded-lg shadow-lg transition-colors"
                                title="Download Image"
                            >
                                <Download size={18} />
                            </button>
                        </div>
	                    </div>
	                </div>

                {currentVersion && (
                  <div className="w-full max-w-5xl px-1 md:px-1.5 pb-1 flex-shrink-0">
                    <div className="bg-neutral-900/85 border border-neutral-800 rounded-xl px-3 py-2 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                          {[
                            { key: 'version' as const, label: '版本紀錄', icon: History },
                            { key: 'check' as const, label: '好住檢查', icon: ClipboardCheck },
                          ].map(tab => {
                            const Icon = tab.icon;
                            return (
                              <button
                                key={tab.key}
                                onClick={() => setResultInfoTab(tab.key)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                                  resultInfoTab === tab.key
                                    ? 'bg-white text-black'
                                    : 'text-neutral-500 hover:text-neutral-200'
                                }`}
                              >
                                <Icon size={11} />
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[9px] text-neutral-500 flex-shrink-0">
                          {sourceLabels[currentVersion.source]} · V{displayedVersionIndex + 1}
                        </span>
                      </div>

                      {resultInfoTab === 'version' && (
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <History size={12} className="text-indigo-400 flex-shrink-0" />
                            <span className="text-[10px] font-bold text-neutral-200 truncate">這版怎麼來的</span>
                          </div>
                          <p className="text-[10px] text-neutral-400 leading-relaxed line-clamp-2">{currentVersion.changeReason}</p>
                          {(currentVersion.aiSummary || currentVersion.projectBrief?.summary) && (
                            <p className="mt-1 text-[9px] text-neutral-600 truncate">
                              摘要：{currentVersion.aiSummary || currentVersion.projectBrief?.summary}
                            </p>
                          )}
                        </div>
                      )}

                      {resultInfoTab === 'check' && (
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <ClipboardCheck size={12} className="text-emerald-400" />
                              <span className="text-[10px] font-bold text-neutral-200">AI 幫你檢查好不好住</span>
                            </div>
                            <span className="text-[9px] text-neutral-600">
                              {currentVersion.checklistStatus === 'checking'
                                ? '檢核中'
                                : currentVersion.checklistStatus === 'done'
                                  ? '已完成'
                                  : currentVersion.checklistStatus === 'error'
                                    ? '需人工複核'
                                    : '等待檢核'}
                            </span>
                          </div>

                          {currentVersion.checklistStatus === 'checking' && (
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                              <CircleDashed size={12} className="animate-spin text-neutral-500" />
                              正在檢查動線、收納、比例、採光與濕區風險...
                            </div>
                          )}

                          {currentVersion.checklistStatus !== 'checking' && currentVersion.checklist && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-1.5">
                              {currentVersion.checklist.map(item => {
                                const tone =
                                  item.status === 'pass'
                                    ? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-300'
                                    : item.status === 'fail'
                                      ? 'border-red-800/50 bg-red-950/20 text-red-300'
                                      : item.status === 'warning'
                                        ? 'border-amber-800/50 bg-amber-950/20 text-amber-300'
                                        : 'border-neutral-800 bg-neutral-950/40 text-neutral-400';
                                const Icon = item.status === 'pass' ? CheckCircle2 : item.status === 'unknown' ? CircleDashed : AlertTriangle;
                                return (
                                  <div key={item.key} className={`rounded-lg border px-2 py-1.5 min-w-0 ${tone}`}>
                                    <div className="flex items-center gap-1 min-w-0 mb-0.5">
                                      <Icon size={10} className="flex-shrink-0" />
                                      <span className="text-[9px] font-bold truncate">{item.label}</span>
                                    </div>
                                    <p className="text-[9px] leading-snug text-neutral-400 line-clamp-2">{item.note}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

	             </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-neutral-600 max-w-md text-center">
                 {isGenerating ? (
                    <div className="space-y-6 animate-pulse">
                        <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                            {/* Orbit wave 1 (Tech blueprint gradient ring) */}
                            <div className="absolute inset-0 rounded-full border border-dashed border-indigo-500/40 animate-[spin_15s_linear_infinite]" />
                            
                            {/* Orbit wave 2 (Golden glowing pointer ring) */}
                            <div className="absolute -inset-1 rounded-full border-2 border-transparent border-t-amber-400/60 border-r-indigo-500/50 animate-[spin_4s_linear_infinite]" />
                            
                            {/* Orbit wave 3 (Reverse dotted ring) */}
                            <div className="absolute inset-3 rounded-full border border-dotted border-purple-400/50 animate-[spin_10s_linear_infinite_reverse]" />
                            
                            {/* Quantum background glow */}
                            <div className="absolute inset-6 rounded-full bg-indigo-600/20 blur-xl animate-pulse" />
                            <div className="absolute inset-2 rounded-full bg-purple-600/10 blur-2xl animate-pulse" />
                            
                            {/* Holosculpt Glass Crystal sphere */}
                            <div className="absolute inset-6 rounded-full bg-neutral-950/80 border border-neutral-800/90 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.25)] overflow-hidden group">
                                {/* Aesthetic central paired design icons */}
                                <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 animate-pulse" style={{ animationDuration: '3s' }}>
                                    <Armchair size={24} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" strokeWidth={1.8} />
                                    <div className="flex gap-1 items-center">
                                        <Sparkles className="text-indigo-400 animate-bounce" size={10} />
                                        <span className="text-[7px] text-indigo-300 font-mono tracking-widest uppercase">AI Core</span>
                                    </div>
                                </div>
                            </div>

                            {/* Orbiting particles */}
                            <div className="absolute -top-1 -right-1 bg-neutral-950 border border-neutral-800/80 p-2 rounded-xl shadow-2xl animate-[bounce_2.5s_ease-in-out_infinite] shadow-indigo-500/10">
                                <Sparkles className="text-amber-400 animate-pulse" size={12} />
                            </div>
                            <div className="absolute -bottom-1 -left-1 bg-neutral-950 border border-neutral-800/80 p-2 rounded-xl shadow-2xl animate-[bounce_2s_ease-in-out_infinite_reverse] shadow-purple-500/10">
                                <Wand2 className="text-indigo-400" size={11} />
                            </div>
                        </div>
                        <div className="px-4">
	                             <h3 className="text-xl font-bold text-white mb-3 bg-gradient-to-r from-white via-neutral-100 to-indigo-200 bg-clip-text text-transparent">正在產生第一版設計圖...</h3>
	                             <p className="text-xs text-neutral-400 leading-relaxed font-sans">
	                                 AI 正在參考左側的現況照片、需求與風格，完成後會一起檢查動線、收納和家具比例。
	                             </p>
                        </div>
                    </div>
                 ) : (
                    <>
                        <div className="w-20 h-20 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 shadow-xl rotate-3">
                            <Armchair size={36} className="text-neutral-500" strokeWidth={1.5} />
                        </div>
	                        <h3 className="text-xl font-medium text-neutral-300 mb-2">先完成左側 3 件事</h3>
	                        <p className="text-sm leading-relaxed mb-6 text-neutral-400">
	                            上傳現況、整理需求、選擇想看的空間後，就能產生第一版設計圖。
	                        </p>
                    </>
                 )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
