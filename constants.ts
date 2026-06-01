import { DesignStyle, RoomType } from './types';

export const DESIGN_STYLES = Object.values(DesignStyle);
export const ROOM_TYPES = Object.values(RoomType).filter(t => t !== RoomType.STUDIO);

export const SAMPLE_PROMPTS = [
  "舒適的閱讀角落，搭配溫馨的燈光與毛絨天鵝絨家具。",
  "開放式格局概念，配有大理石檯面與奢華金色裝飾點綴。",
  "通透寬敞的空間，擁有落地窗與滿滿的綠意盎然室內植栽。",
  "輕奢沉穩暗色調，配有質感皮質家具與現代工業風清水模質感。"
];
