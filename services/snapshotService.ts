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
    const snapshotId = `SNAPSHOT_${Date.now()}`;
    console.log(`[${snapshotId}] Starting snapshot capture`);
    
    const targetElement = element || document.body;
    
    // Load html2canvas if not available
    if (!window.html2canvas) {
      console.log(`[${snapshotId}] Loading html2canvas library...`);
      try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('html2canvas loading timeout'));
          }, 10000);
          
          script.onload = () => {
            clearTimeout(timeout);
            // Wait a bit for the library to initialize
            setTimeout(resolve, 100);
          };
          script.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load html2canvas script'));
          };
        });
        
        console.log(`[${snapshotId}] html2canvas loaded successfully`);
      } catch (error) {
        console.error(`[${snapshotId}] Failed to load html2canvas:`, error);
        throw new Error('Failed to load screenshot library. Please check your internet connection.');
      }
    }
    
    console.log(`[${snapshotId}] Capturing element:`, targetElement.tagName, targetElement.className);
    
    const canvas = await window.html2canvas(targetElement, {
      useCORS: true,
      allowTaint: true,
      scale: 1, // Reduced scale for better compatibility
      backgroundColor: '#ffffff',
      logging: false,
      removeContainer: true,
      imageTimeout: 15000,
      width: targetElement.scrollWidth,
      height: targetElement.scrollHeight,
      onclone: (clonedDoc) => {
        console.log(`[${snapshotId}] Document cloned for rendering`);
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
    
    console.log(`[${snapshotId}] Canvas created:`, canvas.width, 'x', canvas.height);

    // Use high quality PNG with better compression
    const dataUrl = canvas.toDataURL('image/png', 0.9);
    console.log(`[${snapshotId}] Data URL created, length:`, dataUrl.length);
    
    if (dataUrl.length < 100) {
      console.error(`[${snapshotId}] Data URL too short, likely failed:`, dataUrl);
      throw new Error('Failed to generate snapshot image data');
    }
    
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
    
    console.log(`[${snapshotId}] Snapshot created:`, {
      id: snapshot.id,
      name: snapshot.name,
      dataUrlLength: snapshot.dataUrl.length
    });

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
    const downloadId = `DOWNLOAD_${Date.now()}`;
    console.log(`[${downloadId}] Starting snapshot download:`, snapshot.name);
    
    if (!snapshot.dataUrl || snapshot.dataUrl.length < 100) {
      console.error(`[${downloadId}] Invalid snapshot data:`, snapshot.dataUrl?.length || 0);
      alert('Cannot download: Snapshot data is corrupted or missing');
      return;
    }
    
    const link = document.createElement('a');
    link.download = `${snapshot.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = snapshot.dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`[${downloadId}] Download initiated`);
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

  importSnapshots(snapshots: Snapshot[]): void {
    try {
      this.snapshots = snapshots;
      this.saveSnapshots();
    } catch (e) {
      console.warn('Failed to import snapshots:', e);
    }
  }
}

export const snapshotService = new SnapshotService();