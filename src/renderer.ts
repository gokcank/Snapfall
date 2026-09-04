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

  // 90s Retro Arcade Bubble Drawing (Puzzle Bobble / Bust-a-Move aesthetic)
  drawBubble(x: number, y: number, bubble: Bubble, alpha: number = 1.0, scale: number = 1.0) {
    const r = this.grid.radius * scale;
    const visual = COLOR_PALETTE[bubble.color];
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. Crisp Outer Contour Base (Sharp separation on dark arcade backgrounds)
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = visual.dark;
    ctx.fill();

    // 2. Rich 3D Spherical Radial Body Gradient
    const bodyGrad = ctx.createRadialGradient(
      x - r * 0.28,
      y - r * 0.28,
      r * 0.08,
      x,
      y,
      r * 0.98
    );
    bodyGrad.addColorStop(0, visual.light);
    bodyGrad.addColorStop(0.36, visual.primary);
    bodyGrad.addColorStop(0.85, visual.dark);
    bodyGrad.addColorStop(1.0, "rgba(15, 12, 28, 0.55)");

    ctx.beginPath();
    ctx.arc(x, y, r * 0.96, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // 3. Crisp Cartoon Arcade Border Stroke
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "rgba(10, 8, 20, 0.5)";
    ctx.stroke();

    // 4. Primary Specular Glint (Signature 90s Curved Highlight)
    ctx.beginPath();
    ctx.ellipse(
      x - r * 0.32,
      y - r * 0.34,
      r * 0.35,
      r * 0.18,
      -Math.PI / 4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.fill();

    // 5. Secondary Specular Dot
    ctx.beginPath();
    ctx.arc(x - r * 0.1, y - r * 0.48, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.fill();

    // 6. Bottom-Right Ambient Rim Reflection
    ctx.beginPath();
    ctx.ellipse(
      x + r * 0.26,
      y + r * 0.3,
      r * 0.28,
      r * 0.12,
      -Math.PI / 4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
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
      grad.addColorStop(0, "rgba(255, 255, 255, 0)");
      grad.addColorStop(0.65, COLOR_PALETTE[p.color].light);
      grad.addColorStop(1, "#ffffff");

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

  // Option 1: Minimalist Frosted Crystal Pedestal, Sleek Directional Arrow & Pearl Drop Indicators
  drawShooter(shooter: CannonShooter, foulsLeft: number = 5, maxFouls: number = 5) {
    const ctx = this.ctx;
    const ox = shooter.origin.x;
    const oy = shooter.origin.y;
    const angle = shooter.angle;

    ctx.save();

    // 1. Sleek Frosted Crystal Pedestal
    // Base shadow beneath glass disc
    ctx.beginPath();
    ctx.ellipse(ox, oy + 16, 46, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fill();

    // Pedestal glass disc
    ctx.beginPath();
    ctx.ellipse(ox, oy + 10, 44, 12, 0, 0, Math.PI * 2);
    const pedestalGrad = ctx.createRadialGradient(ox, oy + 8, 4, ox, oy + 10, 44);
    pedestalGrad.addColorStop(0, "rgba(25, 35, 65, 0.75)");
    pedestalGrad.addColorStop(0.8, "rgba(10, 15, 30, 0.9)");
    pedestalGrad.addColorStop(1, "rgba(0, 242, 255, 0.35)");
    ctx.fillStyle = pedestalGrad;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "rgba(0, 242, 255, 0.6)";
    ctx.shadowColor = "#00f2ff";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner delicate glass bevel rim
    ctx.beginPath();
    ctx.ellipse(ox, oy + 7, 34, 9, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Sleek Directional Aiming Arrow (Rotates with cannon angle)
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(-angle + Math.PI / 2);

    // Modern glowing tapered arrow
    ctx.beginPath();
    ctx.moveTo(0, -62);           // Sharp tip
    ctx.lineTo(7.5, -48);         // Right wing
    ctx.lineTo(2.2, -49.5);       // Right inner notch
    ctx.lineTo(1.8, -25);         // Right shaft bottom
    ctx.lineTo(-1.8, -25);        // Left shaft bottom
    ctx.lineTo(-2.2, -49.5);      // Left inner notch
    ctx.lineTo(-7.5, -48);        // Left wing
    ctx.closePath();

    const arrowGrad = ctx.createLinearGradient(0, -25, 0, -62);
    arrowGrad.addColorStop(0, "rgba(0, 242, 255, 0.35)");
    arrowGrad.addColorStop(0.65, "#00f2ff");
    arrowGrad.addColorStop(1, "#ffffff");

    ctx.fillStyle = arrowGrad;
    ctx.shadowColor = "#00f2ff";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Crisp center spine highlight
    ctx.beginPath();
    ctx.moveTo(0, -27);
    ctx.lineTo(0, -59);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // 3. Loaded Bubble in Pedestal Center
    const reloadScale = 0.5 + 0.5 * shooter.reloadRatio;
    const loadedBubble: Bubble = {
      id: "loaded",
      color: shooter.currentBubbleColor,
      row: -1,
      col: -1
    };
    this.drawBubble(ox, oy, loadedBubble, 1.0, reloadScale);

    // 4. Next Bubble Glass Cradle (Left side)
    const nextX = ox - 80;
    const nextY = oy + 12;

    // Glass cradle saucer
    ctx.beginPath();
    ctx.ellipse(nextX, nextY + 10, 26, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10, 15, 30, 0.75)";
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(0, 242, 255, 0.35)";
    ctx.stroke();

    // Subtle inner ring
    ctx.beginPath();
    ctx.ellipse(nextX, nextY + 8, 18, 6, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(116, 245, 255, 0.85)";
    ctx.font = "600 9px \"Space Mono\", monospace";
    ctx.textAlign = "center";
    ctx.fillText("SONRAKİ", nextX, nextY + 28);

    const nextBubble: Bubble = {
      id: "next",
      color: shooter.nextBubbleColor,
      row: -1,
      col: -1
    };
    this.drawBubble(nextX, nextY - 4, nextBubble, 0.9, 0.8);

    // 5. Minimalist Pearl Drop Indicators (Centered below pedestal)
    const dotsY = oy + 44;
    const dotSpacing = 16;
    const startDotX = ox - ((maxFouls - 1) * dotSpacing) / 2;

    for (let f = 0; f < maxFouls; f++) {
      const dotX = startDotX + f * dotSpacing;
      const isFilled = f < foulsLeft;
      const isWarning = foulsLeft <= 1;

      ctx.beginPath();
      ctx.arc(dotX, dotsY, 4, 0, Math.PI * 2);
      if (isFilled) {
        const dotGlow = isWarning ? "#ff0055" : "#00f2ff";
        ctx.fillStyle = isWarning ? "#ff2a6d" : "#05d9e8";
        ctx.shadowColor = dotGlow;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Tiny pearl specular glint
        ctx.beginPath();
        ctx.arc(dotX - 1.2, dotsY - 1.2, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      } else {
        // Spent foul: clean translucent glass ring
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.stroke();
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
      ctx.font = '700 18px "Fredoka", sans-serif';
      ctx.fillStyle = sp.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;
      ctx.textAlign = 'center';
      ctx.fillText(sp.text, sp.x, sp.y);
      ctx.restore();
    }
  }

  // Boundaries, Retro Industrial Ceiling Press & Danger Line
  drawBoundaries(hasWarning: boolean = false) {
    const ctx = this.ctx;
    ctx.save();

    const cY = this.grid.ceilingY;

    // 1. Descending mechanical ceiling press slab
    if (cY > 0) {
      const slabGrad = ctx.createLinearGradient(0, 0, 0, cY);
      slabGrad.addColorStop(0, "#120f24");
      slabGrad.addColorStop(1, "#231d3d");
      ctx.fillStyle = slabGrad;
      ctx.fillRect(0, 0, this.canvas.width, cY);

      // Retro Arcade Amber Hazard Stripes
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.canvas.width, cY);
      ctx.clip();
      ctx.lineWidth = 14;
      ctx.strokeStyle = "rgba(255, 180, 0, 0.22)";
      for (let x = -cY; x < this.canvas.width + cY; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + cY, cY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Ceiling girder lip (Sturdy Brass/Steel Edge)
    const ceilGrad = ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    ceilGrad.addColorStop(0, "#ffd600");
    ceilGrad.addColorStop(0.5, "#ff9100");
    ceilGrad.addColorStop(1, "#ffd600");
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, cY, this.canvas.width, 4);

    // Girder steel trim
    ctx.fillStyle = "#453d70";
    ctx.fillRect(0, cY + 4, this.canvas.width, 3);

    // 3. Side arcade cabinet walls
    ctx.strokeStyle = "#2d2650";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, cY, this.canvas.width - 2, this.canvas.height - cY);

    // 4. Danger line at bottom (fixed world coordinate y = 520)
    const dangerY = 520;
    ctx.strokeStyle = hasWarning ? "#ff3355" : "rgba(255, 51, 85, 0.35)";
    ctx.lineWidth = hasWarning ? 2.5 : 1.5;
    ctx.setLineDash([8, 4]);
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
