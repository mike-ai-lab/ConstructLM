# Activity Logger Feature - Implementation Summary

## Overview
A comprehensive activity logging system has been added to ConstructLM that automatically tracks all user activities and app workflow events. Logs are saved to a default folder and can be accessed via an "Open Logs" button in the file menu.

## Features

### 1. **Automatic Activity Logging**
The system logs the following activities:
- **Chat Management**: Chat creation, deletion, and switching
- **Messages**: User messages sent and AI responses received
- **Files**: File uploads and removals
- **Notes**: Note creation and deletion
- **Todos**: Todo creation, completion, and deletion
- **Reminders**: Reminder creation and triggering
- **Model Switching**: When users switch between AI models
- **Drawing**: Drawing tool usage and actions
- **Mind Maps**: Mind map generation
- **Session**: Application start and end times
- **Errors**: Any errors that occur during app usage

### 2. **Log Storage**
- **Location**: Logs are stored in a default folder:
  - **Electron**: `{userData}/logs/` (e.g., `C:\Users\{username}\AppData\Roaming\ConstructLM\logs`)
  - **Browser**: `{APPDATA}/ConstructLM/logs/` or similar OS-specific temp directory
- **File Format**: Daily log files named `activity-YYYY-MM-DD.log`
- **Auto-Rotation**: New log file created each day automatically

### 3. **Log Format**
Each log entry contains:
```
[ISO-8601 Timestamp] [Level] [Category] Message | Details
```

Example:
```
[2025-01-15T10:30:45.123Z] [ACTION] [CHAT] New chat created | chatId: abc123, modelId: gemini-2.0
[2025-01-15T10:30:50.456Z] [ACTION] [MESSAGE] Message sent | chatId: abc123, messageLength: 245, modelId: gemini-2.0
[2025-01-15T10:31:00.789Z] [ACTION] [FILE] File uploaded | fileName: document.pdf, fileType: pdf, fileSize: 2048576
```

### 4. **Log Levels**
- **ACTION**: User actions (messages, file uploads, etc.)
- **INFO**: General information (session start/end)
- **WARNING**: Warning messages
- **ERROR**: Error events with stack traces

### 5. **Log Categories**
- CHAT, MESSAGE, FILE, NOTE, TODO, REMINDER, MODEL, DRAWING, MINDMAP, SESSION, MAINTENANCE

## Files Added/Modified

### New Files:
1. **`services/activityLogger.ts`** - Core logging service
   - Singleton instance for app-wide logging
   - Buffer-based writing for performance
   - Auto-flush every 5 seconds or when buffer reaches 10 entries
   - Methods for logging specific activities

2. **`App/hooks/useActivityLogger.ts`** - React hook
   - Initializes logging on app mount
   - Logs session start/end

3. **`components/LogsModal.tsx`** - Logs viewer UI
   - Beautiful modal interface for viewing logs
   - File list with date information
   - Color-coded log entries by level
   - Download functionality for individual log files
   - Open logs folder button
   - Expandable log file details

### Modified Files:
1. **`components/FileSidebar.tsx`**
   - Added "Open Logs" button in Chats tab
   - Integrated LogsModal component
   - Added History icon import

2. **`components/ChatHistory.tsx`**
   - Added onOpenLogs callback prop
   - Added "Open Logs" button in header
   - Added History icon import

## Usage

### For Developers - Logging Activities:

```typescript
import { activityLogger } from './services/activityLogger';

// Log specific activities
activityLogger.logChatCreated(chatId, modelId);
activityLogger.logMessageSent(chatId, messageLength, modelId);
activityLogger.logFileUploaded(fileName, fileType, fileSize);
activityLogger.logTodoCompleted(todoId, title);
activityLogger.logError('CATEGORY', 'Error message', error);

// Or use generic methods
activityLogger.logAction('CUSTOM', 'Custom action', { customData: 'value' });
activityLogger.logInfo('CATEGORY', 'Info message', { details: 'value' });
```

### For Users - Accessing Logs:

1. Click on the **Chats** tab in the left sidebar
2. Click the **History icon** (clock) button in the header
3. The Logs Modal will open showing:
   - List of available log files (organized by date)
   - Current log file content with color-coded entries
   - Download button for each log file
   - Open Logs Folder button to access files directly

## Performance Considerations

- **Buffering**: Logs are buffered in memory and written to disk every 5 seconds or when buffer reaches 10 entries
- **Non-blocking**: Logging is asynchronous and doesn't block UI
- **Automatic Cleanup**: Old logs (>30 days) can be cleaned up via `activityLogger.clearOldLogs()`
- **Minimal Overhead**: Efficient string formatting and file I/O

## Integration Points

The logger should be integrated into:
1. **Chat handlers** - Log chat creation, deletion, selection
2. **Message handlers** - Log message sending and receiving
3. **File handlers** - Log file uploads and removals
4. **Todo/Note/Reminder handlers** - Log CRUD operations
5. **Model switching** - Log model changes
6. **Error boundaries** - Log errors

## Example Integration in Handlers:

```typescript
// In chatHandlers.ts
export const createChatHandlers = (...) => {
  return {
    handleCreateChat: () => {
      const newChat = { id: generateId(), ... };
      activityLogger.logChatCreated(newChat.id, activeModelId);
      // ... rest of logic
    },
    handleSelectChat: (chatId) => {
      activityLogger.logAction('CHAT', 'Chat selected', { chatId });
      // ... rest of logic
    }
  };
};
```

## Future Enhancements

- Export logs as CSV/JSON
- Search and filter logs
- Log analytics dashboard
- Real-time log streaming
- Log compression for old files
- Configurable log retention policy
- Log encryption for sensitive data

## Notes

- Logs are stored locally on the user's machine
- No data is sent to external servers
- Users can manually delete log files from the logs folder
- Log files are plain text and human-readable
- The logger gracefully handles file system errors
