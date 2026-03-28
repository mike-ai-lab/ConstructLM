import { Highlight } from '../types';
import Mark from 'mark.js';

// Unique debug prefix for easy log filtering
const DEBUG_PREFIX = '🎯[CITE-HL]';

class HighlightService {
  private readonly STORAGE_KEY = 'constructlm_highlights';
  private markInstances: Map<string, Mark> = new Map();

  private getAll(): Highlight[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return parsed.filter((h: any) => h.text && typeof h.text === 'string');
    } catch {
      return [];
    }
  }

  private saveAll(highlights: Highlight[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(highlights));
    } catch (error) {
      console.error('Failed to save highlights:', error);
    }
  }

  saveHighlight(highlight: Highlight): void {
    const highlights = this.getAll();
    highlights.push(highlight);
    this.saveAll(highlights);
  }

  getHighlightsByMessage(chatId: string, messageId: string): Highlight[] {
    return this.getAll().filter(h => h.chatId === chatId && h.messageId === messageId);
  }

  deleteHighlight(id: string): void {
    const highlights = this.getAll().filter(h => h.id !== id);
    this.saveAll(highlights);
  }

  deleteHighlightsByChat(chatId: string): void {
    const highlights = this.getAll().filter(h => h.chatId !== chatId);
    this.saveAll(highlights);
  }

  /**
   * Apply Mark.js highlighting to a DOM element (for citation auto-highlight)
   * This is separate from the Rangy-based manual highlighting system
   * ONLY for Text, Markdown, and PDF text layers - NOT for Excel/CSV
   */
  applyCitationHighlight(element: HTMLElement, quote: string, viewerType: string = 'unknown'): void {
    console.log(`${DEBUG_PREFIX} applyCitationHighlight called`, {
      viewerType,
      quote: quote?.substring(0, 50),
      quoteLength: quote?.length,
      elementId: element?.id,
      elementTagName: element?.tagName
    });

    if (!element || !quote?.trim()) {
      console.warn(`${DEBUG_PREFIX} Invalid input - element or quote missing`);
      return;
    }

    const elementId = element.id || `citation-target-${Date.now()}`;
    if (!element.id) element.id = elementId;

    let markInstance = this.markInstances.get(elementId);
    if (!markInstance) {
      markInstance = new Mark(element);
      this.markInstances.set(elementId, markInstance);
      console.log(`${DEBUG_PREFIX} Created new Mark.js instance for ${elementId}`);
    }

    // Clear previous citation highlights
    markInstance.unmark();
    console.log(`${DEBUG_PREFIX} Cleared previous highlights`);

    // Apply new highlight with auto-scroll
    const startTime = performance.now();
    markInstance.mark(quote.trim(), {
      className: 'citation-auto-highlight',
      accuracy: 'complementary',
      separateWordSearch: false,
      done: (totalMarks: number) => {
        const duration = Math.round(performance.now() - startTime);
        console.log(`${DEBUG_PREFIX} Highlighting complete`, {
          viewerType,
          totalMarks,
          duration: `${duration}ms`,
          quote: quote.substring(0, 50),
          success: totalMarks > 0
        });
        
        if (totalMarks > 0) {
          const firstMark = element.querySelector('.citation-auto-highlight');
          if (firstMark) {
            console.log(`${DEBUG_PREFIX} Scrolling to first highlight`);
            console.log(`${DEBUG_PREFIX} First mark element:`, {
              tagName: firstMark.tagName,
              className: firstMark.className,
              computedStyle: window.getComputedStyle(firstMark).backgroundColor,
              innerHTML: firstMark.innerHTML?.substring(0, 50)
            });
            firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add pulse animation
            firstMark.classList.add('citation-auto-highlight-pulse');
            setTimeout(() => {
              firstMark.classList.remove('citation-auto-highlight-pulse');
            }, 2000);
          } else {
            console.warn(`${DEBUG_PREFIX} Marks created but first mark not found in DOM`);
          }
        } else {
          console.warn(`${DEBUG_PREFIX} No matches found for quote: "${quote.substring(0, 50)}..."`);
        }
      }
    });
  }

  /**
   * Clear citation highlights from element
   */
  clearCitationHighlight(elementId: string): void {
    console.log(`${DEBUG_PREFIX} Clearing highlights from ${elementId}`);
    const markInstance = this.markInstances.get(elementId);
    if (markInstance) {
      markInstance.unmark();
      this.markInstances.delete(elementId);
      console.log(`${DEBUG_PREFIX} Cleared and removed Mark.js instance`);
    } else {
      console.log(`${DEBUG_PREFIX} No Mark.js instance found for ${elementId}`);
    }
  }

  /**
   * Dispatch event for document viewers to handle citation highlighting
   */
  triggerCitationHighlight(fileName: string, quote: string, location?: string): void {
    console.log(`${DEBUG_PREFIX} Triggering citation highlight event`, {
      fileName,
      quote: quote?.substring(0, 50),
      quoteLength: quote?.length,
      location
    });
    
    const event = new CustomEvent('citationHighlight', {
      detail: { fileName, quote, location }
    });
    window.dispatchEvent(event);
  }
}

export const highlightService = new HighlightService();
