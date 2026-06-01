import React, { useState, useEffect } from 'react';
import { Wand2, Download, Maximize2, RefreshCw, Key, ChevronRight, CheckCircle2, ScanEye, Sparkles, Send, Armchair, X, Undo2, Redo2, History, Eye, EyeOff, Box, Lightbulb, SlidersHorizontal } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import Button from './components/Button';
import AIDesignerChat from './components/AIDesignerChat';
import AIDesignerSidebar from './components/AIDesignerSidebar';
import { DesignConfig, DesignStyle, RoomType, ROOM_TYPE_LABELS, DESIGN_STYLE_LABELS } from './types';
import { DESIGN_STYLES, ROOM_TYPES, SAMPLE_PROMPTS } from './constants';
import { generateDesign, analyzeRoomImages, editDesignImage, extractSpatialContextForRendering } from './services/geminiService';
import { ThreeRoomViewer } from './components/ThreeRoomViewer';

const REFINE_PRESETS = [
  { label: "🛋️ 頂級皮革沙發", prompt: "將主沙發更換為溫潤色澤的頂級棕色皮革沙發，增添空間沉穩感與奢華質感" },
  { label: "🪵 北歐拼木地板", prompt: "將地板全數鋪設為溫暖質樸的北歐橡木人字拼木地板，提升自然層次" },
  { label: "💡 溫馨落日氣氛燈", prompt: "在角落或天花板邊緣導入柔和的暖黃色落日落地燈與隱藏式線性光源" },
  { label: "🪴 琴葉榕室內綠植", prompt: "在房間光照良好的角落佈置高大的琴葉榕盆栽與部分蔓綠絨垂吊綠植，營造生命氣息" },
  { label: "🎨 現代幾何抽象畫", prompt: "在主牆面懸掛一幅以黑、白、金為主軸的現代極簡手繪幾何抽象藝術畫作" },
  { label: "🧱 清水混凝土背景", prompt: "將電視迎光面的背牆材質改為乾淨、優雅的清水混凝土模板牆，呈現侘寂風格" }
];

const USER_API_KEY_STORAGE_KEY = 'interior-design-studio.geminiApiKey';

const getStoredApiKey = () => {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(USER_API_KEY_STORAGE_KEY) || '';
};

const App: React.FC = () => {
  const [apiKeyReady, setApiKeyReady] = useState(Boolean(process.env.API_KEY || getStoredApiKey()));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getStoredApiKey);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<'manual' | 'ai'>('manual');
  
  // View mode & Refinement state for Solution A (3D Sandbox)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showTipsPopover, setShowTipsPopover] = useState(false);
  const [appliedRefinements, setAppliedRefinements] = useState<string[]>([]);

  // History State for Undo/Redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isComparing, setIsComparing] = useState(false);

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
          msg = "Permission denied. The selected API key project does not have access to the required Gemini models. Please select a paid project.";
          setApiKeyReady(false);
          setTimeout(() => setShowApiKeyModal(true), 100);
      } else if (
        errorMessage.includes("500") || 
        errorString.includes("500") ||
        errorMessage.includes("Internal error")
      ) {
          msg = "The AI model encountered a temporary internal error (500). Please try simplifying your request or try again in a moment.";
      } else {
          msg = err.message || msg;
      }
      setError(msg);
  };

  const handleAnalyze = async () => {
    const filesToAnalyze: File[] = [];
    if (config.floorPlan) filesToAnalyze.push(config.floorPlan);
    if (config.realScenes.length > 0) filesToAnalyze.push(...config.realScenes);

    if (filesToAnalyze.length === 0) {
      setError("Please upload a floor plan or at least one real scene image to analyze.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    try {
      const analysisText = await analyzeRoomImages(filesToAnalyze);
      // Append analysis to the current prompt
      setConfig(prev => ({
        ...prev,
        prompt: (prev.prompt ? prev.prompt + "\n\n" : "") + `[Room Context: ${analysisText}]`
      }));
    } catch (err) {
      handleError(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!config.floorPlan && config.realScenes.length === 0) {
      setError("Please upload at least a floor plan or a real scene image.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setHistory([]);
    setHistoryIndex(-1);
    setEditPrompt("");
    setIsComparing(false);
    setAppliedRefinements([]);

    try {
      let enrichedConfig = { ...config };

      // If floor plan is provided, pre-analyse spatial layout for the target room
      // and inject it into the prompt for more accurate rendering
      if (config.floorPlan) {
        try {
          const spatialContext = await extractSpatialContextForRendering(
            config.floorPlan,
            config.roomType,
            config.realScenes.length > 0 ? config.realScenes : undefined
          );
          if (spatialContext) {
            const spatialTag = `[平面圖空間語境: ${spatialContext}]`;
            enrichedConfig = {
              ...config,
              prompt: config.prompt
                ? `${config.prompt}\n\n${spatialTag}`
                : spatialTag,
            };
          }
        } catch {
          // Spatial analysis failed — continue with original config, not a blocker
        }
      }

      const resultImage = await generateDesign(enrichedConfig);
      setHistory([resultImage]);
      setHistoryIndex(0);
    } catch (err: any) {
      handleError(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportDesign = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setHistory([result]);
        setHistoryIndex(0);
        setIsComparing(false);
        setEditPrompt("");
        setError(null);
        setAppliedRefinements([]); // Clear for imported designs
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMagicEdit = async () => {
    if (!displayImage || !editPrompt.trim()) return;

    setIsEditing(true);
    setError(null);

    try {
      // Always edit based on the CURRENT (latest) image in the stack
      const sourceImage = history[historyIndex];
      const newImage = await editDesignImage(sourceImage, editPrompt);
      
      // Add to history and remove any future history (if we were in the middle of the stack)
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newImage);
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      // Record 3D refinement sync
      if (!appliedRefinements.includes(editPrompt)) {
        setAppliedRefinements(prev => [...prev, editPrompt]);
      }
      
      setEditPrompt(""); // Clear prompt after success
    } catch (err) {
      handleError(err);
    } finally {
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
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
             <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-neutral-900/50 rounded-full blur-3xl"></div>
             <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-neutral-800/30 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-md w-full bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white text-black mb-6 shadow-lg shadow-white/10">
            <Armchair size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Interior Design Studio</h1>
          <p className="text-neutral-400 mb-8 leading-relaxed">
            專業級 AI 空間視覺化工具。
          </p>
          
          {error && (
            <div className="mb-6 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-sm text-red-200">
              {error}
            </div>
          )}

          <Button onClick={handleSelectKey} className="w-full py-4 text-lg bg-white hover:bg-neutral-200 shadow-none font-semibold transition-all" style={{ color: '#000000' }}>
            開始使用
          </Button>
        </div>
      </div>
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
              <p className="text-[10px] text-neutral-600 leading-relaxed">
                您的 API Key 僅儲存於本機瀏覽器（localStorage），不會傳送至任何第三方伺服器。
              </p>
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

      {/* AI Designer Chat Modal */}
      {showAIChat && (
        <AIDesignerChat
          onClose={() => setShowAIChat(false)}
          onApplySummary={(summary) => {
            setConfig(prev => ({
              ...prev,
              prompt: (prev.prompt ? prev.prompt + '\n\n' : '') + summary
            }));
          }}
        />
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
                  <div className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">設計師觀點</div>
                  <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                    {activeWorkflowStep === 1 && "格局與硬裝基礎指南"}
                    {activeWorkflowStep === 2 && "AI 設計訪談指南"}
                    {activeWorkflowStep === 3 && "2D 視覺風格渲染指南"}
                    {activeWorkflowStep === 4 && "3D 軟裝配置佈局指南"}
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

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-5 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                <span className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase bg-indigo-950 px-2.5 py-1 rounded border border-indigo-900 block w-max">
                  {activeWorkflowStep === 1 && "第一步主要攻略"}
                  {activeWorkflowStep === 2 && "第二步主要攻略"}
                  {activeWorkflowStep === 3 && "第三步主要攻略"}
                  {activeWorkflowStep === 4 && "第四步主要攻略"}
                </span>
                <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-normal">
                  {activeWorkflowStep === 1 && "「觀察採光、承重牆、面高比例，決定空間大架構骨架。」請上傳平面格局圖與當前屋況實況照片，AI 將自動識別空間格局。"}
                  {activeWorkflowStep === 2 && "「透過對話釐清需求，讓 AI 設計師深入了解您的生活習慣與風格偏好。」切換至 AI 設計師模式，上傳平面圖後選擇目標空間，AI 將引導您完成設計訪談。"}
                  {activeWorkflowStep === 3 && "「定調全屋漆色、本體材質（石材、地板）。」根據 AI 訪談結果或手動設定，一鍵生成照片級高度擬真效果，支援隨性局部微調設計。"}
                  {activeWorkflowStep === 4 && "「家具即是靈魂。佈局走道淨寬、材質搭配以確保生活便利性。」拖曳沙發、桌毯，切換精確的高寬參數或牆地材質，完全掌握軟裝實景。"}
                </p>
              </div>

              {/* Advanced Tips */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  AI 設計師實務叮嚀：
                </h4>
                <ul className="text-xs text-neutral-400 list-disc list-inside space-y-1.5 pl-1 leading-relaxed">
                  {activeWorkflowStep === 1 && [
                    "承重主牆切勿擅自拆移，非承重隔間則可拆除以極大化公領域通透感。",
                    "廚衛排煙、排水管路位置為硬碰硬設計，格局調整時應盡量保持就近配置以絕後患。",
                    "大面積引入自然採光能讓小空間在感官尺度上直接放大 30% 以上。"
                  ].map((tip, idx) => <li key={idx} className="marker:text-indigo-500">{tip}</li>)}
                  {activeWorkflowStep === 2 && [
                    "與 AI 設計師溝通時，盡量具體描述生活習慣，例如「常在客廳工作」比「需要書桌」更能幫助 AI 給出精準建議。",
                    "告知 AI 設計師家庭成員組成（如有長輩或小孩），可針對安全動線、收納高度提供專屬規劃建議。",
                    "預算範圍越清楚，AI 越能推薦性價比最高的材質與工法組合，避免設計方案超出執行可能。"
                  ].map((tip, idx) => <li key={idx} className="marker:text-indigo-500">{tip}</li>)}
                  {activeWorkflowStep === 3 && [
                    "經典大師配色黃金率：主色（硬裝）70% + 搭配色（大型家具）25% + 亮眼點綴色 5%。",
                    "石材大板紋理與實木材質色澤切忌龐雜，色系統一延伸（如一體化電視牆）更能顯露不凡奢華。",
                    "使用 AI 局部微調（Refine）時，增加如「一字型條狀反光燈帶」能輕鬆烘托極致層次感。"
                  ].map((tip, idx) => <li key={idx} className="marker:text-indigo-500">{tip}</li>)}
                  {activeWorkflowStep === 4 && [
                    "一般走道動線標準淨寬保留 65 - 80 cm，主幹道雙人交會需留 90 - 120 cm 以確保行進無阻。",
                    "冰箱與電視櫃開門半徑、吧檯拉抽半徑等動態機能空間，請利用 3D 互動沙盒審慎模擬推演。",
                    "地毯尺寸需覆蓋沙發前腳下半邊或橫向超出沙發 20 cm，方能凝聚高尚的會客核心氣息。"
                  ].map((tip, idx) => <li key={idx} className="marker:text-indigo-500">{tip}</li>)}
                </ul>
              </div>
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
              <h1 className="text-lg font-bold text-white leading-none mb-1">Interior</h1>
              <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase leading-none">Design Studio</span>
            </div>
          </div>
          {/* Mode toggle */}
          <div className="flex items-center gap-1 mt-3 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setSidebarMode('manual')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${sidebarMode === 'manual' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'}`}
            >
              <SlidersHorizontal size={12} />
              手動設定
            </button>
            <button
              onClick={() => setSidebarMode('ai')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${sidebarMode === 'ai' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3"/>
                <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                <path d="M19 3l1.5 1.5L19 6l-1.5-1.5Z" strokeWidth="2"/>
              </svg>
              AI 設計師
            </button>
          </div>
        </div>

        {/* AI Designer mode — always mounted (CSS hidden when inactive) to preserve chat state */}
        <div className={`flex-1 min-h-0 p-4 flex flex-col overflow-hidden ${sidebarMode === 'ai' ? '' : 'hidden'}`}>
            <AIDesignerSidebar
              floorPlan={config.floorPlan}
              realScenes={config.realScenes}
              onFloorPlanChange={(f) => setConfig(prev => ({ ...prev, floorPlan: f }))}
              onRealScenesChange={(files) => setConfig(prev => ({ ...prev, realScenes: files }))}
              context={{
                style: config.style,
                roomType: config.roomType,
                hasFloorPlan: !!config.floorPlan,
                hasRealScene: config.realScenes.length > 0,
              }}
              onGenerate={async (aiPrompt) => {
                // Generate using images from config + AI-collected prompt
                // Does NOT modify config.prompt — fully isolated
                if (!config.floorPlan && config.realScenes.length === 0) {
                  setError('請先上傳平面配置圖或實景照片。');
                  return;
                }
                setIsGenerating(true);
                setError(null);
                setHistory([]);
                setHistoryIndex(-1);
                setEditPrompt('');
                setIsComparing(false);
                setAppliedRefinements([]);
                try {
                  const { generateDesign } = await import('./services/geminiService');
                  const resultImage = await generateDesign({
                    ...config,
                    prompt: aiPrompt || config.prompt,
                  });
                  setHistory([resultImage]);
                  setHistoryIndex(0);
                } catch (err: any) {
                  handleError(err);
                } finally {
                  setIsGenerating(false);
                }
              }}
              isGenerating={isGenerating}
            />
          </div>

        {/* Manual mode */}
        <div className={`p-6 space-y-8 pb-8 flex-1 ${sidebarMode === 'manual' ? '' : 'hidden'}`}>

          {/* Section 0: Import Existing */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              快速工具 (Quick Tools)
            </h2>
            <ImageUpload 
              label="匯入設計圖" 
              description="上傳現有渲染圖以直接進行編輯"
              file={null} // Keep null so it acts as a permanent upload button
              onFileChange={handleImportDesign}
            />
          </div>

          <div className="h-px bg-neutral-800" />

          {/* Section 1: Inputs */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              參考圖片 (Reference Images)
            </h2>
            <ImageUpload 
              label="平面配置圖" 
              description="2D 佈局圖或藍圖 (Floor Plan)"
              file={config.floorPlan} 
              onFileChange={(f) => setConfig(prev => ({ ...prev, floorPlan: f }))} 
            />
            <ImageUpload 
              label="實景照片 (選填)" 
              description="當前空間照片 (可多張)"
              multiple={true}
              files={config.realScenes} 
              onFilesChange={(files) => setConfig(prev => ({ ...prev, realScenes: files }))} 
            />
            
            {(config.floorPlan || config.realScenes.length > 0) && (
              <Button 
                variant="secondary" 
                onClick={handleAnalyze} 
                isLoading={isAnalyzing} 
                className="w-full text-xs py-2 h-9"
                icon={<ScanEye size={14} />}
              >
                {isAnalyzing ? "正在自動分析空間..." : "自動分析空間語境"}
              </Button>
            )}
          </div>

          <div className="h-px bg-neutral-800" />

          {/* Section 2: Config */}
          <div className="space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
              3D 空間與風格設定
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-400">目標空間類型</label>
                <select 
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-white/20 focus:border-white/50 outline-none transition-all"
                  value={config.roomType}
                  onChange={(e) => setConfig(prev => ({ ...prev, roomType: e.target.value as RoomType }))}
                >
                  {ROOM_TYPES.map(t => <option key={t} value={t}>{ROOM_TYPE_LABELS[t as RoomType] || t}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-400">期望設計風格</label>
                <select 
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-white/20 focus:border-white/50 outline-none transition-all"
                  value={config.style}
                  onChange={(e) => setConfig(prev => ({ ...prev, style: e.target.value as DesignStyle }))}
                >
                  {DESIGN_STYLES.map(s => <option key={s} value={s}>{DESIGN_STYLE_LABELS[s as DesignStyle] || s}</option>)}
                </select>
              </div>
            </div>



            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-neutral-400">額外附加需求指令 (選填)</label>
                {isAnalyzing
                  ? <span className="text-xs text-indigo-400 animate-pulse">正在讀取圖像細節...</span>
                  : <button
                      onClick={() => setShowAIChat(true)}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/50 hover:border-indigo-700 px-2 py-0.5 rounded-full transition-all"
                    >
                      <Sparkles size={10} />
                      AI 設計訪談
                    </button>
                }
              </div>
              <textarea
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-white/20 focus:border-white/50 outline-none min-h-[120px] resize-y placeholder:text-neutral-600 transition-all"
                placeholder="描述特定的色彩、家具偏好、採光或藝術氛圍...（可使用上方自動分析進行填寫）"
                value={config.prompt}
                onChange={(e) => setConfig(prev => ({ ...prev, prompt: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {SAMPLE_PROMPTS.slice(0, 2).map((p, i) => (
                  <button 
                    key={i}
                    onClick={() => setConfig(prev => ({ ...prev, prompt: p }))}
                    className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 px-2 py-1 rounded-md transition-colors text-left truncate max-w-full"
                  >
                    {p.substring(0, 40)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Section - Inline & Focused (No longer a full width footer) */}
          <div className="pt-6 border-t border-neutral-800/80 flex flex-col items-center justify-center">
            {error && (
              <div className="w-full mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-100">
                {error}
              </div>
            )}
            <Button 
              onClick={handleGenerate} 
              isLoading={isGenerating} 
              className="w-[85%] mx-auto py-3.5 bg-gradient-to-r from-neutral-200 to-white hover:from-white hover:to-neutral-100 !text-black shadow-lg shadow-white/5 font-semibold text-sm rounded-full tracking-wide flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 border border-white/20 select-none"
              icon={<Wand2 size={16} className="text-indigo-600 animate-pulse" />}
            >
              {isGenerating ? '生成渲染中...' : '渲染設計方案'}
            </Button>
            <p className="text-[10px] text-neutral-500 mt-2 text-center flex items-center gap-1">
              <Sparkles size={11} className="text-indigo-400 animate-pulse" />
              生成高解析擬真 3D 空間圖
            </p>
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
                 <span className="text-sm font-semibold tracking-wider text-neutral-300 hidden md:inline flex-shrink-0">設計工作區</span>
                 
                 {/* Collapse/Expand Sidebar Trigger Button */}
                 <button
                   onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                   className="p-1 px-2.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white flex items-center gap-1.5 transition-all text-[11px] font-medium cursor-pointer"
                   title={isSidebarCollapsed ? "展開左側面板" : "收合左側面板"}
                 >
                   <ChevronRight size={13} className={`transform transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
                   <span>{isSidebarCollapsed ? "展開面板" : "收合面板"}</span>
                 </button>
                 
                 <div className="h-4 w-[1px] bg-neutral-800 hidden md:block"></div>
                 
                 {/* 2D vs 3D Mode Tab Selector */}
                 <div className="flex items-center bg-neutral-950 p-1 rounded-full border border-neutral-800/80 shadow-inner scale-95 origin-left flex-shrink-0">
                   <button 
                     onClick={() => setViewMode('2d')}
                     className={`px-2.5 py-1 text-[11px] rounded-full font-bold select-none flex items-center gap-1.5 transition-all duration-300 ${viewMode === '2d' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'}`}
                   >
                     <Eye size={12} />
                     2D AI 寫實
                   </button>
                   <button 
                     onClick={() => setViewMode('3d')}
                     className={`px-2.5 py-1 text-[11px] rounded-full font-bold select-none flex items-center gap-1.5 transition-all duration-300 ${viewMode === '3d' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'}`}
                   >
                     <Box size={12} />
                     3D 互動沙盒
                   </button>
                 </div>

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
                        onClick={() => { setHistory([]); setHistoryIndex(-1); }}
                        title="清除本次結果"
                        className="!py-1 !px-2.5"
                    >
                        <RefreshCw size={14} />
                    </Button>
                )}
            </div>
        </div>

        {/* DIY 自助式設計全生命週期引導 - 全新整合工作流 (DIY Integrated Life-cycle Workflow & Designer's Guide) */}
        <div className="bg-neutral-900/80 border-b border-neutral-850 p-2.5 px-4 md:px-6 flex items-center justify-between gap-4 select-none flex-shrink-0 z-35 shadow-sm relative backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-shrink-0 relative">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span className="text-[10px] font-bold tracking-[0.12em] text-neutral-400 uppercase flex items-center gap-1">
                DIY 全流程規劃
              </span>
            </div>

            {/* Interactive Designer Popover Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowTipsPopover(true)}
                className="flex items-center gap-1 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-800/50 hover:border-indigo-700/80 px-2.5 py-1 rounded-full text-[10px] text-indigo-300 font-bold cursor-pointer transition-all leading-none shadow-md active:scale-95 select-none"
              >
                <Lightbulb size={10} className="text-indigo-400" />
                <span>設計師觀點</span>
              </button>
            </div>
          </div>

          {/* Connected Steps detailing Hard (硬裝) vs Soft (軟裝) Phases */}
          <div className="flex flex-1 items-center justify-end md:justify-center gap-2 xl:gap-4 overflow-x-auto scrollbar-none py-1">
            {[
              {
                step: 1,
                title: "實景上傳",
                subtitle: "格局分析 · Upload",
                active: activeWorkflowStep === 1,
                done: !!config.floorPlan || config.realScenes.length > 0
              },
              {
                step: 2,
                title: "AI 設計訪談",
                subtitle: "需求確認 · Consult",
                active: activeWorkflowStep === 2,
                done: activeWorkflowStep > 2 && (!!config.floorPlan || config.realScenes.length > 0)
              },
              {
                step: 3,
                title: "2D 視覺渲染",
                subtitle: "硬裝設計 · Render",
                active: activeWorkflowStep === 3,
                done: !!displayImage
              },
              {
                step: 4,
                title: "3D 軟裝配置",
                subtitle: "軟裝設計 · Placement",
                active: activeWorkflowStep === 4,
                done: viewMode === '3d'
              }
            ].map((s, i, arr) => (
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
             <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-500 min-h-0">
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
                            placeholder="描述要修改的細節，例如：將沙發換成棕色皮革..."
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
                         {REFINE_PRESETS.map((p, i) => (
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
                              Showing Previous Version
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
                                    <p className="text-neutral-200 text-xs sm:text-sm font-medium tracking-wide">正在套用智慧細節微調...</p>
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
                             <h3 className="text-xl font-bold text-white mb-3 bg-gradient-to-r from-white via-neutral-100 to-indigo-200 bg-clip-text text-transparent">正在為您建構空間夢想...</h3>
                             <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                                 正在智慧化分析平面配置圖和實景照片細節，以生成高品質、超寫實的空間渲染與設計視覺效果。
                             </p>
                        </div>
                    </div>
                 ) : (
                    <>
                        <div className="w-20 h-20 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 shadow-xl rotate-3">
                            <Armchair size={36} className="text-neutral-500" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-medium text-neutral-300 mb-2">準備好開始您的專屬設計</h3>
                        <p className="text-sm leading-relaxed mb-6 text-neutral-400">
                            請在左側側邊欄上傳您的房屋格局圖和實景照片，即可開始生成專業的高品質 AI 空間寫實透視與渲染視覺效果。
                        </p>
                        <div className="flex gap-4 text-xs text-neutral-500">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-neutral-700"></span>
                                Gemini 3 Pro
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-neutral-700"></span>
                                Gemini 3.5 Flash
                            </div>
                        </div>
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
