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
  private matrix: GridMatrix;

  private score: number = 0;
  private scoreEl: HTMLElement | null;
  private coordInfoEl: HTMLElement | null;

  private lastTime: number = 0;
  private isTouching: boolean = false;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.scoreEl = document.getElementById('scoreValue');
    this.coordInfoEl = document.getElementById('coordInfo');

    // 480x680 canvas: 10 bubbles wide, 16 rows max
    this.grid = new HexGrid(24, 10, 16);
    this.renderer = new CanvasRenderer(this.canvas, this.grid);
    this.physics = new PhysicsEngine(this.grid);
    this.trajectory = new TrajectoryCalculator(this.grid);
    this.matrix = this.grid.createEmptyMatrix();

    // Cannon at bottom center (x: 240, y: 615)
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
    // Fill first 5 rows with alternating colors
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
    // Mouse Controls
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

      // Check if clicked on Next bubble dock to swap colors
      const nextDockX = this.shooter.origin.x - 80;
      const nextDockY = this.shooter.origin.y + 6;
      if (Math.hypot(pos.x - nextDockX, pos.y - nextDockY) < 32) {
        this.shooter.swapColors();
        return;
      }

      this.fireBubble();
    });

    // Touch Controls (Mobile Friendly)
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 0 || this.physics.currentProjectile !== null) return;
      this.isTouching = true;
      const pos = this.getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);

      // Check tap on swap dock
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

    // Keyboard shortcut to swap (Space)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.shooter.swapColors();
      }
    });
  }

  private fireBubble() {
    if (this.physics.currentProjectile !== null) return;

    const color = this.shooter.consumeBubble();
    const speed = 1250; // px/sec
    this.physics.launch(this.shooter.origin, this.shooter.angle, speed, color);

    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = `Fırlatıldı! [${color}]`;
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

    if (this.physics.currentProjectile !== null) {
      const step = this.physics.update(dt, this.matrix);
      if (step.snappedCell) {
        this.score += 10;
        if (this.scoreEl) {
          this.scoreEl.textContent = this.score.toString();
        }
        if (this.coordInfoEl) {
          this.coordInfoEl.textContent = `Kenetlendi: (${step.snappedCell.row}, ${step.snappedCell.col})`;
        }
      }
    }
  }

  private render() {
    this.renderer.clear();
    this.renderer.drawBoundaries();
    this.renderer.drawGrid(this.matrix);

    // Render Trajectory Line while aiming and no projectile in flight
    if (this.physics.currentProjectile === null && (this.shooter.aiming || this.isTouching)) {
      const traj = this.trajectory.calculate(
        this.shooter.origin,
        this.shooter.angle,
        this.matrix,
        2
      );
      this.renderer.drawTrajectory(traj, this.shooter.currentBubbleColor);
    }

    // Render Shooter Cannon & Loaded/Next Bubbles
    this.renderer.drawShooter(this.shooter);

    // Render Flying Projectile if active
    if (this.physics.currentProjectile !== null) {
      this.renderer.drawProjectile(this.physics.currentProjectile);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new BubbleShooterGame();
});
