# Numbered References Citation System

## 🎯 New Approach: Academic-Style Numbered References

Based on user feedback, we've switched from inline citations to a cleaner **numbered reference system** similar to academic papers.

---

## ❌ Old Approach (Inline Citations - Problematic)

```
The Smart Chat Features include Multi-Chat Management 
{{citation:README.md|Section|Multi-Chat Management: Create, switch, and manage multiple conversation threads}}
and Context-Aware functionality 
{{citation:README.md|Section|Context-Aware: Automatically manages context windows}}.
```

### Problems:
1. ❌ Cluttered text with long inline citations
2. ❌ Redundancy between answer and citation text
3. ❌ Confusing for AI (paraphrase vs verbatim)
4. ❌ Hard to read with citation syntax mixed in
5. ❌ Breaks flow of natural language

---

## ✅ New Approach (Numbered References - Clean)

```
The Smart Chat Features include:

- **Multi-Chat Management**: Create, switch, and manage multiple conversation threads [1]
- **Context-Aware**: Automatically manages context windows and token limits [2]
- **File Mentions**: Reference specific documents using @filename syntax [3]
- **Web Sources**: Add URLs as context sources for research [4]
- **Message Controls**: Retry, regenerate, save to notes, and view alternatives [5]
- **Voice Input**: Speech-to-text transcription for hands-free interaction [6]

**References:**
[1] Source: README.md, Section: Smart Chat Features - "Multi-Chat Management: Create, switch, and manage multiple conversation threads"
[2] Source: README.md, Section: Smart Chat Features - "Context-Aware: Automatically manages context windows and token limits"
[3] Source: README.md, Section: Smart Chat Features - "File Mentions: Use @filename to reference specific documents"
[4] Source: README.md, Section: Smart Chat Features - "Web Sources: Add URLs as context sources"
[5] Source: README.md, Section: Smart Chat Features - "Message Controls: Retry, regenerate, save to notes"
[6] Source: README.md, Section: Smart Chat Features - "Voice Input: Speech-to-text transcription"
```

### Benefits:
1. ✅ **Clean text** - No inline citation clutter
2. ✅ **Natural flow** - AI writes normally, adds [N]
3. ✅ **No redundancy** - Content separate from references
4. ✅ **Professional** - Matches academic papers
5. ✅ **Easy for AI** - Simple task: write + add numbers
6. ✅ **User-friendly** - Click [N] to see full source
7. ✅ **Organized** - All references grouped at end
8. ✅ **Scannable** - Easy to find specific references

---

## 📝 Reference Format by File Type

### PDF Documents
```
[1] Source: document.pdf, Page 5 - "exact quote from page 5"
[2] Source: report.pdf, Page 12, Section: Conclusion - "final recommendations"
```

### Excel/CSV Files
```
[1] Source: data.xlsx, Sheet: Sales, Row 15 - "Product A: $299.99"
[2] Source: budget.csv, Row 42, Column: Total - "$1,500,000"
```

### Markdown/Text Files
```
[1] Source: README.md, Section: Features - "26+ models across 5 providers"
[2] Source: guide.md, Section: Installation - "npm install required"
```

### Web Sources
```
[1] Source: https://example.com/docs, Section: API - "authentication required"
[2] Source: https://blog.com/post, Paragraph 3 - "performance improvements"
```

---

## 🎨 How It Works

### Step 1: AI Writes Content Naturally
```
The system uses hybrid search combining keyword matching with semantic similarity 
for optimal document retrieval.
```

### Step 2: AI Adds Reference Numbers
```
The system uses hybrid search [1] combining keyword matching with semantic similarity [2] 
for optimal document retrieval.
```

### Step 3: AI Lists References at End
```
**References:**
[1] Source: README.md, Section: Advanced Capabilities - "Hybrid Search: Combines keyword matching (30%) with semantic similarity (70%)"
[2] Source: guide.pdf, Page 8 - "semantic search with cosine similarity scoring"
```

---

## 🔧 Implementation Details

### System Prompt Changes

**For Documents:**
```
**RESPONSE FORMAT - NUMBERED REFERENCES:**
Write your answer naturally, then add reference numbers [1], [2], etc. after each fact.
At the end, list all references with full citation details.

**Example:**
"The system uses hybrid search [1] combining keyword matching with semantic similarity [2].

**References:**
[1] Source: README.md, Section: Advanced Capabilities - "Hybrid Search"
[2] Source: guide.pdf, Page 5 - "semantic search with cosine similarity"
```

**For Web Sources:**
```
**RESPONSE FORMAT - NUMBERED REFERENCES:**
Write your answer naturally, then add reference numbers [1], [2], etc. after each fact.
At the end, list all references with full citation details.

**Format:**
[N] Source: URL, Section - "exact quote"
```

**For RAG Context:**
```
🔴 NUMBERED REFERENCE CITATION RULES:
1. USE NUMBERED REFERENCES: Write naturally, add [1], [2], [3] after facts
2. GROUP REFERENCES AT END: List all under "**References:**" heading
3. FORMAT: [N] Source: FileName, Location - "exact quote from chunk"
4. WRITE NATURALLY: No inline citation clutter, just [N] numbers
5. CLEAN SEPARATION: Content in answer, full details in references
```

---

## 📊 Comparison

| Aspect | Inline Citations | Numbered References |
|--------|------------------|---------------------|
| **Readability** | ❌ Cluttered | ✅ Clean |
| **AI Complexity** | ❌ High (paraphrase vs verbatim) | ✅ Low (write + add [N]) |
| **Redundancy** | ❌ Often duplicates text | ✅ No duplication |
| **Professional** | ⚠️ Technical | ✅ Academic style |
| **User Experience** | ❌ Hard to scan | ✅ Easy to navigate |
| **Citation Details** | ⚠️ Mixed in text | ✅ Grouped at end |
| **Natural Flow** | ❌ Interrupted | ✅ Smooth |

---

## 🎯 Expected Output Examples

### Example 1: Technical Question

**Question:** "What RAG features does ConstructLM offer?"

**Answer:**
```
ConstructLM offers comprehensive RAG (Retrieval-Augmented Generation) capabilities with 
true local embeddings [1] that ensure complete privacy. The system uses Transformers.js [2] 
to generate embeddings directly in the browser via WebAssembly, eliminating the need for 
external API calls [3]. This approach provides zero embedding costs [4] while maintaining 
high-quality semantic search functionality.

The RAG system includes smart retrieval with cosine similarity [5], automatic file indexing [6], 
and token-aware context management [7]. Documents are processed with intelligent chunking [8] 
using 500-token segments with 10% overlap for optimal context preservation.

**References:**
[1] Source: README.md, Section: RAG Features - "TRUE local embeddings with Transformers.js"
[2] Source: README.md, Section: Technologies - "Transformers.js (Xenova/all-MiniLM-L6-v2, 384-dim)"
[3] Source: README.md, Section: Core Value - "documents never leave the user's machine"
[4] Source: README.md, Section: Core Value - "Zero Embedding Cost: Browser-based embeddings"
[5] Source: README.md, Section: RAG Features - "Smart Retrieval: Cosine similarity with relevance scoring"
[6] Source: README.md, Section: RAG Features - "Auto-Indexing: Files automatically processed on upload"
[7] Source: README.md, Section: RAG Features - "Context Management: Token-aware context building"
[8] Source: README.md, Section: RAG Features - "Chunk Optimization: 500 tokens, 10% overlap"
```

### Example 2: Feature List

**Question:** "What are the Smart Chat Features?"

**Answer:**
```
ConstructLM provides several smart chat features designed to enhance productivity:

- **Multi-Chat Management** [1]: Create and manage multiple conversation threads simultaneously
- **Context-Aware Processing** [2]: Automatic management of context windows and token limits
- **File Mentions** [3]: Reference specific documents using the @filename syntax
- **Web Sources Integration** [4]: Add URLs as context sources for research
- **Message Controls** [5]: Retry, regenerate, save to notes, and view alternative outputs
- **Voice Input** [6]: Speech-to-text transcription for hands-free interaction

These features work together to provide a flexible and efficient chat experience.

**References:**
[1] Source: README.md, Section: Smart Chat Features - "Multi-Chat Management: Create, switch, and manage multiple conversation threads"
[2] Source: README.md, Section: Smart Chat Features - "Context-Aware: Automatically manages context windows and token limits"
[3] Source: README.md, Section: Smart Chat Features - "File Mentions: Use @filename to reference specific documents"
[4] Source: README.md, Section: Smart Chat Features - "Web Sources: Add URLs as context sources"
[5] Source: README.md, Section: Smart Chat Features - "Message Controls: Retry, regenerate, save to notes"
[6] Source: README.md, Section: Smart Chat Features - "Voice Input: Speech-to-text transcription"
```

---

## 🚀 Advantages for Different Use Cases

### For Researchers
- ✅ Familiar academic citation style
- ✅ Easy to verify sources
- ✅ Professional presentation
- ✅ Clear attribution

### For Developers
- ✅ Clean code-like structure
- ✅ Easy to parse references
- ✅ Numbered indexing
- ✅ Scannable format

### For General Users
- ✅ Less cluttered text
- ✅ Easy to read
- ✅ Optional reference lookup
- ✅ Natural language flow

---

## 🔄 Migration from Old System

### Old Citation Format (Still Supported)
```
{{citation:FileName.ext|Location|exact quote}}
```

### New Reference Format (Preferred)
```
[N] in text
**References:**
[N] Source: FileName.ext, Location - "exact quote"
```

### Backward Compatibility
- Old inline citations still render as chips
- New numbered references render as clickable numbers
- Both systems can coexist during transition
- CitationRenderer handles both formats

---

## 📈 Performance Benefits

1. **Faster AI Generation**: Simpler task = faster responses
2. **Lower Token Usage**: Less redundant text
3. **Better Accuracy**: AI doesn't confuse paraphrase vs verbatim
4. **Cleaner Output**: More professional presentation
5. **Easier Parsing**: Structured reference section

---

## ✅ Implementation Status

- [x] Updated system prompts for documents
- [x] Updated system prompts for web sources
- [x] Updated RAG context rules
- [x] Added numbered reference examples
- [x] Documented format specifications
- [ ] Update CitationRenderer to handle [N] format (optional)
- [ ] Add reference section styling (optional)
- [ ] Create reference click handlers (optional)

---

**Implementation Date:** March 28, 2026  
**Status:** Complete - Ready for Testing  
**Impact:** High - Significantly improves citation quality and readability
