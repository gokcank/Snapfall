import { HexGrid } from './grid';

const grid = new HexGrid(24, 10, 18);
console.log(`Grid Width: ${grid.width}px, Row Height: ${grid.rowHeight.toFixed(2)}px`);

// Test 1: Dimensions
console.assert(grid.getColsInRow(0) === 10, 'Row 0 must have 10 cols');
console.assert(grid.getColsInRow(1) === 9, 'Row 1 must have 9 cols');
console.assert(grid.getColsInRow(2) === 10, 'Row 2 must have 10 cols');

// Test 2: Center Positions
const p00 = grid.gridToWorld(0, 0);
console.assert(p00.x === 24 && p00.y === 24, 'Top-left (0,0) center check');

const p09 = grid.gridToWorld(0, 9);
console.assert(p09.x === 456 && p09.y === 24, 'Top-right (0,9) center check');

const p10 = grid.gridToWorld(1, 0);
console.assert(p10.x === 48, 'Row 1 col 0 offset check');

// Test 3: Inter-bubble distance
// Horizontal distance in same row must be 2*R = 48
const p01 = grid.gridToWorld(0, 1);
const horizDist = Math.hypot(p01.x - p00.x, p01.y - p00.y);
console.assert(Math.abs(horizDist - 48) < 0.001, `Horizontal dist expected 48, got ${horizDist}`);

// Diagonal distance between touching bubbles in row 0 and row 1
const diagDist = Math.hypot(p10.x - p00.x, p10.y - p00.y);
console.assert(Math.abs(diagDist - 48) < 0.001, `Diagonal dist expected 48, got ${diagDist}`);

// Test 4: Neighbor symmetry (If A is neighbor of B, B must be neighbor of A)
let symmetryPassed = true;
for (let r = 0; r < 5; r++) {
  const cols = grid.getColsInRow(r);
  for (let c = 0; c < cols; c++) {
    const neighbors = grid.getNeighbors(r, c);
    for (const n of neighbors) {
      const revNeighbors = grid.getNeighbors(n.row, n.col);
      const hasBackRef = revNeighbors.some(rn => rn.row === r && rn.col === c);
      if (!hasBackRef) {
        console.error(`Symmetry failed between (${r},${c}) and (${n.row},${n.col})`);
        symmetryPassed = false;
      }
    }
  }
}
console.assert(symmetryPassed, 'All neighbor relationships must be symmetrical!');

console.log('All Grid Mathematical Unit Tests Passed Successfully!');
