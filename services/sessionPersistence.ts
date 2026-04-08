/**
 * Session Persistence Service
 * Saves and restores complete application state including:
 * - Theme (light/dark)
 * - Sidebar states (open/closed, widths)
 * - Current chat ID
 * - Input field contents PER CHAT (draft recovery)
 * - Uploaded images PER CHAT (for crash recovery)
 */

interface ChatDraft {
  input: string;
  uploadedImages: Array<{
    id: string;
    fileName: string;
    size: number;
    type: string;
    dataUrl: string;
    estimatedTokens: number;
  }>;
}

interface SessionState {
  theme: 'light' | 'dark';
  isSidebarOpen: boolean;
  sidebarWidth: number;
  viewerWidth: number;
  currentChatId: string | null;
  chatDrafts: Record<string, ChatDraft>; // Per-chat drafts
  activeTab: 'chat' | 'notebook' | 'todos' | 'github';
  viewState: any;
  lastSaved: number;
}

const SESSION_KEY = 'constructlm_session_state';
const AUTO_SAVE_INTERVAL = 2000; // 2 seconds

class SessionPersistenceService {
  private autoSaveTimer: NodeJS.Timeout | null = null;

  /**
   * Save complete session state
   */
  saveSession(state: Partial<SessionState>): void {
    try {
      const existing = this.loadSession();
      const updated: SessionState = {
        ...existing,
        ...state,
        lastSaved: Date.now(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('[SessionPersistence] Failed to save session:', error);
    }
  }

  /**
   * Load complete session state
   */
  loadSession(): SessionState {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[SessionPersistence] Failed to load session:', error);
    }

    // Return defaults
    return {
      theme: 'light',
      isSidebarOpen: true,
      sidebarWidth: 288,
      viewerWidth: 450,
      currentChatId: null,
      chatDrafts: {},
      activeTab: 'chat',
      viewState: null,
      lastSaved: 0,
    };
  }

  /**
   * Save input draft for specific chat
   */
  saveChatDraft(chatId: string, input: string, uploadedImages: any[]): void {
    const session = this.loadSession();
    
    // Ensure chatDrafts exists
    if (!session.chatDrafts) {
      session.chatDrafts = {};
    }
    
    // Convert images to serializable format
    const serializableImages = uploadedImages.map(img => ({
      id: img.id,
      fileName: img.file.name,
      size: img.size,
      type: img.file.type,
      dataUrl: img.preview,
      estimatedTokens: img.estimatedTokens || 0,
    }));

    session.chatDrafts[chatId] = {
      input,
      uploadedImages: serializableImages,
    };

    this.saveSession({ chatDrafts: session.chatDrafts });
  }

  /**
   * Load draft for specific chat
   */
  loadChatDraft(chatId: string): ChatDraft {
    const session = this.loadSession();
    // Ensure chatDrafts exists and return the draft or empty default
    return (session.chatDrafts && session.chatDrafts[chatId]) || { input: '', uploadedImages: [] };
  }

  /**
   * Clear draft for specific chat
   */
  clearChatDraft(chatId: string): void {
    const session = this.loadSession();
    // Ensure chatDrafts exists before trying to delete
    if (session.chatDrafts && session.chatDrafts[chatId]) {
      delete session.chatDrafts[chatId];
      this.saveSession({ chatDrafts: session.chatDrafts });
    }
  }

  /**
   * Start auto-save for input field
   */
  startAutoSave(getState: () => { chatId: string; input: string; uploadedImages: any[] }): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      const { chatId, input, uploadedImages } = getState();
      if (chatId && (input.trim() || uploadedImages.length > 0)) {
        this.saveChatDraft(chatId, input, uploadedImages);
      }
    }, AUTO_SAVE_INTERVAL);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Clear entire session
   */
  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    console.log('[SessionPersistence] Session cleared');
  }
}

export const sessionPersistence = new SessionPersistenceService();
