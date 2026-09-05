import { EffectsManager } from './effects';
import { HexGrid } from './grid';
import { CannonShooter } from './shooter';
import { Bubble, BubbleColor, COLOR_PALETTE, GridMatrix, Projectile, TrajectoryResult } from './types';

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

    // 3.5. 90s Engraved Relief Arcade Emblem (Bomb, Token, Cherry, Lightning, Invader)
    this.drawReliefEmblem(ctx, x, y, r, bubble.color);

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

  // 90s Retro Arcade Dotted Aim Line & Ghost Snap Preview
  drawTrajectory(traj: TrajectoryResult, currentColor: import('./types').BubbleColor) {
    const ctx = this.ctx;
    ctx.save();

    const visual = COLOR_PALETTE[currentColor];

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
        const radius = 3.2;

        // Outer crisp bead ring
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = visual.primary;
        ctx.fill();

        // Inner bright bead center
        ctx.beginPath();
        ctx.arc(px, py, radius * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
    }

    if (traj.targetCell) {
      const ghostPos = this.grid.gridToWorld(traj.targetCell.row, traj.targetCell.col);
      const ghostBubble: Bubble = {
        id: "ghost",
        color: currentColor,
        row: traj.targetCell.row,
        col: traj.targetCell.col
      };

      this.drawBubble(ghostPos.x, ghostPos.y, ghostBubble, 0.45, 0.95);

      ctx.beginPath();
      ctx.arc(ghostPos.x, ghostPos.y, this.grid.radius, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffd600";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // 90s Retro Arcade Mechanical Arrow Turret, Feeder Pod & Golden Coin Foul Indicators
  drawShooter(shooter: CannonShooter, foulsLeft: number = 5, maxFouls: number = 5) {
    const ctx = this.ctx;
    const ox = shooter.origin.x;
    const oy = shooter.origin.y;
    const angle = shooter.angle;

    ctx.save();

    // 1. Mechanical Turret Pedestal with Rotating Gear Teeth
    // Base drop shadow
    ctx.beginPath();
    ctx.ellipse(ox, oy + 16, 48, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();

    // Rotating mechanical gear teeth around pedestal rim
    const gearTeeth = 12;
    const gearRot = angle * 2.0; // rotates smoothly with aim angle
    ctx.save();
    for (let i = 0; i < gearTeeth; i++) {
      const a = gearRot + (i * Math.PI * 2) / gearTeeth;
      const gx = ox + Math.cos(a) * 43;
      const gy = oy + 10 + Math.sin(a) * 11;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(a);
      ctx.fillStyle = "#ffb300";
      ctx.fillRect(-2.5, -2, 5, 4);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = "#663d00";
      ctx.strokeRect(-2.5, -2, 5, 4);
      ctx.restore();
    }
    ctx.restore();

    // Turret outer brass ring
    ctx.beginPath();
    ctx.ellipse(ox, oy + 10, 42, 12, 0, 0, Math.PI * 2);
    const pedestalGrad = ctx.createRadialGradient(ox, oy + 8, 6, ox, oy + 10, 42);
    pedestalGrad.addColorStop(0, "#332a58");
    pedestalGrad.addColorStop(0.7, "#1b1633");
    pedestalGrad.addColorStop(1, "#0e0b1d");
    ctx.fillStyle = pedestalGrad;
    ctx.fill();

    // Golden brass bezel rim
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#ffd600";
    ctx.stroke();

    // Mechanical rivets around pedestal rim
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rx = ox + Math.cos(a) * 36;
      const ry = oy + 10 + Math.sin(a) * 9;
      ctx.beginPath();
      ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe082";
      ctx.fill();
    }

    // Inner steel bearing disc
    ctx.beginPath();
    ctx.ellipse(ox, oy + 8, 28, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#2b2347";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 214, 0, 0.4)";
    ctx.stroke();

    // 2. Brass Cannon Barrel Cradle & Mechanical Directional Arrow
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(-angle + Math.PI / 2);

    // Heavy Brass Launcher Cradle (side guide brackets flanking bubble)
    const brassGrad = ctx.createLinearGradient(-26, 0, 26, 0);
    brassGrad.addColorStop(0, "#ff8f00");
    brassGrad.addColorStop(0.25, "#ffd54f");
    brassGrad.addColorStop(0.5, "#fff9c4");
    brassGrad.addColorStop(0.75, "#ffb300");
    brassGrad.addColorStop(1, "#b35900");

    // Left cannon guide bracket
    ctx.beginPath();
    ctx.rect(-24, -14, 6, 26);
    ctx.fillStyle = brassGrad;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "#16102a";
    ctx.stroke();

    // Right cannon guide bracket
    ctx.beginPath();
    ctx.rect(18, -14, 6, 26);
    ctx.fillStyle = brassGrad;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "#16102a";
    ctx.stroke();

    // Rear mechanical cradle crossbar
    ctx.beginPath();
    ctx.rect(-20, 8, 40, 6);
    ctx.fillStyle = "#ffb300";
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "#16102a";
    ctx.stroke();

    // Classic arcade arrow pointer shape
    ctx.beginPath();
    ctx.moveTo(0, -66);         // Sharp arrowhead tip
    ctx.lineTo(11, -49);        // Right wing outer
    ctx.lineTo(4.5, -50);       // Right wing inner notch
    ctx.lineTo(3.5, -24);       // Right shaft
    ctx.lineTo(-3.5, -24);      // Left shaft
    ctx.lineTo(-4.5, -50);      // Left wing inner notch
    ctx.lineTo(-11, -49);       // Left wing outer
    ctx.closePath();

    // Warm golden-amber gradient for mechanical arrow
    const arrowGrad = ctx.createLinearGradient(0, -24, 0, -66);
    arrowGrad.addColorStop(0, "#ff9100");
    arrowGrad.addColorStop(0.65, "#ffd600");
    arrowGrad.addColorStop(1, "#fffde7");

    ctx.fillStyle = arrowGrad;
    ctx.fill();

    // Crisp dark comic/arcade outline
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "#16102a";
    ctx.stroke();

    // Arrow center spine highlight
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, -63);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.restore();

    // 3. Loaded Bubble in Center of Turret
    const reloadScale = 0.5 + 0.5 * shooter.reloadRatio;
    const loadedBubble: Bubble = {
      id: "loaded",
      color: shooter.currentBubbleColor,
      row: -1,
      col: -1
    };
    this.drawBubble(ox, oy, loadedBubble, 1.0, reloadScale);

    // 4. Next Bubble Feeder Pod (Left side)
    const nextX = ox - 80;
    const nextY = oy + 12;

    // Feeder dish shadow & body
    ctx.beginPath();
    ctx.ellipse(nextX, nextY + 10, 26, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1c1735";
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "#ffd600";
    ctx.stroke();

    // Inner feeder recess
    ctx.beginPath();
    ctx.ellipse(nextX, nextY + 8, 18, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#120f24";
    ctx.fill();

    // Label: "SONRAKİ" in warm retro font
    ctx.fillStyle = "#ffd600";
    ctx.font = '700 11px "Fredoka", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("SONRAKİ", nextX, nextY + 28);

    const nextBubble: Bubble = {
      id: "next",
      color: shooter.nextBubbleColor,
      row: -1,
      col: -1
    };
    this.drawBubble(nextX, nextY - 4, nextBubble, 0.95, 0.8);

    // 5. Golden Arcade Coin Foul Indicators (Centered below turret)
    const dotsY = oy + 44;
    const dotSpacing = 16;
    const startDotX = ox - ((maxFouls - 1) * dotSpacing) / 2;

    for (let f = 0; f < maxFouls; f++) {
      const dotX = startDotX + f * dotSpacing;
      const isFilled = f < foulsLeft;
      const isWarning = foulsLeft <= 1;

      ctx.beginPath();
      ctx.arc(dotX, dotsY, 4.5, 0, Math.PI * 2);

      if (isFilled) {
        ctx.fillStyle = isWarning ? "#ff3355" : "#ffd600";
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = isWarning ? "#b31034" : "#ff9100";
        ctx.stroke();

        // Shiny coin reflection glint
        ctx.beginPath();
        ctx.arc(dotX - 1.2, dotsY - 1.2, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      } else {
        // Spent foul slot: dark metallic recessed socket
        ctx.fillStyle = "#17132c";
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(255, 214, 0, 0.2)";
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

    // 90s Comic Book Starburst Popups (POP!, GREAT!, CRASH!, BOOM!)
    for (const cb of effects.activeComicBursts) {
      ctx.save();
      ctx.globalAlpha = cb.alpha;
      ctx.translate(cb.x, cb.y);
      ctx.rotate(cb.rotation);
      ctx.scale(cb.scale, cb.scale);

      // Draw 14-point comic starburst
      const spikes = 14;
      const outerR = 36;
      const innerR = 22;
      const step = Math.PI / spikes;

      // Dark comic background outline
      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        const curA = (i * 2) * step - Math.PI / 2;
        const nextA = (i * 2 + 1) * step - Math.PI / 2;
        const ox = Math.cos(curA) * (outerR + 2.5);
        const oy = Math.sin(curA) * (outerR + 2.5);
        const ix = Math.cos(nextA) * (innerR + 1.5);
        const iy = Math.sin(nextA) * (innerR + 1.5);
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fillStyle = "#100a20";
      ctx.fill();

      // Main starburst fill
      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        const curA = (i * 2) * step - Math.PI / 2;
        const nextA = (i * 2 + 1) * step - Math.PI / 2;
        const ox = Math.cos(curA) * outerR;
        const oy = Math.sin(curA) * outerR;
        const ix = Math.cos(nextA) * innerR;
        const iy = Math.sin(nextA) * innerR;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fillStyle = cb.color;
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Bold comic arcade text
      ctx.font = '800 13px "Fredoka", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = cb.textColor;
      ctx.fillText(cb.text, 0, 1);

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

  // --- 90s Engraved Relief Arcade Emblems on Bubbles ---
  private drawReliefEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: BubbleColor) {
    const s = r * 0.54;
    const emblemY = cy + r * 0.05;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.5;

    // 1. Debossed Shadow (shifted slightly down/right for recessed engraved depth)
    ctx.fillStyle = "rgba(8, 6, 18, 0.32)";
    ctx.strokeStyle = "rgba(8, 6, 18, 0.32)";
    this.renderEmblemShape(ctx, cx + 0.6, emblemY + 1.0, s, color);

    // 2. Relief Face (semi-transparent warm white glass imprint stamp)
    ctx.fillStyle = "rgba(255, 255, 255, 0.44)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.44)";
    this.renderEmblemShape(ctx, cx, emblemY, s, color);

    ctx.restore();
  }

  private renderEmblemShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: BubbleColor) {
    switch (color) {
      case BubbleColor.RED:
        this.drawBombEmblem(ctx, cx, cy, s);
        break;
      case BubbleColor.YELLOW:
        this.drawCoinEmblem(ctx, cx, cy, s);
        break;
      case BubbleColor.GREEN:
        this.drawCherryEmblem(ctx, cx, cy, s);
        break;
      case BubbleColor.BLUE:
        this.drawLightningEmblem(ctx, cx, cy, s);
        break;
      case BubbleColor.PURPLE:
        this.drawInvaderEmblem(ctx, cx, cy, s);
        break;
    }
  }

  // RED: 💣 Classic Arcade Bomb
  private drawBombEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
    // Bomb spherical body
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.12, s * 0.54, 0, Math.PI * 2);
    ctx.fill();
    // Neck collar
    ctx.fillRect(cx - s * 0.16, cy - s * 0.52, s * 0.32, s * 0.18);
    // Wick
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.5);
    ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.75, cx + s * 0.38, cy - s * 0.62);
    ctx.stroke();
    // Spark starlet
    ctx.beginPath();
    ctx.arc(cx + s * 0.42, cy - s * 0.64, s * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }

  // YELLOW: 🪙 Arcade Token Coin & Star
  private drawCoinEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
    // Outer coin rim
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    // 5-pointed coin star
    ctx.beginPath();
    const spikes = 5;
    const outerRadius = s * 0.44;
    const innerRadius = s * 0.20;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
  }

  // GREEN: 🍒 Retro Coin-Op Cherries
  private drawCherryEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
    // Left cherry
    ctx.beginPath();
    ctx.arc(cx - s * 0.28, cy + s * 0.24, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
    // Right cherry
    ctx.beginPath();
    ctx.arc(cx + s * 0.28, cy + s * 0.30, s * 0.30, 0, Math.PI * 2);
    ctx.fill();
    // Joined stems
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.28, cy + s * 0.06);
    ctx.quadraticCurveTo(cx - s * 0.16, cy - s * 0.46, cx + s * 0.04, cy - s * 0.58);
    ctx.moveTo(cx + s * 0.28, cy + s * 0.12);
    ctx.quadraticCurveTo(cx + s * 0.14, cy - s * 0.42, cx + s * 0.04, cy - s * 0.58);
    ctx.stroke();
    // Top leaf
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.22, cy - s * 0.58, s * 0.24, s * 0.10, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // BLUE: ⚡ High-Voltage Lightning Bolt
  private drawLightningEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.10, cy - s * 0.68);
    ctx.lineTo(cx - s * 0.38, cy + s * 0.04);
    ctx.lineTo(cx - s * 0.04, cy + s * 0.04);
    ctx.lineTo(cx - s * 0.20, cy + s * 0.72);
    ctx.lineTo(cx + s * 0.38, cy - s * 0.04);
    ctx.lineTo(cx + s * 0.04, cy - s * 0.04);
    ctx.closePath();
    ctx.fill();
  }

  // PURPLE: 👾 16-Bit Space Invader Alien
  private drawInvaderEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
    const p = s * 0.12;
    ctx.save();
    // Antennae
    ctx.fillRect(cx - p * 3, cy - p * 3.5, p, p);
    ctx.fillRect(cx + p * 2, cy - p * 3.5, p, p);
    ctx.fillRect(cx - p * 2, cy - p * 2.5, p, p);
    ctx.fillRect(cx + p * 1, cy - p * 2.5, p, p);
    // Head & brow
    ctx.fillRect(cx - p * 3, cy - p * 1.5, p * 6, p);
    // Face rows
    ctx.fillRect(cx - p * 4, cy - p * 0.5, p * 8, p);
    ctx.fillRect(cx - p * 4, cy + p * 0.5, p * 8, p);
    // Center mouth row
    ctx.fillRect(cx - p * 2, cy + p * 1.5, p * 4, p);
    // Outer claws
    ctx.fillRect(cx - p * 4, cy + p * 1.5, p, p * 2);
    ctx.fillRect(cx + p * 3, cy + p * 1.5, p, p * 2);
    ctx.fillRect(cx - p * 2, cy + p * 2.5, p, p);
    ctx.fillRect(cx + p * 1, cy + p * 2.5, p, p);

    // Eye cutouts
    ctx.fillStyle = "rgba(10, 8, 20, 0.45)";
    ctx.fillRect(cx - p * 2.5, cy - p * 0.5, p, p);
    ctx.fillRect(cx + p * 1.5, cy - p * 0.5, p, p);
    ctx.restore();
  }

}
