/**
 * Unified scroll utility for citation highlighting across all viewers
 */

export const scrollToHighlight = (
  containerRef: React.RefObject<HTMLElement>,
  selector: string,
  delay: number = 150
): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!containerRef.current) {
        resolve(false);
        return;
      }

      const element = containerRef.current.querySelector(selector);
      
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        resolve(true);
      } else {
        console.warn('❌ Citation highlight not found');
        resolve(false);
      }
    }, delay);
  });
};

/**
 * Scroll to element by ID with delay
 */
export const scrollToElementById = (
  elementId: string,
  delay: number = 150
): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        resolve(true);
      } else {
        console.warn('❌ Element not found:', elementId);
        resolve(false);
      }
    }, delay);
  });
};

/**
 * Standard highlight class names for consistency
 */
export const HIGHLIGHT_CLASSES = {
  TARGET: 'citation-highlight-target',
  ROW: 'citation-highlight-row',
  MARK: 'citation-highlight-mark'
} as const;

/**
 * Standard highlight selectors
 */
export const HIGHLIGHT_SELECTORS = {
  ANY: '.citation-highlight-target, .citation-highlight-row, .citation-highlight-mark, .highlight-target, .highlighted-row',
  TARGET: '.citation-highlight-target',
  ROW: '.citation-highlight-row',
  MARK: '.citation-highlight-mark'
} as const;
