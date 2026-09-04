import { BubbleColor, Vector2D } from "./types";

export class CannonShooter {
  readonly origin: Vector2D;
  private angleRad: number = Math.PI / 2; // default: 90 deg (straight up)
  private loadedColor: BubbleColor;
  private nextColor: BubbleColor;
  private isAiming: boolean = false;
  private reloadProgress: number = 1.0; // 0 to 1
  private lastWasOffBoard: boolean = false;

  private readonly availableColors: BubbleColor[] = [
    BubbleColor.RED,
    BubbleColor.BLUE,
    BubbleColor.GREEN,
    BubbleColor.YELLOW,
    BubbleColor.PURPLE
  ];

  constructor(origin: Vector2D, initialColors?: BubbleColor[]) {
    this.origin = origin;
    this.loadedColor = this.getSmartColor(initialColors);
    this.nextColor = this.getSmartColor(initialColors);
  }

  get angle(): number {
    return this.angleRad;
  }

  get currentBubbleColor(): BubbleColor {
    return this.loadedColor;
  }

  get nextBubbleColor(): BubbleColor {
    return this.nextColor;
  }

  get aiming(): boolean {
    return this.isAiming;
  }

  get reloadRatio(): number {
    return this.reloadProgress;
  }

  getSmartColor(activeColors?: BubbleColor[], totalBubbles?: number): BubbleColor {
    // If no active colors provided or empty list, pick uniformly from all available colors
    if (!activeColors || activeColors.length === 0) {
      this.lastWasOffBoard = false;
      const idx = Math.floor(Math.random() * this.availableColors.length);
      return this.availableColors[idx];
    }

    // 1. Endgame / Victory Protection:
    // If 8 or fewer bubbles remain on board, or only 1 color remains, 100% chance from active colors.
    if ((totalBubbles !== undefined && totalBubbles <= 8) || activeColors.length === 1) {
      this.lastWasOffBoard = false;
      const idx = Math.floor(Math.random() * activeColors.length);
      return activeColors[idx];
    }

    // Colors currently NOT on the board
    const offBoardColors = this.availableColors.filter((c) => !activeColors.includes(c));

    // 2. Anti-Spam / Streak Protection:
    // If the previous generation was off-board, or if no off-board colors exist, force active color.
    if (this.lastWasOffBoard || offBoardColors.length === 0) {
      this.lastWasOffBoard = false;
      const idx = Math.floor(Math.random() * activeColors.length);
      return activeColors[idx];
    }

    // 3. Weighted Probabilistic RNG:
    // 85% chance for active board colors, 15% chance for off-board colors.
    const roll = Math.random();
    if (roll < 0.85) {
      this.lastWasOffBoard = false;
      const idx = Math.floor(Math.random() * activeColors.length);
      return activeColors[idx];
    } else {
      this.lastWasOffBoard = true;
      const idx = Math.floor(Math.random() * offBoardColors.length);
      return offBoardColors[idx];
    }
  }

  setAimTarget(targetX: number, targetY: number) {
    const dx = targetX - this.origin.x;
    const dy = targetY - this.origin.y;

    // Angle relative to horizontal right: Math.atan2(-dy, dx)
    let calculatedAngle = Math.atan2(-dy, dx);

    // Clamp angle between 15 deg and 165 deg
    const minAngle = (15 * Math.PI) / 180;
    const maxAngle = (165 * Math.PI) / 180;

    if (calculatedAngle < 0) {
      // User touched below cannon -> point towards the closer boundary
      calculatedAngle = dx < 0 ? maxAngle : minAngle;
    } else {
      calculatedAngle = Math.max(minAngle, Math.min(maxAngle, calculatedAngle));
    }

    this.angleRad = calculatedAngle;
    this.isAiming = true;
  }

  stopAiming() {
    this.isAiming = false;
  }

  consumeBubble(activeColors?: BubbleColor[], totalBubbles?: number): BubbleColor {
    const fired = this.loadedColor;
    this.loadedColor = this.nextColor;
    this.nextColor = this.getSmartColor(activeColors, totalBubbles);
    this.reloadProgress = 0;
    return fired;
  }

  resetColors(activeColors?: BubbleColor[], totalBubbles?: number) {
    this.lastWasOffBoard = false;
    this.loadedColor = this.getSmartColor(activeColors, totalBubbles);
    this.nextColor = this.getSmartColor(activeColors, totalBubbles);
  }

  update(dt: number) {
    if (this.reloadProgress < 1.0) {
      this.reloadProgress = Math.min(1.0, this.reloadProgress + dt * 4); // fast reload animation
    }
  }

  swapColors() {
    const temp = this.loadedColor;
    this.loadedColor = this.nextColor;
    this.nextColor = temp;
  }
}
