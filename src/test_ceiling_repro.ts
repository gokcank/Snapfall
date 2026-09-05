import { HexGrid } from './grid';
import { MatchFinder } from './algorithms';
import { BubbleColor, GridMatrix } from './types';

console.log('--- Ceiling Descent Stress / Repro Test ---');

function fillProceduralRows(grid: HexGrid, matrix: GridMatrix, rows: number, idStart: number): number {
  const colors = [BubbleColor.RED, BubbleColor.BLUE, BubbleColor.GREEN, BubbleColor.YELLOW, BubbleColor.PURPLE];
  let id = idStart;
  for (let r = 0; r < rows; r++) {
    const cols = grid.getColsInRow(r);
    for (let c = 0; c < cols; c++) {
      const color = colors[(r * 3 + c + Math.floor(c / 2)) % colors.length];
      matrix[r][c] = { id: `b-${id++}`, color, row: r, col: c, state: 'idle' };
    }
  }
  return id;
}

function assertMatrixSelfConsistent(grid: HexGrid, matrix: GridMatrix, label: string) {
  for (let r = 0; r < grid.maxRows; r++) {
    const cols = grid.getColsInRow(r);
    for (let c = 0; c < cols; c++) {
      const b = matrix[r][c];
      if (b !== null && (b.row !== r || b.col !== c)) {
        throw new Error(`[${label}] Mismatch at (${r},${c}): stored bubble thinks it's at (${b.row},${b.col})`);
      }
    }
  }
}

function assertNoFloating(grid: HexGrid, matrix: GridMatrix, label: string) {
  // findFloatingBubbles mutates the matrix (detaches floaters), so run it on a clone.
  const clone: GridMatrix = matrix.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  const floating = MatchFinder.findFloatingBubbles(grid, clone);
  if (floating.length > 0) {
    throw new Error(`[${label}] Found ${floating.length} floating bubble(s) that should have been cleaned up already`);
  }
}

function snapshotPositions(grid: HexGrid, matrix: GridMatrix): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();
  for (let r = 0; r < grid.maxRows; r++) {
    const cols = grid.getColsInRow(r);
    for (let c = 0; c < cols; c++) {
      const b = matrix[r][c];
      if (b) map.set(b.id, grid.gridToWorld(r, c));
    }
  }
  return map;
}

// --- Scenario: repeated ceiling descents interleaved with pops, classic-mode style ---
const grid = new HexGrid(24, 10, 16);
let matrix = grid.createEmptyMatrix();
let idCounter = fillProceduralRows(grid, matrix, 4, 1);

assertMatrixSelfConsistent(grid, matrix, 'initial fill');
assertNoFloating(grid, matrix, 'initial fill');

const DESCENTS = 30;
for (let i = 0; i < DESCENTS; i++) {
  const before = snapshotPositions(grid, matrix);

  // A miss: place a new bubble anchored somewhere near the top (mirrors physics.ts
  // always requiring an anchored neighbor for a real collision snap).
  outer: for (let r = 0; r < grid.maxRows; r++) {
    const cols = grid.getColsInRow(r);
    for (let c = 0; c < cols; c++) {
      if (matrix[r][c] === null) {
        const neighbors = grid.getNeighbors(r, c);
        const hasAnchoredNeighbor = r === 0 || neighbors.some((n) => matrix[n.row][n.col] !== null);
        if (hasAnchoredNeighbor) {
          matrix[r][c] = { id: `b-${idCounter++}`, color: BubbleColor.RED, row: r, col: c, state: 'idle' };
          break outer;
        }
      }
    }
  }

  // Ceiling drops one step (mirrors triggerCeilingDescent).
  grid.lowerCeiling(1, 520);

  // Same cleanup call main.ts makes right after a descent.
  const floating = MatchFinder.findFloatingBubbles(grid, matrix);
  if (floating.length > 0) {
    console.log(`  descent #${i}: ${floating.length} bubble(s) newly detached by the descent itself`);
  }

  assertMatrixSelfConsistent(grid, matrix, `descent #${i}`);
  assertNoFloating(grid, matrix, `descent #${i}`);

  // Every bubble that survived must have moved down by exactly one rowHeight on screen,
  // and nothing should have silently swapped identity/position.
  const after = snapshotPositions(grid, matrix);
  for (const [id, beforePos] of before) {
    const afterPos = after.get(id);
    if (!afterPos) continue; // legitimately popped/detached this round, fine
    const dy = afterPos.y - beforePos.y;
    if (Math.abs(dy - grid.rowHeight) > 0.01) {
      throw new Error(`[descent #${i}] Bubble ${id} moved by ${dy}px on screen, expected exactly ${grid.rowHeight}px`);
    }
    if (Math.abs(afterPos.x - beforePos.x) > 0.01) {
      throw new Error(`[descent #${i}] Bubble ${id} shifted horizontally, expected no x change`);
    }
  }
}

console.log(`All ${DESCENTS} simulated descents preserved matrix integrity and consistent on-screen shifting.`);

// --- Scenario: level reset mid-descent (advanceNextLevel / restartGame path) ---
grid.resetCeiling();
matrix = grid.createEmptyMatrix();
idCounter = fillProceduralRows(grid, matrix, 5, idCounter);
grid.lowerCeiling(3, 520);
grid.resetCeiling();
if (grid.ceilingY !== 0) {
  throw new Error('resetCeiling did not return ceilingY to 0');
}
assertMatrixSelfConsistent(grid, matrix, 'post-reset');
assertNoFloating(grid, matrix, 'post-reset');

console.log('Level reset after mid-game descents did not corrupt the matrix.');
console.log('--- Ceiling Descent Stress / Repro Test: PASSED ---');
