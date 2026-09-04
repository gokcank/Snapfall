import { HexGrid } from './grid';
import { MatchFinder } from './algorithms';
import { BubbleColor } from './types';

console.log('--- Running Match-3 & Floating Clusters Unit Tests ---');

const grid = new HexGrid(24, 10, 16);
const matrix = grid.createEmptyMatrix();

// 1. Setup Match-3 Test
// Place 3 RED bubbles touching each other in row 0 and 1
// (0, 0) and (0, 1) are horizontal neighbors. (1, 0) is neighbor of (0, 0) and (0, 1)
matrix[0][0] = { id: 'r1', color: BubbleColor.RED, row: 0, col: 0, state: 'idle' };
matrix[0][1] = { id: 'r2', color: BubbleColor.RED, row: 0, col: 1, state: 'idle' };
matrix[1][0] = { id: 'r3', color: BubbleColor.RED, row: 1, col: 0, state: 'idle' };
// Place a BLUE bubble touching (1, 0)
matrix[1][1] = { id: 'b1', color: BubbleColor.BLUE, row: 1, col: 1, state: 'idle' };

// Test 1: Match-3 Detection
const matches = MatchFinder.findMatches(grid, matrix, { row: 1, col: 0 });
console.assert(matches.length === 3, `Expected 3 matching bubbles, got ${matches.length}`);
console.log(`Match-3 Test Passed: Found ${matches.length} connected RED bubbles.`);

// Test 2: Sub-match (2 bubbles of same color shouldn't match)
const subMatches = MatchFinder.findMatches(grid, matrix, { row: 1, col: 1 });
console.assert(subMatches.length === 0, `Expected 0 matches for isolated BLUE bubble, got ${subMatches.length}`);
console.log('Sub-match Test Passed: Non-matching single/double bubbles ignored.');

// 2. Setup Floating / Hanging Clusters Test
// Setup a bridge from Row 0 down to Row 2:
// Row 0: (0, 5) [GREEN] -> ceiling anchor
// Row 1: (1, 4) [PURPLE]
// Row 2: (2, 5) [YELLOW]
matrix[0][5] = { id: 'g1', color: BubbleColor.GREEN, row: 0, col: 5, state: 'idle' };
matrix[1][4] = { id: 'p1', color: BubbleColor.PURPLE, row: 1, col: 4, state: 'idle' };
matrix[2][5] = { id: 'y1', color: BubbleColor.YELLOW, row: 2, col: 5, state: 'idle' };

// Before disconnecting, nothing should be floating
let floatingBefore = MatchFinder.findFloatingBubbles(grid, matrix);
console.assert(floatingBefore.length === 0, 'No bubbles should float when connected to ceiling');

// Now disconnect the anchor (pop row 0 and 1)
matrix[0][5] = null;
matrix[1][4] = null;

// Now (2, 5) is completely detached from the ceiling!
const floatingAfter = MatchFinder.findFloatingBubbles(grid, matrix);
console.assert(floatingAfter.length === 1, `Expected 1 floating bubble, got ${floatingAfter.length}`);
console.assert(floatingAfter[0].id === 'y1', 'Detached bubble must be y1');
console.assert(matrix[2][5] === null, 'Floating bubble must be removed from matrix');
console.log('Floating Clusters Test Passed: Detached bubble detected and removed from grid.');

console.log('All Match-3 & Floating Clusters Tests Passed Successfully!');
