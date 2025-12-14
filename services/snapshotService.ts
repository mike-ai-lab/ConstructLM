declare global {
  interface Window {
    html2canvas: any;
  }
}

export interface Snapshot {
  id: string;
  timestamp: number;
  dataUrl: string;
  name: string;
  metadata?: {
    url?: string;
    userAgent?: string;
    viewport?: { width: number; height: number };
    activeFiles?: number;
    messageCount?: number;
  };
}

class SnapshotService {
  private snapshots: Snapshot[] = [];
  private readonly STORAGE_KEY = 'constructlm_snapshots';

  constructor() {
    this.loadSnapshots();
  }

  async takeSnapshot(element?: HTMLElement, context?: any): Promise<Snapshot> {
    const targetElement = element || document.body;
    if (!window.html2canvas) {
      throw new Error('html2canvas library not loaded');
    }
    
    const canvas = await window.html2canvas(targetElement, {
      useCORS: true,
      allowTaint: true,
      scale: 2, // Higher quality
      backgroundColor: '#ffffff',
      logging: false,
      removeContainer: true,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        // Ensure fonts are loaded in cloned document
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
          .text-rendering { text-rendering: optimizeLegibility !important; }
        `;
        clonedDoc.head.appendChild(style);
      },
      ignoreElements: (element) => {
        // Ignore certain UI elements that shouldn't be in snapshots
        return element.classList?.contains('snapshot-ignore') || 
               element.classList?.contains('resize-handle-vertical') ||
               element.tagName === 'SCRIPT' ||
               element.tagName === 'STYLE' ||
               false;
      }
    });

    // Use high quality PNG with better compression
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const snapshot: Snapshot = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      dataUrl,
      name: `Snapshot ${new Date().toLocaleString()}`,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        activeFiles: context?.fileCount || 0,
        messageCount: context?.messageCount || 0
      }
    };

    this.snapshots.unshift(snapshot);
    this.saveSnapshots();
    return snapshot;
  }

  getSnapshots(): Snapshot[] {
    return [...this.snapshots];
  }

  deleteSnapshot(id: string): void {
    this.snapshots = this.snapshots.filter(s => s.id !== id);
    this.saveSnapshots();
  }

  downloadSnapshot(snapshot: Snapshot): void {
    const link = document.createElement('a');
    link.download = `${snapshot.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = snapshot.dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async copyToClipboard(snapshot: Snapshot): Promise<void> {
    const response = await fetch(snapshot.dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
  }

  private saveSnapshots(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.snapshots.slice(0, 50))); // Keep max 50
    } catch (e) {
      console.warn('Failed to save snapshots:', e);
    }
  }

  private loadSnapshots(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.snapshots = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load snapshots:', e);
      this.snapshots = [];
    }
  }
}

export const snapshotService = new SnapshotService();