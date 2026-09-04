import { MatchFinder } from './algorithms';
import { SoundEffects } from './audio';
import { EffectsManager } from './effects';
import { HexGrid } from './grid';
import { PhysicsEngine } from './physics';
import { CanvasRenderer } from './renderer';
import { CannonShooter } from './shooter';
import { TrajectoryCalculator } from './trajectory';
import { Bubble, BubbleColor, GridMatrix } from './types';

class BubbleShooterGame {
  private canvas: HTMLCanvasElement;
  private grid: HexGrid;
  private renderer: CanvasRenderer;
  private physics: PhysicsEngine;
  private shooter: CannonShooter;
  private trajectory: TrajectoryCalculator;
  private effects: EffectsManager;
  private audio: SoundEffects;
  private matrix: GridMatrix;

  private score: number = 0;
  private combo: number = 0;
  private scoreEl: HTMLElement | null;
  private coordInfoEl: HTMLElement | null;

  private lastTime: number = 0;
  private isTouching: boolean = false;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.scoreEl = document.getElementById('scoreValue');
    this.coordInfoEl = document.getElementById('coordInfo');

    this.grid = new HexGrid(24, 10, 16);
    this.renderer = new CanvasRenderer(this.canvas, this.grid);
    this.physics = new PhysicsEngine(this.grid);
    this.trajectory = new TrajectoryCalculator(this.grid);
    this.effects = new EffectsManager();
    this.audio = new SoundEffects();
    this.matrix = this.grid.createEmptyMatrix();

    this.shooter = new CannonShooter({ x: this.canvas.width / 2, y: 615 });

    this.initSampleLevel();
    this.setupInputs();

    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);
  }

  private initSampleLevel() {
    const colors = [
      BubbleColor.RED,
      BubbleColor.BLUE,
      BubbleColor.GREEN,
      BubbleColor.YELLOW,
      BubbleColor.PURPLE
    ];

    let id = 1;
    for (let r = 0; r < 5; r++) {
      const cols = this.grid.getColsInRow(r);
      for (let c = 0; c < cols; c++) {
        const color = colors[(r * 2 + c + Math.floor(c / 2)) % colors.length];
        const bubble: Bubble = {
          id: `bubble-${id++}`,
          color,
          row: r,
          col: c,
          state: 'idle'
        };
        this.matrix[r][c] = bubble;
      }
    }
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private setupInputs() {
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.physics.currentProjectile !== null) return;
      const pos = this.getCanvasPos(e.clientX, e.clientY);
      this.shooter.setAimTarget(pos.x, pos.y);
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (!this.isTouching) {
        this.shooter.stopAiming();
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.physics.currentProjectile !== null) return;
      const pos = this.getCanvasPos(e.clientX, e.clientY);

      const nextDockX = this.shooter.origin.x - 80;
      const nextDockY = this.shooter.origin.y + 6;
      if (Math.hypot(pos.x - nextDockX, pos.y - nextDockY) < 32) {
        this.shooter.swapColors();
        return;
      }

      this.fireBubble();
    });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 0 || this.physics.currentProjectile !== null) return;
      this.isTouching = true;
      const pos = this.getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);

      const nextDockX = this.shooter.origin.x - 80;
      const nextDockY = this.shooter.origin.y + 6;
      if (Math.hypot(pos.x - nextDockX, pos.y - nextDockY) < 36) {
        this.shooter.swapColors();
        this.isTouching = false;
        return;
      }

      this.shooter.setAimTarget(pos.x, pos.y);
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.isTouching || e.touches.length === 0 || this.physics.currentProjectile !== null) return;
      const pos = this.getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
      this.shooter.setAimTarget(pos.x, pos.y);
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      if (this.isTouching && this.physics.currentProjectile === null) {
        this.isTouching = false;
        this.fireBubble();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.shooter.swapColors();
      }
    });
  }

  private fireBubble() {
    if (this.physics.currentProjectile !== null) return;

    const color = this.shooter.consumeBubble();
    const speed = 1250;
    this.physics.launch(this.shooter.origin, this.shooter.angle, speed, color);

    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = `Ateşlendi! [${color}]`;
    }
  }

  private handleSnap(snappedCell: { row: number; col: number }) {
    this.audio.playSnap();

    // 1. Check Match-3 Flood Fill
    const matches = MatchFinder.findMatches(this.grid, this.matrix, snappedCell, 3);

    if (matches.length >= 3) {
      this.combo++;
      const comboMultiplier = Math.min(this.combo, 5);
      const points = matches.length * 30 * comboMultiplier;
      this.score += points;

      this.audio.playPop(this.combo);

      // Pop matched bubbles with particle burst
      let avgX = 0;
      let avgY = 0;
      for (const m of matches) {
        const bubble = this.matrix[m.row][m.col];
        if (bubble) {
          const pos = this.grid.gridToWorld(m.row, m.col);
          avgX += pos.x;
          avgY += pos.y;
          this.effects.spawnPopParticles(pos.x, pos.y, bubble.color);
        }
        this.matrix[m.row][m.col] = null;
      }

      avgX /= matches.length;
      avgY /= matches.length;

      const comboText = this.combo > 1 ? ` COMBO x${this.combo}!` : '';
      this.effects.addScorePopup(`+${points}${comboText}`, avgX, avgY, '#38bdf8');

      // 2. Check Floating / Hanging Clusters
      const floating = MatchFinder.findFloatingBubbles(this.grid, this.matrix);
      if (floating.length > 0) {
        const dropPoints = floating.length * 100 * comboMultiplier;
        this.score += dropPoints;

        this.audio.playDrop();
        this.effects.addFallingBubbles(floating, (r, c) => this.grid.gridToWorld(r, c));

        this.effects.addScorePopup(`+${dropPoints} DÜŞÜŞ BONUSU!`, avgX, avgY + 30, '#f59e0b');

        if (this.coordInfoEl) {
          this.coordInfoEl.textContent = `${matches.length} Patladı! ${floating.length} Balon Düştü!`;
        }
      } else {
        if (this.coordInfoEl) {
          this.coordInfoEl.textContent = `${matches.length} Baloncuk Patlatıldı!`;
        }
      }
    } else {
      // No match reset combo
      this.combo = 0;
      this.score += 10;
      if (this.coordInfoEl) {
        this.coordInfoEl.textContent = `Kenetlendi: (${snappedCell.row}, ${snappedCell.col})`;
      }
    }

    if (this.scoreEl) {
      this.scoreEl.textContent = this.score.toString();
    }
  }

  private gameLoop = (timestamp: number) => {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number) {
    this.shooter.update(dt);
    this.effects.update(dt, this.canvas.height);

    if (this.physics.currentProjectile !== null) {
      const step = this.physics.update(dt, this.matrix);
      if (step.wallBounced) {
        this.audio.playWallBounce();
      }
      if (step.snappedCell) {
        this.handleSnap(step.snappedCell);
      }
    }
  }

  private render() {
    this.renderer.clear();
    this.renderer.drawBoundaries();
    this.renderer.drawGrid(this.matrix);

    // Trajectory Line while aiming
    if (this.physics.currentProjectile === null && (this.shooter.aiming || this.isTouching)) {
      const traj = this.trajectory.calculate(
        this.shooter.origin,
        this.shooter.angle,
        this.matrix,
        2
      );
      this.renderer.drawTrajectory(traj, this.shooter.currentBubbleColor);
    }

    // Visual Effects (Falling Bubbles, Particles, Score Popups)
    this.renderer.drawEffects(this.effects);

    // Shooter Cannon
    this.renderer.drawShooter(this.shooter);

    // Flying Projectile
    if (this.physics.currentProjectile !== null) {
      this.renderer.drawProjectile(this.physics.currentProjectile);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new BubbleShooterGame();
});
