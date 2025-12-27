import React, { useState, useEffect } from 'react';
import { Edit3, Square, Circle, ArrowRight, Minus, Plus, Trash2, Check } from 'lucide-react';
import { DrawingTool, DRAWING_COLORS } from '../services/drawingService';

interface DrawingToolbarProps {
  isOpen: boolean;
  position: { x: number; y: number };
  currentTool: DrawingTool;
  currentColor: any;
  strokeWidth: number;
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (colorId: string) => void;
  onStrokeWidthChange: (delta: number) => void;
  onClearAll: () => void;
  onClose: () => void;
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  isOpen,
  position,
  currentTool,
  currentColor,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onClearAll,
  onClose
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [toolbarPos, setToolbarPos] = useState(position);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setToolbarPos(position);
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setToolbarPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - toolbarPos.x, y: e.clientY - toolbarPos.y });
    e.preventDefault();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed z-50 backdrop-blur-md bg-white/70 dark:bg-[#2a2a2a]/70 border border-[#4485d1]/30 rounded-full shadow-lg px-2 py-1.5 flex items-center gap-1.5 cursor-move select-none"
      style={{ left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px`, userSelect: 'none' }}
      onMouseDown={handleMouseDown}
    >
      <button
        onClick={() => onToolChange('pen')}
        className={`p-1 rounded transition-all ${currentTool === 'pen' ? 'bg-[#4485d1] text-white' : 'hover:bg-gray-100/50 dark:hover:bg-[#3a3a3a]/50'}`}
      >
        <Edit3 size={14} />
      </button>
      <button
        onClick={() => onToolChange('rectangle')}
        className={`p-1 rounded transition-all ${currentTool === 'rectangle' ? 'bg-[#4485d1] text-white' : 'hover:bg-gray-100/50 dark:hover:bg-[#3a3a3a]/50'}`}
      >
        <Square size={14} />
      </button>
      <button
        onClick={() => onToolChange('circle')}
        className={`p-1 rounded transition-all ${currentTool === 'circle' ? 'bg-[#4485d1] text-white' : 'hover:bg-gray-100/50 dark:hover:bg-[#3a3a3a]/50'}`}
      >
        <Circle size={14} />
      </button>
      <button
        onClick={() => onToolChange('arrow')}
        className={`p-1 rounded transition-all ${currentTool === 'arrow' ? 'bg-[#4485d1] text-white' : 'hover:bg-gray-100/50 dark:hover:bg-[#3a3a3a]/50'}`}
      >
        <ArrowRight size={14} />
      </button>
      
      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
      
      {DRAWING_COLORS.map(c => (
        <button
          key={c.id}
          onClick={() => onColorChange(c.id)}
          className={`w-5 h-5 rounded-full border transition-all ${
            currentColor?.id === c.id ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: c.hex }}
        />
      ))}
      
      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
      
      <button
        onClick={() => onStrokeWidthChange(-1)}
        disabled={strokeWidth <= 1}
        className="p-1 hover:bg-gray-100/50 dark:hover:bg-[#3a3a3a]/50 rounded disabled:opacity-30"
      >
        <Minus size={14} />
      </button>
      <div
        className="rounded-full border border-gray-400"
        style={{
          width: `${Math.max(4, strokeWidth * 2)}px`,
          height: `${Math.max(4, strokeWidth * 2)}px`,
          backgroundColor: currentColor?.hex
        }}
      />
      <button
        onClick={() => onStrokeWidthChange(1)}
        disabled={strokeWidth >= 10}
        className="p-1 hover:bg-gray-100/50 dark:hover:bg-[#3a3a3a]/50 rounded disabled:opacity-30"
      >
        <Plus size={14} />
      </button>
      
      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
      
      <button
        onClick={onClose}
        className="p-1 hover:bg-green-100/50 dark:hover:bg-green-900/30 rounded text-green-600"
      >
        <Check size={14} />
      </button>
      <button
        onClick={onClearAll}
        className="p-1 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded text-red-600"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export default DrawingToolbar;
