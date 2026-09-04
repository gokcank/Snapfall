import { HexGrid } from './grid';
import { GridCoord, GridMatrix, TrajectoryResult, TrajectorySegment, Vector2D } from './types';

export class TrajectoryCalculator {
  private grid: HexGrid;

  constructor(grid: HexGrid) {
    this.grid = grid;
  }

  calculate(
    origin: Vector2D,
    angleRad: number,
    matrix: GridMatrix,
    maxBounces: number = 2
  ): TrajectoryResult {
    const minAngle = (15 * Math.PI) / 180;
    const maxAngle = (165 * Math.PI) / 180;
    const clampedAngle = Math.max(minAngle, Math.min(maxAngle, angleRad));

    const segments: TrajectorySegment[] = [];
    let currentStart: Vector2D = { x: origin.x, y: origin.y };
    let dx = Math.cos(clampedAngle);
    let dy = -Math.sin(clampedAngle);

    const r = this.grid.radius;
    const leftWall = r;
    const rightWall = this.grid.width - r;
    const ceiling = this.grid.ceilingY + r;

    let hitType: 'ceiling' | 'bubble' | 'none' = 'none';
    let targetCell: GridCoord | null = null;

    for (let bounce = 0; bounce <= maxBounces; bounce++) {
      // 1. Distance to ceiling
      let tCeil = Infinity;
      if (dy < 0) {
        tCeil = (ceiling - currentStart.y) / dy;
      }

      // 2. Distance to side walls
      let tWall = Infinity;
      let wallHitX = 0;
      if (dx < -0.0001) {
        tWall = (leftWall - currentStart.x) / dx;
        wallHitX = leftWall;
      } else if (dx > 0.0001) {
        tWall = (rightWall - currentStart.x) / dx;
        wallHitX = rightWall;
      }

      // 3. Distance to existing bubbles
      let tBubble = Infinity;
      const collisionDistance = r * 2 - 1.5;
      const collDistSq = collisionDistance * collisionDistance;

      for (let row = 0; row < this.grid.maxRows; row++) {
        const cols = this.grid.getColsInRow(row);
        for (let col = 0; col < cols; col++) {
          if (matrix[row][col] === null) continue;

          const center = this.grid.gridToWorld(row, col);
          const deltaX = currentStart.x - center.x;
          const deltaY = currentStart.y - center.y;

          const bQuad = 2 * (deltaX * dx + deltaY * dy);
          const cQuad = deltaX * deltaX + deltaY * deltaY - collDistSq;
          const disc = bQuad * bQuad - 4 * cQuad;

          if (disc >= 0) {
            const tHit = (-bQuad - Math.sqrt(disc)) / 2;
            if (tHit > 2 && tHit < tBubble) {
              tBubble = tHit;
            }
          }
        }
      }

      // 4. Determine nearest obstacle
      if (tBubble < tCeil && tBubble < tWall) {
        const endX = currentStart.x + dx * tBubble;
        const endY = currentStart.y + dy * tBubble;
        segments.push({ start: currentStart, end: { x: endX, y: endY } });
        hitType = 'bubble';
        targetCell = this.grid.findClosestEmptyCell({ x: endX, y: endY }, matrix, true);
        break;
      } else if (tCeil <= tWall && tCeil < Infinity) {
        const endX = currentStart.x + dx * tCeil;
        const endY = ceiling;
        segments.push({ start: currentStart, end: { x: endX, y: endY } });
        hitType = 'ceiling';
        targetCell = this.grid.findClosestEmptyCell({ x: endX, y: endY }, matrix, false);
        break;
      } else if (tWall < Infinity) {
        const hitY = currentStart.y + dy * tWall;
        const endPos = { x: wallHitX, y: hitY };
        segments.push({ start: currentStart, end: endPos });

        currentStart = endPos;
        dx = -dx;
      } else {
        break;
      }
    }

    return { segments, hitType, targetCell };
  }
}
