/**
 * UI Helper Functions - Extracted from Gemini Dictation App
 * Provides tooltip and context menu functionality
 */

// Tooltip Management
export class TooltipManager {
  private static instance: TooltipManager;
  private currentTooltip: HTMLElement | null = null;
  private hideTimeout: NodeJS.Timeout | null = null;

  static getInstance(): TooltipManager {
    if (!TooltipManager.instance) {
      TooltipManager.instance = new TooltipManager();
    }
    return TooltipManager.instance;
  }

  showTooltip(element: HTMLElement, text: string, delay: number = 500): void {
    // Clear any existing timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Remove existing tooltip
    this.hideTooltip();

    // Create new tooltip after delay
    setTimeout(() => {
      if (!element.matches(':hover')) return; // Don't show if no longer hovering

      const tooltip = document.createElement('div');
      tooltip.className = 'dynamic-tooltip';
      tooltip.textContent = text;
      document.body.appendChild(tooltip);

      // Position tooltip
      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      let top = rect.top - tooltipRect.height - 8;

      // Adjust if tooltip goes off screen
      if (left < 8) left = 8;
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }
      if (top < 8) {
        top = rect.bottom + 8;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;

      this.currentTooltip = tooltip;
    }, delay);
  }

  hideTooltip(delay: number = 0): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    this.hideTimeout = setTimeout(() => {
      if (this.currentTooltip) {
        this.currentTooltip.remove();
        this.currentTooltip = null;
      }
      this.hideTimeout = null;
    }, delay);
  }

  // Add tooltip to element with hover events
  addTooltip(element: HTMLElement, text: string): void {
    element.addEventListener('mouseenter', () => {
      this.showTooltip(element, text);
    });

    element.addEventListener('mouseleave', () => {
      this.hideTooltip(100);
    });
  }
}

// Context Menu Management
export interface ContextMenuItem {
  label?: string;
  icon?: string;
  action?: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export class ContextMenuManager {
  private static instance: ContextMenuManager;
  private currentMenu: HTMLElement | null = null;

  static getInstance(): ContextMenuManager {
    if (!ContextMenuManager.instance) {
      ContextMenuManager.instance = new ContextMenuManager();
      ContextMenuManager.instance.init();
    }
    return ContextMenuManager.instance;
  }

  private init(): void {
    // Close menu on click outside
    document.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (this.currentMenu && !this.currentMenu.contains(target)) {
        this.hideMenu();
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentMenu) {
        this.hideMenu();
      }
    });
  }

  showMenu(x: number, y: number, items: ContextMenuItem[], className: string = 'context-menu'): void {
    this.hideMenu();

    const menu = document.createElement('div');
    menu.className = className;
    
    items.forEach((item, index) => {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'context-menu-divider';
        menu.appendChild(divider);
        return;
      }

      const menuItem = document.createElement('button');
      menuItem.className = `context-menu-item ${item.danger ? 'danger' : ''}`;
      menuItem.disabled = item.disabled || false;
      
      const label = document.createElement('span');
      label.textContent = item.label;
      menuItem.appendChild(label);

      menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!item.disabled) {
          item.action();
          this.hideMenu();
        }
      });

      menu.appendChild(menuItem);
    });

    // Position menu
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    
    // Adjust position if menu goes off screen
    if (x + rect.width > window.innerWidth) {
      x = window.innerWidth - rect.width - 8;
    }
    if (y + rect.height > window.innerHeight) {
      y = window.innerHeight - rect.height - 8;
    }
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    this.currentMenu = menu;
  }

  hideMenu(): void {
    if (this.currentMenu) {
      this.currentMenu.remove();
      this.currentMenu = null;
    }
  }

  // Add context menu to element
  addContextMenu(element: HTMLElement, items: ContextMenuItem[] | (() => ContextMenuItem[]), className?: string): void {
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const menuItems = typeof items === 'function' ? items() : items;
      this.showMenu(e.clientX, e.clientY, menuItems, className);
    });
  }
}

// Input Field Context Menu
export const createInputContextMenu = (inputElement: HTMLInputElement | HTMLTextAreaElement): ContextMenuItem[] => {
  const hasSelection = inputElement.selectionStart !== inputElement.selectionEnd;
  const hasContent = inputElement.value.length > 0;
  const canPaste = navigator.clipboard !== undefined;

  return [
    {
      label: 'Undo',
      action: () => document.execCommand('undo'),
      disabled: !document.queryCommandEnabled('undo')
    },
    { divider: true },
    {
      label: 'Cut',
      action: () => {
        if (hasSelection) {
          document.execCommand('cut');
        }
      },
      disabled: !hasSelection
    },
    {
      label: 'Copy',
      action: () => {
        if (hasSelection) {
          document.execCommand('copy');
        }
      },
      disabled: !hasSelection
    },
    {
      label: 'Paste',
      action: async () => {
        if (canPaste) {
          try {
            const text = await navigator.clipboard.readText();
            document.execCommand('insertText', false, text);
          } catch (err) {
            document.execCommand('paste');
          }
        }
      },
      disabled: !canPaste
    },
    { divider: true },
    {
      label: 'Select All',
      action: () => {
        inputElement.select();
      },
      disabled: !hasContent
    },
    {
      label: 'Delete',
      action: () => {
        if (hasSelection) {
          document.execCommand('delete');
        } else {
          inputElement.value = '';
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
      },
      disabled: !hasContent,
      danger: true
    }
  ];
};

// Message Context Menu
export const createMessageContextMenu = (messageElement: HTMLElement, messageText: string): ContextMenuItem[] => {
  const hasCodeBlocks = messageElement.querySelectorAll('pre code').length > 0;
  const selection = window.getSelection();
  const hasSelection = selection && selection.toString().trim().length > 0;
  
  const menuItems: ContextMenuItem[] = [];
  
  // Add copy selection if text is selected
  if (hasSelection) {
    menuItems.push({
      label: 'Copy Selection',
      action: () => {
        try {
          const selectedText = selection.toString();
          
          // Use execCommand which is more reliable for this use case
          const textarea = document.createElement('textarea');
          textarea.value = selectedText;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          textarea.style.top = '-9999px';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);
          
          if (successful) {
            showToast('Selection copied', 'success');
          } else {
            throw new Error('Copy command failed');
          }
        } catch (err) {
          console.error('Failed to copy selection:', err);
          showToast('Failed to copy selection', 'error');
        }
      }
    });
  }
  
  // Add copy message
  menuItems.push({
    label: 'Copy Message',
    action: async () => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = messageText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Message copied', 'success');
      } catch (err) {
        console.error('Failed to copy message:', err);
        showToast('Failed to copy', 'error');
      }
    }
  });
  
  // Add select all
  menuItems.push({
    label: 'Select All',
    action: () => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(messageElement);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  });
  
  // Add code-related options if code blocks exist
  if (hasCodeBlocks) {
    menuItems.push({ divider: true });
    menuItems.push({
      label: 'Copy Code',
      action: async () => {
        const codeBlocks = messageElement.querySelectorAll('pre code');
        const codeText = Array.from(codeBlocks).map(block => block.textContent).join('\n\n');
        try {
          await navigator.clipboard.writeText(codeText);
          showToast('Code copied to clipboard', 'success');
        } catch (err) {
          console.error('Failed to copy code:', err);
          showToast('Failed to copy code', 'error');
        }
      }
    });
    menuItems.push({
      label: 'Download Code',
      action: () => {
        const codeBlocks = messageElement.querySelectorAll('pre code');
        const codeText = Array.from(codeBlocks).map(block => block.textContent).join('\n\n');
        downloadTextAsFile(codeText, 'code.txt');
      }
    });
  }
  
  return menuItems;
};

// Toast Notifications
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000): void => {
  // Create toast container if it doesn't exist
  let container = document.querySelector('.toast-container') as HTMLElement;
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Remove toast after duration
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
};

// Utility function to download text as file
export const downloadTextAsFile = (text: string, filename: string): void => {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Initialize UI helpers
export const initializeUIHelpers = (): void => {
  // Initialize singletons
  TooltipManager.getInstance();
  ContextMenuManager.getInstance();

  // Add Font Awesome if not already present
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(link);
  }
};

// Export instances for direct use
export const tooltipManager = TooltipManager.getInstance();
export const contextMenuManager = ContextMenuManager.getInstance();