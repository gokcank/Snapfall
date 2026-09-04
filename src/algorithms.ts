import { HexGrid } from './grid';
import { Bubble, GridCoord, GridMatrix } from './types';

export class MatchFinder {
  /**
   * BFS flood-fill to find all contiguous bubbles of the same color starting at startCoord.
   * Returns matching coordinates if cluster size >= minMatch (default 3), otherwise returns empty array.
   */
  static findMatches(
    grid: HexGrid,
    matrix: GridMatrix,
    startCoord: GridCoord,
    minMatch: number = 3
  ): GridCoord[] {
    const startBubble = matrix[startCoord.row]?.[startCoord.col];
    if (!startBubble) return [];

    const targetColor = startBubble.color;
    const queue: GridCoord[] = [startCoord];
    const visited = new Set<string>([`${startCoord.row},${startCoord.col}`]);
    const matches: GridCoord[] = [startCoord];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = grid.getNeighbors(current.row, current.col);

      for (const n of neighbors) {
        const key = `${n.row},${n.col}`;
        if (!visited.has(key)) {
          visited.add(key);
          const neighborBubble = matrix[n.row][n.col];
          if (neighborBubble && neighborBubble.color === targetColor) {
            matches.push(n);
            queue.push(n);
          }
        }
      }
    }

    return matches.length >= minMatch ? matches : [];
  }

  /**
   * Multi-source BFS starting from the ceiling (Row 0) to find all anchored bubbles.
   * Any bubble not reachable from Row 0 is considered floating/hanging, is detached from the grid,
   * and returned as a list of floating bubbles.
   */
  static findFloatingBubbles(grid: HexGrid, matrix: GridMatrix): Bubble[] {
    const anchoredSet = new Set<string>();
    const queue: GridCoord[] = [];

    // 1. Seed with all occupied bubbles in Row 0 (anchors to ceiling)
    const topCols = grid.getColsInRow(0);
    for (let c = 0; c < topCols; c++) {
      if (matrix[0][c] !== null) {
        const key = `0,${c}`;
        anchoredSet.add(key);
        queue.push({ row: 0, col: c });
      }
    }

    // 2. Traverse all connected bubbles anchored to ceiling
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = grid.getNeighbors(current.row, current.col);

      for (const n of neighbors) {
        const key = `${n.row},${n.col}`;
        if (!anchoredSet.has(key) && matrix[n.row][n.col] !== null) {
          anchoredSet.add(key);
          queue.push(n);
        }
      }
    }

    // 3. Any active bubble NOT in anchoredSet is floating!
    const floatingBubbles: Bubble[] = [];
    for (let r = 0; r < grid.maxRows; r++) {
      const cols = grid.getColsInRow(r);
      for (let c = 0; c < cols; c++) {
        const bubble = matrix[r][c];
        if (bubble !== null && !anchoredSet.has(`${r},${c}`)) {
          floatingBubbles.push(bubble);
          matrix[r][c] = null; // Detach from the matrix
        }
      }
    }

    return floatingBubbles;
  }
}
