import { GoogleGenAI } from "@google/genai";
import { DesignChecklistItem, DesignConfig, ProjectBrief } from '../types';

const USER_API_KEY_STORAGE_KEY = 'interior-design-studio.geminiApiKey';
const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

const getGeminiApiKey = (): string => {
  const userApiKey = typeof localStorage !== 'undefined'
    ? localStorage.getItem(USER_API_KEY_STORAGE_KEY)
    : null;

  const apiKey = userApiKey || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("請先設定 Gemini API Key。");
  }

  const trimmedKey = apiKey.trim();
  if (!trimmedKey.startsWith('AIza') && !trimmedKey.startsWith('AQ.')) {
    throw new Error("Gemini API Key 格式看起來不正確。請使用 Google AI Studio 產生的 API Key（AIza... 或 AQ. 開頭）。");
  }

  return trimmedKey;
};

const normalizeGeminiError = (error: unknown): Error => {
  const err = error as { message?: string; status?: number; code?: number };
  const raw = [
    err?.message,
    String(err?.status || ''),
    String(err?.code || ''),
    typeof error === 'string' ? error : '',
  ].join(' ');

  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429') || raw.toLowerCase().includes('quota')) {
    return new Error("Gemini API 已達到額度、速率限制或 spend cap。請到 Google AI Studio / Cloud Billing 檢查專案額度，或換到未被封鎖的新 Google Cloud project。");
  }

  if (raw.includes('API_KEY_INVALID') || raw.includes('400') || raw.toLowerCase().includes('api key not valid')) {
    return new Error("Gemini API Key 無效。請確認貼上的是 AIza... 開頭的 API Key，且不是 OAuth token 或其他憑證。");
  }

  if (raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return new Error("Gemini API 權限被拒絕。請確認此 API Key 所屬專案已啟用 Gemini API，並且沒有被 spend cap 或 API restrictions 擋住。");
  }

  return error instanceof Error ? error : new Error("Gemini API 呼叫失敗，請稍後再試。");
};

// Resize image to max 1024px on longest dimension before encoding.
// PNG stays PNG (preserves floor-plan line quality); all other formats → JPEG 85%.
// PNG (floor plans) use 2048px max to retain wall lines, door arcs, and room labels.
// JPEG/WebP (real scene photos) use 1024px — AI needs colour/atmosphere, not pixel detail.
const compressImageFile = (file: File): Promise<{ data: string; mimeType: string }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = file.type === 'image/png' ? 2048 : 1024;
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round((h * MAX) / w); w = MAX; }
        else        { w = Math.round((w * MAX) / h); h = MAX; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas unavailable')); return; }
      ctx.drawImage(img, 0, 0, w, h);

      const isPng = file.type === 'image/png';
      const mime  = isPng ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mime, isPng ? undefined : 0.85);
      resolve({ data: dataUrl.split(',')[1], mimeType: mime });
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });

const fileToPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  const { data, mimeType } = await compressImageFile(file);
  return { inlineData: { data, mimeType } };
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsText(file);
  });

const isPlainTextFile = (file: File) =>
  file.type.startsWith('text/') ||
  /\.(csv|txt|md|rtf)$/i.test(file.name);

const formatAttachmentSummary = (files: File[]) =>
  files
    .map((file, index) => `${index + 1}. ${file.name}（${file.type || '未知格式'}，${Math.round(file.size / 1024)}KB）`)
    .join('\n');

const fileToChatPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } } | { text: string }> => {
  if (file.type.startsWith('image/')) return fileToPart(file);

  if (isPlainTextFile(file)) {
    const raw = await readFileAsText(file);
    return {
      text: `【附件內容：${file.name}】\n${raw.slice(0, 20000)}${raw.length > 20000 ? '\n（內容過長，已截取前 20000 字元）' : ''}`,
    };
  }

  const dataUrl = await readFileAsDataUrl(file);
  const [header, data] = dataUrl.split(',');
  const mimeType = file.type || header?.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  return { inlineData: { data, mimeType } };
};

const imageSourceToPart = async (imageSource: string): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  let dataUrl = imageSource;

  if (imageSource.startsWith('blob:')) {
    const resp = await fetch(imageSource);
    const blob = await resp.blob();
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const [header, data] = dataUrl.split(',');
  const mimeType = header?.match(/data:(.*?);base64/)?.[1] || 'image/png';
  return { inlineData: { data, mimeType } };
};

const parseJsonArray = <T,>(raw: string): T[] => {
  const cleaned = raw
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T[];
  } catch {
    return [];
  }
};

const fallbackChecklist = (note = '檢核暫時無法完成，請以人工判斷複核。'): DesignChecklistItem[] => [
  { key: 'circulation', label: '走道與動線', status: 'unknown', note },
  { key: 'storage', label: '收納合理性', status: 'unknown', note },
  { key: 'scale', label: '家具比例', status: 'unknown', note },
  { key: 'daylight', label: '採光遮擋', status: 'unknown', note },
  { key: 'wet_kitchen', label: '濕區/廚房風險', status: 'unknown', note },
];

// Pre-render: extract spatial context for the target room from floor plan
// Returns a concise spatial description string to inject into the rendering prompt
export const extractSpatialContextForRendering = async (
  floorPlan: File,
  roomType: string,
  realScenes?: File[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

  const parts: any[] = [await fileToPart(floorPlan)];
  if (realScenes) {
    for (const f of realScenes) parts.push(await fileToPart(f));
  }

  parts.push({
    text: `請分析這張平面配置圖，專注於「${roomType}」這個空間，提取以下空間語境資訊：

1. 建議拍攝視角：從哪個位置看、朝哪個方向、相機大約高度
2. 空間尺寸估計：長×寬×天花板高度
3. 採光：窗戶位置和自然光進入方向（幾點鐘方向）
4. 門的位置：位於哪面牆、開向哪裡
5. 現有家具配置：依據平面圖描述家具位置（靠哪面牆、置中等）

請用簡潔的中文回答，格式如下（約60-80字）：
視角：[描述]。空間：[長×寬×高估計]。採光：[窗戶方向和光線特性]。家具配置：[嚴格依據平面圖的家具位置描述]。`
  });

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: { parts }
  });

  return response.text?.trim() || '';
};

export const generateDesign = async (config: DesignConfig): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

    const parts: any[] = [];
    let imageReferenceInstruction = "";
    let imageCounter = 1;

    // 1. Add Floor Plan (STRUCTURAL TRUTH)
    if (config.floorPlan) {
      const floorPlanPart = await fileToPart(config.floorPlan);
      parts.push(floorPlanPart);
      imageReferenceInstruction += `Image ${imageCounter} is the FLOOR PLAN/BLUEPRINT. You must STRICTLY adhere to this spatial layout. Construct the 3D room with the exact wall configuration, door placements, and window locations shown in this blueprint. Do not hallucinate new walls or change the room shape.\n`;
      imageCounter++;
    }

    // 2. Add Real Scenes (Reference)
    if (config.realScenes && config.realScenes.length > 0) {
      for (const sceneFile of config.realScenes) {
         const scenePart = await fileToPart(sceneFile);
         parts.push(scenePart);
      }
      imageReferenceInstruction += `Images ${imageCounter} to ${imageCounter + config.realScenes.length - 1} are REAL SCENE photos. Use these multiple angles to form a comprehensive understanding of the 3D space, ceiling height, and lighting context. Maintain the structural integrity observed in these photos while applying the new design.\n`;
    }

    // 3. Build rendering prompt
    // Three modes:
    //   A. [AI_BRIEF] prefix  → full AI designer brief, skip roomType/style entirely
    //   B. [平面圖空間語境:]   → manual mode + pre-analysed spatial context
    //   C. plain              → manual mode, generic instructions

    const isAIBrief      = config.prompt?.startsWith('[AI_BRIEF]\n') ?? false;
    const hasSpatialCtx  = !isAIBrief && (config.prompt?.includes('[平面圖空間語境:') ?? false);
    const cleanAIPrompt  = isAIBrief ? config.prompt!.replace('[AI_BRIEF]\n', '') : '';

    let promptText: string;

    if (isAIBrief) {
      // Mode A: AI designer has composed a full, room-specific render brief.
      // Do NOT inject roomType or style — the brief already contains them.
      promptText = `Generate a high-quality photorealistic interior design visualization.

DESIGN BRIEF (follow every specification exactly):
${cleanAIPrompt}

CRITICAL INSTRUCTIONS:
1. ROOM & STYLE: Strictly follow the room type, camera angle, and style described in the design brief above. Do NOT substitute with any other room type.
2. SPATIAL ACCURACY: If a floor plan image is provided, use it to verify wall positions, window locations, and door openings.
3. FURNITURE: Place furniture exactly as described — do not add or remove pieces.
4. LIGHTING: Render natural light from the window direction stated.
5. REALISM: Photo-realistic quality with accurate shadows, materials, and textures.
6. OUTPUT: High-resolution 4:3 image.
${imageReferenceInstruction}`;

    } else if (hasSpatialCtx) {
      // Mode B: manual mode with pre-analysed floor plan spatial context
      promptText = `Generate a high-quality photorealistic interior design visualization.

TASK:
Create a ${config.roomType} design in the style of ${config.style}.

DESIGN DETAILS & SPATIAL CONTEXT:
${config.prompt}

CRITICAL INSTRUCTIONS:
1. SPATIAL ACCURACY: Strictly follow the [平面圖空間語境] data — camera angle, room dimensions, window/door positions, and furniture layout must match exactly.
2. CAMERA: Use the exact viewpoint described in the spatial context.
3. LIGHTING: Render natural light entering from the window direction specified.
4. FURNITURE: Place furniture exactly as described in the floor plan analysis.
5. REALISM: Photo-realistic quality with accurate shadows and material textures.
6. OUTPUT: High-resolution 4:3 image.
${imageReferenceInstruction}`;

    } else {
      // Mode C: plain manual mode
      promptText = `Generate a high-quality photorealistic interior design visualization.

TASK:
Create a ${config.roomType} design in the style of ${config.style}.
${config.prompt ? `\nSPECIFIC DETAILS:\n${config.prompt}` : ''}

CRITICAL INSTRUCTIONS:
1. SPATIAL ACCURACY: The render must be an exact extrusion of the provided Floor Plan (if available).
2. REALISM: Advanced ray-tracing style lighting, realistic shadows, and physical textures.
3. COMPOSITION: High-resolution 4:3 image showing the best angle of the room.
${imageReferenceInstruction}`;
    }

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          imageSize: "1K",
          aspectRatio: "4:3"
        }
      }
    });

    const candidateParts = response.candidates?.[0]?.content?.parts;
    if (candidateParts) {
        for (const part of candidateParts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }

    throw new Error("AI 未回傳圖片，請稍後再試或調整需求描述。");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw normalizeGeminiError(error);
  }
};

export const evaluateDesignChecklist = async (
  imageSource: string,
  context: {
    roomType: string;
    style: string;
    prompt: string;
    projectBrief?: ProjectBrief | null;
  }
): Promise<DesignChecklistItem[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const imagePart = await imageSourceToPart(imageSource);

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: {
        parts: [
          imagePart,
          {
            text: `你是一位資深室內設計師，請針對這張生成後的室內設計圖做「好住」檢核，不要只評估美感。

空間類型：${context.roomType}
風格：${context.style}
渲染/修改指令：${context.prompt || '未提供'}
專案資料：${context.projectBrief ? JSON.stringify(context.projectBrief) : '未提供'}

請只輸出 JSON array，不要 Markdown，不要說明文字。固定輸出 5 個物件，key 必須依序為：
circulation, storage, scale, daylight, wet_kitchen

每個物件格式：
{"key":"circulation","label":"走道與動線","status":"pass|warning|fail|unknown","note":"20字內繁體中文判斷"}

判斷重點：
1. 走道是否可能不足、座椅後退或櫃門開啟是否卡動線
2. 收納是否符合需求，是否只有裝飾沒有實用收納
3. 家具比例是否過大或過小，是否擠壓空間
4. 採光是否被大型家具、櫃體或深色材質遮擋
5. 廚房/浴室/濕區是否有不合理移位、防水、排煙或清潔風險；非濕區也需標示是否無明顯風險`
          }
        ]
      }
    });

    const parsed = parseJsonArray<DesignChecklistItem>(response.text || '');
    const allowedKeys = new Set(['circulation', 'storage', 'scale', 'daylight', 'wet_kitchen']);
    const normalized = parsed
      .filter(item => allowedKeys.has(item.key))
      .map(item => ({
        key: item.key,
        label: item.label || item.key,
        status: ['pass', 'warning', 'fail', 'unknown'].includes(item.status) ? item.status : 'unknown',
        note: item.note || '需要人工複核。',
      })) as DesignChecklistItem[];

    return normalized.length > 0 ? normalized : fallbackChecklist();
  } catch (error) {
    console.error("Checklist Error:", error);
    return fallbackChecklist();
  }
};

// Analyze the uploaded room images
export const analyzeRoomImages = async (files: File[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    
    const parts: any[] = [];
    for (const file of files) {
        parts.push(await fileToPart(file));
    }

    parts.push({ text: "Analyze these images for interior design. Identify: 1. Is this a floor plan or real photo? 2. Room type/function 3. Key architectural elements (windows, doors, wall layout). 4. Suggested furniture placement based on structure. Keep it concise and structured." });

    const response = await ai.models.generateContent({
      model: TEXT_MODEL, 
      contents: {
        parts: parts
      }
    });

    return response.text || "無法分析圖片，請確認圖片清晰且格式正確。";
  } catch (error) {
    console.error("Analysis Error:", error);
    throw normalizeGeminiError(error);
  }
};

// Edit the generated image using Gemini 3 Pro Image
export const editDesignImage = async (imageSource: string, prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

    // Resolve Blob URL → data URL so we can extract base64
    let base64Image = imageSource;
    if (imageSource.startsWith('blob:')) {
      const resp = await fetch(imageSource);
      const blob = await resp.blob();
      base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // Robust clean base64
    let cleanBase64 = base64Image;
    let mimeType = 'image/png';

    // Check if it has a prefix
    if (base64Image.includes(',')) {
        const parts = base64Image.split(',');
        // Attempt to extract mime from header like "data:image/jpeg;base64"
        const header = parts[0];
        if (header.includes('image/jpeg') || header.includes('image/jpg')) mimeType = 'image/jpeg';
        else if (header.includes('image/webp')) mimeType = 'image/webp';

        cleanBase64 = parts[1];
    }

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType 
            }
          },
          { text: `
            ROLE: Expert Image Editor & Interior Designer.
            
            TASK: Edit the provided image based strictly on this request: "${prompt}".

            STRICT CONSTRAINT - PRESERVATION IS KEY:
            1. You are performing "In-painting" logic. 
            2. Identify the specific object or area mentioned in the request (e.g., "sofa", "wall color", "vase").
            3. MODIFY ONLY that specific target.
            4. FREEZE ALL OTHER PIXELS: The camera angle, lighting, shadows, flooring pattern, ceiling, and surrounding furniture MUST remain exactly 100% identical to the original image.
            5. Do NOT re-style the room. Do NOT change the time of day.
            6. If adding an object, ensure it casts realistic shadows that match the existing lighting direction.
            ` 
          }
        ]
      },
      config: {
        imageConfig: {
          imageSize: "1K",
          aspectRatio: "4:3"
        }
      }
    });

    const editCandidateParts = response.candidates?.[0]?.content?.parts;
    if (editCandidateParts) {
        for (const part of editCandidateParts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("AI 未回傳編輯後圖片，請稍後再試。");
  } catch (error) {
    console.error("Edit Error:", error);
    throw normalizeGeminiError(error);
  }
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DesignContext {
  style: string;
  roomType: string;
  hasFloorPlan: boolean;
  hasRealScene: boolean;
}

export interface RoomInfo {
  zhName: string;
  key: string;
  description: string; // spatial: size, windows, doors, existing furniture layout
}

// Analyse floor plan → return structured room list
export const analyzeFloorPlanRooms = async (files: File[]): Promise<RoomInfo[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
    const parts: any[] = [];
    for (const file of files) parts.push(await fileToPart(file));

    parts.push({
      text: `請分析這張平面配置圖，識別所有主要空間。

嚴格按照以下格式輸出，每個空間一行，三個欄位用「|」分隔：
中文名稱|英文識別碼|空間描述

規定：
- 不可使用 Markdown（不要 **、*、-、#、數字列點）
- 不要輸出任何說明文字，只輸出資料行
- 英文識別碼只用小寫英文和底線
- 描述包含：尺寸估計、窗戶採光方向、現有家具位置

輸出範例（嚴格照此格式）：
客廳|living_room|約5×4m，東側落地窗，沙發靠北牆，橢圓茶几居中
主臥室|bedroom_main|約4×3.5m，北側雙窗，雙人床靠北牆
次臥室|bedroom_second|約3×3m，東側窗，單人床
廚房|kitchen|L形廚台，爐台在南牆
衛浴|bathroom|馬桶、洗手台、淋浴區`
    });

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: { parts }
    });

    const raw = response.text || '';

    // Robust multi-format parser
    const rooms: RoomInfo[] = [];

    for (const line of raw.split('\n')) {
      const cleaned = line
        .replace(/^\s*[-*•\d.]+\s*/, '')  // strip list markers
        .replace(/\*\*/g, '')             // strip bold markers
        .replace(/\*/g, '')               // strip italic markers
        .trim();

      if (!cleaned || cleaned.length < 3) continue;

      // Try pipe-separated format: 名稱|key|description
      if (cleaned.includes('|')) {
        const p = cleaned.split('|').map(s => s.trim().replace(/\*\*/g, '').replace(/\*/g, ''));
        if (p[0] && p[0].length > 0) {
          rooms.push({
            zhName: p[0],
            key: p[1]?.replace(/[^a-z0-9_]/g, '') || 'room_' + rooms.length,
            description: p[2] || '',
          });
        }
        continue;
      }

      // Fallback: try to detect Chinese room names on their own line
      // e.g. "客廳：約5×4m" or "1. 客廳"
      const nameMatch = cleaned.match(/^([客主次臥廚衛浴餐書工儲陽台玄關走廊樓梯][^\n：:（(]{0,6})/);
      if (nameMatch) {
        const zhName = nameMatch[1].trim();
        if (!rooms.find(r => r.zhName === zhName)) {
          rooms.push({
            zhName,
            key: 'room_' + rooms.length,
            description: cleaned.replace(zhName, '').replace(/^[：:（()\s]+/, '').trim(),
          });
        }
      }
    }

    return rooms;
  } catch (error) {
    throw normalizeGeminiError(error);
  }
};

const buildSystemInstruction = (ctx?: DesignContext, rooms?: RoomInfo[], summary?: string) => `你是一位資深、細心且有親和力的 AI 室內設計師。你的任務是透過自然對話理解屋主的生活方式、空間條件與風格偏好，最後將需求整理成精準的 2D 寫實渲染指令。

${summary ? `【先前對話摘要（已確認需求）】\n${summary}\n\n請以此摘要為基礎繼續對話，不要重複詢問已確認的資訊。\n` : ''}
${rooms && rooms.length > 0 ? `【已識別的平面圖空間】
${rooms.map(r => `• ${r.zhName}（${r.key}）：${r.description}`).join('\n')}

根據以上平面圖資訊，你的工作流程：
1. 告知使用者已識別哪些空間，詢問他想渲染哪個空間
2. 根據平面圖確認該空間的視角、採光方向、家具位置
3. 【重要】主動詢問屋主的設計風格偏好和色調喜好，不可自行假設
4. 收集完整後，輸出精準渲染指令

` : `${ctx?.hasFloorPlan ? '屋主已上傳平面圖。' : ''}${ctx?.hasRealScene ? '屋主已上傳實景照片。' : ''}
`}
【設計風格的處理原則】
- 絕對不可自行假設或預設風格（即使系統有預設值）
- 必須透過對話詢問屋主的風格偏好
- 可以提供2-3種風格選項供屋主參考，但最終由屋主決定
- 常見風格參考：北歐簡約、日式侘寂、現代輕奢、工業風、法式古典、地中海風

【渲染指令輸出格式】
當你從對話中收集完所有資訊（目標空間、視角、採光、家具位置、屋主確認的設計風格）後，在回覆末尾依序加上：
[專案資料: {"household":"家庭成員","area":"坪數或面積","budget":"預算","painPoints":"生活痛點","stylePreference":"風格偏好","rejectedElements":"不可接受元素","targetRoom":"目標空間","constructionLimits":"施工限制","storageNeeds":"收納需求","lifestyleNotes":"生活習慣","summary":"80字內專案摘要"}]
[渲染指令: 生成一張{空間名稱}的照片級室內設計渲染圖。視角：{具體視角描述}。空間：{尺寸比例}，{採光描述}。家具：{嚴格依據平面圖的家具位置}。風格：{屋主選定的風格}，色調：{色彩描述}。{其他氛圍細節}。]

注意事項：
- 語氣親切、溫和、專業，有設計師的判斷力與陪伴感，像在陪屋主一起把家的樣子慢慢釐清，使用繁體中文
- 少用工具式說明，多用自然提問引導屋主描述生活情境、喜好與限制
- 每次回覆聚焦一個重點，2-3句話（渲染指令除外）；若正在閱讀報價單、需求表或規格資料，可用3-5個短段落整理重點、金額、疑點與下一步
- 渲染指令要詳細具體，約80-120字
- 專案資料必須是合法 JSON，未知欄位用空字串，不要猜測未確認的預算或家庭成員
- 【重要】嚴禁使用 Markdown 格式：不可使用 **粗體**、*斜體*、# 標題或 - 列點。需要分段時，請用短標題加自然段落，例如「總金額：」、「主要項目：」、「需要確認：」，不要輸出任何星號`;

// Compress older messages into a running summary to cap token growth.
// existingSummary: previously accumulated summary (empty string if none).
// messages: the older messages to fold into the summary.
export const summarizeHistory = async (
  existingSummary: string,
  messages: ChatMessage[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

  const dialogue = messages
    .map(m => `${m.role === 'user' ? '屋主' : '設計師'}: ${m.content}`)
    .join('\n');

  const prompt = existingSummary
    ? `現有摘要：\n${existingSummary}\n\n新增對話：\n${dialogue}\n\n請合併更新為一份完整摘要，`
    : `請將以下室內設計諮詢對話壓縮成摘要，`;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: {
      parts: [{
        text: prompt + '保留所有已確認的設計需求（坪數、家庭成員、痛點、預算、風格、目標空間、採光、家具偏好），繁體中文，150字以內，直接輸出純文字，不需標題或列點。'
      }]
    }
  });

  return response.text?.trim() || existingSummary;
};

export const chatWithDesigner = async (
  history: ChatMessage[],
  userMessage: string,
  attachments?: File[],
  context?: DesignContext,
  rooms?: RoomInfo[],
  summary?: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

    const userParts: any[] = [];

    if (attachments && attachments.length > 0) {
      userParts.push({
        text: `【屋主上傳的參考資料】\n${formatAttachmentSummary(attachments)}\n請把這些資料視為專案上下文。若是報價單、需求表或規格資料，請優先提取預算、品項、尺寸、材質、限制、已選設備與需要追問的不確定處。回覆請用清楚短段落，不要使用 Markdown 或任何星號。`,
      });

      for (const file of attachments) {
        const part = await fileToChatPart(file);
        userParts.push(part);
      }
    }

    userParts.push({ text: userMessage });

    const contents = [
      ...history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: userParts }
    ];

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents,
      config: {
        systemInstruction: buildSystemInstruction(context, rooms, summary),
      }
    });

    return response.text || '抱歉，我無法回應，請再試一次。';
  } catch (error) {
    throw normalizeGeminiError(error);
  }
};
