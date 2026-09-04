import { EffectsManager } from './effects';
import { HexGrid } from './grid';
import { CannonShooter } from './shooter';
import { Bubble, COLOR_PALETTE, GridMatrix, Projectile, TrajectoryResult } from './types';

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

    // Specular gloss reflection
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

    // Bottom bounce reflection
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y + r * 0.4, r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();

    ctx.restore();
  }

  // Draw flying projectile
  drawProjectile(p: Projectile) {
    const bubble: Bubble = {
      id: 'projectile',
      color: p.color,
      row: -1,
      col: -1
    };

    const ctx = this.ctx;
    ctx.save();
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 0) {
      const trailLength = 28;
      const tx = p.x - (p.vx / speed) * trailLength;
      const ty = p.y - (p.vy / speed) * trailLength;

      const grad = ctx.createLinearGradient(tx, ty, p.x, p.y);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(1, COLOR_PALETTE[p.color].glow);

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(p.x, p.y);
      ctx.lineWidth = p.radius * 1.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = grad;
      ctx.stroke();
    }
    ctx.restore();

    this.drawBubble(p.x, p.y, bubble, 1.0, 1.0);
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

  // Trajectory reflection line & ghost target snap preview
  drawTrajectory(traj: TrajectoryResult, currentColor: import('./types').BubbleColor) {
    const ctx = this.ctx;
    ctx.save();

    const visual = COLOR_PALETTE[currentColor];
    ctx.strokeStyle = visual.primary;
    ctx.fillStyle = '#ffffff';

    for (const seg of traj.segments) {
      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      const length = Math.hypot(dx, dy);
      const dotSpacing = 16;
      const numDots = Math.floor(length / dotSpacing);

      for (let i = 1; i <= numDots; i++) {
        const t = (i * dotSpacing) / length;
        const px = seg.start.x + dx * t;
        const py = seg.start.y + dy * t;
        const radius = 3.5;

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.shadowColor = visual.primary;
        ctx.shadowBlur = 8;
        ctx.fill();
      }
    }

    if (traj.targetCell) {
      const ghostPos = this.grid.gridToWorld(traj.targetCell.row, traj.targetCell.col);
      const ghostBubble: Bubble = {
        id: 'ghost',
        color: currentColor,
        row: traj.targetCell.row,
        col: traj.targetCell.col
      };

      ctx.shadowBlur = 0;
      this.drawBubble(ghostPos.x, ghostPos.y, ghostBubble, 0.45, 0.95);

      ctx.beginPath();
      ctx.arc(ghostPos.x, ghostPos.y, this.grid.radius, 0, Math.PI * 2);
      ctx.strokeStyle = visual.light;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // Sci-Fi Arcade Cannon Shooter
  drawShooter(shooter: CannonShooter, foulsLeft: number = 5, maxFouls: number = 5) {
    const ctx = this.ctx;
    const ox = shooter.origin.x;
    const oy = shooter.origin.y;
    const angle = shooter.angle;

    ctx.save();

    // 1. Shooter Base Pedestal Plate
    ctx.beginPath();
    ctx.arc(ox, oy, 48, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.stroke();

    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const nx = ox + Math.cos(a) * 44;
      const ny = oy + Math.sin(a) * 44;
      ctx.beginPath();
      ctx.arc(nx, ny, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.fill();
    }

    // 2. Rotating Cannon Barrel / Turret Arrow
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(-angle + Math.PI / 2);

    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(-12, -54);
    ctx.lineTo(12, -54);
    ctx.lineTo(18, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-10, -56, 20, 4);

    ctx.restore();

    // 3. Loaded Bubble in Cannon Chamber
    const reloadScale = 0.5 + 0.5 * shooter.reloadRatio;
    const loadedBubble: Bubble = {
      id: 'loaded',
      color: shooter.currentBubbleColor,
      row: -1,
      col: -1
    };
    this.drawBubble(ox, oy, loadedBubble, 1.0, reloadScale);

    // 4. Next Bubble Preview Dock (at the left side)
    const nextX = ox - 80;
    const nextY = oy + 6;

    ctx.beginPath();
    ctx.arc(nextX, nextY, 28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SONRAKİ', nextX, nextY + 40);

    const nextBubble: Bubble = {
      id: 'next',
      color: shooter.nextBubbleColor,
      row: -1,
      col: -1
    };
    this.drawBubble(nextX, nextY, nextBubble, 0.9, 0.8);

    // 5. Foul Orbs / Ceiling Drop Counter (at the right side)
    const foulStartX = ox + 55;
    const foulY = oy + 25;
    ctx.font = '600 9px Outfit, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('TAVAN', foulStartX + 20, foulY + 16);

    for (let f = 0; f < maxFouls; f++) {
      const fx = foulStartX + f * 11;
      ctx.beginPath();
      ctx.arc(fx, foulY, 3.5, 0, Math.PI * 2);
      if (f < foulsLeft) {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 5;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // Render Visual Effects
  drawEffects(effects: EffectsManager) {
    const ctx = this.ctx;

    for (const fb of effects.activeFallingBubbles) {
      this.drawBubble(fb.x, fb.y, fb.bubble, fb.alpha, 1.0);
    }

    for (const p of effects.activeParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    }

    for (const sp of effects.activeScorePopups) {
      ctx.save();
      ctx.globalAlpha = sp.alpha;
      ctx.font = '800 16px Outfit, sans-serif';
      ctx.fillStyle = sp.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.fillText(sp.text, sp.x, sp.y);
      ctx.restore();
    }
  }

  // Boundaries & Danger Line
  drawBoundaries(hasWarning: boolean = false) {
    const ctx = this.ctx;
    ctx.save();

    const ceilGrad = ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    ceilGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
    ceilGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.6)');
    ceilGrad.addColorStop(1, 'rgba(56, 189, 248, 0.4)');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, this.canvas.width, 4);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 0, this.canvas.width - 2, this.canvas.height);

    // Danger line at row 12
    const dangerY = this.grid.rowHeight * 12 + this.grid.radius;
    ctx.strokeStyle = hasWarning ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.25)';
    ctx.lineWidth = hasWarning ? 2 : 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(this.canvas.width, dangerY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (hasWarning) {
      ctx.font = '700 10px Outfit, sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('TEHLİKE ÇİZGİSİ', this.canvas.width / 2 - 40, dangerY - 6);
    }

    ctx.restore();
  }
}
