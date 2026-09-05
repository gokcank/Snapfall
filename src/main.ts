import { MatchFinder } from './algorithms';
import { SoundEffects } from './audio';
import { EffectsManager } from './effects';
import { HexGrid } from './grid';
import { PhysicsEngine } from './physics';
import { CanvasRenderer } from './renderer';
import { CannonShooter } from './shooter';
import { TrajectoryCalculator } from './trajectory';
import { BubbleColor, GameMode, GameState, GridMatrix } from './types';

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
  private mode: GameMode = 'classic';
  private score: number = 0;
  private highScore: number = 0;
  private level: number = 1;
  private combo: number = 0;
  private foulsLeft: number = 5;
  private maxFouls: number = 5;
  private totalPopped: number = 0;

  private soundEnabled: boolean = true;
  private laserEnabled: boolean = true;
  private settingsOpenedFrom: 'menu' | 'pause' = 'menu';

  // DOM Elements
  private scoreEl: HTMLElement | null;
  private highScoreEl: HTMLElement | null;
  private levelLabelEl: HTMLElement | null;
  private levelEl: HTMLElement | null;
  private coordInfoEl: HTMLElement | null;

  private btnHudSound: HTMLElement | null;
  private btnHudPause: HTMLElement | null;

  private mainMenuModal: HTMLElement | null;
  private menuHighScoreVal: HTMLElement | null;
  private btnModeClassic: HTMLElement | null;
  private btnModeSurvival: HTMLElement | null;
  private modeDescText: HTMLElement | null;
  private btnStartGame: HTMLElement | null;
  private btnOpenSettings: HTMLElement | null;

  private pauseModal: HTMLElement | null;
  private btnResume: HTMLElement | null;
  private btnPauseSettings: HTMLElement | null;
  private btnPauseRestart: HTMLElement | null;
  private btnPauseHome: HTMLElement | null;

  private settingsModal: HTMLElement | null;
  private btnToggleSound: HTMLElement | null;
  private btnToggleLaser: HTMLElement | null;
  private btnCloseSettings: HTMLElement | null;

  private gameOverModal: HTMLElement | null;
  private victoryModal: HTMLElement | null;
  private goScoreEl: HTMLElement | null;
  private goPoppedEl: HTMLElement | null;
  private vicScoreEl: HTMLElement | null;

  private lastTime: number = 0;
  private isTouching: boolean = false;
  private isTouchDevice: boolean = false;
  private bubbleIdCounter: number = 1;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.scoreEl = document.getElementById('scoreValue');
    this.highScoreEl = document.getElementById('highScoreText');
    this.levelLabelEl = document.getElementById('levelLabel');
    this.levelEl = document.getElementById('levelValue');
    this.coordInfoEl = document.getElementById('coordInfo');

    this.btnHudSound = document.getElementById('btnHudSound');
    this.btnHudPause = document.getElementById('btnHudPause');

    this.mainMenuModal = document.getElementById('mainMenuModal');
    this.menuHighScoreVal = document.getElementById('menuHighScoreVal');
    this.btnModeClassic = document.getElementById('btnModeClassic');
    this.btnModeSurvival = document.getElementById('btnModeSurvival');
    this.modeDescText = document.getElementById('modeDescText');
    this.btnStartGame = document.getElementById('btnStartGame');
    this.btnOpenSettings = document.getElementById('btnOpenSettings');

    this.pauseModal = document.getElementById('pauseModal');
    this.btnResume = document.getElementById('btnResume');
    this.btnPauseSettings = document.getElementById('btnPauseSettings');
    this.btnPauseRestart = document.getElementById('btnPauseRestart');
    this.btnPauseHome = document.getElementById('btnPauseHome');

    this.settingsModal = document.getElementById('settingsModal');
    this.btnToggleSound = document.getElementById('btnToggleSound');
    this.btnToggleLaser = document.getElementById('btnToggleLaser');
    this.btnCloseSettings = document.getElementById('btnCloseSettings');

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

    this.loadSavedSettings();
    this.initLevel(this.level);
    this.setupInputs();
    this.setupModalButtons();
    this.setupModeSelector();
    this.setupControlButtons();

    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = 'Snapfall Arcade: Başlamak için OYUNA BAŞLA butonuna dokunun';
    }

    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);
  }

  private loadSavedSettings() {
    const savedScore = localStorage.getItem('snapfall_highscore');
    if (savedScore) {
      this.highScore = parseInt(savedScore, 10) || 0;
      if (this.highScoreEl) {
        this.highScoreEl.textContent = this.highScore.toString();
      }
      if (this.menuHighScoreVal) {
        this.menuHighScoreVal.textContent = this.highScore.toString();
      }
    }

    const savedMode = localStorage.getItem('snapfall_mode') as GameMode | null;
    if (savedMode === 'survival' || savedMode === 'classic') {
      this.setMode(savedMode);
    } else {
      this.setMode('classic');
    }

    const savedSound = localStorage.getItem('snapfall_sound');
    if (savedSound !== null) {
      this.soundEnabled = savedSound === 'true';
    }
    this.audio.setEnabled(this.soundEnabled);
    this.updateSoundDisplay();

    const savedLaser = localStorage.getItem('snapfall_laser');
    if (savedLaser !== null) {
      this.laserEnabled = savedLaser === 'true';
    }
    this.updateLaserDisplay();
  }

  private updateSoundDisplay() {
    if (this.btnHudSound) {
      if (this.soundEnabled) {
        this.btnHudSound.innerHTML = `<svg class="arcade-hud-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fill-opacity="0.3"></polygon><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M19 5a9.5 9.5 0 0 1 0 14"></path></svg>`;
      } else {
        this.btnHudSound.innerHTML = `<svg class="arcade-hud-svg muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fill-opacity="0.3"></polygon><line x1="22" y1="9" x2="16" y2="15"></line><line x1="16" y1="9" x2="22" y2="15"></line></svg>`;
      }
    }
    if (this.btnToggleSound) {
      this.btnToggleSound.textContent = this.soundEnabled ? 'AÇIK' : 'KAPALI';
      if (this.soundEnabled) {
        this.btnToggleSound.classList.add('active');
      } else {
        this.btnToggleSound.classList.remove('active');
      }
    }
  }

  private toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.audio.setEnabled(this.soundEnabled);
    localStorage.setItem('snapfall_sound', this.soundEnabled.toString());
    this.updateSoundDisplay();
  }

  private updateLaserDisplay() {
    if (this.btnToggleLaser) {
      this.btnToggleLaser.textContent = this.laserEnabled ? 'AÇIK' : 'KAPALI';
      if (this.laserEnabled) {
        this.btnToggleLaser.classList.add('active');
      } else {
        this.btnToggleLaser.classList.remove('active');
      }
    }
  }

  private toggleLaser() {
    this.laserEnabled = !this.laserEnabled;
    localStorage.setItem('snapfall_laser', this.laserEnabled.toString());
    this.updateLaserDisplay();
  }

  private setMode(newMode: GameMode) {
    this.mode = newMode;
    localStorage.setItem('snapfall_mode', newMode);

    if (this.btnModeClassic && this.btnModeSurvival && this.modeDescText) {
      if (newMode === 'classic') {
        this.btnModeClassic.classList.add('active');
        this.btnModeSurvival.classList.remove('active');
        this.modeDescText.textContent = 'Bölüm bazlı: Tüm balonları temizleyerek seviyeleri aşın.';
      } else {
        this.btnModeSurvival.classList.add('active');
        this.btnModeClassic.classList.remove('active');
        this.modeDescText.textContent = 'Sonsuz mod: Balonlar sürekli yenilenir, rekor skoru hedefleyin!';
      }
    }

    this.updateLevelDisplay();
  }

  private updateLevelDisplay() {
    if (this.mode === 'classic') {
      if (this.levelLabelEl) this.levelLabelEl.textContent = 'Seviye';
      if (this.levelEl) this.levelEl.textContent = this.level.toString();
    } else {
      if (this.levelLabelEl) this.levelLabelEl.textContent = 'Mod';
      if (this.levelEl) this.levelEl.textContent = 'Sonsuz';
    }
  }

  private updateHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('snapfall_highscore', this.highScore.toString());
      if (this.highScoreEl) {
        this.highScoreEl.textContent = this.highScore.toString();
      }
      if (this.menuHighScoreVal) {
        this.menuHighScoreVal.textContent = this.highScore.toString();
      }
    }
  }

  private initLevel(lvl: number) {
    this.grid.resetCeiling();
    this.matrix = this.grid.createEmptyMatrix();

    if (this.mode === 'classic') {
      this.maxFouls = 5;
      this.foulsLeft = 5;
    } else {
      this.maxFouls = 4;
      this.foulsLeft = 4;
    }

    this.updateLevelDisplay();

    const colors = [
      BubbleColor.RED,
      BubbleColor.BLUE,
      BubbleColor.GREEN,
      BubbleColor.YELLOW,
      BubbleColor.PURPLE
    ];

    const initialRows = this.mode === 'classic' ? Math.min(6, 3 + lvl) : 5;
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

    const { colors: activeColors, total: totalBubbles } = this.grid.getActiveColors(this.matrix);
    this.shooter.resetColors(activeColors, totalBubbles);

    if (this.state === 'playing' && this.coordInfoEl) {
      this.coordInfoEl.textContent = this.mode === 'classic' ? `Seviye ${lvl} Başladı!` : 'Sonsuz Hayatta Kalma Başladı!';
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
      if (this.isTouchDevice || this.state !== 'playing' || this.physics.currentProjectile !== null) return;
      const pos = this.getCanvasPos(e.clientX, e.clientY);
      this.shooter.setAimTarget(pos.x, pos.y);
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (!this.isTouching) {
        this.shooter.stopAiming();
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.isTouchDevice || this.state !== 'playing' || this.physics.currentProjectile !== null) return;
      const pos = this.getCanvasPos(e.clientX, e.clientY);

      const nextDockX = this.shooter.origin.x - 80;
      const nextDockY = this.shooter.origin.y + 6;
      if (Math.hypot(pos.x - nextDockX, pos.y - nextDockY) < 32) {
        this.shooter.swapColors();
        return;
      }

      this.fireBubble();
      this.shooter.stopAiming();
    });

    this.canvas.addEventListener('touchstart', (e) => {
      this.isTouchDevice = true;
      if (this.state !== 'playing' || e.touches.length === 0 || this.physics.currentProjectile !== null) return;
      this.isTouching = true;
      const pos = this.getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);

      const nextDockX = this.shooter.origin.x - 80;
      const nextDockY = this.shooter.origin.y + 6;
      if (Math.hypot(pos.x - nextDockX, pos.y - nextDockY) < 36) {
        this.shooter.swapColors();
        this.isTouching = false;
        this.shooter.stopAiming();
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
        this.shooter.stopAiming();
        this.fireBubble();
      } else {
        this.isTouching = false;
        this.shooter.stopAiming();
      }
    });

    this.canvas.addEventListener('touchcancel', () => {
      this.isTouching = false;
      this.shooter.stopAiming();
    });

    window.addEventListener('keydown', (e) => {
      if (this.state === 'playing' && e.code === 'Space') {
        this.shooter.swapColors();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'playing') {
          this.pauseGame();
        } else if (this.state === 'paused') {
          this.resumeGame();
        }
      }
    });
  }

  private setupModeSelector() {
    this.btnModeClassic?.addEventListener('click', () => {
      this.setMode('classic');
    });

    this.btnModeSurvival?.addEventListener('click', () => {
      this.setMode('survival');
    });
  }

  private setupControlButtons() {
    this.btnHudSound?.addEventListener('click', () => {
      this.toggleSound();
    });

    this.btnHudPause?.addEventListener('click', () => {
      if (this.state === 'playing') {
        this.pauseGame();
      }
    });

    this.btnResume?.addEventListener('click', () => {
      this.resumeGame();
    });

    this.btnPauseRestart?.addEventListener('click', () => {
      this.resumeGame();
      this.restartGame();
    });

    this.btnPauseHome?.addEventListener('click', () => {
      if (this.pauseModal) this.pauseModal.classList.add('hidden');
      this.returnToMainMenu();
    });

    this.btnOpenSettings?.addEventListener('click', () => {
      this.openSettings('menu');
    });

    this.btnPauseSettings?.addEventListener('click', () => {
      this.openSettings('pause');
    });

    this.btnToggleSound?.addEventListener('click', () => {
      this.toggleSound();
    });

    this.btnToggleLaser?.addEventListener('click', () => {
      this.toggleLaser();
    });

    this.btnCloseSettings?.addEventListener('click', () => {
      this.closeSettings();
    });

    // Arcade Cabinet CPO Action Buttons
    const btnA = document.querySelector('.cpo-arcade-btn.btn-a');
    const btnB = document.querySelector('.cpo-arcade-btn.btn-b');
    const btnC = document.querySelector('.cpo-arcade-btn.btn-c');
    const btnD = document.querySelector('.cpo-arcade-btn.btn-d');

    btnA?.addEventListener('click', () => {
      if (this.state === 'playing') {
        this.fireBubble();
      }
    });

    btnB?.addEventListener('click', () => {
      if (this.state === 'playing') {
        this.shooter.swapColors();
      }
    });

    btnC?.addEventListener('click', () => {
      this.toggleSound();
    });

    btnD?.addEventListener('click', () => {
      this.toggleLaser();
    });

    // Arcade Joystick Interactive Drag & Aim
    const stickWrap = document.querySelector('.cpo-joystick-wrap') as HTMLElement | null;
    const stickBall = document.querySelector('.cpo-joystick-ball') as HTMLElement | null;
    if (stickWrap && stickBall) {
      let isDraggingStick = false;
      const onStickMove = (clientX: number) => {
        if (!isDraggingStick) return;
        const rect = stickWrap.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const diffX = clientX - centerX;
        const clampedDiff = Math.max(-14, Math.min(14, diffX));
        stickBall.style.transform = `translate(${clampedDiff}px, ${Math.abs(clampedDiff) * 0.3}px)`;
        
        // Tilt aim angle
        if (this.state === 'playing') {
          const aimX = this.shooter.origin.x + (clampedDiff / 14) * 220;
          const aimY = this.shooter.origin.y - 300;
          this.shooter.setAimTarget(aimX, aimY);
        }
      };

      stickWrap.addEventListener('pointerdown', (e) => {
        isDraggingStick = true;
        stickWrap.setPointerCapture(e.pointerId);
        onStickMove(e.clientX);
      });

      stickWrap.addEventListener('pointermove', (e) => {
        if (isDraggingStick) {
          onStickMove(e.clientX);
        }
      });

      const onStickRelease = () => {
        if (isDraggingStick) {
          isDraggingStick = false;
          stickBall.style.transform = 'translate(0px, 0px)';
        }
      };

      stickWrap.addEventListener('pointerup', onStickRelease);
      stickWrap.addEventListener('pointercancel', onStickRelease);
    }
  }

  private setupModalButtons() {
    this.btnStartGame?.addEventListener('click', () => {
      this.startGameFromMenu();
    });

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

  private pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    if (this.pauseModal) this.pauseModal.classList.remove('hidden');
    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = 'Oyun Duraklatıldı';
    }
  }

  private resumeGame() {
    if (this.state !== 'paused') return;
    if (this.pauseModal) this.pauseModal.classList.add('hidden');
    this.state = 'playing';
    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = 'Nişan almak için dokunun veya sürükleyin';
    }
  }

  private openSettings(from: 'menu' | 'pause') {
    this.settingsOpenedFrom = from;
    if (from === 'menu' && this.mainMenuModal) this.mainMenuModal.classList.add('hidden');
    if (from === 'pause' && this.pauseModal) this.pauseModal.classList.add('hidden');
    if (this.settingsModal) this.settingsModal.classList.remove('hidden');
  }

  private closeSettings() {
    if (this.settingsModal) this.settingsModal.classList.add('hidden');
    if (this.settingsOpenedFrom === 'menu') {
      if (this.mainMenuModal) this.mainMenuModal.classList.remove('hidden');
    } else {
      if (this.pauseModal) this.pauseModal.classList.remove('hidden');
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
    if (this.pauseModal) this.pauseModal.classList.add('hidden');
    if (this.settingsModal) this.settingsModal.classList.add('hidden');
    if (this.mainMenuModal) this.mainMenuModal.classList.remove('hidden');
    this.state = 'menu';
    this.loadSavedSettings();
    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = 'Snapfall Arcade: Başlamak için OYUNA BAŞLA butonuna dokunun';
    }
  }

  private fireBubble() {
    if (this.physics.currentProjectile !== null) return;

    this.shooter.stopAiming();

    const { colors: activeColors, total: totalBubbles } = this.grid.getActiveColors(this.matrix);
    const color = this.shooter.consumeBubble(activeColors, totalBubbles);
    const speed = 1250;
    this.physics.launch(this.shooter.origin, this.shooter.angle, speed, color);

    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = `Ateşlendi! [${color}]`;
    }
  }

  private countTotalBubbles(): number {
    let count = 0;
    for (let r = 0; r < this.grid.maxRows; r++) {
      const cols = this.grid.getColsInRow(r);
      for (let c = 0; c < cols; c++) {
        if (this.matrix[r][c] !== null) count++;
      }
    }
    return count;
  }

  private replenishSurvivalRow() {
    const colors = [
      BubbleColor.RED,
      BubbleColor.BLUE,
      BubbleColor.GREEN,
      BubbleColor.YELLOW,
      BubbleColor.PURPLE
    ];

    for (let r = 0; r < 3; r++) {
      const cols = this.grid.getColsInRow(r);
      for (let c = 0; c < cols; c++) {
        if (this.matrix[r][c] === null) {
          const color = colors[Math.floor(Math.random() * colors.length)];
          this.matrix[r][c] = {
            id: `b-${this.bubbleIdCounter++}`,
            color,
            row: r,
            col: c,
            state: 'idle'
          };
        }
      }
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

      // 90s Retro Arcade Comic Burst Badge
      let burstText = 'POP!';
      let burstColor = '#ffd600';
      if (this.combo >= 3) {
        burstText = 'SUPER!';
        burstColor = '#ff3355';
      } else if (this.combo === 2) {
        burstText = 'GREAT!';
        burstColor = '#00e676';
      } else if (matches.length >= 5) {
        burstText = 'BOOM!';
        burstColor = '#ff6d00';
      }
      this.effects.addComicBurst(burstText, avgX, avgY - 18, burstColor);

      // 2. Check Floating / Hanging Clusters
      const floating = MatchFinder.findFloatingBubbles(this.grid, this.matrix);
      if (floating.length > 0) {
        const dropPoints = floating.length * 100 * comboMultiplier;
        this.score += dropPoints;
        this.totalPopped += floating.length;

        this.audio.playDrop();
        this.effects.addFallingBubbles(floating, (r, c) => this.grid.gridToWorld(r, c));

        this.effects.addScorePopup(`+${dropPoints} DÜŞÜŞ BONUSU!`, avgX, avgY + 30, '#f59e0b');

        let dropText = 'CRASH!';
        let dropColor = '#ff9100';
        if (floating.length >= 6) {
          dropText = 'PERFECT!';
          dropColor = '#ffd600';
        }
        this.effects.addComicBurst(dropText, avgX + (Math.random() - 0.5) * 40, avgY + 32, dropColor);

        if (this.coordInfoEl) {
          this.coordInfoEl.textContent = `${matches.length} Patlatıldı! ${floating.length} Düştü!`;
        }
      } else {
        if (this.coordInfoEl) {
          this.coordInfoEl.textContent = `${matches.length} Baloncuk Patlatıldı!`;
        }
      }

      // Check Victory vs Endless Replenish
      if (this.mode === 'classic') {
        if (this.grid.isGridEmpty(this.matrix)) {
          this.triggerVictory();
          return;
        }
      } else {
        if (this.countTotalBubbles() < 18) {
          this.replenishSurvivalRow();
        }
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
    if (this.pauseModal) this.pauseModal.classList.add('hidden');
    if (this.settingsModal) this.settingsModal.classList.add('hidden');
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

    // Trajectory Line (only when laser enabled, playing, no projectile in flight, and actively aiming)
    const isActivelyAiming = this.isTouchDevice ? this.isTouching : (this.shooter.aiming || this.isTouching);
    if (this.laserEnabled && this.state === 'playing' && this.physics.currentProjectile === null && isActivelyAiming) {
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
