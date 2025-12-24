# ConstructLM Context & Storage Analysis

## Executive Summary

This document analyzes how ConstructLM handles file context, storage, embeddings, and data persistence across application sessions.

---

## 1. Storage Architecture Overview

### 1.1 Dual Storage System

ConstructLM uses a **hybrid storage approach**:

```
┌─────────────────────────────────────────────────────┐
│                  STORAGE LAYERS                      │
├─────────────────────────────────────────────────────┤
│  1. localStorage (Persistent)                       │
│     - Chat history (messages, metadata)             │
│     - File metadata (id, name, type, size)          │
│     - File content (full text/base64)               │
│     - User preferences                              │
│                                                      │
│  2. IndexedDB (Persistent)                          │
│     - Vector embeddings                             │
│     - Text chunks with embeddings                   │
│     - File hashes for deduplication                 │
│                                                      │
│  3. RAM (Session Only)                              │
│     - Active chat state                             │
│     - UI state                                      │
│     - Temporary processing data                     │
└─────────────────────────────────────────────────────┘
```

---

## 2. File Upload & Processing Flow

### 2.1 When User Uploads Files

**Location:** `App/handlers/fileHandlers.ts`

```typescript
handleFileUpload(fileList: FileList) {
  1. Validate file extensions (PDF, Excel, CSV, TXT, MD, images, etc.)
  2. Skip system files (starting with . or ~)
  3. Check for duplicates (by file path)
  4. Parse file content using fileParser service
  5. Store ProcessedFile in state
  6. Save to localStorage via chatRegistry
}
```

**Supported File Types:**
- Documents: `.pdf`, `.xlsx`, `.xls`, `.csv`, `.txt`, `.md`, `.json`, `.doc`, `.docx`
- Code: `.js`, `.ts`, `.css`, `.py`, `.java`, `.c`, `.cpp`, `.h`, `.cs`
- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.webp`
- Web: `.html`, `.xml`

### 2.2 File Storage in localStorage

**Location:** `services/chatRegistry.ts`

```typescript
// Files are stored in localStorage with full content
saveFiles(files: ProcessedFile[]): void {
  const fileMap: Record<string, ProcessedFile> = {};
  files.forEach(file => {
    fileMap[file.id] = file; // Includes full content!
  });
  localStorage.setItem('constructlm_files', JSON.stringify(fileMap));
}
```

**Critical Finding:** ✅ **File content IS persisted to localStorage**

---

## 3. Embedding & Vector Storage

### 3.1 IndexedDB Vector Store

**Location:** `services/vectorStore.ts`

```typescript
Database: 'ConstructLM_VectorStore'
Stores:
  - 'embeddings': File-level embeddings with hash-based deduplication
  - 'chunks': Text chunks with individual embeddings

Schema:
  EmbeddingRecord {
    fileId: string
    fileHash: string        // For deduplication
    version: string         // Model version
    embedding: number[]     // Vector representation
    timestamp: number
  }
  
  ChunkRecord {
    id: string
    fileId: string
    chunkIndex: number
    content: string         // Actual text chunk
    embedding: number[]     // Chunk vector
    tokens: number
  }
```

### 3.2 Smart Caching with Hash-Based Deduplication

**Location:** `services/embeddingService.ts`

```typescript
async processFile(file: ProcessedFile): Promise<void> {
  // 1. Generate hash of file content
  const fileHash = await generateFileHash(file.content);
  
  // 2. Check if already embedded
  const existing = await vectorStore.getEmbeddingByHash(fileHash);
  
  // 3. If hash matches, reuse embeddings (no re-processing!)
  if (existing && existing.version === EMBEDDING_VERSION) {
    console.log('Reusing embeddings (hash match)');
    // Copy embeddings to new fileId
    return;
  }
  
  // 4. Only generate new embeddings if content changed
  const chunks = chunkText(file.content, 500, 10);
  for (const chunk of chunks) {
    const embedding = await this.generateEmbedding(chunk);
    await vectorStore.saveChunks([...]);
  }
}
```

**Key Features:**
- ✅ Hash-based deduplication (same content = reuse embeddings)
- ✅ Version tracking (re-embed if model changes)
- ✅ Incremental processing (only new/changed files)
- ✅ Persistent across sessions

### 3.3 Embedding Model

**Model:** `Xenova/all-MiniLM-L6-v2` (via @xenova/transformers)
- Runs **locally in browser** (no API calls)
- 384-dimensional embeddings
- Fast and efficient
- No cost, no rate limits

---

## 4. Context Selection Strategy

### 4.1 Keyword-Based Context Selection

**Location:** `services/contextManager.ts`

```typescript
selectContext(query: string, selectedFiles: ProcessedFile[], modelId: string) {
  1. Extract query keywords (words > 2 chars)
  2. Score files by keyword frequency
  3. Extract relevant excerpts (500 chars around keywords)
  4. Respect model context window limits
  5. Return chunks with total token count
}
```

**Smart Features:**
- ✅ Query-aware context selection
- ✅ Model-specific token limits (Groq: 4-8k, Gemini: 32k+)
- ✅ Excerpt extraction (not full files)
- ✅ Token counting and warnings

### 4.2 Context Window Management

```typescript
// Model-specific limits
const groqLimits = {
  'llama-3.3-70b-versatile': 8000,
  'llama-3.1-8b-instant': 4000,
  // ... other models
};

// Conservative approach
const maxTokens = model.provider === 'groq' 
  ? groqLimits[modelId] 
  : contextWindow - 4000;
```

---

## 5. What Happens on App Restart?

### 5.1 Data Restoration Flow

**Location:** `App/hooks/useAppEffects.ts`

```typescript
useEffect(() => {
  // 1. Load chat history from localStorage
  const chatHistory = chatRegistry.getAllChats();
  setChats(chatHistory);
  
  // 2. Load most recent chat
  const mostRecent = chatHistory.sort((a, b) => b.updatedAt - a.updatedAt)[0];
  loadChat(mostRecent.id);
  
  // 3. Chat includes fileIds
  const chat = chatRegistry.getChat(mostRecent.id);
  
  // 4. Load files from localStorage
  const files = chatRegistry.getFiles(chat.fileIds);
  setFiles(files);
  
  // 5. Embeddings are already in IndexedDB (no re-processing!)
}, []);
```

**What Gets Restored:**
- ✅ Chat history (all messages)
- ✅ File content (full text)
- ✅ File metadata
- ✅ Vector embeddings (from IndexedDB)
- ✅ Text chunks (from IndexedDB)
- ✅ Citations (work correctly!)

**What Doesn't Need Re-processing:**
- ✅ Files with same hash reuse embeddings
- ✅ No re-chunking needed
- ✅ No re-embedding needed
- ✅ Instant context availability

---

## 6. Citation Handling

### 6.1 Citation Rendering

**Location:** `components/CitationRenderer/`

Citations are rendered inline with messages and include:
- File name
- Page number (for PDFs)
- Quote text
- Location reference

**Citation Persistence:**
- ✅ Citations stored with messages in localStorage
- ✅ Referenced files stored in localStorage
- ✅ Citations work after app restart
- ✅ Click to view document at specific location

### 6.2 Document Viewer Integration

When user clicks citation:
```typescript
handleViewDocument(fileName: string, page?: number, quote?: string) {
  const file = files.find(f => f.name === fileName);
  if (file) {
    setViewState({
      fileId: file.id,
      page: page || 1,
      quote,
      location
    });
  }
}
```

---

## 7. Storage Limits & Optimization

### 7.1 localStorage Limits

```typescript
// Chat limits
MAX_MESSAGES_PER_CHAT = 50;
MAX_CHATS = 10;

// Quota exceeded handling
handleQuotaExceeded() {
  // Keep only 5 most recent chats
  // Trim to 20 messages per chat
  // Automatic cleanup
}
```

### 7.2 File Storage Optimization

**Strategies:**
1. **Deduplication:** Same content = same hash = reuse embeddings
2. **Compression:** Text content stored efficiently
3. **Lazy Loading:** Files loaded only when needed
4. **Batch Processing:** 5 files at a time
5. **Progress Tracking:** User feedback during upload

---

## 8. Comparison: ConstructLM vs Gemini Dictation Assistant

| Feature | ConstructLM | Gemini Dictation Assistant |
|---------|-------------|---------------------------|
| **File Content Storage** | ✅ localStorage (persistent) | ❌ RAM only (lost on close) |
| **Embeddings Storage** | ✅ IndexedDB (persistent) | ❌ Not implemented |
| **Smart Caching** | ✅ Hash-based deduplication | ❌ Re-process every time |
| **Citations After Restart** | ✅ Work correctly | ❌ Broken (files lost) |
| **Context Selection** | ✅ Keyword-based + scoring | ✅ Keyword-based |
| **Vector Search** | ✅ Cosine similarity | ❌ Not implemented |
| **Incremental Updates** | ✅ Only changed files | ❌ All files re-processed |
| **Local Embeddings** | ✅ Browser-based (free) | ❌ Not implemented |
| **Token Management** | ✅ Model-specific limits | ⚠️ Basic limits |
| **Quota Handling** | ✅ Automatic cleanup | ⚠️ Manual only |

---

## 9. Key Advantages of ConstructLM Approach

### 9.1 Persistent Context
- Files and embeddings survive app restarts
- No need to re-upload or re-process files
- Citations remain functional indefinitely

### 9.2 Smart Deduplication
- Same file uploaded multiple times = processed once
- Hash-based detection prevents wasted computation
- Embeddings reused across sessions

### 9.3 Local Processing
- Embeddings generated in browser (no API costs)
- No rate limits
- Privacy-friendly (data stays local)

### 9.4 Scalable Storage
- IndexedDB can handle large datasets (GBs)
- localStorage for quick access to metadata
- Automatic cleanup when quota exceeded

### 9.5 User Experience
- Instant context availability on restart
- Progress feedback during processing
- Smart warnings for large contexts
- Citations that actually work

---

## 10. Storage Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    USER UPLOADS FILE                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  1. Parse File (fileParser.ts)                          │
│     - Extract text from PDF/Excel/etc                   │
│     - Convert images to base64                          │
│     - Create ProcessedFile object                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  2. Save to localStorage (chatRegistry.ts)              │
│     - Store full file content                           │
│     - Associate with current chat                       │
│     - Persist across sessions ✅                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  3. Generate Hash (embeddingService.ts)                 │
│     - SHA-256 of file content                           │
│     - Check if already embedded                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ├─── Hash Match? ───┐
                     │                   │
                     ▼ NO                ▼ YES
┌─────────────────────────────┐  ┌──────────────────────┐
│  4a. Generate Embeddings    │  │  4b. Reuse Existing  │
│      - Chunk text (500 tok) │  │      - Copy to new   │
│      - Embed each chunk     │  │        fileId        │
│      - Save to IndexedDB    │  │      - Skip compute  │
└─────────────────────────────┘  └──────────────────────┘
                     │                   │
                     └───────┬───────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│  5. Ready for Context Selection                         │
│     - File content in localStorage                      │
│     - Embeddings in IndexedDB                           │
│     - Available immediately on next session ✅          │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Recommendations for Gemini Dictation Assistant

Based on ConstructLM's approach, the Gemini Dictation Assistant should:

### Priority 1: Implement Persistent File Storage
```typescript
// Add to referenceStorage.ts
saveFilesToLocalStorage(files: ReferenceFile[]): void {
  const fileMap: Record<string, ReferenceFile> = {};
  files.forEach(file => {
    fileMap[file.id] = {
      id: file.id,
      path: file.path,
      filename: file.filename,
      content: file.content,
      type: file.type,
      chunks: file.chunks,
      lastModified: file.lastModified,
      size: file.size,
      directoryId: file.directoryId
    };
  });
  localStorage.setItem('reference_files', JSON.stringify(fileMap));
}
```

### Priority 2: Implement IndexedDB for Embeddings
```typescript
// Create vectorStore.ts similar to ConstructLM
class VectorStore {
  async saveEmbedding(fileId: string, embedding: number[]): Promise<void>;
  async getEmbedding(fileId: string): Promise<number[] | null>;
  async saveChunks(chunks: ChunkRecord[]): Promise<void>;
  async getChunks(fileId: string): Promise<ChunkRecord[]>;
}
```

### Priority 3: Add Hash-Based Deduplication
```typescript
// Add to embeddingUtils.ts
async generateFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### Priority 4: Restore Files on Startup
```typescript
// Add to useAppState.ts initialization
useEffect(() => {
  // Load files from localStorage
  const storedFiles = localStorage.getItem('reference_files');
  if (storedFiles) {
    const fileMap = JSON.parse(storedFiles);
    const files = Object.values(fileMap);
    
    // Restore to referenceStorage
    files.forEach(file => {
      referenceStorage.files.set(file.id, file);
    });
    
    // Restore directory registrations
    const directories = new Set(files.map(f => f.directoryId));
    directories.forEach(dirId => {
      // Restore directory metadata
    });
  }
}, []);
```

---

## 12. Conclusion

**ConstructLM's Approach:**
- ✅ **Persistent:** Files and embeddings survive restarts
- ✅ **Efficient:** Smart caching and deduplication
- ✅ **Scalable:** IndexedDB for large datasets
- ✅ **User-Friendly:** Citations work, no re-processing
- ✅ **Cost-Effective:** Local embeddings, no API costs

**Key Takeaway:**
The combination of localStorage (for file content) + IndexedDB (for embeddings) + hash-based deduplication creates a robust, persistent context management system that provides excellent user experience without sacrificing performance.

**Implementation Effort:**
- Low: Add localStorage persistence (~2 hours)
- Medium: Add IndexedDB vector store (~4 hours)
- Medium: Add hash-based deduplication (~3 hours)
- Low: Add startup restoration (~1 hour)

**Total:** ~10 hours to match ConstructLM's context persistence capabilities.
