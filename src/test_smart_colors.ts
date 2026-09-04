import { CannonShooter } from './shooter';
import { HexGrid } from './grid';
import { BubbleColor } from './types';

console.log('--- Testing Smart Weighted RNG & Streak Protection ---');

const origin = { x: 240, y: 615 };
const shooter = new CannonShooter(origin);
const grid = new HexGrid(24, 10, 16);

// Test 1: Grid getActiveColors accurately reflects matrix
const matrix = grid.createEmptyMatrix();
matrix[0][0] = { id: 'b1', color: BubbleColor.RED, row: 0, col: 0, state: 'idle' };
matrix[0][1] = { id: 'b2', color: BubbleColor.RED, row: 0, col: 1, state: 'idle' };
matrix[0][2] = { id: 'b3', color: BubbleColor.BLUE, row: 0, col: 2, state: 'idle' };

const boardInfo = grid.getActiveColors(matrix);
console.assert(boardInfo.total === 3, `Expected 3 bubbles, got ${boardInfo.total}`);
console.assert(boardInfo.colors.length === 2, `Expected 2 unique colors, got ${boardInfo.colors.length}`);
console.assert(boardInfo.colors.includes(BubbleColor.RED) && boardInfo.colors.includes(BubbleColor.BLUE), 'Must contain RED and BLUE');
console.log('✓ Test 1: Grid getActiveColors works correctly.');

// Test 2: Endgame / Victory Protection (single color remaining)
const singleColorList = [BubbleColor.YELLOW];
for (let i = 0; i < 200; i++) {
  const color = shooter.getSmartColor(singleColorList, 2);
  console.assert(color === BubbleColor.YELLOW, `Endgame must yield ONLY yellow, got ${color}`);
}
console.log('✓ Test 2: Single color remaining yields 100% matching color.');

// Test 3: Endgame / Victory Protection (total bubbles <= 8)
const twoColorsList = [BubbleColor.RED, BubbleColor.GREEN];
for (let i = 0; i < 200; i++) {
  const color = shooter.getSmartColor(twoColorsList, 6);
  console.assert(color === BubbleColor.RED || color === BubbleColor.GREEN, `total <= 8 must yield only active colors, got ${color}`);
}
console.log('✓ Test 3: Low bubble count (total <= 8) yields 100% active colors.');

// Test 4: Anti-Spam / Streak Protection (No two off-board colors in a row)
const activeThree = [BubbleColor.RED, BubbleColor.BLUE, BubbleColor.GREEN];
// Off-board colors are YELLOW and PURPLE
const isOffBoard = (c: BubbleColor) => c === BubbleColor.YELLOW || c === BubbleColor.PURPLE;

let previousWasOffBoard = false;
for (let i = 0; i < 1000; i++) {
  const color = shooter.consumeBubble(activeThree, 25);
  const currentIsOff = isOffBoard(color);
  if (previousWasOffBoard) {
    console.assert(!currentIsOff, `Streak protection violated! Two off-board colors in a row: ${color}`);
  }
  previousWasOffBoard = currentIsOff;
}
console.log('✓ Test 4: Anti-Spam streak protection strictly prevents back-to-back off-board colors.');

// Test 5: Statistical Distribution (approx ~85% active, ~15% off-board)
let activeCount = 0;
const totalSims = 10000;
for (let i = 0; i < totalSims; i++) {
  const color = shooter.consumeBubble(activeThree, 30);
  if (!isOffBoard(color)) {
    activeCount++;
  }
}
const activeRatio = activeCount / totalSims;
console.log(`Statistical Distribution: ${(activeRatio * 100).toFixed(1)}% active (target: ~85%)`);
console.assert(activeRatio >= 0.81 && activeRatio <= 0.89, `Active ratio ${activeRatio} outside acceptable 81%-89% tolerance`);
console.log('✓ Test 5: Weighted statistical distribution verified within tolerance.');

console.log('All Smart RNG Unit Tests Passed Successfully!');
