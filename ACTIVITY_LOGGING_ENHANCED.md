# Enhanced Activity Logging Implementation

## Overview
Comprehensive activity logging has been implemented to track all user activities throughout the application, including file uploads, message processing, LLM requests/responses, context processing, and more.

## Changes Made

### 1. Enhanced Activity Logger Service (`services/activityLogger.ts`)
Added new logging methods for detailed activity tracking:

- **File Operations:**
  - `logFileProcessingStart()` - Logs when file processing begins
  - `logFileProcessingComplete()` - Logs batch upload completion with statistics
  
- **Request/Response Tracking:**
  - `logRequestSent()` - Logs LLM request details (model, message length, files, sources)
  - `logResponseReceived()` - Logs LLM response with token usage
  
- **Context Processing:**
  - `logContextProcessing()` - Logs context selection details (tokens, files, chunks)
  - `logSemanticSearch()` - Logs semantic/keyword search operations
  - `logRAGSearch()` - Logs RAG search operations
  
- **Source Management:**
  - `logSourceAdded()` - Logs when a source URL is added
  - `logSourceFetched()` - Logs successful source content fetching
  - `logSourceDeleted()` - Logs source deletion

- **Enhanced Message Logging:**
  - Updated `logMessageSent()` to include files used
  - Updated `logMessageReceived()` to include token usage statistics

### 2. File Handlers (`App/handlers/fileHandlers.ts`)
Added comprehensive logging for file operations:
- Logs batch upload start with total file count
- Logs each file processing step with progress
- Logs skipped files with reasons (hidden, unsupported, duplicate)
- Logs successful file uploads with metadata
- Logs file processing errors
- Logs batch completion with statistics
- Logs file removal operations
- Logs document viewer opens

### 3. Message Handlers (`App/handlers/messageHandlers.ts`)
Added detailed logging for message flow:
- Logs message processing start with context details
- Logs context processing results (tokens, files, chunks)
- Logs context warnings when triggered
- Logs message sent with files used
- Logs LLM request details before sending
- Logs LLM response with token usage
- Logs errors during message processing

### 4. Chat Handlers (`App/handlers/chatHandlers.ts`)
Added logging for chat operations:
- Logs chat loading with message count and model
- Logs chat saving operations
- Logs new chat creation
- Logs chat deletion

### 5. Feature Handlers (`App/handlers/featureHandlers.ts`)
Added logging for feature usage:
- Logs snapshot captures with context
- Logs drawing tool changes
- Logs mind map generation (start, cache hit, completion)

### 6. Context Manager (`services/contextManager.ts`)
Added semantic search logging:
- Logs keyword-based search operations with query and file count

### 7. RAG Service (`services/ragService.ts`)
Added RAG search logging:
- Logs RAG search operations (currently placeholder)

### 8. App.tsx
Added comprehensive logging for:
- Model switching (tracks previous and new model)
- Source operations (add, fetch, delete)
- Logs modal state management

### 9. UI Changes

#### AppHeader Component (`App/components/AppHeader.tsx`)
- Added `FileText` icon import
- Added `onOpenLogs` prop
- Added Logs button in header toolbar (between dark mode and help buttons)
- Button shows activity logs icon with tooltip

#### App.tsx
- Added `isLogsOpen` state
- Imported `LogsModal` component
- Added logs modal rendering outside chat panel
- Positioned logs modal at root level (not suppressed in chat history)
- Added `onOpenLogs` handler to open logs modal

## Log Categories

The enhanced logging system now tracks:

1. **SESSION** - App start/stop
2. **FILE** - Upload, processing, removal, viewing
3. **MESSAGE** - User messages, AI responses
4. **REQUEST** - LLM API requests with details
5. **RESPONSE** - LLM API responses with token usage
6. **CONTEXT** - Context selection and processing
7. **SEARCH** - Semantic/keyword searches
8. **RAG** - RAG search operations
9. **SOURCE** - Web source management
10. **CHAT** - Chat creation, loading, deletion
11. **MODEL** - Model switching
12. **SNAPSHOT** - Screenshot captures
13. **DRAWING** - Drawing tool usage
14. **MINDMAP** - Mind map generation
15. **DOCUMENT** - Document viewer operations

## Log Entry Format

Each log entry includes:
- **Timestamp** - ISO format
- **Level** - INFO, ACTION, WARNING, ERROR
- **Category** - Operation category
- **Message** - Human-readable description
- **Details** - Structured data (tokens, file names, model IDs, etc.)

## Example Log Entries

```
[2025-01-25T10:30:45.123Z] [INFO] [FILE] Starting batch upload of 3 files
[2025-01-25T10:30:45.234Z] [ACTION] [FILE] Processing file | fileName: document.pdf | progress: 1/3
[2025-01-25T10:30:46.345Z] [ACTION] [FILE] File uploaded | fileName: document.pdf | fileType: application/pdf | fileSize: 1048576
[2025-01-25T10:30:47.456Z] [ACTION] [FILE] Batch upload complete | uploaded: 3 | skipped: 0 | skippedFiles: none
[2025-01-25T10:31:00.567Z] [INFO] [MESSAGE] Processing user message | messageLength: 150 | filesSelected: 3 | sourcesSelected: 0 | modelId: gemini-2.0-flash-exp
[2025-01-25T10:31:00.678Z] [ACTION] [CONTEXT] Context processing | totalTokens: 15000 | filesUsed: 3 | chunksCount: 12
[2025-01-25T10:31:00.789Z] [ACTION] [MESSAGE] Message sent | chatId: current | messageLength: 150 | modelId: gemini-2.0-flash-exp | filesUsed: document.pdf, data.csv, notes.txt
[2025-01-25T10:31:00.890Z] [ACTION] [REQUEST] LLM request sent | modelId: gemini-2.0-flash-exp | messageLength: 150 | filesCount: 3 | sourcesCount: 0
[2025-01-25T10:31:05.123Z] [ACTION] [RESPONSE] LLM response received | modelId: gemini-2.0-flash-exp | responseLength: 2500 | inputTokens: 15234 | outputTokens: 856 | totalTokens: 16090
[2025-01-25T10:31:05.234Z] [ACTION] [MESSAGE] Response received | chatId: current | responseLength: 2500 | modelId: gemini-2.0-flash-exp | inputTokens: 15234 | outputTokens: 856 | totalTokens: 16090
```

## Benefits

1. **Complete Activity Tracking** - Every user action is now logged
2. **Performance Monitoring** - Token usage and processing times tracked
3. **Debugging** - Detailed logs help identify issues
4. **Usage Analytics** - Understand how users interact with the app
5. **Audit Trail** - Complete history of operations
6. **Error Tracking** - All errors logged with context

## Logs Modal Location

The Logs Modal is now positioned:
- **Outside the chat history panel** (no longer suppressed)
- **At the root level** alongside Settings and Help modals
- **Accessible via header button** (FileText icon)
- **Positioned next to Graphics Library and Model menus** in the header toolbar

## Future Enhancements

Potential improvements:
- Add log filtering by category/level
- Add log export functionality
- Add real-time log streaming
- Add log analytics dashboard
- Add performance metrics visualization
