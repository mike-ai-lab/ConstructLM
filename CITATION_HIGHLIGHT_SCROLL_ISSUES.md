# Citation Highlighting & Auto-Scrolling Issues

## Problem Summary
Auto-scrolling and highlighting in citation popups and document viewers are inconsistent across different file types (Markdown, Excel, CSV, PDF). Sometimes highlights appear but don't auto-scroll, other times neither highlighting nor scrolling works.

## Root Causes Identified

### 1. **Timing Issues with DOM Updates**
- Different viewers use different timing mechanisms:
  - `TextContextViewer.tsx`: Uses `requestAnimationFrame()` (instant)
  - `MarkdownViewer.tsx`: Uses `setTimeout(..., 100)` (100ms delay)
  - `PdfViewer.tsx`: No auto-scroll implemented for highlights
  - `ExcelViewer.tsx` & `CsvViewer.tsx`: No auto-scroll implemented

### 2. **Inconsistent Highlight Class Names**
- `TextContextViewer.tsx`: Uses `.highlighted-row` and `.highlight-target`
- `MarkdownViewer.tsx`: Uses `.highlight-target` only
- PDF: Uses inline styles on dynamically created divs (no class)
- Excel/CSV: Uses `.highlighted-row` only

### 3. **Text Normalization Inconsistencies**
Different normalization strategies across viewers:
```typescript
// TextContextViewer (Excel/CSV)
const decodeHtmlEntities = (text: string) => {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // ... etc
};

// MarkdownViewer
const normalizeForSearch = (text: string) => {
  return text
    .replace(/<[^>]+>/g, '') // Remove ALL HTML tags
    .replace(/&#39;/g, "'")
    // ... different approach
};
```

### 4. **PDF Highlighting Has No Auto-Scroll**
`PdfViewer.tsx` renders highlights but never scrolls to them. The `renderHighlights()` function creates highlight divs but there's no `scrollIntoView()` call.

## Files Responsible

### Core Citation System
1. **`components/CitationRenderer/components/CitationPopup.tsx`**
   - Manages the popup window
   - Delegates to specific viewers
   - No scrolling logic here

2. **`components/CitationRenderer/components/TextContextViewer.tsx`**
   - Handles Excel, CSV, and Markdown in popup
   - ✅ Has auto-scroll for Excel/CSV
   - ✅ Has auto-scroll for Markdown
   - ⚠️ Uses `requestAnimationFrame()` which may be too fast

### Document Viewers (Full View)
3. **`components/DocumentViewer/PdfViewer.tsx`**
   - ❌ NO auto-scroll implemented
   - ✅ Has highlighting via `renderHighlights()`
   - Missing: `scrollIntoView()` after highlighting

4. **`components/DocumentViewer/MarkdownViewer.tsx`**
   - ✅ Has auto-scroll with 100ms delay
   - ✅ Has highlighting
   - Uses `.highlight-target` class

5. **`components/DocumentViewer/ExcelViewer.tsx`**
   - ❌ NO auto-scroll implemented
   - Has `scrollIntoView()` code but may not trigger
   - Uses `#excel-highlight-row` ID

6. **`components/DocumentViewer/CsvViewer.tsx`**
   - Same as ExcelViewer

7. **`components/DocumentViewer/TextViewer.tsx`**
   - Has basic scroll logic
   - Uses `#text-highlight-match` ID

### Supporting Files
8. **`services/highlightService.ts`**
   - Only manages highlight storage
   - NOT responsible for rendering or scrolling

## Specific Issues by File Type

### PDF
**Problem:** Highlights render but never scroll
**Location:** `components/DocumentViewer/PdfViewer.tsx`
**Fix Needed:** Add scroll logic after `renderHighlights()` completes

```typescript
// In renderHighlights(), after creating highlight divs:
if (highlightLayerRef.current?.firstChild) {
  setTimeout(() => {
    highlightLayerRef.current?.firstChild?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  }, 100);
}
```

### Excel/CSV
**Problem:** Inconsistent scrolling in full viewer
**Location:** `components/DocumentViewer/ExcelViewer.tsx`
**Issue:** Scroll logic exists but may not trigger due to timing

```typescript
// Current code (line 15-19):
const rowEl = document.getElementById('excel-highlight-row');
if (rowEl) {
  rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}
```

**Fix Needed:** Add delay and ensure element exists:
```typescript
useEffect(() => {
  if (highlightQuote) {
    setTimeout(() => {
      const rowEl = document.getElementById('excel-highlight-row');
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200); // Increased delay
  }
}, [highlightQuote]);
```

### Markdown
**Problem:** Sometimes fails to find quote due to HTML encoding
**Location:** `components/DocumentViewer/MarkdownViewer.tsx`
**Issue:** Quote matching fails when content has HTML entities

**Current normalization:**
```typescript
const normalizeForSearch = (text: string) => {
  return text
    .replace(/<[^>]+>/g, '') // Remove ALL HTML tags
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    // ... incomplete entity list
};
```

**Fix Needed:** Use comprehensive HTML entity decoder

## Recommended Fixes

### 1. Standardize Timing (Priority: HIGH)
Create a unified scroll utility:

```typescript
// utils/scrollUtils.ts
export const scrollToHighlight = (
  containerRef: React.RefObject<HTMLElement>,
  selector: string,
  delay: number = 150
) => {
  setTimeout(() => {
    const element = containerRef.current?.querySelector(selector);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      return true;
    }
    return false;
  }, delay);
};
```

### 2. Standardize Highlight Classes (Priority: HIGH)
Use consistent class names across all viewers:
- `.citation-highlight` - for the highlighted element
- `.citation-highlight-target` - for scroll target

### 3. Fix PDF Auto-Scroll (Priority: CRITICAL)
Add scroll logic to `PdfViewer.tsx` after highlights render

### 4. Increase Delays (Priority: MEDIUM)
Change all `requestAnimationFrame()` to `setTimeout(..., 150-200ms)` to ensure DOM is ready

### 5. Unified Text Normalization (Priority: MEDIUM)
Create a shared normalization function that handles:
- HTML entities
- Whitespace
- Special characters
- Case sensitivity

```typescript
// utils/textNormalization.ts
export const normalizeForMatching = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  const decoded = textarea.value;
  
  return decoded
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
};
```

## Testing Checklist

After fixes, test each scenario:
- [ ] PDF citation popup - highlight + scroll
- [ ] PDF full viewer - highlight + scroll
- [ ] Excel citation popup - highlight + scroll
- [ ] Excel full viewer - highlight + scroll
- [ ] CSV citation popup - highlight + scroll
- [ ] CSV full viewer - highlight + scroll
- [ ] Markdown citation popup - highlight + scroll
- [ ] Markdown full viewer - highlight + scroll
- [ ] Text file - highlight + scroll
- [ ] Citations with special characters
- [ ] Citations with HTML entities
- [ ] Citations spanning multiple lines


