import { HexGrid } from './grid';
import { CanvasRenderer } from './renderer';
import { Bubble, BubbleColor, GridMatrix } from './types';

class App {
  private canvas: HTMLCanvasElement;
  private grid: HexGrid;
  private renderer: CanvasRenderer;
  private matrix: GridMatrix;
  private hoverCoord: { row: number; col: number } | null = null;
  private coordInfoEl: HTMLElement | null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.coordInfoEl = document.getElementById('coordInfo');

    // 480px width: 10 bubbles of diameter 48 in row 0
    this.grid = new HexGrid(24, 10, 16);
    this.renderer = new CanvasRenderer(this.canvas, this.grid);
    this.matrix = this.grid.createEmptyMatrix();

    this.initSampleGrid();
    this.setupEventListeners();
    this.render();
  }

  private initSampleGrid() {
    const colors = [
      BubbleColor.RED,
      BubbleColor.BLUE,
      BubbleColor.GREEN,
      BubbleColor.YELLOW,
      BubbleColor.PURPLE
    ];

    // Populate initial 5 rows in staggered layout
    let idCounter = 1;
    for (let r = 0; r < 5; r++) {
      const cols = this.grid.getColsInRow(r);
      for (let c = 0; c < cols; c++) {
        // Patterned color distribution to show clusters and staggered layout
        const color = colors[(r * 2 + c + Math.floor(c / 2)) % colors.length];
        const bubble: Bubble = {
          id: `bubble-${idCounter++}`,
          color,
          row: r,
          col: c,
          state: 'idle'
        };
        this.matrix[r][c] = bubble;
      }
    }
  }

  private getCanvasRelativeCoords(event: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  private setupEventListeners() {
    const handleMove = (x: number, y: number) => {
      const coord = this.grid.worldToGrid(x, y);
      if (this.grid.isValidCoord(coord.row, coord.col)) {
        this.hoverCoord = coord;
        const neighbors = this.grid.getNeighbors(coord.row, coord.col);
        const bubble = this.matrix[coord.row][coord.col];
        const colorText = bubble ? ` [${bubble.color}]` : ' [Boş]';
        if (this.coordInfoEl) {
          this.coordInfoEl.textContent = `Hücre: (${coord.row}, ${coord.col})${colorText} | Komşu: ${neighbors.length}`;
        }
      } else {
        this.hoverCoord = null;
      }
      this.render();
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = this.getCanvasRelativeCoords(e);
      handleMove(pos.x, pos.y);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverCoord = null;
      if (this.coordInfoEl) {
        this.coordInfoEl.textContent = 'Dokunarak inceleyin';
      }
      this.render();
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const pos = this.getCanvasRelativeCoords(e.touches[0]);
        handleMove(pos.x, pos.y);
      }
    }, { passive: true });
  }

  private render = () => {
    this.renderer.clear();
    this.renderer.drawBoundaries();
    this.renderer.drawGridGuide(this.hoverCoord);
    this.renderer.drawGrid(this.matrix);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
