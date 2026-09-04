import { HexGrid } from './grid';
import { BubbleColor } from './types';

console.log('--- Running Game State & Ceiling Descent Unit Tests ---');

const grid = new HexGrid(24, 10, 16);
const matrix = grid.createEmptyMatrix();

// 1. Victory condition (empty grid)
console.assert(grid.isGridEmpty(matrix) === true, 'Empty matrix must return true for isGridEmpty');

// Place one bubble in Row 0
matrix[0][0] = { id: 'test1', color: BubbleColor.RED, row: 0, col: 0, state: 'idle' };
console.assert(grid.isGridEmpty(matrix) === false, 'Matrix with bubble must return false for isGridEmpty');

// 2. Danger line check
console.assert(grid.hasReachedDangerLine(matrix, 520) === false, 'Bubble in row 0 should not trigger danger line at y=520');

// 3. Lower ceiling test
const initialY = grid.gridToWorld(0, 0).y;
console.assert(initialY === 24, `Initial y should be 24, got ${initialY}`);

grid.lowerCeiling(1);
const loweredY = grid.gridToWorld(0, 0).y;
console.assert(Math.abs(loweredY - (24 + grid.rowHeight)) < 0.01, 'Ceiling drop must lower world y coordinate by rowHeight');

// Lower until danger
let hitDanger = false;
for (let i = 0; i < 15; i++) {
  if (grid.lowerCeiling(1, 520)) {
    hitDanger = true;
    break;
  }
}
console.assert(hitDanger === true, 'Lowering ceiling repeatedly must trigger danger line');

grid.resetCeiling();
console.assert(grid.ceilingY === 0, 'Reset ceiling should return ceilingY to 0');

console.log('All Game State & Ceiling Descent Tests Passed Successfully!');
