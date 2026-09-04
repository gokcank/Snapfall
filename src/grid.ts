import { GridCoord, Vector2D, GridMatrix, Bubble } from './types';

export class HexGrid {
  readonly radius: number;
  readonly colsEven: number;
  readonly colsOdd: number;
  readonly maxRows: number;
  readonly rowHeight: number;
  readonly width: number;

  constructor(radius: number = 24, colsEven: number = 10, maxRows: number = 18) {
    this.radius = radius;
    this.colsEven = colsEven;
    this.colsOdd = colsEven - 1;
    this.maxRows = maxRows;
    this.rowHeight = Math.sqrt(3) * radius;
    this.width = colsEven * radius * 2;
  }

  getColsInRow(row: number): number {
    return row % 2 === 0 ? this.colsEven : this.colsOdd;
  }

  isValidCoord(row: number, col: number): boolean {
    if (row < 0 || row >= this.maxRows) return false;
    const maxCols = this.getColsInRow(row);
    return col >= 0 && col < maxCols;
  }

  gridToWorld(row: number, col: number): Vector2D {
    const isOdd = row % 2 === 1;
    const xOffset = isOdd ? this.radius * 2 : this.radius;
    const x = xOffset + col * (this.radius * 2);
    const y = this.radius + row * this.rowHeight;
    return { x, y };
  }

  worldToGrid(x: number, y: number): GridCoord {
    const approxRow = Math.max(0, Math.min(this.maxRows - 1, Math.round((y - this.radius) / this.rowHeight)));
    const isOdd = approxRow % 2 === 1;
    const xOffset = isOdd ? this.radius * 2 : this.radius;
    const maxCols = this.getColsInRow(approxRow);
    const approxCol = Math.max(0, Math.min(maxCols - 1, Math.round((x - xOffset) / (this.radius * 2))));
    return { row: approxRow, col: approxCol };
  }

  getNeighbors(row: number, col: number): GridCoord[] {
    const isOdd = row % 2 === 1;
    const offsets = isOdd
      ? [
          { r: 0, c: -1 }, // Sol
          { r: 0, c: 1 },  // Sağ
          { r: -1, c: 0 }, // Üst-Sol
          { r: -1, c: 1 }, // Üst-Sağ
          { r: 1, c: 0 },  // Alt-Sol
          { r: 1, c: 1 }   // Alt-Sağ
        ]
      : [
          { r: 0, c: -1 }, // Sol
          { r: 0, c: 1 },  // Sağ
          { r: -1, c: -1 }, // Üst-Sol
          { r: -1, c: 0 },  // Üst-Sağ
          { r: 1, c: -1 },  // Alt-Sol
          { r: 1, c: 0 }    // Alt-Sağ
        ];

    const result: GridCoord[] = [];
    for (const offset of offsets) {
      const nr = row + offset.r;
      const nc = col + offset.c;
      if (this.isValidCoord(nr, nc)) {
        result.push({ row: nr, col: nc });
      }
    }
    return result;
  }

  createEmptyMatrix(): GridMatrix {
    const matrix: GridMatrix = [];
    for (let r = 0; r < this.maxRows; r++) {
      const cols = this.getColsInRow(r);
      matrix.push(new Array<Bubble | null>(cols).fill(null));
    }
    return matrix;
  }

  findClosestEmptyCell(
    worldPos: Vector2D,
    matrix: GridMatrix,
    requireAnchor: boolean = true
  ): GridCoord | null {
    const approxRow = Math.max(0, Math.min(this.maxRows - 1, Math.round((worldPos.y - this.radius) / this.rowHeight)));
    let bestCoord: GridCoord | null = null;
    let minDistanceSq = Infinity;

    const rowStart = Math.max(0, approxRow - 2);
    const rowEnd = Math.min(this.maxRows - 1, approxRow + 2);

    for (let r = rowStart; r <= rowEnd; r++) {
      const cols = this.getColsInRow(r);
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] !== null) continue;

        if (requireAnchor && r > 0) {
          const neighbors = this.getNeighbors(r, c);
          const hasNeighbor = neighbors.some((n) => matrix[n.row][n.col] !== null);
          if (!hasNeighbor) continue;
        }

        const center = this.gridToWorld(r, c);
        const dx = worldPos.x - center.x;
        const dy = worldPos.y - center.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          bestCoord = { row: r, col: c };
        }
      }
    }

    return bestCoord;
  }
}
