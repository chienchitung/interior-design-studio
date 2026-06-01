import { GoogleGenAI } from "@google/genai";
import { DesignConfig } from '../types';

const USER_API_KEY_STORAGE_KEY = 'interior-design-studio.geminiApiKey';

const getGeminiApiKey = (): string => {
  const userApiKey = typeof localStorage !== 'undefined'
    ? localStorage.getItem(USER_API_KEY_STORAGE_KEY)
    : null;

  const apiKey = userApiKey || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("請先設定 Gemini API Key。");
  }

  return apiKey;
};

// Helper to convert file to base64
const fileToPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        // Use generic image/jpeg if type is missing, or trust the file type
        const mimeType = file.type || "image/jpeg";
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        });
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
    model: 'gemini-3.5-flash',
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
      model: 'gemini-3-pro-image',
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

    throw new Error("No image generated in the response.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
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
      model: 'gemini-3.5-flash', 
      contents: {
        parts: parts
      }
    });

    return response.text || "Could not analyze image.";
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

// Edit the generated image using Gemini 3 Pro Image
export const editDesignImage = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

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
      model: 'gemini-3-pro-image',
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
    throw new Error("No image generated from edit.");
  } catch (error) {
    console.error("Edit Error:", error);
    throw error;
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
    model: 'gemini-3.5-flash',
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
};

const buildSystemInstruction = (ctx?: DesignContext, rooms?: RoomInfo[]) => `你是一位專業的室內設計師，任務是透過對話了解屋主需求，並將平面圖轉化為精準的 2D 寫實渲染圖。

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
當你從對話中收集完所有資訊（目標空間、視角、採光、家具位置、屋主確認的設計風格）後，在回覆末尾加上：
[渲染指令: 生成一張{空間名稱}的照片級室內設計渲染圖。視角：{具體視角描述}。空間：{尺寸比例}，{採光描述}。家具：{嚴格依據平面圖的家具位置}。風格：{屋主選定的風格}，色調：{色彩描述}。{其他氛圍細節}。]

注意事項：
- 語氣親切專業，使用繁體中文
- 每次回覆聚焦一個重點，2-3句話（渲染指令除外）
- 渲染指令要詳細具體，約80-120字
- 【重要】嚴禁使用 Markdown 格式：不可使用 **粗體**、*斜體*、# 標題、- 列點、數字編號等符號，只輸出純文字`;

export const chatWithDesigner = async (
  history: ChatMessage[],
  userMessage: string,
  images?: File[],
  context?: DesignContext,
  rooms?: RoomInfo[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });

  const userParts: any[] = [];

  if (images && images.length > 0) {
    for (const file of images) {
      const part = await fileToPart(file);
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
    model: 'gemini-3.5-flash',
    contents,
    config: {
      systemInstruction: buildSystemInstruction(context, rooms),
    }
  });

  return response.text || '抱歉，我無法回應，請再試一次。';
};
