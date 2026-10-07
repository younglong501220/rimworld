import {
  Blueprint,
  Building,
  BuildingType,
  CropType,
  DesignationType,
  GroundItem,
  HostileAnimal,
  ItemType,
  Letter,
  MineralType,
  NaturalFeature,
  Pawn,
  PawnJob,
  ResearchProject,
  Room,
  TileTerrain,
  Zone,
  ZoneType,
} from '../types/game';
import { sounds } from '../utils/audio';
import { findPath } from '../utils/pathfinding';
import {
  BUILDING_DEFS,
  CROP_DEFS,
  INITIAL_RESEARCH_PROJECTS,
  MAP_HEIGHT,
  MAP_WIDTH,
} from './constants';

export class ColonyGameEngine {
  public mapWidth = MAP_WIDTH;
  public mapHeight = MAP_HEIGHT;

  // Grid layers
  public terrain: TileTerrain[][] = [];
  public naturalFeatures: (NaturalFeature | null)[][] = [];
  public buildings: (Building | null)[][] = [];
  public blueprints: Map<string, Blueprint> = new Map();
  public designations: (DesignationType | null)[][] = [];
  public items: GroundItem[] = [];
  public zones: Zone[] = [];
  public rooms: Room[] = [];

  // Entities
  public pawns: Pawn[] = [];
  public hostileAnimals: HostileAnimal[] = [];
  public letters: Letter[] = [];

  // Research
  public researchProjects: ResearchProject[] = JSON.parse(
    JSON.stringify(INITIAL_RESEARCH_PROJECTS)
  );
  public activeResearchId: string | null = 'stonecutting';

  // Environment & Time
  public tickCount = 0;
  public gameHour = 8.0; // 0.0 to 24.0
  public dayCount = 1;
  public baseTemperature = 21; // Base outdoor °C
  public outdoorTemperature = 21; // Ambient outdoor °C
  public temperature: number[][] = []; // Temperature grid tracking ambient heat
  public temperatureGrid: number[][] = []; // Per-tile temperature layer (synced with temperature)
  public weather: 'sunny' | 'heatwave' | 'coldsnap' = 'sunny';
  public weatherDuration = 0;

  // Storyteller timer
  public nextIncidentTick = 250;

  // Listeners for UI state update
  private onStateChange: (() => void) | null = null;

  constructor() {
    this.initMap();
    this.spawnStartingColonists();
    this.spawnStartingSupplies();
    this.calculateRoomTemperatures();
  }

  public setChangeListener(fn: () => void) {
    this.onStateChange = fn;
  }

  private notify() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  // ==================== 1. MAP GENERATION ====================
  private initMap() {
    this.terrain = [];
    this.naturalFeatures = [];
    this.buildings = [];
    this.designations = [];
    this.temperature = [];
    this.temperatureGrid = [];

    for (let y = 0; y < this.mapHeight; y++) {
      this.terrain[y] = [];
      this.naturalFeatures[y] = [];
      this.buildings[y] = [];
      this.designations[y] = [];
      this.temperature[y] = [];
      this.temperatureGrid[y] = [];

      for (let x = 0; x < this.mapWidth; x++) {
        this.temperature[y][x] = this.outdoorTemperature;
        this.temperatureGrid[y][x] = this.outdoorTemperature;
        // Base terrain: soil, with rich soil patches in middle
        const distFromCenter = Math.hypot(x - this.mapWidth / 2, y - this.mapHeight / 2);
        let t: TileTerrain = 'soil';
        if (distFromCenter < 5 && Math.random() < 0.6) {
          t = 'rich_soil';
        } else if (x > this.mapWidth - 8 && y < 8) {
          t = 'rocky_floor';
        }
        this.terrain[y][x] = t;
        this.buildings[y][x] = null;
        this.designations[y][x] = null;

        // Natural obstacles
        // 1. Mountain Rock cluster in the top-right and scattered corners
        const isMountainCorner = (x > this.mapWidth - 9 && y < 9 && Math.random() < 0.85);
        const isLeftRockVein = (x < 5 && y > this.mapHeight - 8 && Math.random() < 0.7);
        const isRandomRock = Math.random() < 0.04 && distFromCenter > 7;

        if (isMountainCorner || isLeftRockVein || isRandomRock) {
          let mineral: MineralType = 'granite';
          const r = Math.random();
          if (r < 0.35) mineral = 'steel_vein';
          else if (r < 0.45) mineral = 'slate';
          else if (r < 0.5) mineral = 'silver_vein';

          this.naturalFeatures[y][x] = {
            type: 'rock',
            mineral,
            hp: mineral === 'steel_vein' ? 240 : 300,
            maxHp: 300,
          };
        } else if (Math.random() < 0.12 && distFromCenter > 3) {
          // Trees
          this.naturalFeatures[y][x] = {
            type: 'tree',
            hp: 100,
            maxHp: 100,
            growth: 60 + Math.floor(Math.random() * 40),
          };
        } else if (Math.random() < 0.035) {
          // Wild Berry Bushes
          this.naturalFeatures[y][x] = {
            type: 'berry_bush',
            hp: 60,
            maxHp: 60,
            growth: 100,
            isRipe: true,
          };
        } else {
          this.naturalFeatures[y][x] = null;
        }
      }
    }

    // Default Stockpile Zone in center
    const zoneCells: { x: number; y: number }[] = [];
    for (let dy = 0; dy < 4; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        const zx = 10 + dx;
        const zy = 10 + dy;
        this.naturalFeatures[zy][zx] = null; // Clear rocks
        zoneCells.push({ x: zx, y: zy });
      }
    }
    this.zones.push({
      id: 'stockpile_1',
      name: '主要儲存區 (Stockpile 1)',
      type: 'stockpile',
      color: 'rgba(56, 189, 248, 0.25)',
      cells: zoneCells,
      allowedItems: ['wood', 'steel', 'stone_blocks', 'meal_simple', 'berries', 'medicine', 'silver', 'components'],
    });
  }

  // ==================== 2. STARTING COLONISTS ====================
  private spawnStartingColonists() {
    this.pawns = [
      new Pawn({
        id: 'pawn_1',
        name: '艾米莉·陳',
        nickname: '陳 (Chen)',
        gender: 'female',
        age: 28,
        color: '#38bdf8',
        backstory: '工業機械師，熱衷於建造與開採礦石。',
        traits: ['勤奮 Industrious', '神速步行 Fast Walker'],
        x: 12,
        y: 12,
        realX: 12 * 36,
        realY: 12 * 36,
        food: 85,
        hunger: 85,
        rest: 90,
        recreation: 80,
        comfort: 80,
        mood: 75,
        workSpeed: 1.0,
        workEfficiency: 1.0,
        thoughts: [{ id: 'hope', label: '新起點的希望', moodDelta: 10, durationTicks: 600 }],
        skills: {
          mining: { level: 9, passion: 2 },
          construction: { level: 8, passion: 2 },
          plants: { level: 3, passion: 0 },
          cooking: { level: 2, passion: 0 },
          crafting: { level: 6, passion: 1 },
          intellectual: { level: 4, passion: 0 },
          medical: { level: 3, passion: 0 },
        },
        workPriorities: {
          firefight: 1,
          patient: 1,
          doctor: 3,
          bedRest: 1,
          cook: 3,
          construct: 1,
          mine: 1,
          plantCut: 2,
          grow: 3,
          craft: 2,
          haul: 2,
          clean: 4,
          research: 4,
        },
        hp: 100,
        maxHp: 100,
        isDrafted: false,
        draftTarget: null,
        mentalBreak: null,
        state: 'IDLE',
        path: [],
        currentJob: null,
      }),
      new Pawn({
        id: 'pawn_2',
        name: '托馬斯·布朗',
        nickname: '托馬斯 (Tom)',
        gender: 'male',
        age: 34,
        color: '#4ade80',
        backstory: '農業技術員與殖民地廚師，熱愛自然。',
        traits: ['好胃口 Gourmand', '隨和 Kind'],
        x: 13,
        y: 12,
        realX: 13 * 36,
        realY: 12 * 36,
        food: 90,
        hunger: 90,
        rest: 85,
        recreation: 75,
        comfort: 80,
        mood: 80,
        workSpeed: 1.0,
        workEfficiency: 1.0,
        thoughts: [{ id: 'hope', label: '迫降獲救感', moodDelta: 8, durationTicks: 600 }],
        skills: {
          mining: { level: 2, passion: 0 },
          construction: { level: 4, passion: 0 },
          plants: { level: 10, passion: 2 },
          cooking: { level: 8, passion: 2 },
          crafting: { level: 3, passion: 0 },
          intellectual: { level: 3, passion: 0 },
          medical: { level: 5, passion: 1 },
        },
        workPriorities: {
          firefight: 1,
          patient: 1,
          doctor: 2,
          bedRest: 1,
          cook: 1,
          construct: 3,
          mine: 4,
          plantCut: 1,
          grow: 1,
          craft: 3,
          haul: 2,
          clean: 3,
          research: 4,
        },
        hp: 100,
        maxHp: 100,
        isDrafted: false,
        draftTarget: null,
        mentalBreak: null,
        state: 'IDLE',
        path: [],
        currentJob: null,
      }),
      new Pawn({
        id: 'pawn_3',
        name: '索菲亞·李',
        nickname: '索菲亞 (Sophie)',
        gender: 'female',
        age: 26,
        color: '#c084fc',
        backstory: '核心世界研究學者與醫師，對未知充滿好奇。',
        traits: ['夜貓子 Night Owl', '快槍手 Quick Reflex'],
        x: 11,
        y: 13,
        realX: 11 * 36,
        realY: 13 * 36,
        food: 78,
        hunger: 78,
        rest: 95,
        recreation: 85,
        comfort: 80,
        mood: 82,
        workSpeed: 1.0,
        workEfficiency: 1.0,
        thoughts: [{ id: 'hope', label: '科學探索熱忱', moodDelta: 12, durationTicks: 600 }],
        skills: {
          mining: { level: 1, passion: 0 },
          construction: { level: 2, passion: 0 },
          plants: { level: 4, passion: 0 },
          cooking: { level: 3, passion: 0 },
          crafting: { level: 5, passion: 1 },
          intellectual: { level: 10, passion: 2 },
          medical: { level: 8, passion: 2 },
        },
        workPriorities: {
          firefight: 1,
          patient: 1,
          doctor: 1,
          bedRest: 1,
          cook: 3,
          construct: 4,
          mine: 4,
          plantCut: 3,
          grow: 4,
          craft: 2,
          haul: 2,
          clean: 2,
          research: 1,
        },
        hp: 100,
        maxHp: 100,
        isDrafted: false,
        draftTarget: null,
        mentalBreak: null,
        state: 'IDLE',
        path: [],
        currentJob: null,
      }),
    ];

    // Initial alert letter
    this.addLetter({
      title: '迫降生存：新殖民地建立',
      type: 'good',
      message: '你們的逃生艙在未知邊緣星際地表墜毀。3 名倖存者成功著陸。請立即規劃採礦、伐木、建造庇護所與農田，並分配好工作優先級！',
      x: 12,
      y: 12,
    });
  }

  // ==================== 3. STARTING SUPPLIES ====================
  private spawnStartingSupplies() {
    this.items = [
      { id: 'item_1', type: 'wood', count: 60, x: 10, y: 10 },
      { id: 'item_2', type: 'wood', count: 50, x: 11, y: 10 },
      { id: 'item_3', type: 'steel', count: 45, x: 12, y: 10 },
      { id: 'item_4', type: 'meal_simple', count: 18, x: 10, y: 11 },
      { id: 'item_5', type: 'medicine', count: 10, x: 11, y: 11 },
      { id: 'item_6', type: 'silver', count: 150, x: 12, y: 11 },
      { id: 'item_7', type: 'components', count: 12, x: 13, y: 11 },
    ];
  }

  // ==================== 4. TICK UPDATE & GAME LOOP ====================
  public update() {
    this.tickCount++;

    // 1. Time & Environment Cycle
    this.gameHour += 0.04;
    if (this.gameHour >= 24) {
      this.gameHour -= 24;
      this.dayCount++;
      // Day temperature slight fluctuation
      this.baseTemperature = 18 + Math.floor(Math.sin(this.dayCount * 0.5) * 8);
    }

    // Weather decay
    if (this.weatherDuration > 0) {
      this.weatherDuration--;
      if (this.weatherDuration === 0) {
        this.weather = 'sunny';
        this.addLetter({
          title: '氣候恢復正常',
          type: 'neutral',
          message: '極端天氣已經消散，氣溫逐漸回到平穩狀態。',
        });
      }
    }

    // 2. Incident Storyteller Director
    if (this.tickCount >= this.nextIncidentTick) {
      this.triggerRandomStorytellerEvent();
      this.nextIncidentTick = this.tickCount + 400 + Math.floor(Math.random() * 400);
    }

    // 3. Update Crops in Growing Zones
    if (this.tickCount % 20 === 0) {
      this.updateCrops();
    }

    // 4. Update Colonists AI
    for (const pawn of this.pawns) {
      this.updatePawn(pawn);
    }

    // 5. Update Hostile Animals
    this.updateHostileAnimals();

    // 6. Periodic Room Detection & Temperature Layer Update (tracks ambient heat via flood-fill)
    if (this.tickCount % 15 === 0) {
      this.calculateRoomTemperatures();
    }

    this.notify();
  }

  // ==================== 5. PAWN AI SYSTEM (WorkGiver & JobDriver) ====================
  private updatePawn(pawn: Pawn) {
    // Smooth position interpolation for canvas rendering
    const targetPx = pawn.x * 36;
    const targetPy = pawn.y * 36;
    pawn.realX += (targetPx - pawn.realX) * 0.35;
    pawn.realY += (targetPy - pawn.realY) * 0.35;

    // Decay / Gain Needs
    if (this.tickCount % 12 === 0) {
      // Hunger decay
      pawn.food = Math.max(0, pawn.food - 0.4);
      pawn.hunger = pawn.food;
      // Rest decay (unless sleeping)
      if (pawn.state !== 'SLEEPING') {
        pawn.rest = Math.max(0, pawn.rest - 0.3);
      } else {
        pawn.rest = Math.min(100, pawn.rest + 1.2);
        if (pawn.rest >= 100) {
          pawn.state = 'IDLE';
          pawn.currentJob = null;
        }
      }
      // Recreation decay
      pawn.recreation = Math.max(0, pawn.recreation - 0.25);

      // Comfort update
      if (pawn.state === 'SLEEPING') {
        const onBed = this.buildings[pawn.y]?.[pawn.x]?.type === 'bed';
        if (onBed) {
          pawn.comfort = Math.min(100, pawn.comfort + 1.8);
        } else {
          pawn.comfort = Math.max(0, pawn.comfort - 0.4);
        }
      } else {
        const nearComfortable = this.findAdjacentBuilding(
          pawn.x,
          pawn.y,
          (b) => b.type === 'stool_wood' || b.type === 'table_wood' || b.type === 'bed'
        );
        if (nearComfortable) {
          pawn.comfort = Math.min(100, pawn.comfort + 0.8);
        } else {
          pawn.comfort = Math.max(0, pawn.comfort - 0.15);
        }
      }

      // Mood calculation based on thoughts & needs (hunger, comfort, recreation, rest)
      this.calculatePawnMood(pawn);
    }

    // Update thoughts duration
    if (this.tickCount % 30 === 0) {
      pawn.thoughts = pawn.thoughts
        .map((t) => ({ ...t, durationTicks: t.durationTicks - 30 }))
        .filter((t) => t.durationTicks > 0);
    }

    // If pawn is drafted, player manually controls movement/attack
    if (pawn.isDrafted) {
      if (pawn.path.length > 0) {
        this.stepPawnPath(pawn);
      }
      // Check auto-attack adjacent hostile
      this.checkDraftedCombat(pawn);
      return;
    }

    // If pawn is asleep, stay sleeping until full
    if (pawn.state === 'SLEEPING') {
      return;
    }

    // State Machine
    switch (pawn.state) {
      case 'IDLE':
        this.seekJobForPawn(pawn);
        if (pawn.state === 'IDLE') {
          this.doIdleWander(pawn);
        }
        break;

      case 'MOVING':
        this.followPawnPath(pawn);
        break;

      case 'WORKING':
        this.executePawnJob(pawn);
        break;
    }
  }

  private calculatePawnMood(pawn: Pawn) {
    const cellTemp = this.temperatureGrid[pawn.y]?.[pawn.x] ?? this.outdoorTemperature;
    if (typeof pawn.updateMood === 'function') {
      pawn.updateMood(cellTemp);
    } else {
      let base = 50;

      // 1. Food / Hunger Needs
      const hungerVal = pawn.hunger !== undefined ? pawn.hunger : pawn.food;
      if (hungerVal < 15) {
        base -= 25; // Starving!
      } else if (hungerVal < 35) {
        base -= 10; // Hungry!
      } else if (hungerVal > 85) {
        base += 6; // Well fed!
      }

      // 2. Rest Needs
      if (pawn.rest < 15) {
        base -= 20; // Exhausted!
      } else if (pawn.rest < 30) {
        base -= 8; // Tired!
      }

      // 3. Comfort Needs
      if (pawn.comfort > 80) {
        base += 8; // Luxurious comfort!
      } else if (pawn.comfort > 60) {
        base += 4; // Comfortable!
      } else if (pawn.comfort < 20) {
        base -= 6; // Uncomfortable!
      } else if (pawn.comfort < 10) {
        base -= 12; // In agony / Sore!
      }

      // 4. Recreation Needs
      if (pawn.recreation < 15) {
        base -= 16; // Recreation starved!
      } else if (pawn.recreation > 80) {
        base += 8; // Well entertained!
      }

      // 5. Ambient Temperature at Pawn's Cell
      if (cellTemp < -5) {
        base -= 15; // Severe Freezing!
      } else if (cellTemp < 5) {
        base -= 6; // Shivering cold!
      } else if (cellTemp > 38) {
        base -= 16; // Severe heatstroke risk!
      } else if (cellTemp > 30) {
        base -= 6; // Sweltering heat!
      } else if (cellTemp >= 18 && cellTemp <= 24) {
        base += 4; // Pleasant indoor climate!
      }

      // Sum active thoughts
      for (const t of pawn.thoughts) {
        base += t.moodDelta;
      }

      pawn.mood = Math.max(0, Math.min(100, Math.round(base)));

      // Work Efficiency / Work Speed based on mood
      if (pawn.mentalBreak) {
        pawn.workEfficiency = 0.0;
        pawn.workSpeed = 0.0;
      } else if (pawn.mood >= 80) {
        pawn.workEfficiency = 1.25; // +25% productivity boost
        pawn.workSpeed = 1.25;
      } else if (pawn.mood >= 50) {
        pawn.workEfficiency = 1.0;
        pawn.workSpeed = 1.0;
      } else if (pawn.mood >= 30) {
        pawn.workEfficiency = 0.8; // -20% productivity penalty
        pawn.workSpeed = 0.8;
      } else {
        pawn.workEfficiency = 0.5; // -50% productivity penalty
        pawn.workSpeed = 0.5;
      }
    }

    // Mental break check when pawn's mood falls below threshold (< 20)
    if (pawn.mood < 20 && !pawn.mentalBreak && Math.random() < 0.03) {
      const breaks: ('dazed' | 'binge' | 'sad_wander')[] = ['dazed', 'binge', 'sad_wander'];
      pawn.mentalBreak = breaks[Math.floor(Math.random() * breaks.length)];
      pawn.workEfficiency = 0.0;
      pawn.workSpeed = 0.0;
      sounds.playLetterAlert('bad');
      this.addLetter({
        title: `${pawn.nickname} 精神崩潰！`,
        type: 'bad',
        message: `${pawn.name} 因心情過低崩潰，陷入了「${
          pawn.mentalBreak === 'dazed' ? '迷茫亂晃' : pawn.mentalBreak === 'binge' ? '暴飲暴食' : '悲傷漫遊'
        }」狀態！工作速度歸零，拒絕從事殖民地一切工作。`,
        x: pawn.x,
        y: pawn.y,
      });
    } else if (pawn.mood > 40 && pawn.mentalBreak) {
      // Catharsis recovery
      pawn.mentalBreak = null;
      if (typeof pawn.updateWorkEfficiency === 'function') {
        pawn.updateWorkEfficiency();
      } else {
        pawn.workEfficiency = 1.0;
        pawn.workSpeed = 1.0;
      }
      pawn.thoughts.push({ id: 'catharsis', label: '宣洩過後釋然', moodDelta: 20, durationTicks: 500 });
      this.addLetter({
        title: `${pawn.nickname} 恢復神智`,
        type: 'good',
        message: `${pawn.name} 重新振作起來，恢復了理智與殖民地工作！`,
      });
    }
  }

  // WorkGiver / High-Level Decision Maker
  private seekJobForPawn(pawn: Pawn) {
    if (pawn.mentalBreak) {
      // If mental break, refuse work
      return;
    }

    // 1. Critical Needs First
    // A. Hunger: if hungry, find food
    if (pawn.food < 45) {
      const foodItem = this.findNearestItem(pawn.x, pawn.y, (i) => i.type === 'meal_simple' || i.type === 'berries');
      if (foodItem) {
        const path = this.findPathTo(pawn.x, pawn.y, foodItem.x, foodItem.y, false);
        if (path) {
          pawn.currentJob = {
            type: 'EAT',
            targetX: foodItem.x,
            targetY: foodItem.y,
            targetItemId: foodItem.id,
            progress: 0,
            maxProgress: 35,
            description: `食用 ${foodItem.type === 'meal_simple' ? '簡易餐點' : '野生漿果'}`,
          };
          pawn.path = path;
          pawn.state = path.length === 0 ? 'WORKING' : 'MOVING';
          return;
        }
      }
    }

    // B. Sleep: if exhausted, find bed or sleep on ground
    if (pawn.rest < 25) {
      const bed = this.findNearestBuilding(pawn.x, pawn.y, (b) => b.type === 'bed');
      const targetX = bed ? bed.x : pawn.x;
      const targetY = bed ? bed.y : pawn.y;

      const path = bed ? this.findPathTo(pawn.x, pawn.y, targetX, targetY, false) : [];
      if (!bed || path) {
        pawn.currentJob = {
          type: 'SLEEP',
          targetX,
          targetY,
          progress: 0,
          maxProgress: 100,
          description: bed ? '在床上安穩睡眠' : '席地入睡',
        };
        pawn.path = path || [];
        pawn.state = pawn.path.length === 0 ? 'SLEEPING' : 'MOVING';
        return;
      }
    }

    // C. Recreation: if joy deprived, use horseshoe pin or relax
    if (pawn.recreation < 30) {
      const joyPin = this.findNearestBuilding(pawn.x, pawn.y, (b) => b.type === 'horseshoe_pin' || b.type === 'campfire');
      if (joyPin) {
        const path = this.findPathTo(pawn.x, pawn.y, joyPin.x, joyPin.y, true);
        if (path) {
          pawn.currentJob = {
            type: 'RELAX',
            targetX: joyPin.x,
            targetY: joyPin.y,
            progress: 0,
            maxProgress: 45,
            description: '進行休閒娛樂 (擲蹄鐵/圍爐)',
          };
          pawn.path = path;
          pawn.state = path.length === 0 ? 'WORKING' : 'MOVING';
          return;
        }
      }
    }

    // 2. Scan Work Tasks by Work Priorities (Prio 1 -> 4)
    // Gather active works sorted by pawn priority (1 to 4; 0 is disabled)
    const activeWorkTypes = Object.entries(pawn.workPriorities)
      .filter(([_, prio]) => prio > 0)
      .sort((a, b) => a[1] - b[1]);

    for (const [wType] of activeWorkTypes) {
      const job = this.findWorkJob(pawn, wType);
      if (job) {
        pawn.currentJob = job;
        pawn.path = job.path;
        pawn.state = job.path.length === 0 ? 'WORKING' : 'MOVING';
        return;
      }
    }
  }

  // Work Type dispatcher
  private findWorkJob(pawn: Pawn, workType: string): (PawnJob & { path: { x: number; y: number }[] }) | null {
    switch (workType) {
      case 'construct': {
        // Find nearest blueprint
        let nearestBp: Blueprint | null = null;
        let shortestDist = Infinity;

        for (const bp of this.blueprints.values()) {
          const d = Math.hypot(pawn.x - bp.x, pawn.y - bp.y);
          if (d < shortestDist) {
            shortestDist = d;
            nearestBp = bp;
          }
        }

        if (nearestBp) {
          // Check if blueprint needs materials delivered
          const neededMat = this.getBlueprintMissingMaterial(nearestBp);
          if (neededMat) {
            // Find item on ground
            const groundMat = this.findNearestItem(pawn.x, pawn.y, (i) => i.type === neededMat.type && i.count > 0);
            if (groundMat) {
              const pathToItem = this.findPathTo(pawn.x, pawn.y, groundMat.x, groundMat.y, false);
              if (pathToItem) {
                return {
                  type: 'CONSTRUCT_DELIVER',
                  targetX: groundMat.x,
                  targetY: groundMat.y,
                  blueprintId: nearestBp.id,
                  targetItemId: groundMat.id,
                  progress: 0,
                  maxProgress: 1,
                  description: `搬運 ${neededMat.type === 'wood' ? '木材' : '石磚'} 到施工藍圖`,
                  path: pathToItem,
                };
              }
            }
          } else {
            // All materials delivered! Build it!
            const pathToBp = this.findPathTo(pawn.x, pawn.y, nearestBp.x, nearestBp.y, true);
            if (pathToBp) {
              return {
                type: 'CONSTRUCT_BUILD',
                targetX: nearestBp.x,
                targetY: nearestBp.y,
                blueprintId: nearestBp.id,
                progress: nearestBp.workProgress,
                maxProgress: nearestBp.maxWork,
                description: `建造 ${BUILDING_DEFS[nearestBp.buildingType].nameZh}`,
                path: pathToBp,
              };
            }
          }
        }
        break;
      }

      case 'mine': {
        // Find designated rock
        const rockTile = this.findNearestDesignatedTile(pawn.x, pawn.y, 'MINE');
        if (rockTile) {
          const path = this.findPathTo(pawn.x, pawn.y, rockTile.x, rockTile.y, true);
          if (path) {
            return {
              type: 'MINE',
              targetX: rockTile.x,
              targetY: rockTile.y,
              progress: 0,
              maxProgress: 60,
              description: '開採岩石礦脈',
              path,
            };
          }
        }
        break;
      }

      case 'plantCut': {
        // Find designated tree
        const treeTile = this.findNearestDesignatedTile(pawn.x, pawn.y, 'CHOP');
        if (treeTile) {
          const path = this.findPathTo(pawn.x, pawn.y, treeTile.x, treeTile.y, true);
          if (path) {
            return {
              type: 'CHOP',
              targetX: treeTile.x,
              targetY: treeTile.y,
              progress: 0,
              maxProgress: 50,
              description: '砍伐樹木獲取木材',
              path,
            };
          }
        }
        break;
      }

      case 'grow': {
        // 1. Check harvest ripe crops in growing zones
        for (const zone of this.zones) {
          if (zone.type !== 'growing') continue;
          for (const cell of zone.cells) {
            const feat = this.naturalFeatures[cell.y][cell.x];
            if (feat && feat.type === 'berry_bush' && feat.isRipe) {
              const path = this.findPathTo(pawn.x, pawn.y, cell.x, cell.y, true);
              if (path) {
                return {
                  type: 'HARVEST',
                  targetX: cell.x,
                  targetY: cell.y,
                  progress: 0,
                  maxProgress: 35,
                  description: '收割成熟農作物',
                  path,
                };
              }
            } else if (!feat && !this.buildings[cell.y][cell.x]) {
              // Empty field -> Plant seed
              const path = this.findPathTo(pawn.x, pawn.y, cell.x, cell.y, false);
              if (path) {
                return {
                  type: 'PLANT',
                  targetX: cell.x,
                  targetY: cell.y,
                  progress: 0,
                  maxProgress: 25,
                  description: `播種 ${zone.cropType === 'corn' ? '玉米' : zone.cropType === 'healroot' ? '草藥' : '土豆'}`,
                  path,
                };
              }
            }
          }
        }
        break;
      }

      case 'cook': {
        // If simple meals on map < 12 and raw food exists, cook at campfire or stove
        const currentMeals = this.items.filter((i) => i.type === 'meal_simple').reduce((acc, i) => acc + i.count, 0);
        const rawFood = this.items.filter((i) => i.type === 'berries').reduce((acc, i) => acc + i.count, 0);

        if (currentMeals < 15 && rawFood >= 4) {
          const stove = this.findNearestBuilding(pawn.x, pawn.y, (b) => b.type === 'campfire' || b.type === 'stove');
          if (stove) {
            const path = this.findPathTo(pawn.x, pawn.y, stove.x, stove.y, true);
            if (path) {
              return {
                type: 'COOK',
                targetX: stove.x,
                targetY: stove.y,
                progress: 0,
                maxProgress: stove.type === 'stove' ? 25 : 45,
                description: `在${stove.type === 'stove' ? '燃料爐灶' : '營火'}烹飪簡易餐點`,
                path,
              };
            }
          }
        }
        break;
      }

      case 'haul': {
        // Find ground item not in a stockpile
        const unstockedItem = this.items.find((item) => {
          const inStockpile = this.zones.some(
            (z) => z.type === 'stockpile' && z.cells.some((c) => c.x === item.x && c.y === item.y)
          );
          return !inStockpile;
        });

        if (unstockedItem) {
          // Find empty stockpile cell
          const stockpileCell = this.findEmptyStockpileCell(unstockedItem.type);
          if (stockpileCell) {
            const pathToItem = this.findPathTo(pawn.x, pawn.y, unstockedItem.x, unstockedItem.y, false);
            if (pathToItem) {
              return {
                type: 'HAUL_PICK',
                targetX: unstockedItem.x,
                targetY: unstockedItem.y,
                targetItemId: unstockedItem.id,
                progress: 0,
                maxProgress: 1,
                description: `搬運 ${unstockedItem.type} 到儲存區`,
                path: pathToItem,
              };
            }
          }
        }
        break;
      }

      case 'research': {
        if (!this.activeResearchId) break;
        const currentProject = this.researchProjects.find((p) => p.id === this.activeResearchId && !p.isCompleted);
        if (!currentProject) break;

        const bench = this.findNearestBuilding(pawn.x, pawn.y, (b) => b.type === 'research_bench');
        if (bench) {
          const path = this.findPathTo(pawn.x, pawn.y, bench.x, bench.y, true);
          if (path) {
            return {
              type: 'RESEARCH',
              targetX: bench.x,
              targetY: bench.y,
              progress: 0,
              maxProgress: 60,
              description: `研發科技：${currentProject.name}`,
              path,
            };
          }
        }
        break;
      }
    }

    return null;
  }

  private followPawnPath(pawn: Pawn) {
    if (pawn.path.length > 0) {
      const next = pawn.path.shift()!;
      pawn.x = next.x;
      pawn.y = next.y;

      if (pawn.path.length === 0) {
        pawn.state = 'WORKING';
      }
    } else {
      pawn.state = 'WORKING';
    }
  }

  private executePawnJob(pawn: Pawn) {
    const job = pawn.currentJob;
    if (!job) {
      pawn.state = 'IDLE';
      return;
    }

    switch (job.type) {
      case 'EAT': {
        job.progress++;
        if (job.progress >= job.maxProgress) {
          // Consume item
          const itemIdx = this.items.findIndex((i) => i.id === job.targetItemId);
          if (itemIdx !== -1) {
            const item = this.items[itemIdx];
            item.count -= 1;
            if (item.count <= 0) {
              this.items.splice(itemIdx, 1);
            }
            pawn.food = Math.min(100, pawn.food + (item.type === 'meal_simple' ? 80 : 35));
            sounds.playClick();

            // Table check
            const adjacentTable = this.findAdjacentBuilding(pawn.x, pawn.y, (b) => b.type === 'table_wood');
            if (adjacentTable) {
              pawn.thoughts.push({ id: 'table', label: '在餐桌上品嚐美味', moodDelta: 4, durationTicks: 400 });
            } else {
              pawn.thoughts.push({ id: 'no_table', label: '席地用餐 (無桌就餐)', moodDelta: -3, durationTicks: 300 });
            }
          }
          pawn.state = 'IDLE';
          pawn.currentJob = null;
        }
        break;
      }

      case 'RELAX': {
        job.progress++;
        pawn.recreation = Math.min(100, pawn.recreation + 1.2);
        if (job.progress >= job.maxProgress) {
          pawn.thoughts.push({ id: 'recreation', label: '充分享受娛樂', moodDelta: 5, durationTicks: 350 });
          pawn.state = 'IDLE';
          pawn.currentJob = null;
        }
        break;
      }

      case 'MINE': {
        // Validate target is still rock with designation
        const feat = this.naturalFeatures[job.targetY][job.targetX];
        if (!feat || feat.type !== 'rock' || this.designations[job.targetY][job.targetX] !== 'MINE') {
          pawn.state = 'IDLE';
          pawn.currentJob = null;
          return;
        }

        job.progress += pawn.workEfficiency;
        if (Math.floor(job.progress) % 12 === 0) {
          sounds.playMine();
        }

        if (job.progress >= job.maxProgress) {
          // Mine complete! Drop resources
          const mineral = feat.mineral || 'granite';
          if (mineral === 'steel_vein') {
            this.dropItem('steel', 35, job.targetX, job.targetY);
          } else if (mineral === 'silver_vein') {
            this.dropItem('silver', 40, job.targetX, job.targetY);
          } else {
            this.dropItem('stone_blocks', 20, job.targetX, job.targetY);
          }

          this.naturalFeatures[job.targetY][job.targetX] = null;
          this.designations[job.targetY][job.targetX] = null;
          this.terrain[job.targetY][job.targetX] = 'rocky_floor';

          pawn.skills.mining.level = Math.min(20, pawn.skills.mining.level + 0.1);
          sounds.playComplete();
          pawn.state = 'IDLE';
          pawn.currentJob = null;
        }
        break;
      }

      case 'CHOP': {
        const feat = this.naturalFeatures[job.targetY][job.targetX];
        if (!feat || feat.type !== 'tree' || this.designations[job.targetY][job.targetX] !== 'CHOP') {
          pawn.state = 'IDLE';
          pawn.currentJob = null;
          return;
        }

        job.progress += pawn.workEfficiency;
        if (Math.floor(job.progress) % 10 === 0) {
          sounds.playChop();
        }

        if (job.progress >= job.maxProgress) {
          this.dropItem('wood', 25, job.targetX, job.targetY);
          this.naturalFeatures[job.targetY][job.targetX] = null;
          this.designations[job.targetY][job.targetX] = null;

          pawn.skills.plants.level = Math.min(20, pawn.skills.plants.level + 0.1);
          sounds.playComplete();
          pawn.state = 'IDLE';
          pawn.currentJob = null;
        }
        break;
      }

      case 'HARVEST': {
        const feat = this.naturalFeatures[job.targetY][job.targetX];
        if (!feat || !feat.isRipe) {
          pawn.state = 'IDLE';
          pawn.currentJob = null;
          return;
        }

        job.progress += pawn.workEfficiency;
        if (job.progress >= job.maxProgress) {
          // Check crop type from zone if inside one
          const zone = this.zones.find((z) => z.type === 'growing' && z.cells.some((c) => c.x === job.targetX && c.y === job.targetY));
          const cropDef = zone?.cropType ? CROP_DEFS[zone.cropType] : { yieldItem: 'berries' as ItemType, yieldCount: 10 };

          this.dropItem(cropDef.yieldItem, cropDef.yieldCount, job.targetX, job.targetY);
          this.naturalFeatures[job.targetY][job.targetX] = null;

          pawn.skills.plants.level = Math.min(20, pawn.skills.plants.level + 0.08);
          sounds.playComplete();
          pawn.state = 'IDLE';
          pawn.currentJob = null;
        }
        break;
      }

      case 'PLANT': {
        job.progress += pawn.workEfficiency;
        if (job.progress >= job.maxProgress) {
          // Spawn seedling
          this.naturalFeatures[job.targetY][job.targetX] = {
            type: 'berry_bush',
            hp: 40,
            maxHp: 60,
            growth: 0,
            isRipe: false,
          };
          sounds.playClick();
          pawn.state = 'IDLE';
          pawn.currentJob = null;
        }
        break;
      }

      case 'CONSTRUCT_DELIVER': {
        // Pawn reached item on ground, pick it up and route to blueprint
        const groundItem = this.items.find((i) => i.id === job.targetItemId);
        const bp = job.blueprintId ? this.blueprints.get(job.blueprintId) : null;

        if (groundItem && bp) {
          const neededMat = this.getBlueprintMissingMaterial(bp);
          if (neededMat && groundItem.type === neededMat.type) {
            const carryCount = Math.min(neededMat.count, groundItem.count, 20);
            groundItem.count -= carryCount;
            if (groundItem.count <= 0) {
              this.items = this.items.filter((i) => i.id !== groundItem.id);
            }

            // Path to blueprint to drop materials
            const pathToBp = this.findPathTo(pawn.x, pawn.y, bp.x, bp.y, true);
            if (pathToBp) {
              pawn.currentJob = {
                type: 'HAUL_DROP',
                targetX: bp.x,
                targetY: bp.y,
                blueprintId: bp.id,
                carriedItem: { type: neededMat.type, count: carryCount },
                progress: 0,
                maxProgress: 1,
                description: `將材料送達施工藍圖`,
              };
              pawn.path = pathToBp;
              pawn.state = pathToBp.length === 0 ? 'WORKING' : 'MOVING';
              return;
            }
          }
        }
        pawn.state = 'IDLE';
        pawn.currentJob = null;
        break;
      }

      case 'HAUL_DROP': {
        const bp = job.blueprintId ? this.blueprints.get(job.blueprintId) : null;
        if (bp && job.carriedItem) {
          const itemKey = job.carriedItem.type as 'wood' | 'stone_blocks' | 'steel';
          bp.delivered[itemKey] = (bp.delivered[itemKey] || 0) + job.carriedItem.count;
          sounds.playClick();
        } else if (job.carriedItem) {
          // Regular stockpile drop
          this.dropItem(job.carriedItem.type, job.carriedItem.count, job.targetX, job.targetY);
          sounds.playClick();
        }
        pawn.state = 'IDLE';
        pawn.currentJob = null;
        break;
      }

      case 'HAUL_PICK': {
        const groundItem = this.items.find((i) => i.id === job.targetItemId);
        if (groundItem) {
          const targetStockpile = this.findEmptyStockpileCell(groundItem.type);
          if (targetStockpile) {
            const count = groundItem.count;
            this.items = this.items.filter((i) => i.id !== groundItem.id);

            const pathToStock = this.findPathTo(pawn.x, pawn.y, targetStockpile.x, targetStockpile.y, false);
            if (pathToStock) {
              pawn.currentJob = {
                type: 'HAUL_DROP',
                targetX: targetStockpile.x,
                targetY: targetStockpile.y,
                carriedItem: { type: groundItem.type, count },
                progress: 0,
                maxProgress: 1,
                description: `將 ${groundItem.type} 放置在儲存區`,
              };
              pawn.path = pathToStock;
              pawn.state = pathToStock.length === 0 ? 'WORKING' : 'MOVING';
              return;
            }
          }
        }
        pawn.state = 'IDLE';
        pawn.currentJob = null;
        break;
      }

      case 'CONSTRUCT_BUILD': {
        const bp = job.blueprintId ? this.blueprints.get(job.blueprintId) : null;
        if (!bp) {
          pawn.state = 'IDLE';
          pawn.currentJob = null;
          return;
        }

        job.progress += pawn.workEfficiency;
        bp.workProgress = job.progress;
        if (Math.floor(job.progress) % 10 === 0) {
          sounds.playHammer();
        }

        if (job.progress >= bp.maxWork) {
          // Finish building!
          const def = BUILDING_DEFS[bp.buildingType];
          this.buildings[bp.y][bp.x] = {
            id: `bld_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: bp.buildingType,
            x: bp.x,
            y: bp.y,
            hp: def.maxHp,
            maxHp: def.maxHp,
            material: bp.buildingType.includes('stone') ? 'stone' : bp.buildingType.includes('steel') ? 'steel' : 'wood',
            isOpen: def.isDoor ? false : undefined,
            isLit: def.category === 'Furniture' || def.category === 'Production',
          };

          this.blueprints.delete(bp.id);
          this.detectRooms();
          sounds.playComplete();

          pawn.skills.construction.level = Math.min(20, pawn.skills.construction.level + 0.12);
          pawn.state = 'IDLE';
          pawn.currentJob = null;
        }
        break;
      }

      case 'COOK': {
        job.progress += pawn.workEfficiency;
        if (job.progress >= job.maxProgress) {
          // Consume 4 berries, drop 1 simple meal
          const rawItem = this.items.find((i) => i.type === 'berries' && i.count >= 4);
          if (rawItem) {
            rawItem.count -= 4;
            if (rawItem.count <= 0) {
              this.items = this.items.filter((i) => i.id !== rawItem.id);
            }
            this.dropItem('meal_simple', 1, job.targetX, job.targetY);
            sounds.playComplete();
            pawn.skills.cooking.level = Math.min(20, pawn.skills.cooking.level + 0.1);
          }
          pawn.state = 'IDLE';
          pawn.currentJob = null;
        }
        break;
      }

      case 'RESEARCH': {
        const activeProject = this.researchProjects.find((p) => p.id === this.activeResearchId && !p.isCompleted);
        if (!activeProject) {
          pawn.state = 'IDLE';
          pawn.currentJob = null;
          return;
        }

        job.progress += pawn.workEfficiency;
        activeProject.progress += 0.8 * pawn.workEfficiency;
        if (activeProject.progress >= activeProject.cost) {
          activeProject.isCompleted = true;
          activeProject.progress = activeProject.cost;
          sounds.playComplete();
          this.addLetter({
            title: `科技解鎖：${activeProject.name}`,
            type: 'good',
            message: `殖民者已成功研發 ${activeProject.name}！解鎖建造選項。`,
          });
          pawn.state = 'IDLE';
          pawn.currentJob = null;
        } else if (job.progress >= job.maxProgress) {
          pawn.skills.intellectual.level = Math.min(20, pawn.skills.intellectual.level + 0.1);
          pawn.state = 'IDLE';
          pawn.currentJob = null;
        }
        break;
      }
    }
  }

  private stepPawnPath(pawn: Pawn) {
    if (pawn.path.length > 0) {
      const next = pawn.path.shift()!;
      pawn.x = next.x;
      pawn.y = next.y;
    }
  }

  private doIdleWander(pawn: Pawn) {
    if (Math.random() < 0.08) {
      const dirs = [
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
      ];
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      const nx = pawn.x + d.x;
      const ny = pawn.y + d.y;
      if (this.isWalkable(nx, ny)) {
        pawn.x = nx;
        pawn.y = ny;
      }
    }
  }

  // ==================== 6. HOSTILE ANIMALS & COMBAT ====================
  private updateHostileAnimals() {
    for (let i = this.hostileAnimals.length - 1; i >= 0; i--) {
      const animal = this.hostileAnimals[i];

      const targetPx = animal.x * 36;
      const targetPy = animal.y * 36;
      animal.realX += (targetPx - animal.realX) * 0.35;
      animal.realY += (targetPy - animal.realY) * 0.35;

      // Find nearest colonist to hunt
      let nearestPawn: Pawn | null = null;
      let minDist = Infinity;
      for (const p of this.pawns) {
        const d = Math.hypot(animal.x - p.x, animal.y - p.y);
        if (d < minDist) {
          minDist = d;
          nearestPawn = p;
        }
      }

      if (nearestPawn && this.tickCount % 8 === 0) {
        if (minDist <= 1.2) {
          // Attack colonist!
          nearestPawn.hp -= 8;
          sounds.playMine();
          if (nearestPawn.hp <= 0) {
            nearestPawn.hp = 0;
            this.addLetter({
              title: `${nearestPawn.nickname} 受重傷倒地！`,
              type: 'urgent',
              message: `${nearestPawn.name} 遭到狂暴野獸重創倒地！請立即徵召隊友消滅野獸。`,
              x: nearestPawn.x,
              y: nearestPawn.y,
            });
          }
        } else {
          // Path towards colonist
          const path = this.findPathTo(animal.x, animal.y, nearestPawn.x, nearestPawn.y, true);
          if (path && path.length > 0) {
            const step = path[0];
            animal.x = step.x;
            animal.y = step.y;
          }
        }
      }

      // Check death
      if (animal.hp <= 0) {
        this.dropItem('meal_simple', 3, animal.x, animal.y);
        this.hostileAnimals.splice(i, 1);
        sounds.playComplete();
        this.addLetter({
          title: `狂暴野獸被消滅！`,
          type: 'good',
          message: `殖民者成功擊退了 ${animal.name}，並獲得了新鮮獸肉資源！`,
          x: animal.x,
          y: animal.y,
        });
      }
    }
  }

  private checkDraftedCombat(pawn: Pawn) {
    // If adjacent to a hostile animal, auto-attack
    for (const animal of this.hostileAnimals) {
      const dist = Math.hypot(pawn.x - animal.x, pawn.y - animal.y);
      if (dist <= 1.5) {
        if (this.tickCount % 10 === 0) {
          animal.hp -= 15;
          sounds.playHammer();
        }
        break;
      }
    }
  }

  // ==================== 7. STORYTELLER INCIDENTS ====================
  private triggerRandomStorytellerEvent() {
    const roll = Math.random();

    if (roll < 0.35) {
      // 1. Cargo Pods Drop
      const cx = 8 + Math.floor(Math.random() * (this.mapWidth - 16));
      const cy = 8 + Math.floor(Math.random() * (this.mapHeight - 16));
      this.dropItem('medicine', 8, cx, cy);
      this.dropItem('meal_simple', 12, cx + 1, cy);
      sounds.playLetterAlert('good');
      this.addLetter({
        title: '空投物資艙 (Cargo Pods)',
        type: 'good',
        message: '星際軌道貨船殘骸散落，物資艙墜毀在殖民地附近！獲得了藥品與食物儲備。',
        x: cx,
        y: cy,
      });
    } else if (roll < 0.65) {
      // 2. Mad Animal (狂暴野豬 / 瘋狼)
      const ax = Math.random() < 0.5 ? 1 : this.mapWidth - 2;
      const ay = Math.floor(Math.random() * this.mapHeight);
      this.hostileAnimals.push({
        id: `animal_${Date.now()}`,
        name: '狂暴野豬 (Mad Boar)',
        type: 'mad_boar',
        x: ax,
        y: ay,
        realX: ax * 36,
        realY: ay * 36,
        hp: 65,
        maxHp: 65,
        path: [],
      });
      sounds.playLetterAlert('urgent');
      this.addLetter({
        title: '狂暴野獸來襲 (Mad Animal)!',
        type: 'urgent',
        message: '一隻狂暴的野豬衝入了殖民地範圍，將會主動襲擊殖民者！請善用「徵召 (Draft)」功能進行迎擊防守！',
        x: ax,
        y: ay,
      });
    } else if (roll < 0.85) {
      // 3. Wanderer Joins
      const names = ['瓦倫丁 (Valentin)', '卡拉 (Kara)', '雷諾 (Reno)'];
      const pickName = names[Math.floor(Math.random() * names.length)];
      const newPawn = new Pawn({
        id: `pawn_${Date.now()}`,
        name: pickName,
        nickname: pickName.split(' ')[0],
        gender: 'male',
        age: 30,
        color: '#f59e0b',
        backstory: '流浪的倖存者，尋求庇護與合作。',
        traits: ['勤勞 Hard Worker'],
        x: 2,
        y: 2,
        realX: 2 * 36,
        realY: 2 * 36,
        food: 80,
        hunger: 80,
        rest: 80,
        recreation: 80,
        comfort: 75,
        mood: 85,
        workSpeed: 1.0,
        workEfficiency: 1.0,
        thoughts: [{ id: 'hope', label: '獲救加入殖民地', moodDelta: 15, durationTicks: 600 }],
        skills: {
          mining: { level: 6, passion: 1 },
          construction: { level: 6, passion: 1 },
          plants: { level: 5, passion: 0 },
          cooking: { level: 4, passion: 0 },
          crafting: { level: 5, passion: 1 },
          intellectual: { level: 4, passion: 0 },
          medical: { level: 4, passion: 0 },
        },
        workPriorities: {
          firefight: 1,
          patient: 1,
          doctor: 2,
          bedRest: 1,
          cook: 2,
          construct: 2,
          mine: 2,
          plantCut: 2,
          grow: 2,
          craft: 2,
          haul: 2,
          clean: 3,
          research: 3,
        },
        hp: 100,
        maxHp: 100,
        isDrafted: false,
        draftTarget: null,
        mentalBreak: null,
        state: 'IDLE',
        path: [],
        currentJob: null,
      });
      this.pawns.push(newPawn);
      sounds.playLetterAlert('good');
      this.addLetter({
        title: '漫遊者加入 (Wanderer Joins)',
        type: 'good',
        message: `${newPawn.name} 穿過荒原抵達了殖民地，願意加入成為殖民者！`,
        x: 2,
        y: 2,
      });
    } else {
      // 4. Heat wave or Cold snap
      this.weather = Math.random() < 0.5 ? 'heatwave' : 'coldsnap';
      this.weatherDuration = 400;
      this.baseTemperature = this.weather === 'heatwave' ? 38 : -5;
      this.calculateRoomTemperatures();
      sounds.playLetterAlert('bad');
      this.addLetter({
        title: this.weather === 'heatwave' ? '異常熱浪警報' : '嚴寒寒流侵襲',
        type: 'bad',
        message: `氣溫急遽變化為 ${this.outdoorTemperature}°C！請確保建造足夠的庇護所、電暖器/冷氣空調或室內火把/營火保持舒適溫度。`,
      });
    }
  }

  // ==================== 8. CROPS & ROOM DETECTION ====================
  private updateCrops() {
    for (const zone of this.zones) {
      if (zone.type !== 'growing') continue;
      for (const cell of zone.cells) {
        const feat = this.naturalFeatures[cell.y][cell.x];
        if (feat && feat.type === 'berry_bush' && !feat.isRipe) {
          feat.growth = (feat.growth || 0) + 10;
          if (feat.growth >= 100) {
            feat.isRipe = true;
          }
        }
      }
    }
  }

  /**
   * Calculates ambient heat across the temperature grid using a flood-fill algorithm
   * that accounts for insulation values of building materials and identifies enclosed rooms
   * to distribute heat from heaters and cooling from coolers.
   */
  public calculateRoomTemperatures(): Room[] {
    // 1. Calculate outdoor ambient temperature
    const hourRad = ((this.gameHour - 4) / 24) * 2 * Math.PI;
    const diurnal = Math.sin(hourRad - Math.PI / 2) * 4.5;
    const weatherMod = this.weather === 'heatwave' ? 18 : this.weather === 'coldsnap' ? -22 : 0;
    this.outdoorTemperature = Math.round((this.baseTemperature + diurnal + weatherMod) * 10) / 10;

    // 2. Default all map cells in the temperature grid to outdoor ambient heat
    for (let y = 0; y < this.mapHeight; y++) {
      if (!this.temperature[y]) this.temperature[y] = [];
      if (!this.temperatureGrid[y]) this.temperatureGrid[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        this.temperature[y][x] = this.outdoorTemperature;
        this.temperatureGrid[y][x] = this.outdoorTemperature;
      }
    }

    // 3. Flood-fill algorithm to identify enclosed rooms bordered by walls & doors
    const visited: boolean[][] = Array.from({ length: this.mapHeight }, () =>
      Array(this.mapWidth).fill(false)
    );
    const newRooms: Room[] = [];

    for (let y = 1; y < this.mapHeight - 1; y++) {
      for (let x = 1; x < this.mapWidth - 1; x++) {
        if (visited[y][x] || this.isWall(x, y)) continue;

        // Start flood-fill exploration
        const queue: { x: number; y: number }[] = [{ x, y }];
        const cells: { x: number; y: number }[] = [];
        let isEnclosed = true;
        visited[y][x] = true;

        while (queue.length > 0) {
          const cur = queue.shift()!;
          cells.push(cur);

          if (cur.x <= 0 || cur.x >= this.mapWidth - 1 || cur.y <= 0 || cur.y >= this.mapHeight - 1) {
            isEnclosed = false; // Reached map border -> open to outdoors
          }

          // 4-directional search
          const dirs = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 },
          ];

          for (const d of dirs) {
            const nx = cur.x + d.x;
            const ny = cur.y + d.y;
            if (nx < 0 || nx >= this.mapWidth || ny < 0 || ny >= this.mapHeight) {
              isEnclosed = false;
              continue;
            }

            if (!visited[ny][nx] && !this.isWall(nx, ny)) {
              visited[ny][nx] = true;
              queue.push({ x: nx, y: ny });
            }
          }
        }

        // Room identification criteria
        if (isEnclosed && cells.length >= 4 && cells.length < 160) {
          // Classify room contents & active thermal devices
          let hasBed = 0;
          let hasTable = false;
          let hasWork = false;
          let heatersCount = 0;
          let coolersCount = 0;
          let campfires = 0;
          let torches = 0;

          for (const c of cells) {
            const b = this.buildings[c.y][c.x];
            if (b) {
              if (b.type === 'bed') hasBed++;
              if (b.type === 'table_wood') hasTable = true;
              if (b.type === 'stove' || b.type === 'research_bench') hasWork = true;
              if (b.type === 'heater') heatersCount++;
              if (b.type === 'cooler') coolersCount++;
              if (b.type === 'campfire') campfires++;
              if (b.type === 'torch_lamp') torches++;
            }
          }

          // Calculate perimeter insulation based on wall and doorway building materials
          let woodWalls = 0;
          let stoneWalls = 0;
          let doors = 0;
          let rockWalls = 0;
          let perimeterCount = 0;
          const checkedBorder = new Set<string>();

          for (const c of cells) {
            const dirs = [
              { x: 0, y: -1 },
              { x: 0, y: 1 },
              { x: -1, y: 0 },
              { x: 1, y: 0 },
            ];
            for (const d of dirs) {
              const nx = c.x + d.x;
              const ny = c.y + d.y;
              const key = `${nx},${ny}`;
              if (checkedBorder.has(key)) continue;

              const isInside = cells.some((cell) => cell.x === nx && cell.y === ny);
              if (!isInside && nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight) {
                checkedBorder.add(key);
                perimeterCount++;
                const b = this.buildings[ny][nx];
                const feat = this.naturalFeatures[ny][nx];
                if (b?.type === 'wall_stone') stoneWalls++;
                else if (b?.type === 'wall_wood') woodWalls++;
                else if (b?.type === 'door_wood') doors++;
                else if (feat?.type === 'rock') rockWalls++;
                else woodWalls++;
              }
            }
          }

          const totalBorder = Math.max(1, perimeterCount);
          // Wall insulation ratings: Stone walls (0.90), natural rock (0.95), wood walls (0.70), doors (0.55)
          const insulationVal = Math.min(
            0.98,
            Math.max(
              0.35,
              (stoneWalls * 0.90 + woodWalls * 0.70 + doors * 0.55 + rockWalls * 0.95) / totalBorder
            )
          );

          // Find existing room temperature if room previously existed
          const existingRoom = this.rooms.find((r) =>
            r.cells.some((rc) => cells.some((nc) => nc.x === rc.x && nc.y === rc.y))
          );
          let currentTemp = existingRoom ? existingRoom.temperature : this.outdoorTemperature;

          // Distribute heat from heaters and cooling from coolers across the enclosed room
          const roomArea = Math.max(4, cells.length);
          // Thermal exchange with ambient outdoor heat mediated by room insulation
          const thermalConductance = (1.0 - insulationVal) * 0.16;
          const outdoorExchange = (this.outdoorTemperature - currentTemp) * thermalConductance;

          let activeThermalDelta = 0;

          // Heaters distribute heat to warm the room towards comfortable 21°C
          if (heatersCount > 0 && currentTemp < 21) {
            const heatPower = Math.min(5.0, (21 - currentTemp) * 0.5) * (heatersCount * 8.5 / roomArea);
            activeThermalDelta += heatPower;
          }

          // Check if room is designated as a food freezer stockpile (-5°C) or living space (18°C)
          const hasFoodStockpile = this.zones.some(
            (z) => z.type === 'stockpile' && z.cells.some((c) => cells.some((rc) => rc.x === c.x && rc.y === c.y))
          );
          const coolerTarget = hasFoodStockpile ? -5 : 18;

          // Coolers extract heat and distribute cooling to lower room temperature
          if (coolersCount > 0 && currentTemp > coolerTarget) {
            const coolingPower = Math.min(6.0, (currentTemp - coolerTarget) * 0.5) * (coolersCount * 10.5 / roomArea);
            activeThermalDelta -= coolingPower;
          }

          // Radiant heat from campfires and torches
          activeThermalDelta += (campfires * 2.8) / roomArea;
          activeThermalDelta += (torches * 0.9) / roomArea;

          currentTemp += outdoorExchange + activeThermalDelta;
          currentTemp = Math.round(currentTemp * 10) / 10;

          let rType: Room['type'] = 'Outdoors';
          let rName = '封閉房間';
          if (currentTemp <= 0) {
            rType = 'Freezer';
            rName = '低溫冷凍庫 (Freezer)';
          } else if (hasBed === 1) {
            rType = 'Bedroom';
            rName = '殖民者臥室';
          } else if (hasBed > 1) {
            rType = 'Barracks';
            rName = '多人營房';
          } else if (hasTable) {
            rType = 'Dining Room';
            rName = '殖民地餐廳';
          } else if (hasWork) {
            rType = 'Workshop';
            rName = '生產工坊';
          }

          const roomObj: Room = {
            id: existingRoom ? existingRoom.id : `room_${newRooms.length + 1}`,
            name: rName,
            type: rType,
            cells,
            isEnclosed: true,
            beauty: 12 + cells.length,
            cleanliness: 0.8,
            temperature: currentTemp,
            insulation: Math.round(insulationVal * 100) / 100,
            heatersCount,
            coolersCount,
            targetTemp: coolerTarget,
          };

          newRooms.push(roomObj);

          // Populate the temperature grid for all cells in this enclosed room
          for (const c of cells) {
            this.temperature[c.y][c.x] = currentTemp;
            this.temperatureGrid[c.y][c.x] = currentTemp;
          }
        }
      }
    }

    this.rooms = newRooms;
    return this.rooms;
  }

  public detectRooms(): Room[] {
    return this.calculateRoomTemperatures();
  }

  public updateTemperature(): void {
    this.calculateRoomTemperatures();
  }

  // ==================== 9. USER COMMANDS & DESIGNATION ====================
  public setDesignation(x: number, y: number, type: DesignationType | null) {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;

    if (type === null) {
      // Cancel designation & cancel blueprint if exists
      this.designations[y][x] = null;
      for (const [id, bp] of this.blueprints.entries()) {
        if (bp.x === x && bp.y === y) {
          this.blueprints.delete(id);
        }
      }
      return;
    }

    if (type === 'MINE') {
      const feat = this.naturalFeatures[y][x];
      if (feat && feat.type === 'rock') {
        this.designations[y][x] = 'MINE';
        sounds.playClick();
      }
    } else if (type === 'CHOP') {
      const feat = this.naturalFeatures[y][x];
      if (feat && feat.type === 'tree') {
        this.designations[y][x] = 'CHOP';
        sounds.playClick();
      }
    } else if (type === 'HARVEST') {
      const feat = this.naturalFeatures[y][x];
      if (feat && feat.type === 'berry_bush') {
        this.designations[y][x] = 'HARVEST';
        sounds.playClick();
      }
    } else if (type === 'DECONSTRUCT') {
      if (this.buildings[y][x]) {
        // Instant deconstruct or schedule
        const b = this.buildings[y][x]!;
        if (b.material === 'wood') this.dropItem('wood', 3, x, y);
        if (b.material === 'steel') this.dropItem('steel', 5, x, y);
        this.buildings[y][x] = null;
        sounds.playHammer();
        this.detectRooms();
      }
    }
  }

  public placeBlueprint(buildingType: BuildingType, x: number, y: number) {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;
    if (this.buildings[y][x]) return; // Occupied
    if (this.naturalFeatures[y][x]?.type === 'rock') return; // Rock blocking

    // Check if blueprint already here
    for (const bp of this.blueprints.values()) {
      if (bp.x === x && bp.y === y) return;
    }

    const def = BUILDING_DEFS[buildingType];
    const id = `bp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    this.blueprints.set(id, {
      id,
      buildingType,
      x,
      y,
      cost: { ...def.cost },
      delivered: {},
      workProgress: 0,
      maxWork: def.workRequired,
    });
    sounds.playClick();
  }

  public createZone(type: ZoneType, cells: { x: number; y: number }[], cropType?: CropType) {
    if (cells.length === 0) return;
    const id = `zone_${Date.now()}`;
    const name = type === 'stockpile' ? `儲存區 ${this.zones.length + 1}` : `農田種植區 ${this.zones.length + 1}`;
    const color = type === 'stockpile' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(74, 222, 128, 0.25)';

    this.zones.push({
      id,
      name,
      type,
      color,
      cells,
      allowedItems: type === 'stockpile' ? ['wood', 'steel', 'stone_blocks', 'meal_simple', 'berries', 'medicine', 'silver', 'components'] : undefined,
      cropType: type === 'growing' ? (cropType || 'potato') : undefined,
    });
    sounds.playClick();
  }

  public removeZoneAt(x: number, y: number) {
    this.zones = this.zones.filter((z) => {
      z.cells = z.cells.filter((c) => !(c.x === x && c.y === y));
      return z.cells.length > 0;
    });
    sounds.playClick();
  }

  public toggleDraftPawn(pawnId: string) {
    const pawn = this.pawns.find((p) => p.id === pawnId);
    if (!pawn) return;
    pawn.isDrafted = !pawn.isDrafted;
    pawn.state = pawn.isDrafted ? 'DRAFTED' : 'IDLE';
    pawn.currentJob = null;
    pawn.path = [];
    sounds.playDraft();
  }

  public issueDraftMove(pawnId: string, targetX: number, targetY: number) {
    const pawn = this.pawns.find((p) => p.id === pawnId);
    if (!pawn || !pawn.isDrafted) return;

    const path = this.findPathTo(pawn.x, pawn.y, targetX, targetY, false);
    if (path) {
      pawn.path = path;
      pawn.draftTarget = { x: targetX, y: targetY };
      sounds.playClick();
    }
  }

  // ==================== 10. HELPER FUNCTIONS ====================
  public isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return false;
    // Rock obstacles
    if (this.naturalFeatures[y][x]?.type === 'rock') return false;
    // Solid building (walls)
    const b = this.buildings[y][x];
    if (b && BUILDING_DEFS[b.type].isSolid) return false;
    return true;
  }

  private isWall(x: number, y: number): boolean {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return false;
    const b = this.buildings[y][x];
    return (b && BUILDING_DEFS[b.type].isSolid) || this.naturalFeatures[y][x]?.type === 'rock';
  }

  public findPathTo(startX: number, startY: number, targetX: number, targetY: number, allowAdjacent = false) {
    return findPath(startX, startY, targetX, targetY, (x, y) => this.isWalkable(x, y), this.mapWidth, this.mapHeight, allowAdjacent);
  }

  public dropItem(type: ItemType, count: number, x: number, y: number) {
    // Check if item already exists at cell
    const existing = this.items.find((i) => i.x === x && i.y === y && i.type === type);
    if (existing) {
      existing.count += count;
    } else {
      this.items.push({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        count,
        x,
        y,
      });
    }
  }

  private findNearestItem(x: number, y: number, filter: (item: GroundItem) => boolean): GroundItem | null {
    let best: GroundItem | null = null;
    let minDist = Infinity;
    for (const item of this.items) {
      if (filter(item)) {
        const d = Math.hypot(x - item.x, y - item.y);
        if (d < minDist) {
          minDist = d;
          best = item;
        }
      }
    }
    return best;
  }

  private findNearestBuilding(x: number, y: number, filter: (b: Building) => boolean): Building | null {
    let best: Building | null = null;
    let minDist = Infinity;
    for (let by = 0; by < this.mapHeight; by++) {
      for (let bx = 0; bx < this.mapWidth; bx++) {
        const b = this.buildings[by][bx];
        if (b && filter(b)) {
          const d = Math.hypot(x - bx, y - by);
          if (d < minDist) {
            minDist = d;
            best = b;
          }
        }
      }
    }
    return best;
  }

  private findAdjacentBuilding(x: number, y: number, filter: (b: Building) => boolean): Building | null {
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    for (const d of dirs) {
      const nx = x + d.x;
      const ny = y + d.y;
      if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight) {
        const b = this.buildings[ny][nx];
        if (b && filter(b)) return b;
      }
    }
    return null;
  }

  private findNearestDesignatedTile(x: number, y: number, type: DesignationType): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let minDist = Infinity;
    for (let ty = 0; ty < this.mapHeight; ty++) {
      for (let tx = 0; tx < this.mapWidth; tx++) {
        if (this.designations[ty][tx] === type) {
          const d = Math.hypot(x - tx, y - ty);
          if (d < minDist) {
            minDist = d;
            best = { x: tx, y: ty };
          }
        }
      }
    }
    return best;
  }

  private findEmptyStockpileCell(itemType: ItemType): { x: number; y: number } | null {
    for (const zone of this.zones) {
      if (zone.type !== 'stockpile') continue;
      if (zone.allowedItems && !zone.allowedItems.includes(itemType)) continue;

      for (const cell of zone.cells) {
        const existing = this.items.find((i) => i.x === cell.x && i.y === cell.y);
        if (!existing || (existing.type === itemType && existing.count < 75)) {
          return cell;
        }
      }
    }
    return null;
  }

  private getBlueprintMissingMaterial(bp: Blueprint): { type: ItemType; count: number } | null {
    const cost = bp.cost;
    for (const key of ['wood', 'stone_blocks', 'steel'] as const) {
      const required = cost[key] || 0;
      const current = bp.delivered[key] || 0;
      if (current < required) {
        return { type: key as ItemType, count: required - current };
      }
    }
    return null;
  }

  public addLetter(letterData: Omit<Letter, 'id' | 'read' | 'dateStr'>) {
    const letter: Letter = {
      id: `letter_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      read: false,
      dateStr: `第 ${this.dayCount} 天 ${Math.floor(this.gameHour)}:00`,
      ...letterData,
    };
    this.letters.unshift(letter);
    if (this.letters.length > 20) {
      this.letters.pop();
    }
    this.notify();
  }

  public getTotalResource(type: ItemType): number {
    return this.items.filter((i) => i.type === type).reduce((sum, item) => sum + item.count, 0);
  }
}
