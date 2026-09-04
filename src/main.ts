import { MatchFinder } from './algorithms';
import { SoundEffects } from './audio';
import { EffectsManager } from './effects';
import { HexGrid } from './grid';
import { PhysicsEngine } from './physics';
import { CanvasRenderer } from './renderer';
import { CannonShooter } from './shooter';
import { TrajectoryCalculator } from './trajectory';
import { BubbleColor, GameState, GridMatrix } from './types';

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

  private state: GameState = 'menu';
  private score: number = 0;
  private highScore: number = 0;
  private level: number = 1;
  private combo: number = 0;
  private foulsLeft: number = 5;
  private maxFouls: number = 5;
  private totalPopped: number = 0;

  // DOM Elements
  private scoreEl: HTMLElement | null;
  private highScoreEl: HTMLElement | null;
  private levelEl: HTMLElement | null;
  private coordInfoEl: HTMLElement | null;
  private mainMenuModal: HTMLElement | null;
  private menuHighScoreVal: HTMLElement | null;
  private gameOverModal: HTMLElement | null;
  private victoryModal: HTMLElement | null;
  private goScoreEl: HTMLElement | null;
  private goPoppedEl: HTMLElement | null;
  private vicScoreEl: HTMLElement | null;

  private lastTime: number = 0;
  private isTouching: boolean = false;
  private bubbleIdCounter: number = 1;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.scoreEl = document.getElementById('scoreValue');
    this.highScoreEl = document.getElementById('highScoreText');
    this.levelEl = document.getElementById('levelValue');
    this.coordInfoEl = document.getElementById('coordInfo');

    this.mainMenuModal = document.getElementById('mainMenuModal');
    this.menuHighScoreVal = document.getElementById('menuHighScoreVal');
    this.gameOverModal = document.getElementById('gameOverModal');
    this.victoryModal = document.getElementById('victoryModal');
    this.goScoreEl = document.getElementById('goScore');
    this.goPoppedEl = document.getElementById('goPopped');
    this.vicScoreEl = document.getElementById('vicScore');

    this.grid = new HexGrid(24, 10, 16);
    this.renderer = new CanvasRenderer(this.canvas, this.grid);
    this.physics = new PhysicsEngine(this.grid);
    this.trajectory = new TrajectoryCalculator(this.grid);
    this.effects = new EffectsManager();
    this.audio = new SoundEffects();
    this.matrix = this.grid.createEmptyMatrix();

    this.shooter = new CannonShooter({ x: this.canvas.width / 2, y: 615 });

    this.loadHighScore();
    this.initLevel(this.level);
    this.setupInputs();
    this.setupModalButtons();

    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = 'Snapfall Arcade: Başlamak için OYUNA BAŞLA butonuna dokunun';
    }

    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);
  }

  private loadHighScore() {
    const saved = localStorage.getItem('snapfall_highscore');
    if (saved) {
      this.highScore = parseInt(saved, 10) || 0;
      if (this.highScoreEl) {
        this.highScoreEl.textContent = `En Yüksek: ${this.highScore}`;
      }
      if (this.menuHighScoreVal) {
        this.menuHighScoreVal.textContent = this.highScore.toString();
      }
    }
  }

  private updateHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('snapfall_highscore', this.highScore.toString());
      if (this.highScoreEl) {
        this.highScoreEl.textContent = `En Yüksek: ${this.highScore}`;
      }
      if (this.menuHighScoreVal) {
        this.menuHighScoreVal.textContent = this.highScore.toString();
      }
    }
  }

  private initLevel(lvl: number) {
    this.grid.resetCeiling();
    this.matrix = this.grid.createEmptyMatrix();
    this.foulsLeft = this.maxFouls;

    if (this.levelEl) {
      this.levelEl.textContent = lvl.toString();
    }

    const colors = [
      BubbleColor.RED,
      BubbleColor.BLUE,
      BubbleColor.GREEN,
      BubbleColor.YELLOW,
      BubbleColor.PURPLE
    ];

    const initialRows = Math.min(6, 3 + lvl);
    for (let r = 0; r < initialRows; r++) {
      const cols = this.grid.getColsInRow(r);
      for (let c = 0; c < cols; c++) {
        const color = colors[(r * 3 + c + Math.floor(c / 2)) % colors.length];
        this.matrix[r][c] = {
          id: `b-${this.bubbleIdCounter++}`,
          color,
          row: r,
          col: c,
          state: 'idle'
        };
      }
    }

    if (this.state === 'playing' && this.coordInfoEl) {
      this.coordInfoEl.textContent = `Seviye ${lvl} Başladı!`;
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
      if (this.state !== 'playing' || this.physics.currentProjectile !== null) return;
      const pos = this.getCanvasPos(e.clientX, e.clientY);
      this.shooter.setAimTarget(pos.x, pos.y);
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (!this.isTouching) {
        this.shooter.stopAiming();
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.state !== 'playing' || this.physics.currentProjectile !== null) return;
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
      if (this.state !== 'playing' || e.touches.length === 0 || this.physics.currentProjectile !== null) return;
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
      if (this.isTouching && this.state === 'playing' && this.physics.currentProjectile === null) {
        this.isTouching = false;
        this.fireBubble();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (this.state === 'playing' && e.code === 'Space') {
        this.shooter.swapColors();
      }
    });
  }

  private setupModalButtons() {
    const btnStartGame = document.getElementById('btnStartGame');
    if (btnStartGame) {
      btnStartGame.addEventListener('click', () => {
        this.startGameFromMenu();
      });
    }

    const btnRestart = document.getElementById('btnRestart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        this.restartGame();
      });
    }

    const btnNextLevel = document.getElementById('btnNextLevel');
    if (btnNextLevel) {
      btnNextLevel.addEventListener('click', () => {
        this.advanceNextLevel();
      });
    }

    const btnGoHome = document.getElementById('btnGoHome');
    if (btnGoHome) {
      btnGoHome.addEventListener('click', () => {
        this.returnToMainMenu();
      });
    }

    const btnVicHome = document.getElementById('btnVicHome');
    if (btnVicHome) {
      btnVicHome.addEventListener('click', () => {
        this.returnToMainMenu();
      });
    }
  }

  private startGameFromMenu() {
    if (this.mainMenuModal) this.mainMenuModal.classList.add('hidden');
    this.restartGame();
    this.state = 'playing';
    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = 'Nişan almak için dokunun veya sürükleyin';
    }
  }

  private returnToMainMenu() {
    if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
    if (this.victoryModal) this.victoryModal.classList.add('hidden');
    if (this.mainMenuModal) this.mainMenuModal.classList.remove('hidden');
    this.state = 'menu';
    this.loadHighScore();
    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = 'Snapfall Arcade: Başlamak için OYUNA BAŞLA butonuna dokunun';
    }
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
      this.totalPopped += matches.length;

      this.audio.playPop(this.combo);

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
        this.totalPopped += floating.length;

        this.audio.playDrop();
        this.effects.addFallingBubbles(floating, (r, c) => this.grid.gridToWorld(r, c));

        this.effects.addScorePopup(`+${dropPoints} DÜŞÜŞ BONUSU!`, avgX, avgY + 30, '#f59e0b');

        if (this.coordInfoEl) {
          this.coordInfoEl.textContent = `${matches.length} Patlatıldı! ${floating.length} Düştü!`;
        }
      } else {
        if (this.coordInfoEl) {
          this.coordInfoEl.textContent = `${matches.length} Baloncuk Patlatıldı!`;
        }
      }

      // Check Victory
      if (this.grid.isGridEmpty(this.matrix)) {
        this.triggerVictory();
        return;
      }
    } else {
      this.combo = 0;
      this.score += 10;
      this.foulsLeft--;

      if (this.foulsLeft <= 0) {
        this.triggerCeilingDescent();
      } else {
        if (this.coordInfoEl) {
          this.coordInfoEl.textContent = `Kilitlendi: (${snappedCell.row}, ${snappedCell.col}) | Tavan: ${this.foulsLeft}`;
        }
      }
    }

    // Always clean up any unanchored bubbles
    const lingeringFloating = MatchFinder.findFloatingBubbles(this.grid, this.matrix);
    if (lingeringFloating.length > 0) {
      this.effects.addFallingBubbles(lingeringFloating, (r, c) => this.grid.gridToWorld(r, c));
    }

    this.updateHighScore();
    if (this.scoreEl) {
      this.scoreEl.textContent = this.score.toString();
    }

    // Check Game Over threshold (danger line at y = 520)
    if (this.grid.hasReachedDangerLine(this.matrix, 520)) {
      this.triggerGameOver();
    }
  }

  private triggerCeilingDescent() {
    this.foulsLeft = this.maxFouls;
    this.audio.playWarning();

    const dangerHit = this.grid.lowerCeiling(1, 520);

    // After ceiling drops, immediately drop any disconnected bubbles
    const floating = MatchFinder.findFloatingBubbles(this.grid, this.matrix);
    if (floating.length > 0) {
      this.audio.playDrop();
      this.effects.addFallingBubbles(floating, (r, c) => this.grid.gridToWorld(r, c));
    }

    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = '⚠️ DİKKAT! Tavan bir kademe alçaldı!';
    }

    if (dangerHit || this.grid.hasReachedDangerLine(this.matrix, 520)) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver() {
    this.state = 'gameover';
    this.audio.playGameOver();

    if (this.goScoreEl) this.goScoreEl.textContent = this.score.toString();
    if (this.goPoppedEl) this.goPoppedEl.textContent = this.totalPopped.toString();
    if (this.gameOverModal) this.gameOverModal.classList.remove('hidden');
  }

  private triggerVictory() {
    this.state = 'victory';
    this.audio.playVictory();

    this.score += 1000;
    this.updateHighScore();

    if (this.vicScoreEl) this.vicScoreEl.textContent = this.score.toString();
    if (this.victoryModal) this.victoryModal.classList.remove('hidden');
  }

  private restartGame() {
    if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
    if (this.victoryModal) this.victoryModal.classList.add('hidden');
    if (this.mainMenuModal) this.mainMenuModal.classList.add('hidden');
    this.score = 0;
    this.totalPopped = 0;
    this.level = 1;
    this.combo = 0;
    if (this.scoreEl) this.scoreEl.textContent = '0';
    this.initLevel(this.level);
    this.state = 'playing';
  }

  private advanceNextLevel() {
    if (this.victoryModal) this.victoryModal.classList.add('hidden');
    this.level++;
    this.initLevel(this.level);
    this.state = 'playing';
  }

  private gameLoop = (timestamp: number) => {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number) {
    this.effects.update(dt, this.canvas.height);

    if (this.state === 'playing') {
      this.shooter.update(dt);

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
  }

  private render() {
    this.renderer.clear();

    const dangerActive = this.grid.hasReachedDangerLine(this.matrix, 480);
    this.renderer.drawBoundaries(dangerActive);
    this.renderer.drawGrid(this.matrix);

    // Trajectory Line (only when actively playing)
    if (this.state === 'playing' && this.physics.currentProjectile === null && (this.shooter.aiming || this.isTouching)) {
      const traj = this.trajectory.calculate(
        this.shooter.origin,
        this.shooter.angle,
        this.matrix,
        2
      );
      this.renderer.drawTrajectory(traj, this.shooter.currentBubbleColor);
    }

    // Visual Effects
    this.renderer.drawEffects(this.effects);

    // Shooter Cannon & Foul Indicators
    this.renderer.drawShooter(this.shooter, this.foulsLeft, this.maxFouls);

    // Projectile in flight
    if (this.physics.currentProjectile !== null) {
      this.renderer.drawProjectile(this.physics.currentProjectile);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new BubbleShooterGame();
});
