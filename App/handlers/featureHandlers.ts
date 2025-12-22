import { ProcessedFile } from '../../types';
import { snapshotService, Snapshot } from '../../services/snapshotService';
import { drawingService, DrawingTool, DRAWING_COLORS, DrawingState } from '../../services/drawingService';
import { generateMindMapData } from '../../services/mindMapService';
import { mindMapCache } from '../../services/mindMapCache';
import { showToast } from '../../utils/uiHelpers';

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
    try {
      const messagesContainer = document.querySelector('.max-w-3xl.mx-auto.w-full');
      if (!messagesContainer) {
        showToast('Messages container not found', 'error');
        return;
      }
      const context = { fileCount: files.length, messageCount: messages.length };
      showToast('Taking snapshot...', 'info');
      const snapshot = await snapshotService.takeSnapshot(messagesContainer as HTMLElement, context);
      setSnapshots(snapshotService.getSnapshots());
      showToast('Snapshot saved!', 'success');
    } catch (error: any) {
      console.error('Failed to take snapshot:', error);
      showToast(error?.message || 'Failed to take snapshot', 'error');
    }
  };

  const handleDownloadSnapshot = (snapshot: Snapshot) => {
    snapshotService.downloadSnapshot(snapshot);
  };

  const handleCopySnapshot = async (snapshot: Snapshot) => {
    try {
      await snapshotService.copyToClipboard(snapshot);
      showToast('Copied to clipboard!', 'success');
    } catch (error: any) {
      console.error('Failed to copy snapshot:', error);
      showToast('Failed to copy snapshot', 'error');
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    snapshotService.deleteSnapshot(id);
    setSnapshots(snapshotService.getSnapshots());
  };

  const handleDrawingToolChange = (tool: DrawingTool) => {
    drawingService.setTool(tool);
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
    if (confirm('Clear all drawings and highlights?')) {
      drawingService.clearAll();
    }
  };

  const handleGenerateMindMap = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const cached = mindMapCache.get(fileId, activeModelId);
    if (cached) {
      setMindMapData(cached.data);
      setMindMapFileName(cached.fileName);
      return;
    }

    setIsGeneratingMindMap(true);
    try {
      const data = await generateMindMapData(file, activeModelId);
      mindMapCache.save(fileId, file.name, activeModelId, data);
      setMindMapData(data);
      setMindMapFileName(file.name);
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
