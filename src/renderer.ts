import { HexGrid } from './grid';
import { Bubble, COLOR_PALETTE, GridMatrix } from './types';

export class CanvasRenderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly grid: HexGrid;
  readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, grid: HexGrid) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context not available');
    this.ctx = context;
    this.grid = grid;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Modern 3D bubble drawing with radial gradient and highlight shine
  drawBubble(x: number, y: number, bubble: Bubble, alpha: number = 1.0, scale: number = 1.0) {
    const r = this.grid.radius * scale;
    const visual = COLOR_PALETTE[bubble.color];
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Ambient glow
    ctx.beginPath();
    ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = visual.glow;
    ctx.fill();

    // Bubble 3D body gradient
    const grad = ctx.createRadialGradient(
      x - r * 0.35,
      y - r * 0.35,
      r * 0.1,
      x,
      y,
      r
    );
    grad.addColorStop(0, visual.light);
    grad.addColorStop(0.65, visual.primary);
    grad.addColorStop(1, visual.dark);

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner bevel rim
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.stroke();

    // Specular gloss reflection (Top-Left shiny pill)
    ctx.beginPath();
    ctx.ellipse(
      x - r * 0.35,
      y - r * 0.38,
      r * 0.35,
      r * 0.18,
      -Math.PI / 4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fill();

    // Bottom subtle bounce light reflection
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y + r * 0.4, r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();

    ctx.restore();
  }

  // Draw full hexagonal matrix
  drawGrid(matrix: GridMatrix) {
    for (let r = 0; r < this.grid.maxRows; r++) {
      const cols = this.grid.getColsInRow(r);
      for (let c = 0; c < cols; c++) {
        const bubble = matrix[r][c];
        if (bubble) {
          const pos = this.grid.gridToWorld(r, c);
          this.drawBubble(pos.x, pos.y, bubble);
        }
      }
    }
  }

  // Grid outline and slots visualization (for debugging / level preview)
  drawGridGuide(hoverCoord: { row: number; col: number } | null = null) {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 1;

    for (let r = 0; r < this.grid.maxRows; r++) {
      const cols = this.grid.getColsInRow(r);
      for (let c = 0; c < cols; c++) {
        const pos = this.grid.gridToWorld(r, c);
        const isHovered = hoverCoord && hoverCoord.row === r && hoverCoord.col === c;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.grid.radius - 2, 0, Math.PI * 2);
        ctx.strokeStyle = isHovered ? 'rgba(56, 189, 248, 0.9)' : 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        if (isHovered) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // Ceiling line & border
  drawBoundaries() {
    const ctx = this.ctx;
    ctx.save();

    // Top ceiling bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(0, 0, this.canvas.width, 2);

    // Side wall subtle glow guides
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 0, this.canvas.width - 2, this.canvas.height);

    ctx.restore();
  }
}
