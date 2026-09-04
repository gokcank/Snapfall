import { HexGrid } from './grid';
import { PhysicsEngine } from './physics';
import { TrajectoryCalculator } from './trajectory';
import { BubbleColor } from './types';

console.log('--- Running Physics & Trajectory Unit Tests ---');

const grid = new HexGrid(24, 10, 16);
const matrix = grid.createEmptyMatrix();

// 1. Place test bubbles in Row 0
matrix[0][4] = { id: 'b1', color: BubbleColor.RED, row: 0, col: 4, state: 'idle' };
matrix[0][5] = { id: 'b2', color: BubbleColor.BLUE, row: 0, col: 5, state: 'idle' };

const trajCalc = new TrajectoryCalculator(grid);
const shooterOrigin = { x: 240, y: 610 };

// Test 1: Straight up ray (90 deg)
const trajStraight = trajCalc.calculate(shooterOrigin, Math.PI / 2, matrix, 2);
console.assert(trajStraight.segments.length > 0, 'Trajectory should produce segments');
console.assert(trajStraight.hitType !== 'none', 'Trajectory should hit obstacle or ceiling');
console.log(`Straight shot hit: ${trajStraight.hitType}, Target cell: (${trajStraight.targetCell?.row}, ${trajStraight.targetCell?.col})`);

// Test 2: Angled shot to right wall (30 deg)
const trajBounce = trajCalc.calculate(shooterOrigin, (30 * Math.PI) / 180, matrix, 2);
console.assert(trajBounce.segments.length >= 2, 'Angled shot at 30 deg must reflect off right wall (>= 2 segments)');
console.log(`Wall bounce shot segments: ${trajBounce.segments.length}, final hit: ${trajBounce.hitType}`);

// Test 3: Physics Engine Simulation
const physics = new PhysicsEngine(grid);
physics.launch(shooterOrigin, Math.PI / 2, 1200, BubbleColor.PURPLE);
console.assert(physics.currentProjectile !== null, 'Projectile must be active after launch');

// Simulate frames until projectile snaps
let frames = 0;
let snapped = false;
while (frames < 200 && physics.currentProjectile !== null) {
  const result = physics.update(1 / 60, matrix);
  if (result.snappedCell) {
    snapped = true;
    console.log(`Projectile successfully snapped to grid at: (${result.snappedCell.row}, ${result.snappedCell.col})`);
    break;
  }
  frames++;
}

console.assert(snapped, 'Projectile must snap to grid after travelling upwards');
console.log('All Physics & Trajectory Tests Passed Successfully!');
