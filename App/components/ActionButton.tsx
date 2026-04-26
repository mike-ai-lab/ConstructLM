import React, { useState } from 'react';
import { Phone, Camera, Palette, HelpCircle, Settings, Plus, X, Image as ImageIcon, Moon, Sun } from 'lucide-react';

interface ActionButtonProps {
  onCall?: () => void;
  onSnapshot?: () => void;
  onGraphics?: () => void;
  onThemeToggle?: () => void;
  onHelp?: () => void;
  onSettings?: () => void;
  isLiveMode?: boolean;
  isDarkTheme?: boolean;
  isMobile?: boolean;
}

/**
 * ActionButton Component for ConstructLM
 * Minimal icon-based menu for mobile/web headers.
 * 
 * Features:
 * - Minimal icon design without circular backgrounds
 * - Vertical slide on mobile, horizontal on desktop
 * - Color-accented icons
 */
const ActionButton: React.FC<ActionButtonProps> = ({
  onCall,
  onSnapshot,
  onGraphics,
  onThemeToggle,
  onHelp,
  onSettings,
  isLiveMode = false,
  isDarkTheme = false,
  isMobile = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Configuration for action items
  const actions = [
    { 
      icon: <Phone size={20} className={isLiveMode ? "text-emerald-400" : "text-blue-400"} />, 
      label: 'Call', 
      onClick: () => { 
        console.log('[ActionButton] Call clicked');
        onCall?.(); 
        setIsOpen(false); 
      },
      show: !!onCall
    },
    { 
      icon: <Camera size={20} className="text-emerald-400" />, 
      label: 'Snapshot', 
      onClick: () => { 
        console.log('[ActionButton] Snapshot clicked');
        onSnapshot?.(); 
        setIsOpen(false); 
      },
      show: !!onSnapshot
    },
    { 
      icon: <ImageIcon size={20} className="text-purple-400" />, 
      label: 'Graphics', 
      onClick: () => { 
        console.log('[ActionButton] Graphics clicked');
        onGraphics?.(); 
        setIsOpen(false); 
      },
      show: !!onGraphics
    },
    { 
      icon: isDarkTheme ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-400" />, 
      label: 'Theme', 
      onClick: () => { 
        console.log('[ActionButton] Theme clicked');
        onThemeToggle?.(); 
        setIsOpen(false); 
      },
      show: !!onThemeToggle
    },
    { 
      icon: <HelpCircle size={20} className="text-slate-400" />, 
      label: 'Help', 
      onClick: () => { 
        console.log('[ActionButton] Help clicked');
        onHelp?.(); 
        setIsOpen(false); 
      },
      show: !!onHelp
    },
    { 
      icon: <Settings size={20} className="text-zinc-400" />, 
      label: 'Settings', 
      onClick: () => { 
        console.log('[ActionButton] Settings clicked');
        onSettings?.(); 
        setIsOpen(false); 
      },
      show: !!onSettings
    },
  ].filter(action => action.show);

  return (
    <div className="relative flex items-center justify-end">
      {/* Click-catcher for closing the menu */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 cursor-default" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      <div className={`relative z-50 flex ${isMobile ? 'flex-col items-end' : 'flex-row-reverse items-center'}`}>
        {/* Main Trigger Button - Minimal Icon */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Actions"
          className={`p-2 flex items-center justify-center transition-all duration-200 ${
            isOpen 
              ? 'text-blue-400 scale-110' 
              : 'text-gray-400 hover:text-blue-400 active:scale-90'
          }`}
        >
          {isOpen ? <X size={22} /> : <Plus size={22} />}
        </button>

        {/* Sliding Menu Items - Vertical downward on mobile, Horizontal on desktop */}
        <div 
          className={`${isMobile ? 'absolute top-full right-0 mt-2' : 'relative'} flex transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            isMobile 
              ? `flex-col ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-6 pointer-events-none'}` 
              : `flex-row-reverse ${isOpen ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-6 pointer-events-none'}`
          }`}
        >
          <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row-reverse pr-3'}`}>
            {actions.map((action, index) => (
              <div key={index} className="relative group">
                <button
                  onClick={action.onClick}
                  className="p-2 hover:scale-125 active:scale-95 transition-all duration-200 flex items-center justify-center"
                  title={action.label}
                >
                  {action.icon}
                </button>
                {/* Minimalist Tooltip */}
                <span className={`absolute ${isMobile ? 'right-full mr-3 top-1/2 -translate-y-1/2' : '-bottom-8 left-1/2 -translate-x-1/2'} bg-zinc-900 text-zinc-300 text-[10px] px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-[70]`}>
                  {action.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionButton;
