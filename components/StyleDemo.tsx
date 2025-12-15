import React from 'react';
import { useTooltip, useContextMenu, useToast } from '../hooks/useUIHelpers';

const StyleDemo: React.FC = () => {
  const { showToast } = useToast();
  
  const tooltipRef = useTooltip('This is a tooltip from the gemini app!');
  const contextMenuRef = useContextMenu([
    {
      label: 'Copy',
      icon: 'fas fa-copy',
      action: () => showToast('Copied!', 'success')
    },
    {
      label: 'Delete',
      icon: 'fas fa-trash',
      action: () => showToast('Deleted!', 'error'),
      danger: true
    }
  ]);

  return (
    <div className="p-4 space-y-4">
      <button 
        ref={tooltipRef}
        className="action-button primary"
      >
        <i className="fas fa-info-circle"></i>
        Hover for Tooltip
      </button>
      
      <button 
        ref={contextMenuRef}
        className="action-button"
      >
        <i className="fas fa-mouse-pointer"></i>
        Right-click for Menu
      </button>
      
      <button 
        onClick={() => showToast('Toast notification!', 'info')}
        className="action-button"
      >
        <i className="fas fa-bell"></i>
        Show Toast
      </button>
    </div>
  );
};

export default StyleDemo;