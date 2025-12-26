# Activity Log Issues Found & Fixed

## Issues Identified in `activity-2025-12-26.log`

### 1. ❌ Missing File Names in filesUsed Field
**Problem**: Lines showed `filesUsed: none` even when files were selected and used
```
[ACTION] [MESSAGE] Message sent | filesUsed: none  // BUT filesSelected: 1, filesCount: 1
```

**Root Cause**: Using `fileNames` (from context manager) instead of actual selected file names

**Fix Applied**: Changed to use `selectedFiles.map(f => f.name)` for accurate file name logging

### 2. ❌ Semantic Search Not Logged
**Problem**: No `[SEARCH]` category logs appeared, only RAG searches

**Root Cause**: Semantic search logging was placed before chunks array initialization, causing it to be skipped

**Fix Applied**: Moved `logSemanticSearch()` to end of function with actual results count

### 3. ⚠️ Empty API Error Message
**Problem**: Line 19 shows `API Error: ` with no details

**Note**: This is a Gemini API issue, not a logging issue. The API returned an error without a message.

## Expected Log Output After Fixes

```
[ACTION] [MESSAGE] Message sent | filesUsed: output.pdf
[ACTION] [SEARCH] Semantic search executed | queryLength: 12 | resultsCount: 1
[ACTION] [REQUEST] LLM request sent | filesCount: 1
```

## Summary
- ✅ File names now properly logged
- ✅ Semantic searches now tracked
- ✅ More accurate activity tracking
