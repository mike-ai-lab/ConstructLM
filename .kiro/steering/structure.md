# Project Structure

## Root Directory Organization

```
ConstructLM-1/
├── App/                    # Core application logic (refactored structure)
├── components/             # UI components
├── services/               # Business logic services
├── hooks/                  # Shared React hooks
├── utils/                  # Utility functions
├── styles/                 # Global CSS
├── electron/               # Electron main/preload
├── server/                 # Proxy server
├── public/                 # Static assets
├── data/                   # Static data (KB, docs)
├── dist/                   # Web build output
├── dist-electron/          # Electron build output
└── release/                # Electron installer output
```

## App/ Directory (Core Logic)

Refactored application structure following separation of concerns:

```
App/
├── components/             # App-level components
│   ├── AppHeader.tsx       # Main header with model selector
│   └── FloatingInput.tsx   # Chat input component
├── handlers/               # Event handlers (pure functions)
│   ├── chatHandlers.ts     # Chat operations
│   ├── fileHandlers.ts     # File upload/management
│   ├── messageHandlers.ts  # Message operations
│   ├── inputHandlers.ts    # Input field handlers
│   ├── featureHandlers.ts  # Feature toggles
│   └── audioHandlers.ts    # Voice input
├── hooks/                  # Custom React hooks
│   ├── useChatState.ts     # Chat state management
│   ├── useFileState.ts     # File state management
│   ├── useLayoutState.ts   # Layout/UI state
│   ├── useInputState.ts    # Input field state
│   ├── useFeatureState.ts  # Feature flags state
│   ├── useAppEffects.ts    # Side effects
│   └── useActivityLogger.ts # Activity logging
├── constants.ts            # App constants (widths, limits)
└── types.ts                # App-specific types
```

## components/ Directory

UI components organized by feature:

```
components/
├── CitationRenderer/       # Citation display system
│   ├── components/         # Sub-components (chips, popups, viewers)
│   ├── markdown/           # Markdown parsers with citations
│   ├── utils/              # Citation utilities
│   └── types.ts            # Citation types
├── DocumentViewer/         # Document viewing
│   ├── PdfViewer.tsx
│   ├── ExcelViewer.tsx
│   ├── MarkdownViewer.tsx
│   ├── TextViewer.tsx
│   └── CsvViewer.tsx
├── FileSidebar/            # File management sidebar
│   ├── index.tsx           # Main component
│   ├── FileContextMenu.tsx
│   ├── FilePreviewViewer.tsx
│   ├── PdfPageRenderer.tsx
│   ├── ConfirmModal.tsx
│   ├── types.ts
│   └── utils.ts
├── HelpDocumentation/      # Help system
│   ├── sections/           # Help sections (basics, features, advanced, sources)
│   └── SharedComponents.tsx
├── Notebook/               # Note-taking feature
├── TodoList/               # Task management
│   ├── TodoAddForm.tsx
│   ├── TodoBoardView.tsx
│   ├── TodoGroupsSidebar.tsx
│   ├── TodoHeader.tsx
│   └── TodoStats.tsx
├── MessageBubble.tsx       # Chat message display
├── SettingsModal.tsx       # Settings UI
├── MindMapViewer.tsx       # Mind map visualization
├── GitHubBrowser.tsx       # GitHub integration
├── TabbedWebViewer.tsx     # Web browser (web version)
├── TabbedWebViewerElectron.tsx # Web browser (Electron)
├── LiveSession.tsx         # Live collaboration
├── Reminders.tsx           # Reminder system
├── ReminderOverlay.tsx     # Reminder notifications
├── LogsModal.tsx           # Activity logs viewer
├── RAGProcessViewer.tsx    # RAG debugging UI
└── UpdateNotification.tsx  # Auto-update notifications
```

## services/ Directory

Business logic and external integrations:

```
services/
├── llmService.ts           # Multi-model LLM orchestration
├── geminiService.ts        # Google Gemini integration
├── awsBedrockService.ts    # AWS Bedrock integration
├── localModelService.ts    # Ollama integration
├── modelRegistry.ts        # Model configuration registry
├── ragService.ts           # RAG orchestration
├── embeddingService.ts     # Local embeddings (Transformers.js)
├── vectorStore.ts          # Vector storage (IndexedDB)
├── embeddingUtils.ts       # Embedding utilities
├── fileParser.ts           # Document parsing
├── advancedPdfParser.ts    # PDF extraction
├── contextManager.ts       # Context window management
├── smartContextManager.ts  # Smart context selection
├── hybridContextManager.ts # Hybrid search (keyword + semantic)
├── chatRegistry.ts         # Chat persistence
├── permanentStorage.ts     # IndexedDB wrapper
├── activityLogger.ts       # Usage tracking
├── diagnosticLogger.ts     # Debug logging
├── mindMapService.ts       # Mind map generation
├── mindMapCache.ts         # Mind map caching
├── githubService.ts        # GitHub API integration
├── userProfileService.ts   # User profile management
├── greetingService.ts      # Smart greetings
├── compressionService.ts   # Text compression
├── rateLimiter.ts          # Rate limit handling
├── proxyRotation.ts        # CORS proxy rotation
├── highlightService.ts     # Text highlighting
├── drawingService.ts       # Drawing tools
├── audioUtils.ts           # Audio recording
├── dataExportService.ts    # Data export
├── pdfExport.ts            # PDF generation
├── snapshotService.ts      # Conversation snapshots
├── pipelineTracker.ts      # RAG pipeline tracking
└── ragProcessTracker.ts    # RAG process monitoring
```

## Key Architectural Patterns

### Handler Pattern
- Pure functions in `App/handlers/`
- Accept state and callbacks as parameters
- Return new state or trigger callbacks
- No direct state mutation

### Hook Pattern
- Custom hooks in `App/hooks/` and `hooks/`
- Encapsulate state logic and side effects
- Return state and setter functions
- Composable and reusable

### Service Pattern
- Singleton services in `services/`
- Export single instance (e.g., `export const ragService = new RAGService()`)
- Stateful services use classes
- Stateless services use plain objects with functions

### Component Organization
- Feature-based folders for complex components
- `index.tsx` as main export
- `types.ts` for component-specific types
- `utils.ts` for helper functions
- Sub-components in `components/` subfolder

## File Naming Conventions

- **Components**: PascalCase (e.g., `MessageBubble.tsx`)
- **Services**: camelCase (e.g., `ragService.ts`)
- **Hooks**: camelCase with `use` prefix (e.g., `useChatState.ts`)
- **Handlers**: camelCase with `Handlers` suffix (e.g., `chatHandlers.ts`)
- **Types**: PascalCase for interfaces/types, camelCase for files (e.g., `types.ts`)
- **Utils**: camelCase (e.g., `uiHelpers.ts`)

## Import Path Conventions

- Use `@/` alias for workspace root imports
- Relative imports for same-directory files
- Absolute imports for cross-directory references

Example:
```typescript
import { Message } from '@/types';              // Root types
import { ragService } from '@/services/ragService';  // Service
import { useChatState } from './hooks/useChatState'; // Relative
```

## State Management

- **No Redux/MobX**: Uses React hooks and context
- **Local state**: `useState` for component-specific state
- **Shared state**: Custom hooks (e.g., `useChatState`)
- **Persistent state**: Services with localStorage/IndexedDB
- **Global state**: Minimal, mostly in `App.tsx`

## Data Flow

1. User interaction → Handler function
2. Handler → Service (business logic)
3. Service → External API or storage
4. Response → State update via hook
5. State change → Component re-render

## Testing Strategy

- No formal test suite currently
- Manual testing via development builds
- Diagnostic logging for debugging
- Activity logging for usage tracking

## Build Artifacts

- **Web**: `dist/` - Static files for web deployment
- **Electron**: `dist-electron/` - Compiled main/preload
- **Release**: `release/` - Installers and unpacked builds
- **Cache**: `.vite/` - Vite cache (gitignored)
