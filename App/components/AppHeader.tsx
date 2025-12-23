import React from 'react';
import { PanelLeft, PanelLeftOpen, Cpu, ChevronDown, Phone, Plus, Edit3, Highlighter, Trash2, Check, Minus, Camera, Image, Moon, Sun, HelpCircle, Settings, BookMarked, CheckSquare, Bell, MessageSquare } from 'lucide-react';
import { MODEL_REGISTRY } from '../../services/modelRegistry';
import { DRAWING_COLORS } from '../../services/drawingService';
import GraphicsLibrary from '../../components/GraphicsLibrary';
import { InteractiveBlob } from '../../components/InteractiveBlob';

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
  notesCount?: number;
  onOpenNotebook?: () => void;
  activeTab?: 'chat' | 'notebook' | 'todos';
  onTabChange?: (tab: 'chat' | 'notebook' | 'todos') => void;
  todosCount?: number;
  remindersCount?: number;
  isViewerOpen?: boolean;
  onCloseViewer?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = (props) => {
  const [isCompact, setIsCompact] = React.useState(false);
  const headerRef = React.useRef<HTMLElement>(null);
  
  React.useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    
    const observer = new ResizeObserver(() => {
      const width = header.offsetWidth;
      setIsCompact(width < 900);
    });
    
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  
  return (
    <header ref={headerRef} className="h-[65px] flex-none border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between px-3 md:px-6 bg-white dark:bg-[#1a1a1a] min-w-0 gap-2 relative z-40">
      <div className="flex items-center gap-2 min-w-0 flex-shrink">
        {!props.isMobile && (
          <button onClick={() => props.setIsSidebarOpen(!props.isSidebarOpen)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0">
            {props.isSidebarOpen ? <PanelLeft size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        )}
        <div className="flex-shrink-0 flex items-center justify-center">
          <InteractiveBlob size={28} color="#4485d1" />
        </div>
        <h1 className="font-semibold text-[#1a1a1a] dark:text-white text-base md:text-lg tracking-tight truncate hidden sm:block">ConstructLM</h1>
        {props.activeTab === 'chat' && (
          <div className="relative flex-shrink-0" ref={props.modelMenuRef}>
            <button onClick={(e) => { e.stopPropagation(); props.setShowModelMenu(!props.showModelMenu); }} className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#222222] rounded-full text-xs font-medium text-[#1a1a1a] dark:text-white">
              <Cpu size={12} />
              <span>{props.activeModel.name}</span>
              <ChevronDown size={10} />
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
                  const timeDisplay = remainingMinutes > 0 ? `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}` : `${remainingSeconds}s`;
                  return (
                    <button key={model.id} onClick={() => { props.setActiveModelId(model.id); props.setShowModelMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${props.activeModelId === model.id ? 'bg-[rgba(68,133,209,0.1)]' : 'hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${model.provider === 'google' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                          <span className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">{model.name}</span>
                          {model.supportsThinking && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold flex-shrink-0">Thinks</span>}
                        </div>
                        <div className="flex-shrink-0">
                          {isRateLimited ? (
                            <span className="text-[12px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-mono">▽{timeDisplay}</span>
                          ) : (
                            <span className={`text-[12px] px-1.5 py-0.5 rounded ${model.capacityTag === 'High' ? 'bg-[#16b47e]/20 dark:bg-[#16b47e]/10 text-[#16b47e] dark:text-[#5bd8bb]' : model.capacityTag === 'Medium' ? 'bg-[#25b5cd]/20 dark:bg-[#25b5cd]/10 text-[#25b5cd] dark:text-[#5bd8bb]' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{model.capacityTag}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-[12px] text-[#666666] dark:text-[#a0a0a0] pl-4 mt-0.5">{model.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] rounded-full p-1">
        <button onClick={() => props.onTabChange?.('chat')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${props.activeTab === 'chat' ? 'bg-blue-600 text-white' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222]'}`}>
          <MessageSquare size={14} />
        </button>
        <button onClick={() => { props.onTabChange?.('notebook'); if (props.isViewerOpen) props.onCloseViewer?.(); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative ${props.activeTab === 'notebook' ? 'bg-[#25b5cd] text-white' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222]'}`}>
          <BookMarked size={14} />
          {props.notesCount && props.notesCount > 0 && props.activeTab !== 'notebook' && (
            <span className="absolute -top-1 -right-1 bg-[#25b5cd] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">{props.notesCount > 99 ? '99+' : props.notesCount}</span>
          )}
        </button>
        <button onClick={() => { props.onTabChange?.('todos'); if (props.isViewerOpen) props.onCloseViewer?.(); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative ${props.activeTab === 'todos' ? 'bg-green-600 text-white' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222]'}`}>
          <CheckSquare size={14} />
          {props.todosCount && props.todosCount > 0 && props.activeTab !== 'todos' && (
            <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{props.todosCount > 99 ? '99+' : props.todosCount}</span>
          )}
        </button>
        <button disabled className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative opacity-50 text-[#666666] dark:text-[#a0a0a0] group`} title="Coming Soon!" style={{ cursor: 'default' }}>
          <Bell size={14} />
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] bg-gradient-to-r from-orange-500 to-pink-500 text-white px-2 py-0.5 rounded-full whitespace-nowrap font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">Coming Soon!</span>
        </button>
      </div>

      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 pl-20">
        {/* Drawing Tools - Only show on chat tab */}
        {props.activeTab === 'chat' && !isCompact && (
          <>
            {/* Drawing Tool Picker */}
            <div className="relative" ref={props.toolPickerRef}>
              <button
                onClick={() => props.setShowToolPicker(!props.showToolPicker)}
                className={`p-1.5 md:p-2 rounded-full transition-colors flex-shrink-0 ${
                  props.drawingState.tool === 'highlighter'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : props.drawingState.tool === 'pen'
                    ? 'bg-[rgba(68,133,209,0.1)] text-[#4485d1]'
                    : 'text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'
                }`}
                title="Drawing Tools"
              >
                {props.drawingState.tool === 'highlighter' ? (
                  <Highlighter size={16} />
                ) : props.drawingState.tool === 'pen' ? (
                  <Edit3 size={16} />
                ) : (
                  <Edit3 size={16} />
                )}
              </button>

              {/* Tool Picker Dropdown */}
              {props.showToolPicker && (
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#222222] rounded-lg shadow-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] p-2 z-50 flex gap-1">
                  <button
                    onClick={() => {
                      props.handleDrawingToolChange('pen');
                      props.setShowToolPicker(false);
                    }}
                    className={`p-2 rounded-full transition-all hover:scale-110 ${
                      props.drawingState.tool === 'pen'
                        ? 'bg-[rgba(68,133,209,0.2)] text-[#4485d1] scale-110'
                        : 'text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'
                    }`}
                    title="Pen"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      props.handleDrawingToolChange('highlighter');
                      props.setShowToolPicker(false);
                    }}
                    className={`p-2 rounded-full transition-all hover:scale-110 ${
                      props.drawingState.tool === 'highlighter'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 scale-110'
                        : 'text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'
                    }`}
                    title="Highlighter"
                  >
                    <Highlighter size={16} />
                  </button>
                  {props.drawingState.isActive && (
                    <button
                      onClick={() => {
                        props.handleDrawingToolChange('none');
                        props.setShowToolPicker(false);
                      }}
                      className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 transition-all hover:scale-110"
                      title="Disable Drawing"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Drawing Controls - Positioned below header */}
            {props.drawingState.isActive && props.drawingState.tool !== 'none' && (
              <div className="fixed top-[65px] left-0 right-0 h-12 bg-white dark:bg-[#1a1a1a] border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-center gap-4 z-40 px-4">
                {/* Color Picker */}
                <div className="relative" ref={props.colorPickerRef}>
                  <button
                    onClick={() => props.setShowColorPicker(!props.showColorPicker)}
                    className="p-1.5 rounded-full transition-colors flex-shrink-0"
                    style={{
                      backgroundColor: props.currentColor?.hex,
                      border: '2px solid rgba(0,0,0,0.15)',
                    }}
                    title="Color"
                  />

                  {props.showColorPicker && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-[#222222] rounded-lg shadow-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] p-2 z-50 flex gap-1">
                      {DRAWING_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => {
                            props.handleColorChange(color.id);
                            props.setShowColorPicker(false);
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex-shrink-0 ${
                            props.drawingState.colorId === color.id
                              ? 'border-[#a0a0a0] scale-110'
                              : 'border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Stroke Width - Only for pen */}
                {props.drawingState.tool === 'pen' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => props.handleStrokeWidthChange(-1)}
                      disabled={props.drawingState.strokeWidth <= 1}
                      className="p-1 text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white disabled:opacity-50 rounded transition-colors"
                      style={{ cursor: props.drawingState.strokeWidth <= 1 ? 'default' : 'pointer' }}
                      title="Decrease stroke width"
                    >
                      <Minus size={14} />
                    </button>
                    <div
                      className="rounded-full border border-[#a0a0a0]"
                      style={{
                        width: `${Math.max(4, props.drawingState.strokeWidth * 2)}px`,
                        height: `${Math.max(4, props.drawingState.strokeWidth * 2)}px`,
                        backgroundColor: props.currentColor?.hex,
                      }}
                    />
                    <button
                      onClick={() => props.handleStrokeWidthChange(1)}
                      disabled={props.drawingState.strokeWidth >= 10}
                      className="p-1 text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white disabled:opacity-50 rounded transition-colors"
                      style={{ cursor: props.drawingState.strokeWidth >= 10 ? 'default' : 'pointer' }}
                      title="Increase stroke width"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}

                <div className="w-px h-6 bg-[rgba(0,0,0,0.15)] dark:bg-[rgba(255,255,255,0.05)]" />

                <span className="text-xs text-[#666666] dark:text-[#a0a0a0] font-medium">
                  {props.drawingState.tool === 'pen' ? 'Pen' : 'Highlighter'} Active
                </span>
              </div>
            )}

            {/* Clear All - Show when drawing is active */}
            {props.drawingState.isActive && (
              <button
                onClick={props.handleClearAll}
                className="p-1.5 md:p-2 text-[#f07a76] hover:bg-[#f07a76]/10 dark:hover:bg-[#f07a76]/10 rounded-full transition-colors flex-shrink-0"
                title="Clear all drawings"
              >
                <Trash2 size={16} />
              </button>
            )}
          </>
        )}

        {props.activeTab === 'chat' && !isCompact && (
          <>
            {/* Take Snapshot */}
            <button
              onClick={props.handleTakeSnapshot}
              className="p-1.5 md:p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors flex-shrink-0"
              title="Take snapshot"
            >
              <Camera size={16} />
            </button>

            {/* Graphics Library */}
            <div className="relative">
              <button
                onClick={() => props.setShowGraphicsLibrary(!props.showGraphicsLibrary)}
                className="p-1.5 md:p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors flex-shrink-0 relative"
                title="Graphics Library"
              >
                <Image size={16} />
                {(props.snapshots.length > 0 || props.mindMapCache.getAll().length > 0) && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                    {props.snapshots.length + props.mindMapCache.getAll().length}
                  </span>
                )}
              </button>

              {props.showGraphicsLibrary && (
                <div className="absolute right-0 top-full mt-2 w-96 max-h-96 bg-white dark:bg-[#222222] rounded-lg shadow-xl border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] z-50 overflow-hidden flex flex-col">
                  <GraphicsLibrary
                    isOpen={props.showGraphicsLibrary}
                    snapshots={props.snapshots}
                    mindMapCache={props.mindMapCache}
                    onDownloadSnapshot={props.handleDownloadSnapshot}
                    onCopySnapshot={props.handleCopySnapshot}
                    onDeleteSnapshot={props.handleDeleteSnapshot}
                    onOpenMindMap={props.handleOpenMindMapFromLibrary}
                    onClose={() => props.setShowGraphicsLibrary(false)}
                  />
                </div>
              )}
            </div>
          </>
        )}
        <button onClick={() => document.documentElement.classList.toggle('dark')} className="p-1.5 md:p-2 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded-full relative flex-shrink-0" style={{ width: '30px', height: '30px' }}>
          <Moon size={16} className="dark:!hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: '#666666' }} />
          <Sun size={16} className="!hidden dark:!block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: '#ffffff' }} />
        </button>
        <button onClick={() => props.setIsHelpOpen(true)} className="p-1.5 md:p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors flex-shrink-0">
          <HelpCircle size={16} />
        </button>
        <button onClick={() => props.setIsSettingsOpen(true)} className="p-1.5 md:p-2 text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] hover:text-[#1a1a1a] dark:hover:text-white rounded-full transition-colors flex-shrink-0">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
