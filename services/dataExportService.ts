import { chatRegistry } from './chatRegistry';
import { mindMapCache } from './mindMapCache';
import { snapshotService } from './snapshotService';

interface ExportData {
  version: string;
  timestamp: number;
  settings: any;
  chats: any[];
  mindMaps: any;
  snapshots: any[];
  notes: any[];
  noteCounter: number;
}

class DataExportService {
  private readonly VERSION = '1.0.0';

  async exportData(): Promise<void> {
    try {
      const exportId = `EXPORT_${Date.now()}`;
      console.log(`[${exportId}] Starting data export...`);
      
      const settings = this.getSettings();
      const chats = chatRegistry.getAllFullChats();
      const mindMaps = mindMapCache.getAll();
      const snapshots = snapshotService.getSnapshots();
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      const noteCounter = parseInt(localStorage.getItem('noteCounter') || '1');
      
      console.log(`[${exportId}] Export data collected:`, {
        settingsKeys: Object.keys(settings),
        chatsCount: chats.length,
        mindMapsCount: Object.keys(mindMaps).length,
        snapshotsCount: snapshots.length,
        notesCount: notes.length
      });
      
      // Collect all data
      const exportData: ExportData = {
        version: this.VERSION,
        timestamp: Date.now(),
        settings,
        chats,
        mindMaps,
        snapshots,
        notes,
        noteCounter
      };

      // Create ZIP file
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Add main data file
      zip.file('constructlm-data.json', JSON.stringify(exportData, null, 2));
      
      // Add snapshots as separate files
      for (const snapshot of exportData.snapshots) {
        const imageData = snapshot.dataUrl || snapshot.imageData;
        if (imageData) {
          const base64Data = imageData.split(',')[1];
          zip.file(`snapshots/${snapshot.id}.png`, base64Data, { base64: true });
        }
      }

      // Generate ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Download file
      const filename = `constructlm-backup-${new Date().toISOString().split('T')[0]}.zip`;
      this.downloadBlob(content, filename);
      
      this.showToast('Data exported successfully!', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      this.showToast('Export failed. Please try again.', 'error');
    }
  }

  async importData(file: File, mode: 'replace' | 'merge' = 'replace'): Promise<void> {
    try {
      const importId = `IMPORT_${Date.now()}`;
      console.log(`[${importId}] Starting data import from file:`, file.name);
      
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);
      
      console.log(`[${importId}] ZIP loaded, files:`, Object.keys(zip.files));
      
      // Read main data file
      const dataFile = zip.file('constructlm-data.json');
      if (!dataFile) {
        throw new Error('Invalid backup file: missing data file');
      }
      
      const dataContent = await dataFile.async('text');
      const importData: ExportData = JSON.parse(dataContent);
      
      console.log(`[${importId}] Import data parsed:`, {
        version: importData.version,
        timestamp: new Date(importData.timestamp).toISOString(),
        settingsKeys: importData.settings ? Object.keys(importData.settings) : 'none',
        chatsCount: importData.chats ? importData.chats.length : 0,
        mindMapsCount: importData.mindMaps ? Object.keys(importData.mindMaps).length : 0,
        snapshotsCount: importData.snapshots ? importData.snapshots.length : 0
      });
      
      // Validate version compatibility
      if (!importData.version || !importData.timestamp) {
        throw new Error('Invalid backup file format');
      }
      
      // Confirm import
      const modeText = mode === 'merge' ? 'merge with' : 'replace';
      const confirmed = confirm(
        `Import backup from ${new Date(importData.timestamp).toLocaleDateString()}?\n\n` +
        `This will ${modeText}:\n` +
        `• ${importData.chats?.length || 0} chats\n` +
        `• ${Object.keys(importData.mindMaps || {}).length} mind maps\n` +
        `• ${importData.snapshots?.length || 0} snapshots\n` +
        `• ${importData.notes?.length || 0} notes\n` +
        `• Settings\n\n` +
        (mode === 'replace' ? 'Current data will be lost. ' : 'Data will be merged. ') +
        'Continue?'
      );
      
      if (!confirmed) return;
      
      console.log(`[${importId}] Starting data restoration (${mode} mode)...`);
      
      // Import settings
      console.log(`[${importId}] Restoring settings...`);
      this.restoreSettings(importData.settings);
      
      if (mode === 'replace') {
        // Replace mode: clear existing data
        console.log(`[${importId}] Clearing existing data...`);
        chatRegistry.importChats(importData.chats || []);
        mindMapCache.importAll(importData.mindMaps || {});
        localStorage.setItem('notes', JSON.stringify(importData.notes || []));
        localStorage.setItem('noteCounter', (importData.noteCounter || 1).toString());
      } else {
        // Merge mode: combine with existing data
        console.log(`[${importId}] Merging with existing data...`);
        const existingChats = chatRegistry.getAllFullChats();
        const mergedChats = [...existingChats, ...(importData.chats || [])];
        chatRegistry.importChats(mergedChats);
        
        const existingMindMaps = mindMapCache.getAll();
        const mergedMindMaps = { ...existingMindMaps, ...(importData.mindMaps || {}) };
        mindMapCache.importAll(mergedMindMaps);
        
        const existingNotes = JSON.parse(localStorage.getItem('notes') || '[]');
        const existingCounter = parseInt(localStorage.getItem('noteCounter') || '1');
        const mergedNotes = [...existingNotes, ...(importData.notes || [])];
        localStorage.setItem('notes', JSON.stringify(mergedNotes));
        localStorage.setItem('noteCounter', Math.max(existingCounter, importData.noteCounter || 1).toString());
      }
      
      // Import snapshots with images
      const snapshotsWithImages = await Promise.all(
        (importData.snapshots || []).map(async (snapshot) => {
          const imageFile = zip.file(`snapshots/${snapshot.id}.png`);
          if (imageFile) {
            const imageBlob = await imageFile.async('blob');
            const imageData = await this.blobToBase64(imageBlob);
            return { ...snapshot, dataUrl: imageData };
          }
          return { ...snapshot, dataUrl: snapshot.dataUrl || snapshot.imageData || '' };
        })
      );
      
      if (mode === 'replace') {
        snapshotService.importSnapshots(snapshotsWithImages);
      } else {
        const existingSnapshots = snapshotService.getSnapshots();
        snapshotService.importSnapshots([...existingSnapshots, ...snapshotsWithImages]);
      }
      
      this.showToast(`Data ${mode === 'merge' ? 'merged' : 'imported'} successfully! Refreshing...`, 'success');
      
      // Refresh page after short delay
      setTimeout(() => window.location.reload(), 2000);
      
    } catch (error) {
      console.error('Import failed:', error);
      this.showToast(`Import failed: ${(error as Error).message}`, 'error');
    }
  }

  private getSettings(): any {
    return {
      apiKeys: {
        google: localStorage.getItem('google-api-key') || '',
        groq: localStorage.getItem('groq-api-key') || '',
        openai: localStorage.getItem('openai-api-key') || ''
      },
      theme: localStorage.getItem('theme') || 'light',
      defaultModel: localStorage.getItem('default-model') || 'gemini-2.0-flash-exp'
    };
  }

  private restoreSettings(settings: any): void {
    console.log('[SETTINGS] Restoring settings:', settings);
    
    if (!settings) {
      console.warn('[SETTINGS] No settings to restore');
      return;
    }
    
    if (settings.apiKeys) {
      console.log('[SETTINGS] Restoring API keys:', Object.keys(settings.apiKeys));
      if (settings.apiKeys.google) {
        localStorage.setItem('google-api-key', settings.apiKeys.google);
        console.log('[SETTINGS] Google API key restored');
      }
      if (settings.apiKeys.groq) {
        localStorage.setItem('groq-api-key', settings.apiKeys.groq);
        console.log('[SETTINGS] Groq API key restored');
      }
      if (settings.apiKeys.openai) {
        localStorage.setItem('openai-api-key', settings.apiKeys.openai);
        console.log('[SETTINGS] OpenAI API key restored');
      }
    }
    
    if (settings.theme) {
      localStorage.setItem('theme', settings.theme);
      console.log('[SETTINGS] Theme restored:', settings.theme);
    }
    
    if (settings.defaultModel) {
      localStorage.setItem('default-model', settings.defaultModel);
      console.log('[SETTINGS] Default model restored:', settings.defaultModel);
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-[9999] text-white ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  }
}

export const dataExportService = new DataExportService();