import { Bubble, COLOR_PALETTE, ComicBurst, FallingBubble, Particle, ScorePopup } from './types';

export class EffectsManager {
  private particles: Particle[] = [];
  private fallingBubbles: FallingBubble[] = [];
  private scorePopups: ScorePopup[] = [];
  private comicBursts: ComicBurst[] = [];

  get activeParticles(): Particle[] {
    return this.particles;
  }

  get activeFallingBubbles(): FallingBubble[] {
    return this.fallingBubbles;
  }

  get activeScorePopups(): ScorePopup[] {
    return this.scorePopups;
  }

  get activeComicBursts(): ComicBurst[] {
    return this.comicBursts;
  }

  spawnPopParticles(x: number, y: number, color: import('./types').BubbleColor) {
    const visual = COLOR_PALETTE[color];
    const particleCount = 16;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 240;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const radius = 2.5 + Math.random() * 3.5;
      const maxLife = 0.45 + Math.random() * 0.35;
      const colorChoice = Math.random() > 0.4 ? visual.primary : visual.light;

      this.particles.push({
        x,
        y,
        vx,
        vy,
        radius,
        color: colorChoice,
        alpha: 1.0,
        life: 0,
        maxLife
      });
    }
  }

  addFallingBubbles(bubbles: Bubble[], getPos: (r: number, c: number) => { x: number; y: number }) {
    for (const b of bubbles) {
      const pos = getPos(b.row, b.col);
      const vx = (Math.random() - 0.5) * 160;
      const vy = -60 - Math.random() * 100; // small upward hop before falling

      this.fallingBubbles.push({
        bubble: b,
        x: pos.x,
        y: pos.y,
        vx,
        vy,
        alpha: 1.0
      });
    }
  }

  addScorePopup(text: string, x: number, y: number, color: string = '#f1f5f9') {
    this.scorePopups.push({
      text,
      x,
      y,
      vy: -60,
      alpha: 1.0,
      life: 0,
      color
    });
  }

  addComicBurst(text: string, x: number, y: number, color: string = '#ffd600', maxLife: number = 0.85) {
    const rotation = (Math.random() - 0.5) * 0.3;
    this.comicBursts.push({
      text,
      x,
      y,
      vy: -75,
      scale: 0.3,
      rotation,
      color,
      textColor: '#16102b',
      alpha: 1.0,
      life: 0,
      maxLife
    });
  }

  update(dt: number, canvasHeight: number) {
    // 1. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 450 * dt; // gravity
      p.vx *= 0.96; // drag
      p.alpha = Math.max(0, 1.0 - p.life / p.maxLife);
    }

    // 2. Update Falling Bubbles
    const gravity = 2200;
    for (let i = this.fallingBubbles.length - 1; i >= 0; i--) {
      const fb = this.fallingBubbles[i];
      fb.x += fb.vx * dt;
      fb.y += fb.vy * dt;
      fb.vy += gravity * dt;

      if (fb.y > canvasHeight + 50) {
        this.fallingBubbles.splice(i, 1);
      }
    }

    // 3. Update Score Popups
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const sp = this.scorePopups[i];
      sp.life += dt;
      sp.y += sp.vy * dt;
      sp.alpha = Math.max(0, 1.0 - sp.life / 0.9);

      if (sp.life >= 0.9) {
        this.scorePopups.splice(i, 1);
      }
    }

    // 4. Update Comic Bursts
    for (let i = this.comicBursts.length - 1; i >= 0; i--) {
      const cb = this.comicBursts[i];
      cb.life += dt;
      cb.y += cb.vy * dt;
      cb.vy *= 0.94;
      const progress = cb.life / cb.maxLife;

      if (progress < 0.2) {
        cb.scale = 0.3 + (progress / 0.2) * 0.85;
      } else if (progress < 0.35) {
        cb.scale = 1.15 - ((progress - 0.2) / 0.15) * 0.15;
      } else {
        cb.scale = 1.0;
      }

      if (progress > 0.6) {
        cb.alpha = Math.max(0, 1.0 - (progress - 0.6) / 0.4);
      }

      if (cb.life >= cb.maxLife) {
        this.comicBursts.splice(i, 1);
      }
    }
  }
}
