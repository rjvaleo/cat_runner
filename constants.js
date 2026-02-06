
import { CellType } from './types.js';

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 15;
export const TICK_RATE = 16; 
export const PLAYER_SPEED = 0.12; 
export const ENEMY_SPEED = 0.05;  
export const DIG_DURATION = 250;
export const PUDDLE_DURATION = 400; 
export const PUDDLE_SLOW_FACTOR = 0.4;

export const GRAVITY = 0.008;
export const JUMP_FORCE = -0.15; 
export const TERMINAL_VELOCITY = 0.25;

export const AUDIO_URLS = {
  WALK: 'https://assets.mixkit.co/active_storage/sfx/1118/1118-preview.mp3', 
  BARK: 'https://assets.mixkit.co/active_storage/sfx/25/25-preview.mp3',
  GOLD: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  GAME_OVER: 'https://assets.mixkit.co/active_storage/sfx/238/238-preview.mp3',
  JUMP: 'https://assets.mixkit.co/active_storage/sfx/2111/2111-preview.mp3'
};

const MANUAL_LEVELS = [
  {
    name: "Classic Start",
    description: "The original trial. Collect all fish to reveal the ladder to freedom.",
    playerStart: { x: 1, y: 13 },
    enemies: [{ x: 18, y: 13 }],
    grid: [
      [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],[2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],[2,4,0,0,0,3,0,0,0,0,0,0,0,0,0,3,0,0,4,2],[2,1,1,1,1,3,1,1,1,1,1,1,1,1,1,3,1,1,1,2],[2,0,0,0,0,3,0,0,0,0,0,0,0,0,0,3,0,0,0,2],[2,0,0,0,0,3,0,0,0,0,0,0,0,0,0,3,0,0,0,2],[2,4,0,1,1,1,1,1,3,1,1,3,1,1,1,1,1,0,4,2],[2,1,1,0,0,0,0,0,3,0,0,3,0,0,0,0,0,1,1,2],[2,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,0,2],[2,1,1,1,1,1,1,3,1,1,1,1,3,1,1,1,1,1,1,2],[2,0,0,0,0,0,0,3,0,0,0,0,3,0,0,0,0,0,0,2],[2,0,4,0,0,0,0,3,0,0,0,0,3,0,0,0,0,4,0,2],[2,1,1,1,1,1,1,1,1,3,3,1,1,1,1,1,1,1,1,2],[2,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,2],[2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    ]
  },
  {
    name: "Ladders of Lore",
    description: "Don't get trapped in the depths! Use your claws if you must.",
    playerStart: { x: 2, y: 2 },
    enemies: [{ x: 17, y: 13 }, { x: 10, y: 7 }],
    grid: [
      [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],[2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],[2,0,0,4,0,3,0,0,0,0,4,0,0,0,3,0,0,4,0,2],[2,1,1,1,1,3,1,1,1,1,1,1,1,1,3,1,1,1,1,2],[2,0,0,0,0,3,0,0,0,0,0,0,0,0,3,0,0,0,0,2],[2,0,4,0,0,3,0,0,4,4,4,0,0,0,3,0,0,4,0,2],[2,1,1,1,1,3,1,1,1,1,1,1,1,1,3,1,1,1,1,2],[2,0,0,0,0,3,0,0,0,3,0,0,0,0,3,0,0,0,0,2],[2,0,4,0,0,0,0,0,0,3,0,0,0,0,0,0,0,4,0,2],[2,1,1,1,1,1,1,3,1,1,1,1,3,1,1,1,1,1,1,2],[2,0,0,0,0,0,0,3,0,0,0,0,3,0,0,0,0,0,0,2],[2,0,0,4,0,0,0,3,0,0,0,0,3,0,0,0,4,0,0,2],[2,1,1,1,1,1,1,1,1,3,3,1,1,1,1,1,1,1,1,2],[2,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,2],[2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
    ]
  }
];

const generateProceduralLevel = (index) => {
  const grid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(CellType.EMPTY));
  for (let x = 0; x < GRID_WIDTH; x++) { grid[0][x] = CellType.SOLID; grid[GRID_HEIGHT - 1][x] = CellType.SOLID; }
  for (let y = 0; y < GRID_HEIGHT; y++) { grid[y][0] = CellType.SOLID; grid[y][GRID_WIDTH - 1] = CellType.SOLID; }
  const seed = (index + 1) * 777.77;
  const floorSpacing = 3;
  for (let y = floorSpacing; y < GRID_HEIGHT - 1; y += floorSpacing) {
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      const chance = Math.abs(Math.sin(seed + y * 2.1 + x * 0.9));
      if (chance > 0.35) grid[y][x] = CellType.BRICK;
    }
  }
  for (let x = 2; x < GRID_WIDTH - 2; x += 4) {
    const ladderX = x + Math.floor(Math.abs(Math.sin(seed * x)) * 2);
    if (ladderX < GRID_WIDTH - 1) {
      for (let y = 1; y < GRID_HEIGHT - 1; y++) { grid[y][ladderX] = CellType.LADDER; }
    }
  }
  const enemies = [];
  const goldCount = 10 + (index % 5);
  let placedGold = 0;
  for (let i = 0; i < 100 && placedGold < goldCount; i++) {
    const rx = 1 + Math.floor(Math.abs(Math.sin(seed * (i + 1))) * (GRID_WIDTH - 2));
    const ry = 1 + Math.floor(Math.abs(Math.cos(seed * (i + 1))) * (GRID_HEIGHT - 2));
    if (grid[ry][rx] === CellType.EMPTY) { grid[ry][rx] = CellType.GOLD; placedGold++; }
  }
  const enemyCount = 1 + Math.floor(index / 15);
  for (let i = 0; i < enemyCount; i++) {
    const ex = GRID_WIDTH - 2 - (i * 2);
    const ey = GRID_HEIGHT - 2;
    if (grid[ey][ex] !== CellType.EMPTY) grid[ey][ex] = CellType.EMPTY;
    enemies.push({ x: ex, y: ey });
  }
  return {
    name: `Purr-ilous Level ${index + 1}`,
    description: `A unique procedurally generated challenge for level ${index + 1}. Find all fish!`,
    playerStart: { x: 1, y: GRID_HEIGHT - 2 },
    enemies,
    grid
  };
};

export const DEFAULT_LEVELS = [
  ...MANUAL_LEVELS,
  ...Array.from({ length: 100 - MANUAL_LEVELS.length }, (_, i) => generateProceduralLevel(i + MANUAL_LEVELS.length))
];
