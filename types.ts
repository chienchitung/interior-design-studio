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
  realScene?: File | null; // Keep for backward compatibility if needed, though we will remove usage
}

export interface GeneratedResult {
  imageUrl: string;
  timestamp: number;
}