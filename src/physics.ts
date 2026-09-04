import { HexGrid } from './grid';
import { Bubble, GridCoord, GridMatrix, Projectile, Vector2D } from './types';

export interface PhysicsStepResult {
  projectileActive: boolean;
  snappedCell: GridCoord | null;
  snappedBubble: Bubble | null;
  wallBounced: boolean;
}

export class PhysicsEngine {
  private grid: HexGrid;
  private projectile: Projectile | null = null;
  private bubbleIdCounter: number = 1000;

  constructor(grid: HexGrid) {
    this.grid = grid;
  }

  get currentProjectile(): Projectile | null {
    return this.projectile;
  }

  launch(origin: Vector2D, angleRad: number, speed: number, color: import('./types').BubbleColor) {
    const vx = Math.cos(angleRad) * speed;
    const vy = -Math.sin(angleRad) * speed;

    this.projectile = {
      x: origin.x,
      y: origin.y,
      vx,
      vy,
      radius: this.grid.radius,
      color
    };
  }

  update(dt: number, matrix: GridMatrix): PhysicsStepResult {
    if (!this.projectile) {
      return { projectileActive: false, snappedCell: null, snappedBubble: null, wallBounced: false };
    }

    const p = this.projectile;
    const r = this.grid.radius;
    let wallBounced = false;

    // Movement substeps to prevent tunneling at high speeds (e.g., speed = 1200 px/s)
    const substeps = 4;
    const subDt = dt / substeps;

    for (let step = 0; step < substeps; step++) {
      p.x += p.vx * subDt;
      p.y += p.vy * subDt;

      // 1. Wall Collisions
      if (p.x <= r) {
        p.x = r;
        p.vx = Math.abs(p.vx);
        wallBounced = true;
      } else if (p.x >= this.grid.width - r) {
        p.x = this.grid.width - r;
        p.vx = -Math.abs(p.vx);
        wallBounced = true;
      }

      // 2. Ceiling Collision
      if (p.y <= r) {
        p.y = r;
        const snap = this.grid.findClosestEmptyCell({ x: p.x, y: p.y }, matrix, false);
        if (snap) {
          const bubble: Bubble = {
            id: `bubble-${this.bubbleIdCounter++}`,
            color: p.color,
            row: snap.row,
            col: snap.col,
            state: 'idle'
          };
          matrix[snap.row][snap.col] = bubble;
          this.projectile = null;
          return { projectileActive: false, snappedCell: snap, snappedBubble: bubble, wallBounced };
        }
      }

      // 3. Grid Bubble Collision
      const collisionDist = r * 2 - 2;
      const collDistSq = collisionDist * collisionDist;

      for (let row = 0; row < this.grid.maxRows; row++) {
        const cols = this.grid.getColsInRow(row);
        for (let col = 0; col < cols; col++) {
          const bubble = matrix[row][col];
          if (!bubble) continue;

          const center = this.grid.gridToWorld(row, col);
          const dx = p.x - center.x;
          const dy = p.y - center.y;
          const distSq = dx * dx + dy * dy;

          if (distSq <= collDistSq) {
            // Collision detected! Snap into nearest empty cell
            const snap = this.grid.findClosestEmptyCell({ x: p.x, y: p.y }, matrix, true);
            if (snap) {
              const newBubble: Bubble = {
                id: `bubble-${this.bubbleIdCounter++}`,
                color: p.color,
                row: snap.row,
                col: snap.col,
                state: 'idle'
              };
              matrix[snap.row][snap.col] = newBubble;
              this.projectile = null;
              return { projectileActive: false, snappedCell: snap, snappedBubble: newBubble, wallBounced };
            }
          }
        }
      }
    }

    return { projectileActive: true, snappedCell: null, snappedBubble: null, wallBounced };
  }
}
