export interface GridCoord {
  row: number;
  col: number;
}

export interface Vector2D {
  x: number;
  y: number;
}

export enum BubbleColor {
  RED = 'RED',
  BLUE = 'BLUE',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  PURPLE = 'PURPLE'
}

export interface ColorVisual {
  primary: string;
  light: string;
  dark: string;
  glow: string;
}

export const COLOR_PALETTE: Record<BubbleColor, ColorVisual> = {
  [BubbleColor.RED]: {
    primary: '#ff3355',
    light: '#ffa3b5',
    dark: '#b31034',
    glow: 'rgba(255, 51, 85, 0.4)'
  },
  [BubbleColor.BLUE]: {
    primary: '#2979ff',
    light: '#82b1ff',
    dark: '#0d47a1',
    glow: 'rgba(41, 121, 255, 0.4)'
  },
  [BubbleColor.GREEN]: {
    primary: '#00e676',
    light: '#b9f6ca',
    dark: '#00893e',
    glow: 'rgba(0, 230, 118, 0.4)'
  },
  [BubbleColor.YELLOW]: {
    primary: '#ffd600',
    light: '#fff59d',
    dark: '#f57f17',
    glow: 'rgba(255, 214, 0, 0.4)'
  },
  [BubbleColor.PURPLE]: {
    primary: '#aa00ff',
    light: '#ea80fc',
    dark: '#6200ea',
    glow: 'rgba(170, 0, 255, 0.4)'
  }
};

export interface Bubble {
  id: string;
  color: BubbleColor;
  row: number;
  col: number;
  state?: 'idle' | 'popping' | 'falling';
  scale?: number;
  alpha?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export type GridMatrix = (Bubble | null)[][];

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: BubbleColor;
}

export interface TrajectorySegment {
  start: Vector2D;
  end: Vector2D;
}

export interface TrajectoryResult {
  segments: TrajectorySegment[];
  hitType: 'ceiling' | 'bubble' | 'none';
  targetCell: GridCoord | null;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FallingBubble {
  bubble: Bubble;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
}

export interface ScorePopup {
  text: string;
  x: number;
  y: number;
  vy: number;
  alpha: number;
  life: number;
  color: string;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover' | 'victory';
export type GameMode = 'classic' | 'survival';

export interface GameStats {
  score: number;
  highScore: number;
  level: number;
  foulsLeft: number;
  maxFouls: number;
  bubblesPopped: number;
  mode: GameMode;
}
