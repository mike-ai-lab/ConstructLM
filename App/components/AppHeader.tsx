import React from 'react';
import { Sparkles, PanelLeft, PanelLeftOpen, Cpu, ChevronDown, Phone, Plus, Edit3, Highlighter, Trash2, Check, Minus, Camera, Image, Moon, Sun, HelpCircle, Settings } from 'lucide-react';
import { MODEL_REGISTRY } from '../../services/modelRegistry';
import { DRAWING_COLORS } from '../../services/drawingService';
import GraphicsLibrary from '../../components/GraphicsLibrary';

interface AppHeaderProps {
  isMobile: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activeModel: any;
  showModelMenu: boolean;
  setShowModelMenu: (show: boolean) => void;
  modelMenuRef: React.RefObject<HTMLDivElement>;
  rateLimitTimers: Record<string, number>;
  activeModelId: string;
  setActiveModelId: (id: string) => void;
  isElectron: boolean;
  isCallingEffect: boolean;
  isLiveMode: boolean;
  setIsCallingEffect: (effect: boolean) => void;
  setIsLiveMode: (mode: boolean) => void;
  handleCreateChat: () => void;
  showToolPicker: boolean;
  setShowToolPicker: (show: boolean) => void;
  toolPickerRef: React.RefObject<HTMLDivElement>;
  drawingState: any;
  handleDrawingToolChange: (tool: any) => void;
  handleClearAll: () => void;
  showColorPicker: boolean;
  setShowColorPicker: (show: boolean) => void;
  colorPickerRef: React.RefObject<HTMLDivElement>;
  currentColor: any;
  handleColorChange: (id: string) => void;
  handleStrokeWidthChange: (delta: number) => void;
  handleTakeSnapshot: () => void;
  showGraphicsLibrary: boolean;
  setShowGraphicsLibrary: (show: boolean) => void;
  snapshots: any[];
  mindMapCache: any;
  setIsHelpOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  handleDownloadSnapshot: (snapshot: any) => void;
  handleCopySnapshot: (snapshot: any) => void;
  handleDeleteSnapshot: (id: string) => void;
  handleOpenMindMapFromLibrary: (fileId: string, modelId: string, data: any, fileName: string) => void;
}

const AppHeader: React.FC<AppHeaderProps> = (props) => {
  return (
    <header className="h-[65px] flex-none border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between px-3 md:px-6 bg-white dark:bg-[#1a1a1a] min-w-0 gap-2 relative z-40">
      <div className="flex items-center gap-2 min-w-0 flex-shrink">
        {!props.isMobile && (
          <button 
            onClick={() => props.setIsSidebarOpen(!props.isSidebarOpen)} 
            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
            title={props.isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
          >
            {props.isSidebarOpen ? <PanelLeft size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        )}
        <div className="bg-gradient-to-tr from-[#4485d1] to-[#4485d1] p-1.5 rounded-lg shadow-sm flex-shrink-0">
          <Sparkles size={14} className="text-white" />
        </div>
        <h1 className="font-semibold text-[#1a1a1a] dark:text-white text-base md:text-lg tracking-tight truncate hidden sm:block">ConstructLM</h1>
        
        <div className="relative flex-shrink-0" ref={props.modelMenuRef}>
          <button 
            onClick={(e) => {
              console.log('BUTTON CLICKED', props.showModelMenu);
              e.stopPropagation();
              props.setShowModelMenu(!props.showModelMenu);
            }}
            className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded-full text-xs font-medium text-[#1a1a1a] dark:text-white"
          >
            <Cpu size={12} className="flex-shrink-0" />
            <span className="max-w-[60px] md:max-w-[120px] truncate">{props.activeModel.name}</span>
            <ChevronDown size={10} className="flex-shrink-0" />
          </button>
          
          <div style={{display: props.showModelMenu ? 'block' : 'none'}} className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#222222] rounded-xl shadow-xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] overflow-hidden z-[100]">
            <div className="px-3 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] text-[12px] font-bold text-[#666666] dark:text-[#a0a0a0] uppercase">Select Model</div>
            <div className="max-h-[400px] overflow-y-auto p-1">
                {MODEL_REGISTRY.map(model => {
                  const cooldown = props.rateLimitTimers[model.id];
                  const isRateLimited = cooldown && cooldown > Date.now();
                  const remainingMs = isRateLimited ? cooldown - Date.now() : 0;
                  const remainingMinutes = Math.floor(remainingMs / 60000);
                  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
                  const timeDisplay = remainingMinutes > 0 
                    ? `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
                    : `${remainingSeconds}s`;
                  
                  return (
                    <button
                      key={model.id}
                      onClick={() => { props.setActiveModelId(model.id); props.setShowModelMenu(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${props.activeModelId === model.id ? 'bg-[rgba(68,133,209,0.1)]' : 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${model.provider === 'google' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                          <span className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">{model.name}</span>
                          {model.supportsThinking && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold flex-shrink-0">Thinks</span>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {isRateLimited ? (
                            <span className="text-[12px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-mono">▽{timeDisplay}</span>
                          ) : (
                            <span className={`text-[12px] px-1.5 py-0.5 rounded ${
                              model.capacityTag === 'High' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              model.capacityTag === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}>{model.capacityTag}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-[12px] text-[#666666] dark:text-[#a0a0a0] pl-4 mt-0.5">{model.description}</div>
                      {model.maxInputWords && model.maxOutputWords && (
                        <div className="text-[12px] text-[#666666] dark:text-[#a0a0a0] pl-4 mt-1 flex gap-3">
                          <span>In: ~{(model.maxInputWords / 1000).toFixed(0)}K</span>
                          <span>Out: ~{(model.maxOutputWords / 1000).toFixed(0)}K</span>
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        {!props.isElectron && (
          <button
            onClick={() => {
              if (!props.isCallingEffect && !props.isLiveMode) {
                props.setIsCallingEffect(true);
                setTimeout(() => {
                  props.setIsCallingEffect(false);
                  props.setIsLiveMode(true);
                }, 5000);
              }
            }}
            disabled={props.isCallingEffect || props.isLiveMode}
            className={`p-1.5 md:p-2 rounded-full transition-all flex-shrink-0 ${
              props.isCallingEffect 
                ? 'bg-green-500 text-white animate-pulse scale-110' 
                : 'text-[#a0a0a0] hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600'
            } ${props.isLiveMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Call Gemini Live"
          >
            <Phone size={16} className={props.isCallingEffect ? 'animate-bounce' : ''} />
          </button>
        )}
        <button onClick={props.handleCreateChat} className="p-1.5 md:p-2 text-[#a0a0a0] hover:bg-[rgba(68,133,209,0.1)] hover:text-[#4485d1] rounded-full transition-colors flex-shrink-0" title="New Chat">
          <Plus size={16} />
        </button>
        <div className="relative flex-shrink-0" ref={props.toolPickerRef}>
          <button
            onClick={() => props.setShowToolPicker(!props.showToolPicker)}
            className={`p-1.5 md:p-2 rounded-full transition-colors ${
              props.drawingState.tool === 'highlighter'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                : props.drawingState.tool === 'pen'
                ? 'bg-[rgba(68,133,209,0.1)] text-[#4485d1]'
                : 'text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'
            }`}
            title="Drawing Tools"
          >
            {props.drawingState.tool === 'highlighter' ? <Highlighter size={16} /> : <Edit3 size={16} />}
          </button>
          
          {props.showToolPicker && (
            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#222222] rounded-lg shadow-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] p-2 z-[100] flex gap-1">
              <button onClick={() => { props.handleDrawingToolChange('pen'); props.setShowToolPicker(false); }} className={`p-2 rounded-full transition-all hover:scale-110 ${props.drawingState.tool === 'pen' ? 'bg-[rgba(68,133,209,0.2)] text-[#4485d1] scale-110' : 'text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'}`} title="Pen">
                <Edit3 size={18} />
              </button>
              <button onClick={() => { props.handleDrawingToolChange('highlighter'); props.setShowToolPicker(false); }} className={`p-2 rounded-full transition-all hover:scale-110 ${props.drawingState.tool === 'highlighter' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 scale-110' : 'text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'}`} title="Highlighter">
                <Highlighter size={18} />
              </button>
              <button onClick={() => { props.handleClearAll(); props.setShowToolPicker(false); }} className="p-2 rounded-full text-[#a0a0a0] hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-[#ef4444] transition-all hover:scale-110" title="Clear All">
                <Trash2 size={18} />
              </button>
              {props.drawingState.isActive && (
                <button onClick={() => { props.handleDrawingToolChange('none'); props.setShowToolPicker(false); }} className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 transition-all hover:scale-110" title="Done">
                  <Check size={18} />
                </button>
              )}
            </div>
          )}
        </div>
        
        {props.drawingState.isActive && props.drawingState.tool !== 'none' && (
          <>
            <div className="relative flex-shrink-0" ref={props.colorPickerRef}>
              <button onClick={() => props.setShowColorPicker(!props.showColorPicker)} className="p-1.5 md:p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors" title="Choose Color">
                <div className="flex items-center">
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-gray-300" style={{ backgroundColor: props.currentColor.color }} />
                </div>
              </button>
              
              {props.showColorPicker && (
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#222222] rounded-lg shadow-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] p-2 z-[100] flex gap-1">
                  {DRAWING_COLORS.map(color => (
                    <button key={color.id} onClick={() => props.handleColorChange(color.id)} className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex-shrink-0 ${props.drawingState.colorId === color.id ? 'border-[#a0a0a0] scale-110' : 'border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]'}`} style={{ backgroundColor: color.color }} title={(color as any).name} />
                  ))}
                </div>
              )}
            </div>
            
            {props.drawingState.tool === 'pen' && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => props.handleStrokeWidthChange(-1)} disabled={props.drawingState.strokeWidth <= 1} className="p-1 text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded" title="Decrease stroke width">
                  <Minus size={12} />
                </button>
                <div className="rounded-full bg-gray-600" style={{ width: `${Math.max(4, props.drawingState.strokeWidth * 2)}px`, height: `${Math.max(4, props.drawingState.strokeWidth * 2)}px` }} />
                <button onClick={() => props.handleStrokeWidthChange(1)} disabled={props.drawingState.strokeWidth >= 10} className="p-1 text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded" title="Increase stroke width">
                  <Plus size={12} />
                </button>
              </div>
            )}
          </>
        )}
        
        <div className="relative flex-shrink-0">
          <button onClick={props.handleTakeSnapshot} className="p-1.5 md:p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors flex-shrink-0" title="Take Snapshot (Ctrl+Shift+S)">
            <Camera size={16} />
          </button>
        </div>
        <div className="relative flex-shrink-0">
          <button onClick={(e) => {
            e.stopPropagation();
            props.setShowGraphicsLibrary(!props.showGraphicsLibrary);
          }} className="p-1.5 md:p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors relative flex-shrink-0" title="Graphics Library">
            <Image size={16} />
            {(props.snapshots.length + Object.keys(props.mindMapCache.getAll()).length) > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#4485d1] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {props.snapshots.length + Object.keys(props.mindMapCache.getAll()).length}
              </span>
            )}
          </button>
          {props.showGraphicsLibrary && (
            <GraphicsLibrary
              isOpen={props.showGraphicsLibrary}
              onClose={() => props.setShowGraphicsLibrary(false)}
              snapshots={props.snapshots}
              onDownloadSnapshot={props.handleDownloadSnapshot}
              onCopySnapshot={props.handleCopySnapshot}
              onDeleteSnapshot={props.handleDeleteSnapshot}
              onOpenMindMap={props.handleOpenMindMapFromLibrary}
            />
          )}
        </div>
        <button onClick={() => document.documentElement.classList.toggle('dark')} className="p-1.5 md:p-2 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded-full relative flex-shrink-0" title="Toggle Theme" style={{ width: '30px', height: '30px' }}>
          <Moon size={16} className="dark:!hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: '#666666' }} />
          <Sun size={16} className="!hidden dark:!block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: '#ffffff' }} />
        </button>
        <button onClick={() => props.setIsHelpOpen(true)} className="p-1.5 md:p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors flex-shrink-0" title="Help & Documentation">
          <HelpCircle size={16} />
        </button>
        <button onClick={() => props.setIsSettingsOpen(true)} className="p-1.5 md:p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors flex-shrink-0" title="Settings">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
