# Citation File Matching Fix

## Problem
When clicking on citation chips in AI responses, the app was showing "file not found" errors even though the PDF was successfully uploaded and rendering correctly in the sources panel.

## Root Cause
The file matching logic in `CitationChip.tsx` was using a strict string comparison (`f.name === fileName`) which failed when:
- File names had different casing (e.g., "Document.pdf" vs "document.pdf")
- Citations referenced files without extensions
- Minor whitespace differences existed
- File names were truncated in citations

## Solution
Implemented robust file matching in `CitationChip.tsx` with three levels of matching:

1. **Exact Match (case-insensitive)**: Compares normalized lowercase file names
2. **Extension-agnostic Match**: Compares file names without extensions
3. **Partial Match**: Handles cases where citation might have truncated names

### Changes Made

#### File: `components/CitationRenderer/components/CitationChip.tsx`

**Before:**
```typescript
const fileExists = isUrl ? true : files.find(f => f.name === fileName);
```

**After:**
```typescript
const fileExists = isUrl ? true : files.find(f => {
  const normalizedFileName = fileName.toLowerCase().trim();
  const normalizedFilename = f.name.toLowerCase().trim();
  
  // Exact match
  if (normalizedFilename === normalizedFileName) return true;
  
  // Match without extension
  const fileNameWithoutExt = normalizedFileName.replace(/\.[^.]+$/, '');
  const fNameWithoutExt = normalizedFilename.replace(/\.[^.]+$/, '');
  if (fileNameWithoutExt === fNameWithoutExt) return true;
  
  // Partial match (citation might have truncated name)
  if (normalizedFilename.includes(normalizedFileName) || normalizedFileName.includes(normalizedFilename)) return true;
  
  return false;
});
```

Also updated `handleOpenFull()` to use the same robust matching when finding the actual file to open, ensuring the correct file name is passed to `onViewDocument()`.

## Testing
After this fix:
- ✅ Citations work with case-insensitive file names
- ✅ Citations work without file extensions
- ✅ Citations work with partial file names
- ✅ Re-uploaded files are properly matched
- ✅ PDF preview opens correctly when clicking citation chips

## Impact
- No breaking changes
- Backward compatible with existing citations
- Improves user experience by making citation matching more forgiving
- Prevents false "file not found" errors
