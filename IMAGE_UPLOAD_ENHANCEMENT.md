# Image Upload Enhancement Implementation

## Overview
Enhanced the chat input field with visual image upload capabilities, including thumbnails, collapsible panel, clipboard support, and token estimation.

## Features Implemented

### 1. Visual Image Thumbnails
- Images display as visual previews instead of file names
- 48x48px thumbnail size with proper aspect ratio
- Smooth rounded corners and hover effects

### 2. Collapsible Image Panel
- Expandable/collapsible panel when multiple images are attached
- Shows image count and total estimated tokens
- Clean, organized layout above the input field

### 3. Individual Image Information
Each image displays:
- Thumbnail preview
- File name
- File size (KB/MB)
- Estimated token count (~500-1500 tokens per image)
- Remove (X) button for individual deletion

### 4. Clipboard Support (Ctrl+V)
- Paste images directly from clipboard
- Automatically detects image data in clipboard
- Supports multiple images pasted at once
- Works seamlessly with text pasting

### 5. Drag & Drop Enhancement
- Separates images from documents automatically
- Images go to image panel (no @mention)
- Documents go to file sidebar (with @mention)
- Visual feedback during drag operations

### 6. Token Estimation
- Smart token calculation based on image size
- Base tokens: ~500 per image
- Size-based adjustment: up to +1000 tokens for large images
- Total token count displayed in panel header

## Files Modified

### New Files
- `App/components/ImageUploadPanel.tsx` - Image panel component with thumbnails

### Modified Files
- `App/hooks/useInputState.ts` - Added uploadedImages state
- `App/handlers/inputHandlers.ts` - Added image upload, remove, and paste handlers
- `App/components/FloatingInput.tsx` - Integrated image panel and handlers
- `App/handlers/messageHandlers.ts` - Added image processing and sending
- `App.tsx` - Wired up all new handlers and state

## Technical Details

### Image Data Flow
1. User uploads/pastes image → `handleImageUpload`
2. Create `UploadedImage` object with preview URL and metadata
3. Store in `uploadedImages` state
4. Display in `ImageUploadPanel` component
5. On send → Convert to `ProcessedFile` format
6. Pass to LLM service with `fileHandle` for base64 conversion
7. Clear images and revoke blob URLs after sending

### Token Estimation Algorithm
```typescript
const baseTokens = 500; // Base cost for image processing
const sizeInMB = file.size / (1024 * 1024);
const sizeTokens = Math.min(sizeInMB * 100, 1000); // Up to 1000 extra
const totalTokens = baseTokens + sizeTokens;
```

### Image Support Detection
- Uses existing `model.supportsImages` flag from model registry
- Compatible models: Gemini, GPT-4, Claude, Qwen VL
- Images automatically filtered for non-vision models

## User Experience

### Upload Methods
1. Click "+" button → Select images from file picker
2. Drag & drop images onto input field
3. Paste images with Ctrl+V

### Visual Feedback
- Drag over: Blue border and bounce animation
- Uploading: Smooth fade-in of thumbnails
- Hover: Subtle background highlight
- Remove: Red hover effect on X button

### Collapsible Panel
- Auto-expands when images added
- Click header to collapse/expand
- Shows count and token estimate in header
- Scrollable if many images (max height: 300px)

## Integration with Existing Features

### File Upload System
- Images separated from documents automatically
- Documents trigger @mention, images don't
- Both can be uploaded simultaneously
- File parser handles image type detection

### Message System
- Images converted to ProcessedFile format
- Sent alongside text and document context
- LLM service handles base64 encoding
- Blob URLs cleaned up after sending

### RAG System
- Images bypass RAG embedding (not indexed)
- Documents still processed for semantic search
- Token counts include both images and context
- Context warning includes image tokens

## Browser Compatibility
- Clipboard API: Chrome 76+, Firefox 87+, Edge 79+
- Blob URLs: All modern browsers
- File API: Universal support
- Drag & Drop: Universal support

## Performance Considerations
- Blob URLs created on-demand, revoked after use
- No image processing until send (lazy loading)
- Thumbnails use native browser rendering
- Token estimation is instant (no API calls)

## Future Enhancements
- Image preview modal on thumbnail click
- Image editing (crop, rotate, annotate)
- Batch image operations
- Image compression before sending
- OCR text extraction from images
