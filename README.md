# Interior Design Studio

AI 室內設計師工作台，協助使用者從平面圖與實景照片出發，透過需求訪談、2D 寫實渲染與 3D 軟裝配置，快速整理可視化的室內設計方案。

## 系統定位

這套系統不是單純的圖片生成器，而是一個面向屋主與設計溝通流程的互動工具。它把室內設計流程拆成四個環節：

1. 實景上傳：上傳平面配置圖與現場照片，建立空間事實基礎。
2. AI 設計訪談：由 AI 室內設計師引導使用者釐清生活需求、風格偏好與空間限制。
3. 2D 視覺渲染：根據手動設定或 AI 設計指令生成照片級室內設計圖。
4. 3D 軟裝配置：在互動 3D 沙盒中檢查家具比例、走道動線與軟裝配置。

## 主要功能

- 手動模式：選擇空間類型、設計風格、上傳參考圖片並直接生成渲染圖。
- AI 設計師模式：透過自然對話整理設計需求，產生更完整的渲染指令。
- 平面圖分析：識別主要空間、尺寸估計、採光方向與既有家具位置。
- 實景照片參考：可同時上傳多張現況照片，補足平面圖無法呈現的材質、採光與高度資訊。
- 2D 圖像生成：生成 4:3 高解析寫實室內設計圖。
- 局部微調：針對已生成圖片進行沙發、地板、牆面、燈光、植栽等局部修改。
- 歷史版本：支援簡易 undo / redo 與前後版本比較。
- 3D 軟裝沙盒：以 Three.js 呈現房間與家具，輔助檢查空間比例與動線。
- 設計師觀點：每個流程步驟提供對應的室內設計提醒。

## AI 模型配置

模型集中設定於 `services/geminiService.ts`：

```ts
const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
```

目前用途分配：

- `gemini-2.5-flash`：AI 設計師聊天、AI 設計訪談、平面圖分析、空間語境分析。
- `gemini-3.1-flash-image-preview`：2D 室內設計圖生成、已生成圖片的局部編輯。

## 技術架構

- React 19
- TypeScript
- Vite
- Three.js
- Google GenAI SDK
- Lucide React icons

重要檔案：

- `App.tsx`：主要 UI、四步流程、手動模式、2D/3D 工作區。
- `services/geminiService.ts`：Gemini API 呼叫、模型設定、錯誤處理、提示詞邏輯。
- `components/AIDesignerSidebar.tsx`：AI 引導入口，負責需求訪談、房間選擇、ProjectBrief 與渲染指令整理。
- `components/ThreeRoomViewer.tsx`：3D 房間互動沙盒。
- `components/ThreeRoomFurniture.ts`：3D 家具與物件建模。
- `types.ts`：房間類型、設計風格與主要資料型別。
- `constants.ts`：風格、房型與範例提示詞。

## 本機開發

### 前置需求

- Node.js
- Gemini API key

Gemini API key 通常為 `AIza...` 開頭。請不要使用 OAuth token 或其他格式的憑證。

### 安裝

```bash
npm install
```

### API Key 設定

開發時有兩種方式：

1. 在 app 右上角 `API Key` 按鈕輸入 key。key 只會存在本機瀏覽器 `localStorage`。
2. 建立 `.env.local`：

```bash
GEMINI_API_KEY=你的_Gemini_API_Key
```

注意：目前專案是前端直接呼叫 Gemini API。若使用 `.env.local`，Vite 會把 key 注入前端 bundle；這只適合本機測試，不建議直接公開部署。

### 啟動開發伺服器

```bash
npm run dev
```

預設 Vite 設定使用：

```txt
http://localhost:3000
```

### 建置

```bash
npm run build
```

### 預覽建置結果

```bash
npm run preview
```

## 使用流程

### 1. 實景上傳

上傳平面配置圖與現場照片。平面圖用於判斷格局、房間關係、門窗位置；實景照片用於補充天花高度、材質、採光與現場限制。

### 2. AI 設計訪談

切換至 AI 設計師模式後，AI 室內設計師會協助整理：

- 想渲染的空間
- 家庭成員與生活習慣
- 使用情境與收納需求
- 風格偏好與色調
- 預算或不可接受的設計元素

完成後，AI 會產生可用於渲染的設計指令。

### 3. 2D 視覺渲染

系統會根據上傳圖片與設計指令生成照片級室內設計圖。若有平面圖，手動模式會先進行空間語境分析，再把視角、尺寸、採光與家具位置注入渲染提示詞。

### 4. 3D 軟裝配置

切換至 3D 模式後，可檢查家具尺度、走道寬度、視覺比例與軟裝配置。這個階段偏向「生活可用性」檢查，而不是重新生成圖片。
