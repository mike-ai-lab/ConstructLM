import { chatRegistry } from './chatRegistry';
import { mindMapCache } from './mindMapCache';
import { snapshotService } from './snapshotService';
import { permanentStorage } from './permanentStorage';
import { activityLogger } from './activityLogger';
import { userProfileService } from './userProfileService';

interface ExportData {
  version: string;
  timestamp: number;
  exportDate: string;
  settings: any;
  chats: any[];
  mindMaps: any;
  snapshots: any[];
  notes: any[];
  noteCounter: number;
  todos: any[];
  reminders: any[];
  sources: any[];
  userProfile: any;
  userFolders: any[];
  lastChatId: string;
  noteStyle: string;
  processedFiles: any[];
  fileSections: any[];
}

export interface ExportOptions {
  settings?: boolean;
  chats?: boolean;
  mindMaps?: boolean;
  snapshots?: boolean;
  notes?: boolean;
  todos?: boolean;
  reminders?: boolean;
  sources?: boolean;
  userProfile?: boolean;
  userFolders?: boolean;
  processedFiles?: boolean;
  activityLogs?: boolean;
}

class DataExportService {
  private readonly VERSION = '2.0.0';

  async exportData(options?: ExportOptions): Promise<void> {
    const opts = options || {
      settings: true,
      chats: true,
      mindMaps: true,
      snapshots: true,
      notes: true,
      todos: true,
      reminders: true,
      sources: true,
      userProfile: true,
      userFolders: true,
      processedFiles: true,
      activityLogs: true
    };
    try {
      const exportId = `EXPORT_${Date.now()}`;
      console.log(`[${exportId}] Starting data export...`);
      
      const settings = opts.settings ? this.getSettings() : {};
      const chats = opts.chats ? chatRegistry.getAllFullChats() : [];
      const mindMaps = opts.mindMaps ? mindMapCache.getAll() : {};
      const snapshots = opts.snapshots ? snapshotService.getSnapshots() : [];
      const notes = opts.notes ? JSON.parse(localStorage.getItem('notes') || '[]') : [];
      const noteCounter = opts.notes ? parseInt(localStorage.getItem('noteCounter') || '1') : 1;
      const todos = opts.todos ? JSON.parse(localStorage.getItem('todos') || '[]') : [];
      const reminders = opts.reminders ? JSON.parse(localStorage.getItem('reminders') || '[]') : [];
      const sources = opts.sources ? JSON.parse(localStorage.getItem('sources') || '[]') : [];
      const userProfile = opts.userProfile ? userProfileService.getProfile() : {};
      const userFolders = opts.userFolders ? JSON.parse(localStorage.getItem('userFolders') || '[]') : [];
      const lastChatId = opts.userProfile ? (localStorage.getItem('lastChatId') || localStorage.getItem('currentChatId') || '') : '';
      const noteStyle = opts.userProfile ? (localStorage.getItem('noteStyle') || 'border') : 'border';
      const processedFiles = opts.processedFiles ? await permanentStorage.getAllFiles() : [];
      
      // Collect file sections
      const fileSections: any[] = [];
      if (opts.processedFiles) {
        for (const file of processedFiles) {
          const sections = await permanentStorage.getSectionsByFileId(file.id);
          if (sections.length > 0) {
            fileSections.push({ fileId: file.id, sections });
          }
        }
      }
      
      console.log(`[${exportId}] Export data collected:`, {
        settingsKeys: settings ? Object.keys(settings) : 'none',
        chatsCount: chats.length,
        mindMapsCount: Object.keys(mindMaps).length,
        snapshotsCount: snapshots.length,
        notesCount: notes.length,
        todosCount: todos.length,
        remindersCount: reminders.length,
        sourcesCount: sources.length,
        processedFilesCount: processedFiles.length,
        fileSectionsCount: fileSections.length
      });
      
      // Collect all data
      const exportData: ExportData = {
        version: this.VERSION,
        timestamp: Date.now(),
        exportDate: new Date().toISOString(),
        settings,
        chats,
        mindMaps,
        snapshots,
        notes,
        noteCounter,
        todos,
        reminders,
        sources,
        userProfile,
        userFolders,
        lastChatId,
        noteStyle,
        processedFiles,
        fileSections
      };

      // Create manifest
      const manifest = this.createManifest(exportData);
      
      // Create ZIP file
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Add manifest file
      zip.file('MANIFEST.txt', manifest);
      
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
      
      // Add activity logs if available
      if (opts.activityLogs) {
        try {
          const logFiles = await activityLogger.getLogFiles();
          for (const logFile of logFiles) {
            const logContent = await activityLogger.readLogFile(logFile);
            if (logContent) {
              zip.file(`logs/${logFile}`, logContent);
            }
          }
        } catch (error) {
          console.warn('Could not export activity logs:', error);
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

  async importData(file: File, options?: ExportOptions, mode: 'replace' | 'merge' = 'replace'): Promise<void> {
    const opts = options || {
      settings: true,
      chats: true,
      mindMaps: true,
      snapshots: true,
      notes: true,
      todos: true,
      reminders: true,
      sources: true,
      userProfile: true,
      userFolders: true,
      processedFiles: true,
      activityLogs: false
    };
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
        snapshotsCount: importData.snapshots ? importData.snapshots.length : 0,
        todosCount: importData.todos ? importData.todos.length : 0,
        remindersCount: importData.reminders ? importData.reminders.length : 0,
        sourcesCount: importData.sources ? importData.sources.length : 0,
        processedFilesCount: importData.processedFiles ? importData.processedFiles.length : 0
      });
      
      // Validate version compatibility
      if (!importData.version || !importData.timestamp) {
        throw new Error('Invalid backup file format');
      }
      
      // Build confirmation message based on selected options
      const modeText = mode === 'merge' ? 'merge with' : 'replace';
      const items: string[] = [];
      if (opts.chats) items.push(`• ${importData.chats?.length || 0} chats`);
      if (opts.mindMaps) items.push(`• ${Object.keys(importData.mindMaps || {}).length} mind maps`);
      if (opts.snapshots) items.push(`• ${importData.snapshots?.length || 0} snapshots`);
      if (opts.notes) items.push(`• ${importData.notes?.length || 0} notes`);
      if (opts.todos) items.push(`• ${importData.todos?.length || 0} todos`);
      if (opts.reminders) items.push(`• ${importData.reminders?.length || 0} reminders`);
      if (opts.sources) items.push(`• ${importData.sources?.length || 0} web sources`);
      if (opts.processedFiles) items.push(`• ${importData.processedFiles?.length || 0} processed files`);
      if (opts.userProfile) items.push(`• User profile & preferences`);
      if (opts.settings) items.push(`• Settings`);
      
      const confirmed = confirm(
        `Import backup from ${new Date(importData.timestamp).toLocaleDateString()}?\n\n` +
        `This will ${modeText}:\n` +
        items.join('\n') +
        '\n\n' +
        (mode === 'replace' ? 'Current data will be lost. ' : 'Data will be merged. ') +
        'Continue?'
      );
      
      if (!confirmed) return;
      
      console.log(`[${importId}] Starting data restoration (${mode} mode)...`);
      
      // Import settings
      if (opts.settings && importData.settings) {
        console.log(`[${importId}] Restoring settings...`);
        this.restoreSettings(importData.settings);
      }
      
      if (mode === 'replace') {
        // Replace mode: clear existing data
        console.log(`[${importId}] Clearing existing data...`);
        if (opts.chats) chatRegistry.importChats(importData.chats || []);
        if (opts.mindMaps) mindMapCache.importAll(importData.mindMaps || {});
        if (opts.notes) {
          localStorage.setItem('notes', JSON.stringify(importData.notes || []));
          localStorage.setItem('noteCounter', (importData.noteCounter || 1).toString());
        }
        if (opts.todos) localStorage.setItem('todos', JSON.stringify(importData.todos || []));
        if (opts.reminders) localStorage.setItem('reminders', JSON.stringify(importData.reminders || []));
        if (opts.sources) localStorage.setItem('sources', JSON.stringify(importData.sources || []));
        if (opts.userProfile && importData.userProfile) {
          userProfileService.saveProfile(importData.userProfile);
          if (importData.lastChatId) localStorage.setItem('lastChatId', importData.lastChatId);
          if (importData.noteStyle) localStorage.setItem('noteStyle', importData.noteStyle);
        }
        if (opts.userFolders) localStorage.setItem('userFolders', JSON.stringify(importData.userFolders || []));
      } else {
        // Merge mode: combine with existing data
        console.log(`[${importId}] Merging with existing data...`);
        if (opts.chats) {
          const existingChats = chatRegistry.getAllFullChats();
          const mergedChats = [...existingChats, ...(importData.chats || [])];
          chatRegistry.importChats(mergedChats);
        }
        
        if (opts.mindMaps) {
          const existingMindMaps = mindMapCache.getAll();
          const mergedMindMaps = { ...existingMindMaps, ...(importData.mindMaps || {}) };
          mindMapCache.importAll(mergedMindMaps);
        }
        
        if (opts.notes) {
          const existingNotes = JSON.parse(localStorage.getItem('notes') || '[]');
          const existingCounter = parseInt(localStorage.getItem('noteCounter') || '1');
          const mergedNotes = [...existingNotes, ...(importData.notes || [])];
          localStorage.setItem('notes', JSON.stringify(mergedNotes));
          localStorage.setItem('noteCounter', Math.max(existingCounter, importData.noteCounter || 1).toString());
        }
        
        if (opts.todos) {
          const existingTodos = JSON.parse(localStorage.getItem('todos') || '[]');
          localStorage.setItem('todos', JSON.stringify([...existingTodos, ...(importData.todos || [])]));
        }
        
        if (opts.reminders) {
          const existingReminders = JSON.parse(localStorage.getItem('reminders') || '[]');
          localStorage.setItem('reminders', JSON.stringify([...existingReminders, ...(importData.reminders || [])]));
        }
        
        if (opts.sources) {
          const existingSources = JSON.parse(localStorage.getItem('sources') || '[]');
          localStorage.setItem('sources', JSON.stringify([...existingSources, ...(importData.sources || [])]));
        }
        
        if (opts.userProfile && importData.userProfile) {
          const existingProfile = userProfileService.getProfile() || {};
          userProfileService.saveProfile({ ...existingProfile, ...importData.userProfile });
        }
        
        if (opts.userFolders) {
          const existingFolders = JSON.parse(localStorage.getItem('userFolders') || '[]');
          localStorage.setItem('userFolders', JSON.stringify([...existingFolders, ...(importData.userFolders || [])]));
        }
      }
      
      // Import snapshots with images
      if (opts.snapshots) {
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
      }
      
      // Import processed files and sections
      if (opts.processedFiles) {
        console.log(`[${importId}] Restoring processed files...`);
        if (importData.processedFiles && importData.processedFiles.length > 0) {
          for (const file of importData.processedFiles) {
            await permanentStorage.saveFile(file);
          }
        }
        
        if (importData.fileSections && importData.fileSections.length > 0) {
          for (const fileSection of importData.fileSections) {
            await permanentStorage.saveSections(fileSection.sections, fileSection.fileId);
          }
        }
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

  private createManifest(data: ExportData): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('              CONSTRUCTLM BACKUP MANIFEST');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Export Version: ${data.version}`);
    lines.push(`Export Date: ${data.exportDate}`);
    lines.push(`Timestamp: ${data.timestamp}`);
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                    EXPORTED DATA SUMMARY');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('');
    lines.push('📊 CONVERSATIONS & CONTENT:');
    lines.push(`  • Chats: ${data.chats?.length || 0}`);
    lines.push(`  • Mind Maps: ${Object.keys(data.mindMaps || {}).length}`);
    lines.push(`  • Snapshots: ${data.snapshots?.length || 0}`);
    lines.push(`  • Notes: ${data.notes?.length || 0}`);
    lines.push('');
    lines.push('✅ TASKS & REMINDERS:');
    lines.push(`  • Todos: ${data.todos?.length || 0}`);
    lines.push(`  • Reminders: ${data.reminders?.length || 0}`);
    lines.push('');
    lines.push('🌐 WEB & SOURCES:');
    lines.push(`  • Web Sources: ${data.sources?.length || 0}`);
    lines.push('');
    lines.push('📁 FILES & PROCESSING:');
    lines.push(`  • Processed Files: ${data.processedFiles?.length || 0}`);
    lines.push(`  • File Sections: ${data.fileSections?.length || 0}`);
    if (data.processedFiles && data.processedFiles.length > 0) {
      const totalSize = data.processedFiles.reduce((sum, f) => sum + (f.size || 0), 0);
      lines.push(`  • Total File Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    }
    lines.push('');
    lines.push('👤 USER PREFERENCES:');
    lines.push(`  • User Profile: ${data.userProfile ? 'Yes' : 'No'}`);
    if (data.userProfile) {
      if (data.userProfile.name) lines.push(`    - Name: ${data.userProfile.name}`);
      if (data.userProfile.role) lines.push(`    - Role: ${data.userProfile.role}`);
      lines.push(`    - Greeting Style: ${data.userProfile.greetingStyle || 'casual'}`);
      lines.push(`    - Sessions: ${data.userProfile.sessionCount || 0}`);
    }
    lines.push(`  • User Folders: ${data.userFolders?.length || 0}`);
    lines.push(`  • Note Style: ${data.noteStyle || 'border'}`);
    lines.push(`  • Last Active Chat: ${data.lastChatId ? 'Saved' : 'None'}`);
    lines.push('');
    lines.push('⚙️ SETTINGS:');
    lines.push(`  • Theme: ${data.settings?.theme || 'light'}`);
    lines.push(`  • Default Model: ${data.settings?.defaultModel || 'N/A'}`);
    lines.push(`  • API Keys Configured:`);
    if (data.settings?.apiKeys) {
      lines.push(`    - Google Gemini: ${data.settings.apiKeys.google ? '✓' : '✗'}`);
      lines.push(`    - Groq: ${data.settings.apiKeys.groq ? '✓' : '✗'}`);
      lines.push(`    - OpenAI: ${data.settings.apiKeys.openai ? '✓' : '✗'}`);
    }
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                    BACKUP CONTENTS');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('');
    lines.push('📦 Files in this backup:');
    lines.push('  • MANIFEST.txt - This file');
    lines.push('  • constructlm-data.json - Main data file');
    if (data.snapshots && data.snapshots.length > 0) {
      lines.push(`  • snapshots/ - ${data.snapshots.length} snapshot images`);
    }
    lines.push('  • logs/ - Activity logs (if available)');
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                    IMPORT INSTRUCTIONS');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('');
    lines.push('To restore this backup:');
    lines.push('1. Open ConstructLM application');
    lines.push('2. Go to Settings (gear icon)');
    lines.push('3. Click "Import Data" in Data Management section');
    lines.push('4. Select this ZIP file');
    lines.push('5. Choose import mode:');
    lines.push('   • MERGE: Combines with existing data');
    lines.push('   • REPLACE: Overwrites all current data');
    lines.push('');
    lines.push('⚠️  IMPORTANT NOTES:');
    lines.push('  • AWS credentials are NOT included for security');
    lines.push('  • Activity logs are read-only (Electron only)');
    lines.push('  • File embeddings and chunks are fully preserved');
    lines.push('  • All user preferences and customizations included');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push(`Generated by ConstructLM v${data.version}`);
    lines.push('═══════════════════════════════════════════════════════════════');
    return lines.join('\n');
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
