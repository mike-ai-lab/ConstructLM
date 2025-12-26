import { useEffect, useRef } from 'react';
import { 
  tooltipManager, 
  contextMenuManager, 
  createInputContextMenu, 
  createMessageContextMenu,
  initializeUIHelpers,
  showToast,
  type ContextMenuItem 
} from '../utils/uiHelpers';

/**
 * Hook for managing tooltips on elements
 */
export const useTooltip = (text: string, delay: number = 500) => {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !text) return;

    tooltipManager.addTooltip(element, text);
  }, [text, delay]);

  return { ref };
};

/**
 * Hook for managing context menus on elements
 */
export const useContextMenu = (
  items: ContextMenuItem[] | (() => ContextMenuItem[]), 
  className?: string
) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    contextMenuManager.addContextMenu(element, items, className);
  }, [items, className]);

  return ref;
};

/**
 * Hook for input field context menus
 */
export const useInputContextMenu = () => {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const menuItems = createInputContextMenu(element);
      contextMenuManager.showMenu(e.clientX, e.clientY, menuItems, 'input-context-menu');
    };

    element.addEventListener('contextmenu', handleContextMenu);

    return () => {
      element.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return ref;
};

/**
 * Hook for message context menus
 */
export const useMessageContextMenu = (messageText: string) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !messageText) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const menuItems = createMessageContextMenu(element, messageText);
      contextMenuManager.showMenu(e.clientX, e.clientY, menuItems, 'message-context-menu');
    };

    element.addEventListener('contextmenu', handleContextMenu);

    return () => {
      element.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [messageText]);

  return ref;
};

/**
 * Hook to initialize UI helpers on app mount
 */
export const useUIHelpersInit = () => {
  useEffect(() => {
    initializeUIHelpers();
  }, []);
};

/**
 * Hook for toast notifications
 */
export const useToast = () => {
  return {
    showToast: (message: string, type: 'success' | 'error' | 'info' = 'info', duration?: number) => {
      showToast(message, type, duration);
    }
  };
};

/**
 * Hook for enhanced button with tooltip and context menu
 */
export const useEnhancedButton = (
  tooltipText?: string,
  contextMenuItems?: ContextMenuItem[]
) => {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Add tooltip if provided
    if (tooltipText) {
      tooltipManager.addTooltip(element, tooltipText);
    }

    // Add context menu if provided
    if (contextMenuItems) {
      contextMenuManager.addContextMenu(element, contextMenuItems);
    }
  }, [tooltipText, contextMenuItems]);

  return ref;
};
