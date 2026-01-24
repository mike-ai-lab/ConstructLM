# Technology Stack

## Core Technologies

- **Frontend**: React 19, TypeScript, Vite 6
- **Desktop**: Electron 28, Electron Builder
- **Styling**: Tailwind CSS (via integrated-styles.css), Lucide Icons
- **Build**: Vite with dual configs (web + electron)

## AI/ML Stack

- **Local Embeddings**: @xenova/transformers (Transformers.js) - Xenova/all-MiniLM-L6-v2 (384-dim)
  - WebAssembly-based inference in browser
  - 50-100ms per embedding after initial load
  - ~25MB model download (one-time, cached)
- **LLM Providers**: Google Generative AI SDK, OpenAI SDK, AWS SDK (Bedrock), Groq API, Cerebras API
- **Vector Storage**: IndexedDB (raw API) with cosine similarity search

## Document Processing

- **PDF**: PDF.js with structured extraction
- **Excel/CSV**: XLSX library
- **DOCX**: Mammoth.js
- **Markdown**: React Markdown
- **Text Highlighting**: Mark.js, Rangy

## Storage

- **IndexedDB**: Document storage, vector store, embeddings cache
- **LocalStorage**: Settings, API keys, user preferences
- **idb-keyval**: Simplified IndexedDB wrapper for key-value operations

## 3D/Graphics

- **Three.js**: 3D rendering engine
- **React Three Fiber**: React renderer for Three.js
- **@react-three/drei**: Helpers for React Three Fiber
- **Framer Motion**: Animation library

## Development Tools

- **TypeScript**: ~5.8.2 with strict mode
- **Node**: v16+ required
- **Package Manager**: npm
- **Concurrency**: concurrently for parallel dev processes

## Common Commands

### Development
```bash
# Web development server
npm run dev                    # Starts Vite dev server on port 5173

# Electron development
npm run electron:dev           # Starts Vite + Electron with hot reload
npm run electron:start         # Alternative electron start command
npm run electron:start:clean   # Kills port 5175 and starts fresh

# Proxy server (for CORS)
npm run proxy                  # Starts proxy server for web content
```

### Building
```bash
# Web build
npm run build                  # Builds for web deployment
npm run preview                # Preview production build

# Electron build
npm run electron:build         # Full production build (Windows installer)
npm run electron:pack          # Build without installer (unpacked)
```

### Utilities
```bash
# Version management
npm run prebuild               # Updates version.json (runs before build)

# Manual cleanup
clear-cache.bat                # Clear Vite cache (Windows)
fresh-build.bat                # Clean build from scratch
```

## Build Configuration

### Vite Config (`vite.config.ts`)
- Base path: `./` (relative for Electron)
- Port: 5173 (web), 5175 (electron dev)
- Cache busting: Timestamp-based asset names
- Proxy: HuggingFace for model downloads

### Electron Config (`electron.vite.config.ts`)
- Output: `dist-electron/`
- Format: CommonJS (`.cjs`)
- Entry points: `main.ts`, `preload.ts`
- External: Electron + Node builtins

### TypeScript Config
- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: react-jsx
- Path alias: `@/*` → workspace root
- Experimental decorators enabled

## Environment Variables

Required in `.env.local`:
```env
VITE_GEMINI_API_KEY=...        # Google Gemini (required)
GROQ_API_KEY=...               # Groq (optional)
OPENAI_API_KEY=...             # OpenAI (optional)
AWS_ACCESS_KEY_ID=...          # AWS Bedrock (optional)
AWS_SECRET_ACCESS_KEY=...      # AWS Bedrock (optional)
AWS_REGION=us-east-1           # AWS region
```

## Browser Compatibility

- Modern browsers with ES2022 support
- IndexedDB support required
- WebAssembly support required (for Transformers.js)
- Recommended: Chrome 90+, Firefox 88+, Edge 90+

## Performance Considerations

- Lazy loading for components
- Virtual scrolling for large documents
- Debounced search
- Embedding cache for reuse
- Chunk compression for storage
- Streaming responses from LLMs
