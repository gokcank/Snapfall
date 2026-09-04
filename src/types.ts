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
    primary: '#ef4444',
    light: '#fca5a5',
    dark: '#991b1b',
    glow: 'rgba(239, 68, 68, 0.4)'
  },
  [BubbleColor.BLUE]: {
    primary: '#3b82f6',
    light: '#93c5fd',
    dark: '#1e40af',
    glow: 'rgba(59, 130, 246, 0.4)'
  },
  [BubbleColor.GREEN]: {
    primary: '#10b981',
    light: '#6ee7b7',
    dark: '#065f46',
    glow: 'rgba(16, 185, 129, 0.4)'
  },
  [BubbleColor.YELLOW]: {
    primary: '#f59e0b',
    light: '#fde68a',
    dark: '#b45309',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  [BubbleColor.PURPLE]: {
    primary: '#a855f7',
    light: '#d8b4fe',
    dark: '#6b21a8',
    glow: 'rgba(168, 85, 247, 0.4)'
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

export type GameState = 'playing' | 'gameover' | 'victory';

export interface GameStats {
  score: number;
  highScore: number;
  level: number;
  foulsLeft: number;
  maxFouls: number;
  bubblesPopped: number;
}
