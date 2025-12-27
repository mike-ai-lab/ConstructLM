import { Highlight } from '../types';

class HighlightService {
  private readonly STORAGE_KEY = 'constructlm_highlights';

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
}

export const highlightService = new HighlightService();
