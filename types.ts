export enum DesignStyle {
  MODERN = 'Modern',
  MINIMALIST = 'Minimalist',
  SCANDINAVIAN = 'Scandinavian',
  INDUSTRIAL = 'Industrial',
  MID_CENTURY_MODERN = 'Mid-Century Modern',
  LUXURY = 'Luxury',
  BOHEMIAN = 'Bohemian',
  JAPANDI = 'Japandi',
  COASTAL = 'Coastal'
}

export enum RoomType {
  LIVING_ROOM = 'Living Room',
  BEDROOM = 'Bedroom',
  KITCHEN = 'Kitchen',
  DINING_ROOM = 'Dining Room',
  BATHROOM = 'Bathroom',
  OFFICE = 'Home Office',
  STUDIO = 'Studio Apartment'
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  [RoomType.LIVING_ROOM]: '客廳 (Living Room)',
  [RoomType.BEDROOM]: '臥室 (Bedroom)',
  [RoomType.KITCHEN]: '廚房 (Kitchen)',
  [RoomType.DINING_ROOM]: '餐廳 (Dining Room)',
  [RoomType.BATHROOM]: '浴室 (Bathroom)',
  [RoomType.OFFICE]: '書房/辦公室 (Home Office)',
  [RoomType.STUDIO]: '單身套房/工作室 (Studio Apartment)'
};

export const DESIGN_STYLE_LABELS: Record<DesignStyle, string> = {
  [DesignStyle.MODERN]: '現代風 (Modern)',
  [DesignStyle.MINIMALIST]: '極簡風 (Minimalist)',
  [DesignStyle.SCANDINAVIAN]: '北歐風 (Scandinavian)',
  [DesignStyle.INDUSTRIAL]: '工業風 (Industrial)',
  [DesignStyle.MID_CENTURY_MODERN]: '中世紀現代風 (Mid-Century)',
  [DesignStyle.LUXURY]: '輕奢風 (Luxury)',
  [DesignStyle.BOHEMIAN]: '波西米亞風 (Bohemian)',
  [DesignStyle.JAPANDI]: '日式侘寂風 (Japandi)',
  [DesignStyle.COASTAL]: '美式海岸風 (Coastal)'
};

export interface DesignConfig {
  style: DesignStyle;
  roomType: RoomType;
  prompt: string;
  floorPlan: File | null;
  realScenes: File[];
}

export interface GeneratedResult {
  imageUrl: string;
  timestamp: number;
}

export interface ProjectBrief {
  household: string;
  area: string;
  budget: string;
  painPoints: string;
  stylePreference: string;
  rejectedElements: string;
  targetRoom: string;
  constructionLimits: string;
  storageNeeds: string;
  lifestyleNotes: string;
  summary: string;
}

export type ChecklistStatus = 'pass' | 'warning' | 'fail' | 'unknown';

export interface DesignChecklistItem {
  key: string;
  label: string;
  status: ChecklistStatus;
  note: string;
}

export interface DesignVersionRecord {
  id: string;
  imageUrl: string;
  createdAt: number;
  source: 'manual_generate' | 'ai_generate' | 'import' | 'magic_edit';
  title: string;
  prompt: string;
  style: DesignStyle;
  roomType: RoomType;
  changeReason: string;
  aiSummary?: string;
  projectBrief?: ProjectBrief | null;
  checklist?: DesignChecklistItem[];
  checklistStatus?: 'idle' | 'checking' | 'done' | 'error';
}

export interface Point2D {
  x: number;
  y: number;
}

export interface EmptySpaceWall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thicknessCm: number;
  confidence?: number;
  pixel?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    thicknessPx: number;
  };
}

export interface EmptySpaceOpening {
  id: string;
  type: 'door' | 'window';
  x: number;
  y: number;
  widthCm: number;
  rotation: number;
  hostWallId?: string;
  confidence?: number;
}

export interface EmptySpaceRoom {
  id: string;
  name: string;
  polygon: Point2D[];
  type?: RoomType | 'corridor' | 'storage' | 'unknown';
  areaSqM?: number;
}

export interface EmptySpaceIssue {
  id: string;
  severity: 'info' | 'warning' | 'error';
  targetType: 'scale' | 'wall' | 'opening' | 'room' | 'model';
  targetId?: string;
  title: string;
  detail: string;
}

export interface EmptySpaceLayout {
  source: 'floor_plan';
  imageName: string;
  generatedAt: number;
  scale: {
    cmPerPixel: number;
    confidence: 'estimated' | 'calibrated';
  };
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  sourceImage: {
    widthPx: number;
    heightPx: number;
    drawingBoundsPx: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
  };
  walls: EmptySpaceWall[];
  openings: EmptySpaceOpening[];
  rooms: EmptySpaceRoom[];
  issues: EmptySpaceIssue[];
  diagnostics: {
    imageWidth: number;
    imageHeight: number;
    darkPixelRatio: number;
    detectedHorizontalBands: number;
    detectedVerticalBands: number;
    averageWallConfidence: number;
  };
}
