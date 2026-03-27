# Quick Reference: Critical Fixes

## 🎯 What's Wrong?

From `testing-pipeline.md`, we see AI responses are **4-5 words** instead of comprehensive answers:
- "Click the link icon in the input area" ❌
- "Prerequisites - Node.js (v16 or higher recommended)" ❌
- "Access via the gear icon" ❌

## 🔧 5 Critical Fixes

### Fix 1: Increase RAG Chunk Limits
**File:** `services/llmService.ts` (line 125)
```typescript
// Change from 6-12 chunks → 15-25 chunks
let chunkLimit = 20; // was 10
```

### Fix 2: Remove Response Debounce
**File:** `App/handlers/messageHandlers.ts` (line 150)
```typescript
// Remove 50ms setTimeout debounce
// Update every 5 chunks instead
updateCounter++;
if (updateCounter % 5 === 0) {
    setMessages(/* update */);
}
```

### Fix 3: Fix Citation Rendering
**File:** `components/CitationRenderer/markdown/markdownParsers.tsx`
```typescript
// Add citation parsing BEFORE markdown parsing
const citationParts = text.split(SPLIT_REGEX);
// Then render citations as chips, not plain text
```

### Fix 4: Implement Auto-Highlighting
**File:** `services/highlightService.ts`
```typescript
// Add Mark.js integration
applyHighlightsToElement(element, fileName, quote) {
    markInstance.mark(quote, {
        className: 'citation-highlight',
        done: () => scrollIntoView()
    });
}
```

### Fix 5: Improve System Prompt
**File:** `services/llmService.ts` (line 20)
```typescript
// Add response quality requirements
**RESPONSE QUALITY REQUIREMENTS:**
1. Provide COMPREHENSIVE answers (minimum 3-5 sentences)
2. Include specific details and context
3. Never give single-sentence responses
```

## 📊 Expected Results

### Before Fixes
```
Q: What are the prerequisites?
A: Prerequisites - Node.js (v16 or higher recommended)
   [21 tokens, 1 sentence] ❌
```

### After Fixes
```
Q: What are the prerequisites?
A: To run ConstructLM, you need Node.js version 16 or higher 
   installed on your system, along with npm which comes bundled 
   with Node.js. You'll also need at least one API key from 
   supported providers like Google Gemini, Groq, or Cerebras. 
   The application requires these dependencies to function 
   properly and connect to AI models.
   [85 tokens, 4 sentences] ✅
```

## 🚀 Implementation Order

1. **Fix 5** (System Prompt) - 5 minutes
2. **Fix 1** (Chunk Limits) - 5 minutes  
3. **Fix 2** (Debounce) - 10 minutes
4. **Fix 3** (Citations) - 20 minutes
5. **Fix 4** (Highlighting) - 30 minutes

**Total Time:** ~70 minutes

## ✅ Testing

Run the same questions from `testing-pipeline.md`:
- Prerequisites question → Should get 3-5 sentences
- Advanced capabilities → Should get detailed list with explanations
- Web research → Should get step-by-step guide
- Configuration → Should get comprehensive settings explanation

## 📁 Files to Modify

1. `services/llmService.ts` (3 changes)
2. `services/contextManager.ts` (1 change)
3. `services/ragService.ts` (1 change)
4. `App/handlers/messageHandlers.ts` (1 change)
5. `components/CitationRenderer/markdown/markdownParsers.tsx` (1 change)
6. `components/CitationRenderer/markdown/SimpleMarkdown.tsx` (1 change)
7. `services/highlightService.ts` (3 new methods)
8. `styles/integrated-styles.css` (add highlight styles)
9. `components/CitationRenderer/components/CitationChip.tsx` (1 change)
10. `components/DocumentViewer/PdfViewer.tsx` (1 change)

## 🔄 Rollback

If issues occur, revert in reverse order:
1. Disable auto-highlighting
2. Revert citation parser changes
3. Restore debounce
4. Reduce chunk limits
5. Revert system prompt

---

**See `CRITICAL_FIXES_IMPLEMENTATION.md` for detailed code changes**
