import { HexGrid } from './grid';
import { Bubble, BubbleColor } from './types';

console.log('--- Running Game State & Ceiling Descent Unit Tests ---');

const grid = new HexGrid(24, 10, 16);
const matrix = grid.createEmptyMatrix();

// 1. Victory condition (empty grid)
console.assert(grid.isGridEmpty(matrix) === true, 'Empty matrix must return true for isGridEmpty');

// Place one bubble
matrix[0][0] = { id: 'test1', color: BubbleColor.RED, row: 0, col: 0, state: 'idle' };
console.assert(grid.isGridEmpty(matrix) === false, 'Matrix with bubble must return false for isGridEmpty');

// 2. Danger line check
console.assert(grid.hasReachedDangerLine(matrix, 12) === false, 'Bubble in row 0 should not trigger danger line');

// Place bubble at row 12 (danger row)
matrix[12][0] = { id: 'danger', color: BubbleColor.BLUE, row: 12, col: 0, state: 'idle' };
console.assert(grid.hasReachedDangerLine(matrix, 12) === true, 'Bubble in row 12 must trigger danger line');
matrix[12][0] = null; // reset

// 3. Shift down test
// Row 0 has test1
const newRow: (Bubble | null)[] = [];
for (let c = 0; c < grid.colsEven; c++) {
  newRow.push({ id: `new-${c}`, color: BubbleColor.GREEN, row: 0, col: c, state: 'idle' });
}

grid.shiftDown(matrix, newRow);
console.assert(matrix[1][0]?.id === 'test1', 'Original bubble test1 should have shifted from row 0 to row 1');
console.assert(matrix[0][0]?.id === 'new-0', 'New row green bubble should now occupy row 0');

console.log('All Game State & Ceiling Descent Tests Passed Successfully!');
