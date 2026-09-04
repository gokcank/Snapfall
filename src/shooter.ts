import { BubbleColor, Vector2D } from './types';

export class CannonShooter {
  readonly origin: Vector2D;
  private angleRad: number = Math.PI / 2; // default: 90 deg (straight up)
  private loadedColor: BubbleColor;
  private nextColor: BubbleColor;
  private isAiming: boolean = false;
  private reloadProgress: number = 1.0; // 0 to 1

  private readonly availableColors: BubbleColor[] = [
    BubbleColor.RED,
    BubbleColor.BLUE,
    BubbleColor.GREEN,
    BubbleColor.YELLOW,
    BubbleColor.PURPLE
  ];

  constructor(origin: Vector2D) {
    this.origin = origin;
    this.loadedColor = this.getRandomColor();
    this.nextColor = this.getRandomColor();
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

  private getRandomColor(): BubbleColor {
    const idx = Math.floor(Math.random() * this.availableColors.length);
    return this.availableColors[idx];
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

  consumeBubble(): BubbleColor {
    const fired = this.loadedColor;
    this.loadedColor = this.nextColor;
    this.nextColor = this.getRandomColor();
    this.reloadProgress = 0;
    return fired;
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
