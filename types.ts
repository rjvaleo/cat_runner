
export enum CellType {
  EMPTY = 0,
  BRICK = 1,     // Diggable
  SOLID = 2,     // Indestructible
  LADDER = 3,
  GOLD = 4,      // Golden Fish
  EXIT = 5       // Visible only when all gold collected
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity extends Position {
  id: string;
  type: 'player' | 'enemy';
  direction: 'left' | 'right';
  isFalling: boolean;
  isClimbing: boolean;
  isJumping?: boolean;
  vY?: number; // Vertical velocity
  jumpCount?: number; // Number of jumps performed since last landing
}

export interface LevelData {
  grid: CellType[][];
  playerStart: Position;
  enemies: Position[];
  name: string;
  description: string;
}

export interface DigState {
  x: number;
  y: number;
  timer: number;
}

export interface PuddleState {
  x: number;
  y: number;
  timer: number;
}

export type GameStatus = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'VICTORY' | 'LOADING';
