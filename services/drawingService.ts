export type DrawingTool = 'highlighter' | 'pen' | 'none';

export interface DrawingColor {
  id: string;
  name: string;
  color: string;
  highlightColor: string;
}

export const DRAWING_COLORS: DrawingColor[] = [
  { id: 'yellow', name: 'Yellow', color: '#FCD34D', highlightColor: '#FEF3C7' },
  { id: 'green', name: 'Green', color: '#34D399', highlightColor: '#D1FAE5' },
  { id: 'blue', name: 'Blue', color: '#60A5FA', highlightColor: '#DBEAFE' },
  { id: 'pink', name: 'Pink', color: '#F472B6', highlightColor: '#FCE7F3' },
  { id: 'purple', name: 'Purple', color: '#A78BFA', highlightColor: '#EDE9FE' }
];

export interface DrawingState {
  isActive: boolean;
  tool: DrawingTool;
  colorId: string;
  strokeWidth: number;
}

export interface DrawingStroke {
  id: string;
  tool: DrawingTool;
  color: string;
  strokeWidth: number;
  points: { x: number; y: number }[];
  timestamp: number;
  shape?: 'circle' | 'rectangle' | 'arrow' | 'line' | 'freeform';
  shapeData?: any;
}

export interface HighlightSelection {
  id: string;
  text: string;
  color: string;
  element: HTMLElement;
  range: Range;
  timestamp: number;
}

class DrawingService {
  private state: DrawingState = {
    isActive: false,
    tool: 'none',
    colorId: 'yellow',
    strokeWidth: 3
  };

  private strokes: DrawingStroke[] = [];
  private highlights: HighlightSelection[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private currentStroke: DrawingStroke | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.setupCanvas();
    this.setupEventListeners();
  }

  private setupCanvas() {
    // Wait for messages container to be available
    const attachCanvas = () => {
      const container = document.querySelector('.flex-1.overflow-y-auto');
      if (!container) {
        setTimeout(attachCanvas, 100);
        return;
      }
      
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'drawing-overlay';
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '10';
      
      this.ctx = this.canvas.getContext('2d');
      if (this.ctx) {
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
      }
      
      (container as HTMLElement).style.position = 'relative';
      container.appendChild(this.canvas);
      this.updateCanvasSize();
    };
    
    attachCanvas();
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => this.updateCanvasSize());
    
    // Mouse events for drawing
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', () => this.handleMouseUp());
    
    // Text selection for highlighting
    document.addEventListener('mouseup', () => this.handleTextSelection());
  }

  private updateCanvasSize() {
    if (!this.canvas) return;
    
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const dpr = window.devicePixelRatio || 1;
    const width = container.scrollWidth;
    const height = container.scrollHeight;
    
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
      this.redrawAll();
    }
  }

  private handleMouseDown(e: MouseEvent) {
    if (!this.state.isActive || this.state.tool === 'none' || this.state.tool === 'highlighter') return;
    
    const target = e.target as HTMLElement;
    // Don't interfere with any interactive elements
    if (target.closest('header') || target.closest('button') || target.closest('[role="button"]') || 
        target.closest('input') || target.closest('select') || target.closest('a') || 
        target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'SELECT') {
      return;
    }
    
    const container = this.canvas?.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;
    
    this.isDrawing = true;
    this.currentStroke = {
      id: Date.now().toString(),
      tool: this.state.tool,
      color: this.getCurrentColor().color,
      strokeWidth: this.state.strokeWidth,
      points: [{ x, y }],
      timestamp: Date.now()
    };
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDrawing || !this.currentStroke) return;
    
    const container = this.canvas?.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;
    
    this.currentStroke.points.push({ x, y });
    
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
      for (const stroke of this.strokes) {
        this.drawBeautifiedStroke(stroke);
      }
      this.drawStroke(this.currentStroke);
    }
  }

  private handleMouseUp() {
    if (!this.isDrawing || !this.currentStroke) return;
    
    this.isDrawing = false;
    
    // Detect and beautify shape
    const beautifiedStroke = this.detectAndBeautifyShape(this.currentStroke);
    this.strokes.push(beautifiedStroke);
    
    // Redraw to show beautified version
    this.redrawAll();
    
    this.currentStroke = null;
    
    this.notifyListeners();
  }

  private handleTextSelection() {
    if (!this.state.isActive || this.state.tool !== 'highlighter') return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const text = range.toString().trim();
    
    if (text.length === 0) return;
    
    // Check if selection is within allowed elements (message content, citations)
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as HTMLElement;
    
    if (!this.isHighlightableElement(element)) {
      selection.removeAllRanges();
      return;
    }
    
    this.createHighlight(text, element, range);
    selection.removeAllRanges();
  }

  private isHighlightableElement(element: HTMLElement | null): boolean {
    if (!element) return false;
    
    // Allow highlighting in message content and citation panels
    return element.closest('.message-content') !== null ||
           element.closest('.citation-panel') !== null ||
           element.closest('[data-highlightable="true"]') !== null;
  }

  private createHighlight(text: string, element: HTMLElement, range: Range) {
    const highlight: HighlightSelection = {
      id: Date.now().toString(),
      text,
      color: this.getCurrentColor().highlightColor,
      element,
      range: range.cloneRange(),
      timestamp: Date.now()
    };
    
    try {
      const span = document.createElement('span');
      span.style.backgroundColor = highlight.color;
      span.style.padding = '2px 0';
      span.style.borderRadius = '2px';
      span.dataset.highlightId = highlight.id;
      span.className = 'drawing-highlight';
      
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      
      this.highlights.push(highlight);
      this.notifyListeners();
    } catch (e) {
      console.warn('Failed to create highlight:', e);
    }
  }

  private drawStroke(stroke: DrawingStroke) {
    if (!this.ctx || stroke.points.length < 2) return;
    
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.strokeWidth;
    
    this.ctx.beginPath();
    this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    // Use quadratic curves for smoother lines
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const current = stroke.points[i];
      const next = stroke.points[i + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      this.ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }
    
    // Draw to the last point
    if (stroke.points.length > 1) {
      const lastPoint = stroke.points[stroke.points.length - 1];
      this.ctx.lineTo(lastPoint.x, lastPoint.y);
    }
    
    this.ctx.stroke();
  }

  private drawBeautifiedStroke(stroke: DrawingStroke) {
    if (!this.ctx) return;
    
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.strokeWidth;
    
    if (!stroke.shape || stroke.shape === 'freeform') {
      this.drawStroke(stroke);
      return;
    }
    
    this.ctx.beginPath();
    
    switch (stroke.shape) {
      case 'circle':
        if (stroke.shapeData) {
          const { center, radius } = stroke.shapeData;
          this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        }
        break;
        
      case 'rectangle':
        if (stroke.shapeData) {
          const { x, y, width, height } = stroke.shapeData;
          this.ctx.rect(x, y, width, height);
        }
        break;
        
      case 'line':
        if (stroke.shapeData) {
          const { start, end } = stroke.shapeData;
          this.ctx.moveTo(start.x, start.y);
          this.ctx.lineTo(end.x, end.y);
        }
        break;
        
      case 'arrow':
        if (stroke.shapeData) {
          const { start, end, angle } = stroke.shapeData;
          // Draw main line
          this.ctx.moveTo(start.x, start.y);
          this.ctx.lineTo(end.x, end.y);
          
          // Draw arrowhead
          const headLength = 15;
          const headAngle = Math.PI / 6;
          
          this.ctx.moveTo(end.x, end.y);
          this.ctx.lineTo(
            end.x - headLength * Math.cos(angle - headAngle),
            end.y - headLength * Math.sin(angle - headAngle)
          );
          
          this.ctx.moveTo(end.x, end.y);
          this.ctx.lineTo(
            end.x - headLength * Math.cos(angle + headAngle),
            end.y - headLength * Math.sin(angle + headAngle)
          );
        }
        break;
    }
    
    this.ctx.stroke();
  }

  private detectAndBeautifyShape(stroke: DrawingStroke): DrawingStroke {
    const points = stroke.points;
    if (points.length < 3) return stroke;

    const shape = this.recognizeShape(points);
    const beautifiedStroke = { ...stroke, shape };

    switch (shape) {
      case 'circle':
        beautifiedStroke.shapeData = this.calculateCircle(points);
        break;
      case 'rectangle':
        beautifiedStroke.shapeData = this.calculateRectangle(points);
        break;
      case 'arrow':
        beautifiedStroke.shapeData = this.calculateArrow(points);
        break;
      case 'line':
        beautifiedStroke.shapeData = this.calculateLine(points);
        break;
      default:
        beautifiedStroke.shape = 'freeform';
    }

    return beautifiedStroke;
  }

  private recognizeShape(points: { x: number; y: number }[]): 'circle' | 'rectangle' | 'arrow' | 'line' | 'freeform' {
    if (points.length < 5) return 'freeform';

    const first = points[0];
    const last = points[points.length - 1];
    const distance = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);

    // Check for closed shapes (circle/rectangle)
    if (distance < 30) {
      return this.isCircular(points) ? 'circle' : 'rectangle';
    }

    // Check for straight line
    if (this.isStraightLine(points)) {
      return this.hasArrowHead(points) ? 'arrow' : 'line';
    }

    return 'freeform';
  }

  private isCircular(points: { x: number; y: number }[]): boolean {
    const center = this.getCentroid(points);
    const distances = points.map(p => Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2));
    const avgDistance = distances.reduce((a, b) => a + b) / distances.length;
    const variance = distances.reduce((sum, d) => sum + (d - avgDistance) ** 2, 0) / distances.length;
    return variance < avgDistance * 0.3;
  }

  private isStraightLine(points: { x: number; y: number }[]): boolean {
    if (points.length < 3) return true;
    const first = points[0];
    const last = points[points.length - 1];
    const lineLength = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
    
    let totalDeviation = 0;
    for (const point of points) {
      const deviation = this.pointToLineDistance(point, first, last);
      totalDeviation += deviation;
    }
    
    return totalDeviation / points.length < lineLength * 0.1;
  }

  private hasArrowHead(points: { x: number; y: number }[]): boolean {
    if (points.length < 10) return false;
    const endPoints = points.slice(-5);
    const direction = this.getDirection(points[points.length - 6], points[points.length - 1]);
    
    // Simple heuristic: check if end points deviate from main direction
    let deviations = 0;
    for (let i = 1; i < endPoints.length; i++) {
      const segmentDir = this.getDirection(endPoints[i - 1], endPoints[i]);
      if (Math.abs(segmentDir - direction) > Math.PI / 4) deviations++;
    }
    
    return deviations >= 2;
  }

  private getCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  private pointToLineDistance(point: { x: number; y: number }, lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    let xx, yy;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getDirection(from: { x: number; y: number }, to: { x: number; y: number }): number {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }

  private calculateCircle(points: { x: number; y: number }[]) {
    const center = this.getCentroid(points);
    const distances = points.map(p => Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2));
    const radius = distances.reduce((a, b) => a + b) / distances.length;
    return { center, radius };
  }

  private calculateRectangle(points: { x: number; y: number }[]) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  }

  private calculateArrow(points: { x: number; y: number }[]) {
    const start = points[0];
    const end = points[points.length - 1];
    const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    return { start, end, length, angle };
  }

  private calculateLine(points: { x: number; y: number }[]) {
    return {
      start: points[0],
      end: points[points.length - 1]
    };
  }

  private redrawAll() {
    if (!this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    
    for (const stroke of this.strokes) {
      this.drawBeautifiedStroke(stroke);
    }
  }

  private getCurrentColor(): DrawingColor {
    return DRAWING_COLORS.find(c => c.id === this.state.colorId) || DRAWING_COLORS[0];
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // Public API
  getState(): DrawingState {
    return { ...this.state };
  }

  setTool(tool: DrawingTool) {
    this.state.tool = tool;
    this.state.isActive = tool !== 'none';
    
    // Update cursor
    document.body.style.cursor = this.state.isActive ? 
      (tool === 'highlighter' ? 'text' : 'crosshair') : 'default';
    
    this.notifyListeners();
  }

  setColor(colorId: string) {
    this.state.colorId = colorId;
    this.notifyListeners();
  }

  setStrokeWidth(width: number) {
    this.state.strokeWidth = Math.max(1, Math.min(10, width));
    this.notifyListeners();
  }

  clearAll() {
    this.strokes = [];
    this.highlights.forEach(h => {
      const element = document.querySelector(`[data-highlight-id="${h.id}"]`);
      if (element) {
        const parent = element.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(element.textContent || ''), element);
          parent.normalize();
        }
      }
    });
    this.highlights = [];
    
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    }
    
    this.notifyListeners();
  }

  getStrokes(): DrawingStroke[] {
    return [...this.strokes];
  }

  getHighlights(): HighlightSelection[] {
    return [...this.highlights];
  }

  onStateChange(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  destroy() {
    if (this.canvas) {
      document.body.removeChild(this.canvas);
    }
    this.clearAll();
    document.body.style.cursor = 'default';
  }
}

export const drawingService = new DrawingService();