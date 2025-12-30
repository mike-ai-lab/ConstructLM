import { ProcessedFile } from '../../types';
import { snapshotService, Snapshot } from '../../services/snapshotService';
import { drawingService, DrawingTool, DRAWING_COLORS, DrawingState } from '../../services/drawingService';
import { generateMindMapData } from '../../services/mindMapService';
import { mindMapCache } from '../../services/mindMapCache';
import { showToast } from '../../utils/uiHelpers';
import { activityLogger } from '../../services/activityLogger';

export const createFeatureHandlers = (
  files: ProcessedFile[],
  messages: any[],
  setSnapshots: (snapshots: Snapshot[]) => void,
  drawingState: DrawingState,
  setShowColorPicker: (show: boolean) => void,
  setMindMapData: (data: any) => void,
  setMindMapFileName: (name: string) => void,
  setIsGeneratingMindMap: (generating: boolean) => void,
  setShowGraphicsLibrary: (show: boolean) => void,
  activeModelId: string
) => {
  const handleTakeSnapshot = async () => {
    const button = document.querySelector('[title="Take snapshot"]');
    const originalIcon = button?.innerHTML;
    try {
      const messagesContainer = document.querySelector('.max-w-3xl.mx-auto.w-full');
      if (!messagesContainer) return;
      
      if (button) button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      
      const context = { fileCount: files.length, messageCount: messages.length };
      const snapshot = await snapshotService.takeSnapshot(messagesContainer as HTMLElement, context);
      setSnapshots(snapshotService.getSnapshots());
      activityLogger.logAction('SNAPSHOT', 'Snapshot taken', { messageCount: messages.length, fileCount: files.length });
      
      setTimeout(() => {
        if (button && originalIcon) button.innerHTML = originalIcon;
      }, 800);
    } catch (error: any) {
      console.error('Failed to take snapshot:', error);
      if (button && originalIcon) button.innerHTML = originalIcon;
    }
  };

  const handleDownloadSnapshot = (snapshot: Snapshot) => {
    snapshotService.downloadSnapshot(snapshot);
  };

  const handleCopySnapshot = async (snapshot: Snapshot) => {
    try {
      await snapshotService.copyToClipboard(snapshot);
    } catch (error: any) {
      console.error('Failed to copy snapshot:', error);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    snapshotService.deleteSnapshot(id);
    setSnapshots(snapshotService.getSnapshots());
  };

  const handleDrawingToolChange = (tool: DrawingTool) => {
    drawingService.setTool(tool);
    activityLogger.logDrawingAction(`Tool changed to ${tool}`);
    if (tool === 'none') {
      setShowColorPicker(false);
    }
  };

  const handleColorChange = (colorId: string) => {
    drawingService.setColor(colorId);
    setShowColorPicker(false);
  };

  const handleStrokeWidthChange = (delta: number) => {
    drawingService.setStrokeWidth(drawingState.strokeWidth + delta);
  };

  const handleClearAll = () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[500] flex items-center justify-center';
    modal.innerHTML = `
      <div class="bg-white dark:bg-[#222222] rounded-xl shadow-2xl p-6 max-w-md mx-4">
        <h3 class="text-lg font-semibold text-[#1a1a1a] dark:text-white mb-2">Clear All Drawings?</h3>
        <p class="text-sm text-[#666666] dark:text-[#a0a0a0] mb-6">This will remove all drawings and highlights from the current view.</p>
        <div class="flex gap-3 justify-end">
          <button id="cancel-btn" class="px-4 py-2 rounded-lg text-sm font-medium text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] transition-colors">Cancel</button>
          <button id="confirm-btn" class="px-4 py-2 rounded-lg text-sm font-medium bg-[#f07a76] text-white hover:bg-[#e06a66] transition-colors">Clear All</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#confirm-btn')?.addEventListener('click', () => {
      drawingService.clearAll();
      document.body.removeChild(modal);
    });
    modal.querySelector('#cancel-btn')?.addEventListener('click', () => document.body.removeChild(modal));
    modal.addEventListener('click', (e) => { if (e.target === modal) document.body.removeChild(modal); });
  };

  const handleGenerateMindMap = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const cached = mindMapCache.get(fileId, activeModelId);
    if (cached) {
      activityLogger.logAction('MINDMAP', 'Mind map loaded from cache', { fileName: file.name });
      setMindMapData(cached.data);
      setMindMapFileName(cached.fileName);
      return;
    }

    setIsGeneratingMindMap(true);
    activityLogger.logAction('MINDMAP', 'Mind map generation started', { fileName: file.name, modelId: activeModelId });
    try {
      const data = await generateMindMapData(file, activeModelId);
      mindMapCache.save(fileId, file.name, activeModelId, data);
      setMindMapData(data);
      setMindMapFileName(file.name);
      activityLogger.logMindMapGenerated(file.name);
    } catch (error: any) {
      console.error('Mind map generation error:', error);
      showToast((error as Error).message || 'Failed to generate mind map', 'error');
    } finally {
      setIsGeneratingMindMap(false);
    }
  };

  const handleOpenMindMapFromLibrary = (fileId: string, modelId: string, data: any, fileName: string) => {
    setMindMapData(data);
    setMindMapFileName(fileName);
    setShowGraphicsLibrary(false);
  };

  const handleDeleteMindMap = (fileId: string, modelId: string) => {
    mindMapCache.delete(fileId, modelId);
  };

  const currentColor = DRAWING_COLORS.find(c => c.id === drawingState.colorId) || DRAWING_COLORS[0];

  return {
    handleTakeSnapshot,
    handleDownloadSnapshot,
    handleCopySnapshot,
    handleDeleteSnapshot,
    handleDrawingToolChange,
    handleColorChange,
    handleStrokeWidthChange,
    handleClearAll,
    handleGenerateMindMap,
    handleOpenMindMapFromLibrary,
    handleDeleteMindMap,
    currentColor,
  };
};
