import { useState, useRef } from 'react';
import { drawingService, DrawingState } from '../services/drawingService';
import { Snapshot } from '../services/snapshotService';

export const useFeatureState = () => {
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isCallingEffect, setIsCallingEffect] = useState(false);
  const [activeModelId, setActiveModelId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [showGraphicsLibrary, setShowGraphicsLibrary] = useState(false);
  const [rateLimitTimers, setRateLimitTimers] = useState<Record<string, number>>({});
  const [drawingState, setDrawingState] = useState<DrawingState>(drawingService.getState());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showToolPicker, setShowToolPicker] = useState(false);
  const [mindMapData, setMindMapData] = useState<any>(null);
  const [mindMapFileName, setMindMapFileName] = useState<string>('');
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);
  
  const modelMenuRef = useRef<HTMLDivElement>(null);

  return {
    isLiveMode,
    setIsLiveMode,
    isCallingEffect,
    setIsCallingEffect,
    activeModelId,
    setActiveModelId,
    isRecording,
    setIsRecording,
    mediaRecorder,
    setMediaRecorder,
    showModelMenu,
    setShowModelMenu,
    isSettingsOpen,
    setIsSettingsOpen,
    isHelpOpen,
    setIsHelpOpen,
    snapshots,
    setSnapshots,
    showGraphicsLibrary,
    setShowGraphicsLibrary,
    rateLimitTimers,
    setRateLimitTimers,
    drawingState,
    setDrawingState,
    showColorPicker,
    setShowColorPicker,
    showToolPicker,
    setShowToolPicker,
    mindMapData,
    setMindMapData,
    mindMapFileName,
    setMindMapFileName,
    isGeneratingMindMap,
    setIsGeneratingMindMap,
    modelMenuRef,
  };
};
