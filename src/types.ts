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
    primary: '#ff0055',
    light: '#ff7aa8',
    dark: '#8a0029',
    glow: 'rgba(255, 0, 85, 0.5)'
  },
  [BubbleColor.BLUE]: {
    primary: '#0077ff',
    light: '#80bfff',
    dark: '#003d8a',
    glow: 'rgba(0, 119, 255, 0.5)'
  },
  [BubbleColor.GREEN]: {
    primary: '#00e676',
    light: '#80ffb7',
    dark: '#00803d',
    glow: 'rgba(0, 230, 118, 0.5)'
  },
  [BubbleColor.YELLOW]: {
    primary: '#ffb700',
    light: '#ffdf80',
    dark: '#996e00',
    glow: 'rgba(255, 183, 0, 0.5)'
  },
  [BubbleColor.PURPLE]: {
    primary: '#c000ff',
    light: '#e580ff',
    dark: '#660088',
    glow: 'rgba(192, 0, 255, 0.5)'
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
