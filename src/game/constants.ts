import { BuildingType, CropType, ItemType, ResearchProject, SkillName, WorkTypeName } from '../types/game';

export const MAP_WIDTH = 34;
export const MAP_HEIGHT = 34;
export const TILE_SIZE = 36; // Base display size in pixels

export interface BuildingDef {
  name: string;
  nameZh: string;
  category: 'Structure' | 'Furniture' | 'Production' | 'Recreation' | 'Power';
  cost: {
    wood?: number;
    stone_blocks?: number;
    steel?: number;
  };
  maxHp: number;
  isSolid: boolean; // Impassable
  isDoor?: boolean;
  workRequired: number;
  description: string;
  comfort?: number;
}

export const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  wall_wood: {
    name: 'Wooden Wall',
    nameZh: '木牆',
    category: 'Structure',
    cost: { wood: 5 },
    maxHp: 200,
    isSolid: true,
    workRequired: 35,
    description: '基礎防護牆，可圍合房間提供遮蔽。',
  },
  wall_stone: {
    name: 'Stone Wall',
    nameZh: '石磚牆',
    category: 'Structure',
    cost: { stone_blocks: 5 },
    maxHp: 450,
    isSolid: true,
    workRequired: 60,
    description: '堅固不可燃的石製牆體。',
  },
  door_wood: {
    name: 'Wooden Door',
    nameZh: '木門',
    category: 'Structure',
    cost: { wood: 10 },
    maxHp: 120,
    isSolid: false,
    isDoor: true,
    workRequired: 30,
    description: '允許殖民者快速通行的手動木門。',
  },
  bed: {
    name: 'Colonist Bed',
    nameZh: '單人床',
    category: 'Furniture',
    cost: { wood: 20 },
    maxHp: 100,
    isSolid: false,
    workRequired: 50,
    comfort: 0.75,
    description: '殖民者睡眠與休息的傢俱，消除「睡在地上」的不滿情緒。',
  },
  table_wood: {
    name: 'Dining Table',
    nameZh: '用餐桌',
    category: 'Furniture',
    cost: { wood: 15 },
    maxHp: 100,
    isSolid: false,
    workRequired: 40,
    description: '殖民者就餐的場所，防止產生「無桌就餐（-3 心情）」負面狀態。',
  },
  stool_wood: {
    name: 'Wooden Stool',
    nameZh: '木凳',
    category: 'Furniture',
    cost: { wood: 8 },
    maxHp: 60,
    isSolid: false,
    workRequired: 25,
    comfort: 0.5,
    description: '簡易座椅，搭配桌子使用以提升進食舒適度。',
  },
  horseshoe_pin: {
    name: 'Horseshoes Pin',
    nameZh: '擲蹄鐵環',
    category: 'Recreation',
    cost: { wood: 10 },
    maxHp: 80,
    isSolid: false,
    workRequired: 25,
    description: '室外娛樂設施，供殖民者放鬆減壓與恢復娛樂值。',
  },
  torch_lamp: {
    name: 'Torch Lamp',
    nameZh: '火把燈',
    category: 'Furniture',
    cost: { wood: 5 },
    maxHp: 50,
    isSolid: false,
    workRequired: 15,
    description: '提供照明與微量溫度，驅散「處於黑暗中」的減益。',
  },
  campfire: {
    name: 'Campfire',
    nameZh: '營火',
    category: 'Production',
    cost: { wood: 12 },
    maxHp: 80,
    isSolid: false,
    workRequired: 30,
    description: '燃燒木材的露天營火，可用於烹飪簡易餐點和取暖。',
  },
  stove: {
    name: 'Fueled Stove',
    nameZh: '燃料爐灶',
    category: 'Production',
    cost: { steel: 25, wood: 10 },
    maxHp: 200,
    isSolid: false,
    workRequired: 70,
    description: '專業廚房烹飪設施，烹飪速度提高 100%。',
  },
  research_bench: {
    name: 'Research Bench',
    nameZh: '簡易研發台',
    category: 'Production',
    cost: { wood: 20, steel: 15 },
    maxHp: 150,
    isSolid: false,
    workRequired: 80,
    description: '供智力專長的殖民者研究新科技與建造藍圖。',
  },
  heater: {
    name: 'Space Heater',
    nameZh: '電暖器',
    category: 'Furniture',
    cost: { steel: 20, wood: 10 },
    maxHp: 100,
    isSolid: false,
    workRequired: 40,
    description: '主動向封閉房間散發熱量，使室溫提升並維持在舒適的 21°C。',
  },
  cooler: {
    name: 'Air Cooler',
    nameZh: '冷氣空調',
    category: 'Structure',
    cost: { steel: 30, wood: 10 },
    maxHp: 120,
    isSolid: false,
    workRequired: 50,
    description: '向室內抽取熱量降溫，可打造負溫冷凍庫（-5°C）長久保鮮食物，或在熱浪中保持涼爽。',
  },
};

export const CROP_DEFS: Record<CropType, { nameZh: string; growTicks: number; yieldItem: ItemType; yieldCount: number }> = {
  potato: {
    nameZh: '土豆 (生長快速)',
    growTicks: 90,
    yieldItem: 'berries',
    yieldCount: 8,
  },
  corn: {
    nameZh: '玉米 (高產量)',
    growTicks: 160,
    yieldItem: 'berries',
    yieldCount: 16,
  },
  healroot: {
    nameZh: '草藥 (藥用價值)',
    growTicks: 130,
    yieldItem: 'medicine',
    yieldCount: 2,
  },
};

export const INITIAL_RESEARCH_PROJECTS: ResearchProject[] = [
  {
    id: 'stonecutting',
    name: '石材切削 (Stonecutting)',
    description: '解鎖將天然石塊切碎為平整石磚技術，建造堅固的石磚牆。',
    cost: 100,
    progress: 0,
    isCompleted: false,
    prerequisites: [],
    unlocks: ['wall_stone'],
  },
  {
    id: 'electricity',
    name: '電力學 (Electricity)',
    description: '掌握基礎發電與布線原理，解鎖燃料爐灶與進階電器。',
    cost: 150,
    progress: 0,
    isCompleted: false,
    prerequisites: [],
    unlocks: ['stove'],
  },
  {
    id: 'agriculture',
    name: '精耕細作 (Agriculture)',
    description: '提高作物種植與收割效率 +25%，產量額外增加。',
    cost: 120,
    progress: 0,
    isCompleted: false,
    prerequisites: [],
    unlocks: [],
  },
  {
    id: 'medicine_prep',
    name: '醫藥研磨 (Herbal Prep)',
    description: '掌握野生草藥的萃取與提純，包紮與治療效果大幅提升。',
    cost: 180,
    progress: 0,
    isCompleted: false,
    prerequisites: ['agriculture'],
    unlocks: [],
  },
  {
    id: 'thermal_control',
    name: '空調溫控 (Climate Control)',
    description: '掌握熱力循環與致冷壓縮技術，解鎖電暖器與冷氣空調設施。',
    cost: 140,
    progress: 0,
    isCompleted: false,
    prerequisites: ['electricity'],
    unlocks: ['heater', 'cooler'],
  },
];

export const WORK_TYPE_LABELS: Record<WorkTypeName, { zh: string; short: string; defaultPrio: number }> = {
  firefight: { zh: '滅火', short: '滅', defaultPrio: 1 },
  patient: { zh: '就醫', short: '醫', defaultPrio: 1 },
  doctor: { zh: '醫療', short: '療', defaultPrio: 2 },
  bedRest: { zh: '休養', short: '休', defaultPrio: 1 },
  cook: { zh: '烹飪', short: '烹', defaultPrio: 2 },
  construct: { zh: '建造', short: '建', defaultPrio: 2 },
  mine: { zh: '採礦', short: '採', defaultPrio: 3 },
  plantCut: { zh: '割草伐木', short: '伐', defaultPrio: 3 },
  grow: { zh: '種植', short: '種', defaultPrio: 3 },
  craft: { zh: '製作', short: '製', defaultPrio: 3 },
  haul: { zh: '搬運', short: '搬', defaultPrio: 3 },
  clean: { zh: '打掃', short: '掃', defaultPrio: 4 },
  research: { zh: '研究', short: '研', defaultPrio: 4 },
};

export const SKILL_LABELS: Record<SkillName, string> = {
  mining: '採礦 Mining',
  construction: '建造 Construction',
  plants: '植物 Plants',
  cooking: '烹飪 Cooking',
  crafting: '工藝 Crafting',
  intellectual: '智力 Intellectual',
  medical: '醫療 Medical',
};
