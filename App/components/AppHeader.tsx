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
  activeTab?: 'chat' | 'notebook' | 'todos' | 'reminders';
  onTabChange?: (tab: 'chat' | 'notebook' | 'todos' | 'reminders') => void;
  todosCount?: number;
  remindersCount?: number;
}

const AppHeader: React.FC<AppHeaderProps> = (props) => {
  return (
    <header className="h-[65px] flex-none border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between px-3 md:px-6 bg-white dark:bg-[#1a1a1a] min-w-0 gap-2 relative z-40">
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
                            <span className={`text-[12px] px-1.5 py-0.5 rounded ${model.capacityTag === 'High' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : model.capacityTag === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{model.capacityTag}</span>
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
        <button onClick={() => props.onTabChange?.('notebook')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative ${props.activeTab === 'notebook' ? 'bg-yellow-600 text-white' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222]'}`}>
          <BookMarked size={14} />
          {props.notesCount && props.notesCount > 0 && props.activeTab !== 'notebook' && (
            <span className="absolute -top-1 -right-1 bg-yellow-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{props.notesCount}</span>
          )}
        </button>
        <button onClick={() => props.onTabChange?.('todos')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative ${props.activeTab === 'todos' ? 'bg-green-600 text-white' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222]'}`}>
          <CheckSquare size={14} />
          {props.todosCount && props.todosCount > 0 && props.activeTab !== 'todos' && (
            <span className="absolute -top-1 -right-1 bg-green-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{props.todosCount}</span>
          )}
        </button>
        <button onClick={() => props.onTabChange?.('reminders')} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative ${props.activeTab === 'reminders' ? 'bg-red-600 text-white' : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[#222222]'}`}>
          <Bell size={14} />
          {props.remindersCount && props.remindersCount > 0 && props.activeTab !== 'reminders' && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{props.remindersCount}</span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
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
