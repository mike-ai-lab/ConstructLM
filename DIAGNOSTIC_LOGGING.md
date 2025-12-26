# RAG Pipeline Diagnostic Logging System

## Overview
Comprehensive diagnostic logging has been added to track the entire RAG pipeline from file ingestion to final LLM response. This is for debugging and inspection purposes only.

## How to Use

### 1. Enable Diagnostic Logging
The diagnostic logger is enabled by default. All operations are automatically logged to the browser console and stored in memory.

### 2. Perform a Test Run
1. Upload a file (PDF, Excel, Markdown, etc.)
2. Wait for embedding to complete
3. Send a query that uses the uploaded file
4. Wait for the response

### 3. Download Diagnostic Logs
1. Click the **Logs** button (FileText icon) in the app header
2. Click the purple **"Diagnostic Logs"** button in the modal header
3. A file named `diagnostic-logs-TIMESTAMP.txt` will be downloaded

## What Gets Logged

### 1. INGESTION & EXTRACTION
- File name, type, size
- Page count (PDF) or sheet count (Excel)
- Extraction method used
- Output unit type

### 2. UNIT/CHUNK CREATION
- Every chunk created before embedding
- Unit ID, source file, chunk index
- Character count, token count
- Chunking strategy used
- Text preview (first 200 chars)
- Full metadata

### 3. EMBEDDING & INDEXING
- Embedding model name and version
- Embedding dimension
- Total units embedded
- Storage backend used

### 4. QUERY & RETRIEVAL
- Raw user query
- Embedding model used
- Top-K requested
- All retrieved results with:
  - Rank
  - Unit ID
  - Similarity score
  - Source file
  - Text preview (first 300 chars)

### 5. LLM CONTEXT ASSEMBLY
- System prompt (full text)
- User prompt (full text)
- Number of units included
- Total characters and tokens
- Each context unit with:
  - Unit ID
  - Order in prompt
  - Character count
  - Source file
  - Chunk index

### 6. FINAL ANSWER
- Model name
- Final answer text
- Answer length
- Thinking text (if applicable)
- Usage stats
- Sources used

## Log Format

All logs are in JSON format with clear section headers:

```
================================================================================
[TIMESTAMP] SECTION_NAME
================================================================================
{
  "field": "value",
  ...
}
```

## Disabling Diagnostic Logging

To disable diagnostic logging (for production):

```typescript
import { diagnosticLogger } from './services/diagnosticLogger';

diagnosticLogger.disable();
```

## Notes

- Logs are stored in memory only (not persisted to disk)
- Logs are cleared when the page is refreshed
- Large files will generate large log files
- This is for debugging only - not for production use
- All data is logged RAW without aggregation or summarization

## Troubleshooting

If logs are empty:
1. Make sure you've performed a complete workflow (upload → embed → query)
2. Check browser console for any errors
3. Verify diagnostic logger is enabled: `diagnosticLogger.enable()`

## Example Workflow

1. Upload `document.pdf`
2. Wait for "Embedding complete" message
3. Send query: "What is the summary?"
4. Wait for response
5. Open Logs modal
6. Click "Diagnostic Logs" button
7. Inspect the downloaded file

You should see:
- File ingestion details
- All chunks created
- Embedding completion
- Query processing
- Retrieved chunks with scores
- Full LLM prompt
- Final answer
