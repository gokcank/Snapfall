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

  // Stitch 3D Crystal Gem Bubble Drawing
  drawBubble(x: number, y: number, bubble: Bubble, alpha: number = 1.0, scale: number = 1.0) {
    const r = this.grid.radius * scale;
    const visual = COLOR_PALETTE[bubble.color];
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. Emissive Outer Neon Glow Aura
    ctx.beginPath();
    ctx.arc(x, y, r * 1.22, 0, Math.PI * 2);
    ctx.fillStyle = visual.glow;
    ctx.fill();

    // 2. Crystal Gem Body Gradient (Deep 3D Shading)
    const bodyGrad = ctx.createRadialGradient(
      x - r * 0.32,
      y - r * 0.32,
      r * 0.08,
      x,
      y,
      r
    );
    bodyGrad.addColorStop(0, visual.light);
    bodyGrad.addColorStop(0.48, visual.primary);
    bodyGrad.addColorStop(0.85, visual.dark);
    bodyGrad.addColorStop(1, '#05050a');

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // 3. Inner Refraction Facet Glow (Crystal Depth)
    const facetGrad = ctx.createRadialGradient(
      x,
      y + r * 0.2,
      r * 0.05,
      x,
      y,
      r * 0.8
    );
    facetGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    facetGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
    facetGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = facetGrad;
    ctx.fill();

    // 4. Crisp Inner Bevel Rim
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.stroke();

    // 5. Primary Specular Crescent Highlight
    ctx.beginPath();
    ctx.ellipse(
      x - r * 0.35,
      y - r * 0.36,
      r * 0.36,
      r * 0.18,
      -Math.PI / 4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.fill();

    // 6. Secondary Specular Twinkle Dot
    ctx.beginPath();
    ctx.arc(x - r * 0.12, y - r * 0.46, r * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();

    // 7. Bottom-Right Ambient Bounce Reflection
    ctx.beginPath();
    ctx.arc(x + r * 0.24, y + r * 0.36, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fill();

    ctx.restore();
  }

  // Draw flying projectile with energetic plasma comet trail
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
      const trailLength = 36;
      const tx = p.x - (p.vx / speed) * trailLength;
      const ty = p.y - (p.vy / speed) * trailLength;

      const grad = ctx.createLinearGradient(tx, ty, p.x, p.y);
      grad.addColorStop(0, 'rgba(0, 242, 255, 0)');
      grad.addColorStop(0.6, COLOR_PALETTE[p.color].glow);
      grad.addColorStop(1, '#ffffff');

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(p.x, p.y);
      ctx.lineWidth = p.radius * 1.6;
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
        const radius = 3.6;

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = visual.primary;
        ctx.shadowBlur = 10;
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

  // Stitch Cyber Cockpit Turret & Energy Indicators
  drawShooter(shooter: CannonShooter, foulsLeft: number = 5, maxFouls: number = 5) {
    const ctx = this.ctx;
    const ox = shooter.origin.x;
    const oy = shooter.origin.y;
    const angle = shooter.angle;

    ctx.save();

    // 1. High-Tech Obsidian Base Arc
    ctx.beginPath();
    ctx.arc(ox, oy, 52, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
    ctx.stroke();

    // Circular notch accents
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const nx = ox + Math.cos(a) * 46;
      const ny = oy + Math.sin(a) * 46;
      ctx.beginPath();
      ctx.arc(nx, ny, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = '#00f2ff';
      ctx.shadowColor = '#00f2ff';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 2. Rotating Turret Barrel with Plasma Core
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(-angle + Math.PI / 2);

    // Outer cyber barrel casing
    ctx.fillStyle = 'rgba(20, 20, 38, 0.96)';
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(-12, -56);
    ctx.lineTo(12, -56);
    ctx.lineTo(18, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner glowing energy core channel
    const coreGrad = ctx.createLinearGradient(0, -10, 0, -50);
    coreGrad.addColorStop(0, '#ce5dff');
    coreGrad.addColorStop(1, '#00f2ff');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(-6, -48, 12, 38);

    // Muzzle emitter band
    ctx.fillStyle = '#00f2ff';
    ctx.shadowColor = '#00f2ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(-11, -58, 22, 4);
    ctx.shadowBlur = 0;

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

    // 4. Next Bubble Preview Glass Dock (Left side)
    const nextX = ox - 86;
    const nextY = oy + 6;

    ctx.beginPath();
    ctx.arc(nextX, nextY, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.35)';
    ctx.stroke();

    ctx.fillStyle = '#74f5ff';
    ctx.font = '700 9px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SONRAKİ', nextX, nextY + 44);

    const nextBubble: Bubble = {
      id: 'next',
      color: shooter.nextBubbleColor,
      row: -1,
      col: -1
    };
    this.drawBubble(nextX, nextY, nextBubble, 0.92, 0.82);

    // 5. Energy Meter: Vertical Battery Orbs (Right side)
    const meterX = ox + 72;
    const meterY = oy - 20;

    // Glass panel behind energy meter
    ctx.fillStyle = 'rgba(10, 10, 26, 0.75)';
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(meterX - 10, meterY - 4, 20, 56, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = foulsLeft <= 1 ? '#ff0055' : '#849495';
    ctx.font = '700 8px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TAVAN', meterX, meterY + 64);

    for (let f = 0; f < maxFouls; f++) {
      const orbY = meterY + 44 - f * 10;
      const isFilled = f < foulsLeft;
      const isWarning = foulsLeft <= 1;

      ctx.beginPath();
      ctx.roundRect(meterX - 6, orbY - 3, 12, 6, 2);
      if (isFilled) {
        ctx.fillStyle = isWarning ? '#ff0055' : '#00f2ff';
        ctx.shadowColor = isWarning ? '#ff0055' : '#00f2ff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Render Visual Effects with arcade typography
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
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }

    for (const sp of effects.activeScorePopups) {
      ctx.save();
      ctx.globalAlpha = sp.alpha;
      ctx.font = '800 17px "Sora", sans-serif';
      ctx.fillStyle = sp.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;
      ctx.textAlign = 'center';
      ctx.fillText(sp.text, sp.x, sp.y);
      ctx.restore();
    }
  }

  // Boundaries, Neon Descending Ceiling Press & Danger Line
  drawBoundaries(hasWarning: boolean = false) {
    const ctx = this.ctx;
    ctx.save();

    const cY = this.grid.ceilingY;

    // 1. Descending ceiling press slab
    if (cY > 0) {
      ctx.fillStyle = 'rgba(10, 10, 26, 0.96)';
      ctx.fillRect(0, 0, this.canvas.width, cY);

      // Stitch Neon Hazard Stripes along ceiling press
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.canvas.width, cY);
      ctx.clip();
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(188, 0, 255, 0.18)';
      for (let x = -cY; x < this.canvas.width + cY; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + cY, cY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Ceiling rim beam (Neon Cyan / Violet Gradient)
    const ceilGrad = ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    ceilGrad.addColorStop(0, '#00f2ff');
    ceilGrad.addColorStop(0.5, '#ce5dff');
    ceilGrad.addColorStop(1, '#00f2ff');
    ctx.fillStyle = ceilGrad;
    ctx.shadowColor = '#00f2ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(0, cY, this.canvas.width, 4);
    ctx.shadowBlur = 0;

    // Ceiling bottom ambient glow
    ctx.fillStyle = 'rgba(0, 242, 255, 0.3)';
    ctx.fillRect(0, cY + 4, this.canvas.width, 2);

    // 3. Side arena walls
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, cY, this.canvas.width - 2, this.canvas.height - cY);

    // 4. Danger line at bottom (fixed world coordinate y = 520)
    const dangerY = 520;
    ctx.strokeStyle = hasWarning ? '#ff0055' : 'rgba(255, 0, 85, 0.3)';
    ctx.lineWidth = hasWarning ? 2.5 : 1.2;
    ctx.setLineDash([7, 4]);
    if (hasWarning) {
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(this.canvas.width, dangerY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    if (hasWarning) {
      ctx.font = '700 10px "Space Mono", monospace';
      ctx.fillStyle = '#ff0055';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ TEHLİKE ÇİZGİSİ', this.canvas.width / 2, dangerY - 6);
    }

    ctx.restore();
  }
}
