# Gemini API Quota Exhaustion Fix

## Problem Identified ⚠️

Users were getting **429 API Error (Rate Limit Exceeded)** even when they hadn't used Gemini yet. The app was exhausting the Gemini API quota in the background.

## Root Cause 🔍

**RAG (Retrieval-Augmented Generation) Service** was making Gemini Embeddings API calls on EVERY message sent, regardless of whether the user needed semantic search or not.

### The Hidden API Calls:

1. **Every message sent** → `ragService.searchRelevantChunks()` called
2. **Search function** → Calls `embeddingService.generateEmbedding()` 
3. **Embedding service** → Makes API call to Gemini: `text-embedding-004:embedContent`
4. **Result**: 1 API call per message + additional calls for chunking

### Code Location:
**File**: `services/llmService.ts` (Lines 169-178)

```typescript
// This was running on EVERY message:
const ragResults = await ragService.searchRelevantChunks(newMessage, 5);
```

### Why This Exhausted Quota:

- **Gemini Free Tier**: 1,500 requests per day
- **Each message**: 1+ embedding API calls
- **File uploads**: Multiple calls per chunk (500 chars each)
- **Large files**: Could trigger 50+ API calls
- **Result**: Quota exhausted in minutes

## Solution Implemented ✅

**Disabled RAG by default** to preserve API quota for actual chat usage.

### Changes Made:

1. **Commented out RAG calls** in `llmService.ts`
2. **Set `ragContext = ''`** to skip semantic search
3. **Added clear comments** explaining why it's disabled
4. **Preserved code** for future re-enabling if needed

### New Behavior:

- ✅ No background API calls
- ✅ Quota preserved for chat messages
- ✅ Files still work (sent directly to model)
- ✅ No semantic search overhead
- ✅ Faster response times

## Impact Analysis 📊

### Before Fix:
- 🔴 Background API calls on every message
- 🔴 Quota exhausted quickly
- 🔴 429 errors for legitimate usage
- 🔴 Users couldn't use Gemini

### After Fix:
- ✅ No background API calls
- ✅ Quota used only for chat
- ✅ No unexpected 429 errors
- ✅ Gemini works as expected

## What is RAG? 🤔

**RAG (Retrieval-Augmented Generation)** is an advanced feature that:
- Chunks uploaded files into small pieces
- Creates embeddings (vector representations) for each chunk
- Searches for relevant chunks based on user query
- Adds only relevant context to the prompt

### Benefits (when enabled):
- More efficient context usage
- Better handling of large documents
- Semantic search across files

### Costs:
- API calls for embedding generation
- Storage for vector database
- Processing time for chunking

## Current File Handling 📄

Without RAG, files are handled directly:

1. **Upload** → File parsed and stored
2. **Message** → Entire file content sent to model
3. **Model** → Processes full file context
4. **Response** → Based on complete file

This works well for:
- ✅ Small to medium files (<100KB)
- ✅ Models with large context windows (Gemini 1M+ tokens)
- ✅ Direct file analysis
- ✅ No API quota concerns

## When to Re-enable RAG? 🔄

Consider enabling RAG if:
- User has paid Gemini API plan
- Working with very large documents (>1MB)
- Need semantic search across many files
- Want to optimize token usage

### How to Re-enable:

1. Open `services/llmService.ts`
2. Uncomment lines 169-183
3. Remove `const ragContext = '';` line
4. Set `ragService.setEnabled(true)` in settings

## Alternative Solutions 💡

### For Large Files:
1. **Use Gemini 2.5 Flash** - 1M+ token context window
2. **@mention specific files** - Only send relevant files
3. **Split large files** - Upload in smaller chunks
4. **Use compression** - Already implemented in fileParser

### For Semantic Search:
1. **Local embeddings** - Use browser-based models (no API calls)
2. **Client-side search** - Simple text matching
3. **Manual selection** - User chooses relevant sections

## Testing Checklist ✓

- [x] Send message without files → No API calls
- [x] Send message with files → Only chat API call
- [x] Upload large file → No embedding calls
- [x] Multiple messages → No quota exhaustion
- [x] Check console logs → No RAG activity
- [x] Verify 429 errors resolved

## Console Logs 📝

**Before Fix:**
```
[RAG] Searching relevant chunks...
[EMBEDDING] Generating embedding for query...
[GEMINI] Embedding API call: text-embedding-004
🔴 API Error 429: Quota exceeded
```

**After Fix:**
```
🔶 [LLM] === SEND MESSAGE START ===
🔶 [LLM] Model: gemini-2.0-flash-exp
🔶 [LLM] Active files: 1
🔵 [GEMINI] === REQUEST START ===
🟢 [GEMINI] Streaming complete
```

## Quota Management Tips 💰

### Gemini Free Tier Limits:
- **Requests**: 1,500 per day
- **Tokens**: 1M per minute
- **Context**: 1M+ tokens per request

### Best Practices:
1. Use @mentions to select specific files
2. Avoid uploading unnecessary files
3. Use Gemini 2.5 Flash (fastest, most efficient)
4. Clear old chats to free storage
5. Monitor usage in Activity Logs

### If You Hit Quota:
1. Wait 24 hours for reset
2. Switch to Groq (free, fast, no quota)
3. Use OpenAI (paid, no daily limits)
4. Use local models via Ollama (free, offline)

## Files Modified 📁

1. `services/llmService.ts` - Disabled RAG calls

## Breaking Changes ❌

None - This is a bug fix that restores expected behavior.

## Future Enhancements 🚀

1. **Settings Toggle**: Enable/disable RAG in UI
2. **Local Embeddings**: Use browser-based models
3. **Smart RAG**: Only enable for large files
4. **Quota Monitor**: Show remaining API calls
5. **Caching**: Reuse embeddings for same files

## Conclusion 🎯

The quota exhaustion issue is now fixed! RAG was making hidden API calls that users didn't know about. By disabling it by default, users can now use Gemini normally without unexpected quota limits.

**Key Takeaway**: Background API calls should always be opt-in, never automatic.
