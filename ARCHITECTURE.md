# ConstructLM Architecture

## System Overview

ConstructLM is a production-grade RAG (Retrieval-Augmented Generation) application with multi-model LLM support, built with React, TypeScript, and Electron.

## RAG Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│                    (React + TypeScript)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Document Processing                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │ PDF Parser │  │ DOCX Parser│  │ Excel/CSV Parser   │   │
│  └────────────┘  └────────────┘  └────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Text Chunking & Embedding                 │
│  • Recursive text splitting (configurable chunk size)       │
│  • Embedding generation (Transformers.js - local)           │
│  • Vector storage (IndexedDB with idb-keyval)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Vector Store (RAG Service)                │
│  • Semantic search with cosine similarity                    │
│  • Context-aware retrieval                                   │
│  • Citation tracking and source linking                      │
│  • Smart context management (token-aware)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    LLM Service (Multi-Model)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Gemini  │  │   Groq   │  │  OpenAI  │  │ Bedrock  │   │
│  │ (Flash/  │  │ (Llama/  │  │ (GPT-4o) │  │ (Claude) │   │
│  │   Pro)   │  │  Mixtral)│  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Response Generation                       │
│  • Streaming responses                                       │
│  • Inline citations with source links                        │
│  • Context window management                                 │
│  • Rate limiting and error handling                          │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. RAG Service (`services/ragService.ts`)
- **Semantic Search**: Cosine similarity-based retrieval using local embeddings
- **Context Building**: Assembles relevant document chunks
- **Citation Generation**: Tracks source documents and page numbers
- **Relevance Scoring**: Filters low-relevance results
- **Status**: Enabled by default (can be toggled in Settings)

### 2. Vector Store (`services/vectorStore.ts`)
- **Storage**: IndexedDB (raw API) for persistent vector storage
- **Embeddings**: Local Transformers.js - Xenova/all-MiniLM-L6-v2 (384 dimensions)
- **Indexing**: Efficient chunk-based indexing
- **Retrieval**: Fast similarity search with cosine similarity
- **Privacy**: 100% local - no data sent to external APIs

### 3. Embedding Service (`services/embeddingService.ts`)
- **Model**: Xenova/all-MiniLM-L6-v2 via Transformers.js
- **Technology**: WebAssembly-based inference in browser
- **Performance**: 50-100ms per embedding after initial model load
- **First Load**: ~5-10 seconds (downloads 25MB model to browser cache)
- **Subsequent**: Instant from cache
- **Batching**: Efficient batch processing of document chunks
- **Caching**: Embedding cache for performance (reuses embeddings for duplicate content)
- **Fallback**: Graceful degradation if model fails to load

### 4. Smart Context Manager (`services/smartContextManager.ts`)
- **Token Counting**: Accurate token estimation
- **Context Pruning**: Intelligent context window management
- **Priority System**: Keeps most relevant context
- **Model-Aware**: Adapts to different model limits

### 5. LLM Service (`services/llmService.ts`)
- **Multi-Provider**: Unified interface for all LLMs
- **Streaming**: Real-time response streaming
- **Error Handling**: Robust retry and fallback logic
- **Rate Limiting**: Built-in rate limit management

## Technical Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide Icons** - Icon library

### Document Processing
- **PDF.js** - PDF parsing with structured extraction
- **XLSX** - Excel/CSV parsing
- **React Markdown** - Markdown rendering

### AI/ML
- **@xenova/transformers** - Local embeddings (Transformers.js)
  - Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
  - Technology: WebAssembly-based inference
  - Performance: 50-100ms per embedding
  - Privacy: 100% local, no API calls
- **Google Generative AI SDK** - Gemini integration
- **OpenAI SDK** - GPT integration  
- **AWS SDK** - Bedrock integration

### Storage
- **IndexedDB** - Document and vector storage (raw API)
- **LocalStorage** - Settings and API keys

### Desktop
- **Electron** - Cross-platform desktop app
- **Electron Builder** - App packaging

## Data Flow

### Document Upload Flow
```
1. User uploads document
2. File parsed (PDF/DOCX/Excel) via fileParser.ts
3. Text extracted and chunked (500 tokens, 10% overlap)
4. Embeddings generated locally via Transformers.js (Xenova/all-MiniLM-L6-v2)
5. Vectors stored in IndexedDB (ConstructLM_VectorStore database)
6. Document indexed for semantic search
7. Ready for RAG queries
```

### Query Flow
```
1. User sends query
2. Query embedded locally (Transformers.js, ~50-100ms)
3. Semantic search in vector store (cosine similarity)
4. Top-K relevant chunks retrieved (default: 5)
5. Context assembled with citations
6. LLM generates response with RAG context
7. Citations rendered inline with source links
```

## Key Features

### RAG Implementation
- ✅ **Local Embeddings** - Transformers.js (Xenova/all-MiniLM-L6-v2, 384-dim)
- ✅ **Persistent Storage** - IndexedDB for offline access
- ✅ **Smart Retrieval** - Cosine similarity with relevance scoring
- ✅ **Citation System** - Direct links to source documents with page numbers
- ✅ **Context Management** - Token-aware context building
- ✅ **Auto-Indexing** - Files automatically processed on upload
- ✅ **Privacy-First** - Zero API calls, all processing in browser
- ✅ **Zero Cost** - No embedding API fees

### Multi-Model Support
- ✅ **4 Providers** - Gemini, Groq, OpenAI, AWS Bedrock
- ✅ **10+ Models** - From fast to powerful
- ✅ **Unified Interface** - Switch models seamlessly
- ✅ **Streaming** - Real-time responses

### Production Features
- ✅ **Error Handling** - Comprehensive error recovery
- ✅ **Rate Limiting** - Built-in cooldown management
- ✅ **Activity Logging** - Usage tracking and analytics
- ✅ **Export/Import** - Data portability
- ✅ **Offline Support** - Works without internet (local models)

## Performance Optimizations

1. **Lazy Loading** - Components loaded on demand
2. **Virtual Scrolling** - Efficient large document rendering
3. **Debounced Search** - Reduced API calls
4. **Embedding Cache** - Reuse computed embeddings
5. **Chunk Compression** - Optimized storage

## Security

- **Client-Side Only** - No backend server (except proxy)
- **Local Storage** - API keys stored in browser only
- **No Data Leakage** - Documents never leave your machine
- **CORS Proxy** - Secure web content fetching

## Scalability

- **Modular Architecture** - Easy to extend
- **Plugin System** - Custom integrations possible
- **Model Registry** - Add new models easily
- **Service Layer** - Clean separation of concerns

## Comparison to Alternatives

| Feature | ConstructLM | Qdrant+Groq | Pinecone+OpenAI |
|---------|-------------|-------------|-----------------|
| **Local Embeddings** | ✅ Free | ✅ Free | ❌ Paid |
| **Vector Storage** | ✅ IndexedDB | ⚠️ Requires setup | ❌ Cloud only |
| **Multi-Model** | ✅ 4 providers | ❌ Single | ❌ Single |
| **Desktop App** | ✅ Electron | ❌ Web only | ❌ Web only |
| **Offline Mode** | ✅ Yes | ⚠️ Partial | ❌ No |
| **Setup Time** | ✅ 5 minutes | ⚠️ 30+ minutes | ⚠️ 15 minutes |
| **Cost** | ✅ Free tier | ✅ Free tier | ⚠️ Paid after limit |

## Why This Architecture?

1. **Zero Infrastructure** - No servers, no databases to manage
2. **Privacy-First** - All processing happens locally
3. **Cost-Effective** - Free embeddings, free vector storage
4. **User-Friendly** - No technical setup required
5. **Production-Ready** - Used in real applications

## Future Enhancements

- [ ] Advanced reranking with cross-encoders
- [ ] Multi-modal embeddings (images + text)
- [ ] Collaborative features (team workspaces)
- [ ] Plugin marketplace
- [ ] Custom model fine-tuning

---

**This is a production-grade RAG system designed for real-world use.**
