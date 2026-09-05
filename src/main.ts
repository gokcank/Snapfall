import { MatchFinder } from './algorithms';
import { SoundEffects } from './audio';
import { EffectsManager } from './effects';
import { HexGrid } from './grid';
import { PhysicsEngine } from './physics';
import { CanvasRenderer } from './renderer';
import { CannonShooter } from './shooter';
import { TrajectoryCalculator } from './trajectory';
import { BubbleColor, GameMode, GameState, GridMatrix, LeaderboardEntry } from './types';

const VICTORY_BONUS = 1000;
const TIME_ATTACK_DURATION = 90;
const PUZZLE_ROW_SCHEDULE = [3, 4, 5, 6];
const PUZZLE_SHOT_MARGIN = 6;
const HIGH_SCORE_KEY_PREFIX = 'snapfall_highscore_';
const LEADERBOARD_KEY_PREFIX = 'snapfall_leaderboard_';
const LEADERBOARD_SIZE = 5;
const NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const MODE_DESCRIPTIONS: Record<GameMode, string> = {
  classic: 'Bölüm bazlı: Tüm balonları temizleyerek seviyeleri aşın.',
  survival: 'Sonsuz mod: Balonlar sürekli yenilenir, rekor skoru hedefleyin!',
  timeattack: 'Zamana karşı: 90 saniyede mümkün olduğunca çok baloncuk patlatın.',
  puzzle: 'Bulmaca: Sınırlı atışla tahtayı tamamen temizlemeye çalışın.'
};

const MODE_LABELS: Record<GameMode, string> = {
  classic: 'Klasik',
  survival: 'Sonsuz',
  timeattack: 'Zamana Karşı',
  puzzle: 'Bulmaca'
};

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
  private highScores: Record<GameMode, number> = { classic: 0, survival: 0, timeattack: 0, puzzle: 0 };
  private level: number = 1;
  private combo: number = 0;
  private foulsLeft: number = 5;
  private maxFouls: number = 5;
  private totalPopped: number = 0;
  private timeRemaining: number = 0;
  private shotsRemaining: number = 0;
  private modeButtons: { mode: GameMode; el: HTMLElement | null }[] = [];
  private leaderboards: Record<GameMode, LeaderboardEntry[]> = { classic: [], survival: [], timeattack: [], puzzle: [] };
  private nameEntryLetters: number[] = [0, 0, 0];
  private pendingGameOverReason: 'danger' | 'timeup' | 'noshots' = 'danger';

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
  private btnModeTimeAttack: HTMLElement | null;
  private btnModePuzzle: HTMLElement | null;
  private modeDescText: HTMLElement | null;
  private btnStartGame: HTMLElement | null;
  private btnOpenSettings: HTMLElement | null;
  private btnOpenAbout: HTMLElement | null;
  private aboutModal: HTMLElement | null;
  private btnCloseAbout: HTMLElement | null;
  private btnOpenScoring: HTMLElement | null;
  private scoringModal: HTMLElement | null;
  private btnCloseScoring: HTMLElement | null;
  private vicBonusVal: HTMLElement | null;
  private btnOpenLeaderboard: HTMLElement | null;
  private leaderboardModal: HTMLElement | null;
  private btnCloseLeaderboard: HTMLElement | null;
  private leaderboardModeLabelEl: HTMLElement | null;
  private leaderboardListEl: HTMLElement | null;
  private nameEntryModal: HTMLElement | null;
  private nameEntryScoreVal: HTMLElement | null;
  private nameLetterEls: (HTMLElement | null)[];
  private btnSaveName: HTMLElement | null;

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
  private goTitleEl: HTMLElement | null;
  private goSubtitleEl: HTMLElement | null;
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
    this.btnModeTimeAttack = document.getElementById('btnModeTimeAttack');
    this.btnModePuzzle = document.getElementById('btnModePuzzle');
    this.modeDescText = document.getElementById('modeDescText');
    this.modeButtons = [
      { mode: 'classic', el: this.btnModeClassic },
      { mode: 'survival', el: this.btnModeSurvival },
      { mode: 'timeattack', el: this.btnModeTimeAttack },
      { mode: 'puzzle', el: this.btnModePuzzle }
    ];
    this.btnStartGame = document.getElementById('btnStartGame');
    this.btnOpenSettings = document.getElementById('btnOpenSettings');
    this.btnOpenAbout = document.getElementById('btnOpenAbout');
    this.aboutModal = document.getElementById('aboutModal');
    this.btnCloseAbout = document.getElementById('btnCloseAbout');
    this.btnOpenScoring = document.getElementById('btnOpenScoring');
    this.scoringModal = document.getElementById('scoringModal');
    this.btnCloseScoring = document.getElementById('btnCloseScoring');
    this.vicBonusVal = document.getElementById('vicBonusVal');
    this.btnOpenLeaderboard = document.getElementById('btnOpenLeaderboard');
    this.leaderboardModal = document.getElementById('leaderboardModal');
    this.btnCloseLeaderboard = document.getElementById('btnCloseLeaderboard');
    this.leaderboardModeLabelEl = document.getElementById('leaderboardModeLabel');
    this.leaderboardListEl = document.getElementById('leaderboardList');
    this.nameEntryModal = document.getElementById('nameEntryModal');
    this.nameEntryScoreVal = document.getElementById('nameEntryScoreVal');
    this.nameLetterEls = [
      document.getElementById('nameLetter0'),
      document.getElementById('nameLetter1'),
      document.getElementById('nameLetter2')
    ];
    this.btnSaveName = document.getElementById('btnSaveName');

    const scoringVictoryBonusEl = document.getElementById('scoringVictoryBonus');
    if (scoringVictoryBonusEl) scoringVictoryBonusEl.textContent = `+${VICTORY_BONUS}`;
    if (this.vicBonusVal) this.vicBonusVal.textContent = `+${VICTORY_BONUS}`;

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
    this.goTitleEl = document.getElementById('goTitle');
    this.goSubtitleEl = document.getElementById('goSubtitle');
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
    (['classic', 'survival', 'timeattack', 'puzzle'] as GameMode[]).forEach((m) => {
      const saved = localStorage.getItem(HIGH_SCORE_KEY_PREFIX + m);
      this.highScores[m] = saved ? parseInt(saved, 10) || 0 : 0;

      const savedBoard = localStorage.getItem(LEADERBOARD_KEY_PREFIX + m);
      try {
        this.leaderboards[m] = savedBoard ? JSON.parse(savedBoard) : [];
      } catch {
        this.leaderboards[m] = [];
      }
    });

    const savedMode = localStorage.getItem('snapfall_mode') as GameMode | null;
    if (savedMode === 'survival' || savedMode === 'classic' || savedMode === 'timeattack' || savedMode === 'puzzle') {
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
    if (this.soundEnabled && this.state === 'playing') {
      this.audio.playBackgroundMusic();
    }
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

    for (const { mode, el } of this.modeButtons) {
      el?.classList.toggle('active', mode === newMode);
    }
    if (this.modeDescText) {
      this.modeDescText.textContent = MODE_DESCRIPTIONS[newMode];
    }

    this.updateLevelDisplay();
    this.updateHighScoreDisplays();
  }

  private formatTime(seconds: number): string {
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  }

  private updateLevelDisplay() {
    if (!this.levelLabelEl || !this.levelEl) return;

    switch (this.mode) {
      case 'classic':
        this.levelLabelEl.textContent = 'Seviye';
        this.levelEl.textContent = this.level.toString();
        break;
      case 'survival':
        this.levelLabelEl.textContent = 'Mod';
        this.levelEl.textContent = 'Sonsuz';
        break;
      case 'timeattack':
        this.levelLabelEl.textContent = 'Süre';
        this.levelEl.textContent = this.formatTime(this.timeRemaining);
        break;
      case 'puzzle':
        this.levelLabelEl.textContent = 'Atış';
        this.levelEl.textContent = this.shotsRemaining.toString();
        break;
    }
  }

  private updateHighScoreDisplays() {
    const score = this.highScores[this.mode];
    if (this.highScoreEl) this.highScoreEl.textContent = score.toString();
    if (this.menuHighScoreVal) this.menuHighScoreVal.textContent = score.toString();
  }

  private updateHighScore() {
    if (this.score > this.highScores[this.mode]) {
      this.highScores[this.mode] = this.score;
      localStorage.setItem(HIGH_SCORE_KEY_PREFIX + this.mode, this.score.toString());
      this.updateHighScoreDisplays();
    }
  }

  private qualifiesForLeaderboard(mode: GameMode, score: number): boolean {
    const list = this.leaderboards[mode];
    if (list.length < LEADERBOARD_SIZE) return true;
    return score > list[list.length - 1].score;
  }

  private addLeaderboardEntry(mode: GameMode, name: string, score: number) {
    const list = [...this.leaderboards[mode], { name, score }];
    list.sort((a, b) => b.score - a.score);
    this.leaderboards[mode] = list.slice(0, LEADERBOARD_SIZE);
    localStorage.setItem(LEADERBOARD_KEY_PREFIX + mode, JSON.stringify(this.leaderboards[mode]));
  }

  private renderLeaderboard() {
    if (this.leaderboardModeLabelEl) this.leaderboardModeLabelEl.textContent = MODE_LABELS[this.mode];
    if (!this.leaderboardListEl) return;

    const list = this.leaderboards[this.mode];
    if (list.length === 0) {
      this.leaderboardListEl.innerHTML = '<li class="leaderboard-empty">Henüz kayıt yok</li>';
      return;
    }

    this.leaderboardListEl.innerHTML = list
      .map((entry, i) => `<li><span class="leaderboard-rank">${i + 1}</span><span class="leaderboard-name">${entry.name}</span><span class="leaderboard-score">${entry.score}</span></li>`)
      .join('');
  }

  private updateNameEntryDisplay() {
    this.nameLetterEls.forEach((el, i) => {
      if (el) el.textContent = NAME_CHARS[this.nameEntryLetters[i]];
    });
  }

  private showNameEntry() {
    this.nameEntryLetters = [0, 0, 0];
    this.updateNameEntryDisplay();
    if (this.nameEntryScoreVal) this.nameEntryScoreVal.textContent = this.score.toString();
    if (this.nameEntryModal) this.nameEntryModal.classList.remove('hidden');
  }

  private saveNameEntry() {
    const name = this.nameEntryLetters.map((i) => NAME_CHARS[i]).join('');
    this.addLeaderboardEntry(this.mode, name, this.score);
    if (this.nameEntryModal) this.nameEntryModal.classList.add('hidden');
    this.showGameOverModal(this.pendingGameOverReason);
  }

  private fillProceduralRows(colors: BubbleColor[], rows: number) {
    for (let r = 0; r < rows; r++) {
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
  }

  private fillPuzzleBoard(lvl: number) {
    const colors = [
      BubbleColor.RED,
      BubbleColor.BLUE,
      BubbleColor.GREEN,
      BubbleColor.YELLOW,
      BubbleColor.PURPLE
    ];
    const rows = PUZZLE_ROW_SCHEDULE[Math.min(lvl - 1, PUZZLE_ROW_SCHEDULE.length - 1)];
    this.fillProceduralRows(colors, rows);

    const { total } = this.grid.getActiveColors(this.matrix);
    this.shotsRemaining = total + PUZZLE_SHOT_MARGIN;
  }

  private initLevel(lvl: number) {
    this.grid.resetCeiling();
    this.matrix = this.grid.createEmptyMatrix();

    const colors = [
      BubbleColor.RED,
      BubbleColor.BLUE,
      BubbleColor.GREEN,
      BubbleColor.YELLOW,
      BubbleColor.PURPLE
    ];

    // Fouls only trigger the descending ceiling in classic/survival; in the
    // other two modes they're kept lit purely for the shooter HUD's dots.
    if (this.mode === 'classic') {
      this.maxFouls = 5;
      this.foulsLeft = 5;
      this.fillProceduralRows(colors, Math.min(6, 3 + lvl));
    } else if (this.mode === 'survival') {
      this.maxFouls = 4;
      this.foulsLeft = 4;
      this.fillProceduralRows(colors, 5);
    } else if (this.mode === 'timeattack') {
      this.maxFouls = 4;
      this.foulsLeft = 4;
      this.timeRemaining = TIME_ATTACK_DURATION;
      this.fillProceduralRows(colors, 5);
    } else {
      this.maxFouls = 5;
      this.foulsLeft = 5;
      this.fillPuzzleBoard(lvl);
    }

    this.updateLevelDisplay();

    const { colors: activeColors, total: totalBubbles } = this.grid.getActiveColors(this.matrix);
    this.shooter.resetColors(activeColors, totalBubbles);

    if (this.state === 'playing' && this.coordInfoEl) {
      if (this.mode === 'classic') {
        this.coordInfoEl.textContent = `Seviye ${lvl} Başladı!`;
      } else if (this.mode === 'survival') {
        this.coordInfoEl.textContent = 'Sonsuz Hayatta Kalma Başladı!';
      } else if (this.mode === 'timeattack') {
        this.coordInfoEl.textContent = 'Zamana Karşı Başladı!';
      } else {
        this.coordInfoEl.textContent = `Bulmaca ${lvl} Başladı!`;
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
    for (const { mode, el } of this.modeButtons) {
      el?.addEventListener('click', () => {
        this.setMode(mode);
      });
    }
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

    this.btnOpenAbout?.addEventListener('click', () => {
      if (this.mainMenuModal) this.mainMenuModal.classList.add('hidden');
      if (this.aboutModal) this.aboutModal.classList.remove('hidden');
    });

    this.btnCloseAbout?.addEventListener('click', () => {
      if (this.aboutModal) this.aboutModal.classList.add('hidden');
      if (this.mainMenuModal) this.mainMenuModal.classList.remove('hidden');
    });

    this.btnOpenScoring?.addEventListener('click', () => {
      if (this.mainMenuModal) this.mainMenuModal.classList.add('hidden');
      if (this.scoringModal) this.scoringModal.classList.remove('hidden');
    });

    this.btnCloseScoring?.addEventListener('click', () => {
      if (this.scoringModal) this.scoringModal.classList.add('hidden');
      if (this.mainMenuModal) this.mainMenuModal.classList.remove('hidden');
    });

    this.btnOpenLeaderboard?.addEventListener('click', () => {
      if (this.mainMenuModal) this.mainMenuModal.classList.add('hidden');
      this.renderLeaderboard();
      if (this.leaderboardModal) this.leaderboardModal.classList.remove('hidden');
    });

    this.btnCloseLeaderboard?.addEventListener('click', () => {
      if (this.leaderboardModal) this.leaderboardModal.classList.add('hidden');
      if (this.mainMenuModal) this.mainMenuModal.classList.remove('hidden');
    });

    this.btnSaveName?.addEventListener('click', () => {
      this.saveNameEntry();
    });

    document.querySelectorAll<HTMLElement>('.name-entry-arrow').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slot = parseInt(btn.dataset.slot || '0', 10);
        const len = NAME_CHARS.length;
        if (btn.dataset.dir === 'up') {
          this.nameEntryLetters[slot] = (this.nameEntryLetters[slot] + 1) % len;
        } else {
          this.nameEntryLetters[slot] = (this.nameEntryLetters[slot] - 1 + len) % len;
        }
        this.updateNameEntryDisplay();
      });
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
    this.audio.stopBackgroundMusic();
    if (this.pauseModal) this.pauseModal.classList.remove('hidden');
    if (this.coordInfoEl) {
      this.coordInfoEl.textContent = 'Oyun Duraklatıldı';
    }
  }

  private resumeGame() {
    if (this.state !== 'paused') return;
    if (this.pauseModal) this.pauseModal.classList.add('hidden');
    this.state = 'playing';
    this.audio.playBackgroundMusic();
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
    if (this.nameEntryModal) this.nameEntryModal.classList.add('hidden');
    if (this.mainMenuModal) this.mainMenuModal.classList.remove('hidden');
    this.state = 'menu';
    this.audio.stopBackgroundMusic();
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

    if (this.mode === 'puzzle') {
      this.shotsRemaining = Math.max(0, this.shotsRemaining - 1);
      this.updateLevelDisplay();
    }

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

  private replenishEndlessRow() {
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
      if (this.mode === 'classic' || this.mode === 'puzzle') {
        if (this.grid.isGridEmpty(this.matrix)) {
          this.triggerVictory();
          return;
        }
      } else {
        if (this.countTotalBubbles() < 18) {
          this.replenishEndlessRow();
        }
      }
    } else {
      this.combo = 0;
      this.score += 10;

      // Fouls only trigger the descending ceiling in classic/survival.
      if (this.mode === 'classic' || this.mode === 'survival') {
        this.foulsLeft--;

        if (this.foulsLeft <= 0) {
          this.triggerCeilingDescent();
        } else if (this.coordInfoEl) {
          this.coordInfoEl.textContent = `Kilitlendi: (${snappedCell.row}, ${snappedCell.col}) | Tavan: ${this.foulsLeft}`;
        }
      } else if (this.coordInfoEl) {
        this.coordInfoEl.textContent = `Kilitlendi: (${snappedCell.row}, ${snappedCell.col})`;
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
      this.triggerGameOver('danger');
    } else if (this.mode === 'puzzle' && this.shotsRemaining <= 0 && !this.grid.isGridEmpty(this.matrix)) {
      this.triggerGameOver('noshots');
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
      this.triggerGameOver('danger');
    }
  }

  private triggerGameOver(reason: 'danger' | 'timeup' | 'noshots' = 'danger') {
    this.state = 'gameover';
    this.audio.stopBackgroundMusic();
    this.audio.playGameOver();

    if (this.goScoreEl) this.goScoreEl.textContent = this.score.toString();
    if (this.goPoppedEl) this.goPoppedEl.textContent = this.totalPopped.toString();

    if (this.score > 0 && this.qualifiesForLeaderboard(this.mode, this.score)) {
      this.pendingGameOverReason = reason;
      this.showNameEntry();
    } else {
      this.showGameOverModal(reason);
    }
  }

  private showGameOverModal(reason: 'danger' | 'timeup' | 'noshots') {
    if (this.goTitleEl && this.goSubtitleEl) {
      if (reason === 'timeup') {
        this.goTitleEl.textContent = 'SÜRE DOLDU!';
        this.goSubtitleEl.textContent = 'Zaman bitti, skorunuz kaydedildi.';
      } else if (reason === 'noshots') {
        this.goTitleEl.textContent = 'ATIŞLAR BİTTİ!';
        this.goSubtitleEl.textContent = 'Tahtayı temizlemeden atışlarınız tükendi.';
      } else {
        this.goTitleEl.textContent = 'OYUN BİTTİ';
        this.goSubtitleEl.textContent = 'Baloncuklar tehlike çizgisini aştı!';
      }
    }

    if (this.gameOverModal) this.gameOverModal.classList.remove('hidden');
  }

  private triggerVictory() {
    this.state = 'victory';
    this.audio.stopBackgroundMusic();
    this.audio.playVictory();

    this.score += VICTORY_BONUS;
    this.updateHighScore();

    if (this.vicScoreEl) this.vicScoreEl.textContent = this.score.toString();
    if (this.victoryModal) this.victoryModal.classList.remove('hidden');
  }

  private restartGame() {
    if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
    if (this.victoryModal) this.victoryModal.classList.add('hidden');
    if (this.pauseModal) this.pauseModal.classList.add('hidden');
    if (this.settingsModal) this.settingsModal.classList.add('hidden');
    if (this.nameEntryModal) this.nameEntryModal.classList.add('hidden');
    if (this.mainMenuModal) this.mainMenuModal.classList.add('hidden');
    this.score = 0;
    this.totalPopped = 0;
    this.level = 1;
    this.combo = 0;
    if (this.scoreEl) this.scoreEl.textContent = '0';
    this.initLevel(this.level);
    this.state = 'playing';
    this.audio.playBackgroundMusic();
  }

  private advanceNextLevel() {
    if (this.victoryModal) this.victoryModal.classList.add('hidden');
    this.level++;
    this.initLevel(this.level);
    this.state = 'playing';
    this.audio.playBackgroundMusic();
    this.audio.playLevelUp();
    const bannerText = this.mode === 'puzzle' ? `BULMACA ${this.level}!` : `SEVİYE ${this.level}!`;
    this.effects.addComicBurst(bannerText, this.canvas.width / 2, this.canvas.height / 2 - 40, '#00e676', 1.3);
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

      if (this.mode === 'timeattack') {
        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
          this.timeRemaining = 0;
          this.updateLevelDisplay();
          this.triggerGameOver('timeup');
          return;
        }
        this.updateLevelDisplay();
      }

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
