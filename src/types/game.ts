export type TileTerrain = 'soil' | 'rich_soil' | 'rocky_floor' | 'wood_floor' | 'stone_tile' | 'sand';

export type MineralType = 'slate' | 'granite' | 'steel_vein' | 'silver_vein' | 'gold_vein';

export type BuildingType = 
  | 'wall_wood' 
  | 'wall_stone' 
  | 'door_wood' 
  | 'bed' 
  | 'table_wood' 
  | 'stool_wood' 
  | 'campfire' 
  | 'stove' 
  | 'research_bench' 
  | 'horseshoe_pin' 
  | 'torch_lamp'
  | 'heater'
  | 'cooler';

export type ItemType = 
  | 'wood' 
  | 'steel' 
  | 'stone_blocks' 
  | 'meal_simple' 
  | 'berries' 
  | 'medicine' 
  | 'silver' 
  | 'components';

export type DesignationType = 
  | 'MINE' 
  | 'CHOP' 
  | 'HARVEST' 
  | 'HAUL' 
  | 'DECONSTRUCT' 
  | 'BUILD';

export type ZoneType = 'stockpile' | 'growing';

export type CropType = 'potato' | 'healroot' | 'corn';

export interface GroundItem {
  id: string;
  type: ItemType;
  count: number;
  x: number;
  y: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  material: 'wood' | 'stone' | 'steel';
  isOpen?: boolean; // For doors
  isLit?: boolean; // For torches/campfires
}

export interface Blueprint {
  id: string;
  buildingType: BuildingType;
  x: number;
  y: number;
  cost: {
    wood?: number;
    stone_blocks?: number;
    steel?: number;
  };
  delivered: {
    wood?: number;
    stone_blocks?: number;
    steel?: number;
  };
  workProgress: number;
  maxWork: number;
}

export interface NaturalFeature {
  type: 'rock' | 'tree' | 'berry_bush';
  mineral?: MineralType;
  hp: number;
  maxHp: number;
  growth?: number; // 0-100 for trees / bushes
  isRipe?: boolean;
}

export interface Zone {
  id: string;
  type: ZoneType;
  name: string;
  cells: { x: number; y: number }[];
  color: string;
  // Stockpile settings
  allowedItems?: ItemType[];
  // Growing settings
  cropType?: CropType;
}

export interface Room {
  id: string;
  name: string;
  type: 'Bedroom' | 'Dining Room' | 'Barracks' | 'Workshop' | 'Outdoors' | 'Storehouse' | 'Freezer';
  cells: { x: number; y: number }[];
  isEnclosed: boolean;
  beauty: number;
  cleanliness: number;
  temperature: number; // in °C
  insulation: number; // 0.0 to 1.0 (based on wall materials and thickness)
  heatersCount: number;
  coolersCount: number;
  targetTemp?: number;
}

export type SkillName = 
  | 'mining' 
  | 'construction' 
  | 'plants' 
  | 'cooking' 
  | 'crafting' 
  | 'intellectual' 
  | 'medical';

export type WorkTypeName = 
  | 'firefight' 
  | 'patient' 
  | 'doctor' 
  | 'bedRest' 
  | 'cook' 
  | 'construct' 
  | 'grow' 
  | 'plantCut' 
  | 'mine' 
  | 'craft' 
  | 'haul' 
  | 'clean' 
  | 'research';

export interface Thought {
  id: string;
  label: string;
  moodDelta: number;
  durationTicks: number; // remaining ticks
}

export type JobType = 
  | 'IDLE' 
  | 'WANDER' 
  | 'MOVE_TO' 
  | 'MINE' 
  | 'CHOP' 
  | 'HARVEST' 
  | 'PLANT' 
  | 'HAUL_PICK' 
  | 'HAUL_DROP' 
  | 'CONSTRUCT_DELIVER' 
  | 'CONSTRUCT_BUILD' 
  | 'DECONSTRUCT' 
  | 'COOK' 
  | 'RESEARCH' 
  | 'EAT' 
  | 'SLEEP' 
  | 'RELAX' 
  | 'ATTACK';

export interface PawnJob {
  type: JobType;
  targetX: number;
  targetY: number;
  progress: number;
  maxProgress: number;
  description: string;
  targetItemId?: string;
  carriedItem?: { type: ItemType; count: number };
  blueprintId?: string;
  targetEntityId?: string;
}

export class Pawn {
  public id: string = '';
  public name: string = '';
  public nickname: string = '';
  public gender: 'male' | 'female' = 'male';
  public age: number = 28;
  public color: string = '#38bdf8';
  public backstory: string = '';
  public traits: string[] = [];
  public x: number = 0;
  public y: number = 0;
  public realX: number = 0;
  public realY: number = 0;
  
  // Needs (0 - 100)
  public food: number = 85;
  public hunger: number = 85; // Hunger satisfaction (0 = starving, 100 = full)
  public rest: number = 85;
  public recreation: number = 80;
  public comfort: number = 75;
  public mood: number = 75; // Mood property (0 - 100)
  public workSpeed: number = 1.0; // Work speed multiplier based on mood (0.0 to 1.25)
  public workEfficiency: number = 1.0; // Alias for workSpeed
  public thoughts: Thought[] = [];
  
  // Skills (0 - 20)
  public skills: Record<SkillName, { level: number; passion: 0 | 1 | 2 }> = {
    mining: { level: 4, passion: 0 },
    construction: { level: 4, passion: 0 },
    plants: { level: 4, passion: 0 },
    cooking: { level: 4, passion: 0 },
    crafting: { level: 4, passion: 0 },
    intellectual: { level: 4, passion: 0 },
    medical: { level: 4, passion: 0 },
  };
  
  // Work Priorities (0 = disabled, 1 = highest, 4 = lowest)
  public workPriorities: Record<WorkTypeName, number> = {
    firefight: 1,
    patient: 1,
    doctor: 3,
    bedRest: 1,
    cook: 3,
    construct: 2,
    mine: 2,
    plantCut: 3,
    grow: 3,
    craft: 3,
    haul: 2,
    clean: 4,
    research: 4,
  };
  
  // Health
  public hp: number = 100;
  public maxHp: number = 100;
  public isDrafted: boolean = false;
  public draftTarget: { x: number; y: number } | null = null;
  public mentalBreak: null | 'dazed' | 'binge' | 'sad_wander' | 'tantrum' = null;
  
  // State
  public state: 'IDLE' | 'MOVING' | 'WORKING' | 'SLEEPING' | 'DRAFTED' = 'IDLE';
  public path: { x: number; y: number }[] = [];
  public currentJob: PawnJob | null = null;
  public assignedBedId?: string;

  constructor(init?: Partial<Pawn>) {
    if (init) {
      Object.assign(this, init);
      if (init.hunger !== undefined && init.food === undefined) {
        this.food = init.hunger;
      } else if (init.food !== undefined && init.hunger === undefined) {
        this.hunger = init.food;
      }
      if (init.workSpeed !== undefined && init.workEfficiency === undefined) {
        this.workEfficiency = init.workSpeed;
      } else if (init.workEfficiency !== undefined && init.workSpeed === undefined) {
        this.workSpeed = init.workEfficiency;
      }
    }
  }

  /**
   * Updates mood property (0-100) based on needs like hunger, comfort, and recreation.
   */
  public updateMood(cellTemp: number = 21): void {
    let base = 50;
    const hungerVal = this.hunger !== undefined ? this.hunger : this.food;

    // 1. Hunger Need (0 - 100)
    if (hungerVal < 15) {
      base -= 25; // Starving
    } else if (hungerVal < 35) {
      base -= 10; // Hungry
    } else if (hungerVal > 85) {
      base += 6; // Satiated
    }

    // 2. Comfort Need (0 - 100)
    if (this.comfort > 80) {
      base += 8; // Luxurious comfort
    } else if (this.comfort > 60) {
      base += 4; // Comfortable
    } else if (this.comfort < 20) {
      base -= 6; // Uncomfortable
    } else if (this.comfort < 10) {
      base -= 12; // Sore / acute discomfort
    }

    // 3. Recreation Need (0 - 100)
    if (this.recreation < 15) {
      base -= 16; // Recreation starved
    } else if (this.recreation > 80) {
      base += 8; // Entertained
    }

    // 4. Rest Need (0 - 100)
    if (this.rest < 15) {
      base -= 20; // Exhausted
    } else if (this.rest < 30) {
      base -= 8;
    }

    // 5. Environmental Temperature
    if (cellTemp < -5) {
      base -= 15;
    } else if (cellTemp < 5) {
      base -= 6;
    } else if (cellTemp > 38) {
      base -= 16;
    } else if (cellTemp > 30) {
      base -= 6;
    } else if (cellTemp >= 18 && cellTemp <= 24) {
      base += 4;
    }

    // 6. Thoughts
    for (const t of this.thoughts) {
      base += t.moodDelta;
    }

    this.mood = Math.max(0, Math.min(100, Math.round(base)));
    this.updateWorkEfficiency();
  }

  /**
   * Updates work speed based on mood and mental break state.
   */
  public updateWorkEfficiency(): void {
    if (this.mentalBreak) {
      this.workSpeed = 0.0;
      this.workEfficiency = 0.0;
    } else if (this.mood >= 80) {
      this.workSpeed = 1.25; // +25% boost
      this.workEfficiency = 1.25;
    } else if (this.mood >= 50) {
      this.workSpeed = 1.0; // Normal
      this.workEfficiency = 1.0;
    } else if (this.mood >= 30) {
      this.workSpeed = 0.8; // -20% penalty
      this.workEfficiency = 0.8;
    } else {
      this.workSpeed = 0.5; // -50% penalty
      this.workEfficiency = 0.5;
    }
  }
}

export interface HostileAnimal {
  id: string;
  name: string;
  type: 'mad_boar' | 'rabid_wolf';
  x: number;
  y: number;
  realX: number;
  realY: number;
  hp: number;
  maxHp: number;
  targetPawnId?: string;
  path: { x: number; y: number }[];
}

export interface Letter {
  id: string;
  title: string;
  type: 'good' | 'bad' | 'neutral' | 'urgent';
  message: string;
  dateStr: string;
  x?: number;
  y?: number;
  read: boolean;
}

export interface ResearchProject {
  id: string;
  name: string;
  description: string;
  cost: number;
  progress: number;
  isCompleted: boolean;
  prerequisites: string[];
  unlocks: string[];
}
