---
inclusion: always
---

# Project Structure & Architecture

## Directory Organization

### Root Structure
- `App/` - Core application logic with handlers, hooks, and app-level components
- `components/` - Reusable UI components organized by feature
- `services/` - Business logic, external integrations, singleton services
- `hooks/` - Shared React hooks for cross-cutting concerns
- `utils/` - Pure utility functions
- `electron/` - Electron main process and preload scripts
- `types.ts` - Root-level TypeScript types

### App/ Directory (Application Core)
**Purpose**: Centralized application logic following separation of concerns

- `App/components/` - App-level UI (AppHeader, FloatingInput)
- `App/handlers/` - Pure event handler functions (chat, file, message, input, feature, audio)
- `App/hooks/` - State management hooks (chat, file, layout, input, feature, effects, activity)
- `App/constants.ts` - Application constants (widths, limits, defaults)
- `App/types.ts` - App-specific TypeScript types

### components/ Directory
**Purpose**: Feature-based UI components with co-located logic

Complex components use folder structure:
- `index.tsx` - Main component export
- `types.ts` - Component-specific types
- `utils.ts` - Helper functions
- `components/` - Sub-components

Key component groups:
- `CitationRenderer/` - Citation system with markdown parsing
- `DocumentViewer/` - Multi-format document viewers (PDF, Excel, CSV, Markdown, Text)
- `FileSidebar/` - File management with preview and context menu
- `HelpDocumentation/` - Help system with sectioned content
- `TodoList/` - Task management with board view
- `Notebook/` - Note-taking feature

### services/ Directory
**Purpose**: Business logic, external APIs, and data persistence

Service categories:
- **LLM Integration**: `llmService`, `geminiService`, `awsBedrockService`, `localModelService`, `modelRegistry`
- **RAG System**: `ragService`, `embeddingService`, `vectorStore`, `contextManager`, `smartContextManager`, `hybridContextManager`
- **Document Processing**: `fileParser`, `advancedPdfParser`
- **Storage**: `permanentStorage`, `chatRegistry`, `vectorStore`
- **Utilities**: `activityLogger`, `diagnosticLogger`, `compressionService`, `rateLimiter`

## Architectural Patterns

### Handler Pattern (App/handlers/)
**Rules**:
- Pure functions only - no side effects
- Accept state and callbacks as parameters
- Return new state or invoke callbacks
- Never mutate state directly
- Keep handlers focused on single responsibility

**Example**:
```typescript
export const handleSendMessage = (
  message: string,
  chatState: ChatState,
  onUpdate: (state: ChatState) => void
) => {
  const newState = { ...chatState, messages: [...chatState.messages, message] };
  onUpdate(newState);
};
```

### Hook Pattern (App/hooks/, hooks/)
**Rules**:
- Encapsulate related state and logic
- Return state and setter functions
- Use composition for complex state
- Keep hooks focused and reusable
- Follow React hooks rules (no conditional calls)

**Example**:
```typescript
export const useChatState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  return { messages, setMessages, isLoading, setIsLoading };
};
```

### Service Pattern (services/)
**Rules**:
- Export singleton instances for stateful services
- Use classes for stateful services, plain objects for stateless
- Keep services focused on single domain
- Handle errors internally and return results
- Use async/await for asynchronous operations

**Example**:
```typescript
class RAGService {
  private vectorStore: VectorStore;
  async search(query: string): Promise<SearchResult[]> { /* ... */ }
}
export const ragService = new RAGService();
```

### Component Organization
**Rules**:
- Use feature-based folders for complex components
- Co-locate types, utils, and sub-components
- Export main component from `index.tsx`
- Keep components focused on presentation
- Delegate business logic to services and handlers

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `MessageBubble.tsx` |
| Services | camelCase | `ragService.ts` |
| Hooks | camelCase with `use` prefix | `useChatState.ts` |
| Handlers | camelCase with `Handlers` suffix | `chatHandlers.ts` |
| Types | camelCase file, PascalCase exports | `types.ts` → `export interface Message` |
| Utils | camelCase | `uiHelpers.ts` |

## Import Path Rules

**Always use `@/` alias for workspace root imports**:
```typescript
import { Message } from '@/types';                    // Root types
import { ragService } from '@/services/ragService';   // Services
import { useChatState } from '@/App/hooks/useChatState'; // App hooks
```

**Use relative imports only for same-directory files**:
```typescript
import { formatDate } from './utils';  // Same directory
import { SubComponent } from './components/SubComponent'; // Subdirectory
```

## State Management Strategy

**No Redux/MobX** - Uses React hooks and custom hooks pattern:
- **Local state**: `useState` for component-specific state
- **Shared state**: Custom hooks in `App/hooks/` (e.g., `useChatState`)
- **Persistent state**: Services with localStorage/IndexedDB
- **Global state**: Minimal, primarily in `App.tsx`

## Data Flow Architecture

```
User Interaction
    ↓
Handler Function (App/handlers/)
    ↓
Service (services/)
    ↓
External API / Storage
    ↓
State Update (via hook)
    ↓
Component Re-render
```

## Code Placement Guidelines

**When adding new code, follow these rules**:

1. **New UI Component**: 
   - Simple: `components/ComponentName.tsx`
   - Complex: `components/ComponentName/index.tsx` with types, utils, sub-components

2. **New Business Logic**: 
   - Create service in `services/serviceName.ts`
   - Export singleton instance

3. **New Event Handler**: 
   - Add to appropriate handler file in `App/handlers/`
   - Create new handler file if needed for new domain

4. **New State Management**: 
   - Create custom hook in `App/hooks/` for app-level state
   - Create in `hooks/` for cross-cutting concerns

5. **New Utility Function**: 
   - Add to `utils/` for general utilities
   - Add to component's `utils.ts` for component-specific helpers

## Common Patterns to Follow

### Error Handling
- Services should catch and handle errors internally
- Return error states rather than throwing
- Log errors using `diagnosticLogger`

### Async Operations
- Always use async/await (no raw promises)
- Handle loading states in hooks
- Show user feedback for long operations

### Type Safety
- Define interfaces for all data structures
- Use TypeScript strict mode
- Avoid `any` - use `unknown` if type is truly unknown

### Performance
- Lazy load heavy components
- Debounce expensive operations (search, API calls)
- Use React.memo for expensive renders
- Cache results in services when appropriate
