# Image Citation Annotations - Quick Start Guide

## What We're Building

**Revolutionary Feature:** AI can cite specific regions in images (floor plans, CAD drawings, diagrams) with visual highlighting - just like it cites text in documents.

**Example:**
```
User: "Where is the master bathroom?"
AI: "The master bathroom is {{citation:floor_plan.png|region:top-right|adjacent to bedroom 2}}"
User clicks [1] → Floor plan opens with top-right region highlighted in red
```

---

## Why This Matters

1. **NO other AI assistant does this** - First-mover advantage
2. **Perfect for construction/engineering** - Your target audience
3. **Solves CAD PDF problem** - Where text extraction fails completely
4. **Leverages existing system** - Minimal refactoring, extends current citation logic

---

## Implementation Phases

### Phase 1: Grid-Based (MVP - 2-3 days) ✅ RECOMMENDED START

**Citation Format:**
```
{{citation:image.png|region:top-left|Description}}
```

**9-Zone Grid:**
```
┌─────────┬─────────┬─────────┐
│top-left │  top    │top-right│
├─────────┼─────────┼─────────┤
│  left   │ center  │  right  │
├─────────┼─────────┼─────────┤
│bot-left │ bottom  │bot-right│
└─────────┴─────────┴─────────┘
```

**Pros:** Simple, fast, works immediately, ~70% accuracy

---

### Phase 2: Bounding Boxes (Advanced - 1 week)

**Citation Format:**
```
{{citation:image.png|bbox:15,20,35,45|Description}}
```

**Pros:** Precise highlighting (~85% accuracy), professional appearance

---

### Phase 3: Vector Embeddings (Future - 2 weeks)

**Citation Format:**
```
{{citation:image.png|embedding:abc123|Description}}
```

**Pros:** Semantic understanding (~95% accuracy), handles rotated images

---

## Files to Modify

### 1. Citation Parser
**File:** `components/CitationRenderer/utils/citationUtils.ts`
- Add `isImageCitation()` function
- Add `parseImageRegion()` function
- Add `gridToCoords()` mapping

### 2. Citation Chip
**File:** `components/CitationRenderer/components/CitationChip.tsx`
- Detect image citations
- Add `onViewImageAnnotation` handler
- Pass image data to viewer

### 3. New Component
**File:** `components/ImageAnnotationViewer/index.tsx`
- Full-screen image viewer
- SVG overlay for region highlighting
- Zoom, rotation, navigation controls
- Based on mockup design

### 4. App Integration
**File:** `App.tsx`
- Add `imageAnnotationState` state
- Add `handleViewImageAnnotation` handler
- Render `<ImageAnnotationViewer />` when active

### 5. System Prompt
**File:** `services/llmService.ts`
- Add image citation instructions
- Teach AI the grid zones
- Provide examples

---

## CAD Drawing Workflow

### Problem
- CAD PDFs have garbage text extraction (coordinates, not semantic)
- Semantic chunking fails (spatial relationships lost)
- AI gets confused by disconnected coordinate data

### Solution
```
CAD PDF → Detect technical drawing → Convert to images → AI cites regions
```

**New Files:**
- `services/cadPdfConverter.ts` - PDF → Image conversion
- Update `App/handlers/fileHandlers.ts` - Auto-detect CAD drawings

**User Experience:**
```
1. User uploads "floor_plan.pdf"
2. App: "🏗️ Technical drawing detected! Convert to images?"
3. User: "Yes"
4. App converts each page to PNG
5. User: "Where is the master bathroom?"
6. AI: "Located {{citation:floor_plan_page1.png|region:top-right|adjacent to bedroom 2}}"
7. User clicks [1] → Image opens with region highlighted
```

---

## Testing Checklist

- [ ] Grid-based citation renders correctly
- [ ] Click citation chip → Image viewer opens
- [ ] Region highlighted with red rectangle
- [ ] Multiple citations navigate correctly
- [ ] Zoom/rotation controls work
- [ ] CAD PDF auto-detection works
- [ ] PDF → Image conversion works
- [ ] Mobile responsive

---

## Success Criteria

**User Experience:**
- Users understand spatial references in images
- Citations open smoothly (<100ms)
- Highlighting is accurate and visible

**Technical:**
- <500ms to convert CAD PDF page
- <50MB storage per image
- 70%+ accuracy for grid citations

**Business:**
- Unique feature (no competitors have this)
- Positive feedback from construction professionals
- Increased engagement with CAD drawings

---

## Next Steps

1. **Review plan** - Read full implementation plan
2. **Start Phase 1** - Grid-based citations (2-3 days)
3. **Test with real CAD drawings** - Get user feedback
4. **Iterate** - Improve based on usage
5. **Phase 2** - Add bounding boxes (1 week)

---

## Key Insights from Mockup

Your mockup (`IMAGE-ANNOTATION.TXT`) shows:

✅ **Clean UI** - Minimal, floating controls (not bulky)
✅ **SVG Overlay** - Rectangle highlights with smooth transitions
✅ **Navigation** - Previous/Next between citations
✅ **Context Card** - Shows citation details
✅ **Zoom Controls** - Essential for detailed drawings

**We'll implement this exact design!**

---

## Questions Before Starting?

1. **Start with Phase 1 (Grid)?** - Recommended for MVP
2. **CAD PDF auto-conversion?** - Should we prompt user or auto-convert?
3. **Image storage?** - IndexedDB or keep in memory?
4. **Mobile support?** - Touch gestures for zoom/pan?

Ready to implement when you give the green light! 🚀
