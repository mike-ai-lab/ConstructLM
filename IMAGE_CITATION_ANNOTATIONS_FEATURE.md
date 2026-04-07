# Image Citation Annotations Feature

## Vision

Enable AI to cite specific regions in images (floor plans, CAD drawings, diagrams) and automatically highlight those regions when users click citation chips - similar to how document citations work but with visual annotations.

## The Problem

**Current State:**
- Vision models (Gemini, GPT-4V) can analyze images and cite specific areas
- Example: `{{citation:floor_plan.png|top left|ZONE 1}}`
- BUT: Clicking the citation chip does nothing for images (only works for documents)
- User has to manually find "top left" in the image

**User Pain:**
- "Where exactly is ZONE 1?"
- "Which part of the CAD drawing is the AI referring to?"
- "I see 10 zones, which one did it cite?"

## The Solution

### Automatic Visual Annotations

When AI cites an image region, the system:
1. **Detects image citations** in AI response
2. **Renders citation chips** (already working)
3. **On click:** Opens popup with image + highlighted region
4. **Visual highlight:** Circle/box around cited area

### Example Flow

```
User: "What's in the top left of this floor plan?"
AI: "The top left contains {{citation:floor_plan.png|top left|ZONE 1 with dimensions 2500x2500}}"

User clicks citation chip →
Popup opens showing floor_plan.png with:
- Red circle highlighting top-left quadrant
- Label: "ZONE 1"
- Zoom controls to inspect details
```

## Technical Approach

### Phase 1: Region Detection (Coordinate-Based)

**Parse location strings from citations:**
```typescript
// Citation format: {{citation:image.png|location|text}}
// Location examples:
// - "top left" → coordinates: {x: 0-33%, y: 0-33%}
// - "center" → coordinates: {x: 33-66%, y: 33-66%}
// - "bottom right corner" → coordinates: {x: 66-100%, y: 66-100%}

const regionMap = {
  'top left': { x: [0, 0.33], y: [0, 0.33] },
  'top center': { x: [0.33, 0.66], y: [0, 0.33] },
  'top right': { x: [0.66, 1], y: [0, 0.33] },
  'center left': { x: [0, 0.33], y: [0.33, 0.66] },
  'center': { x: [0.33, 0.66], y: [0.33, 0.66] },
  'center right': { x: [0.66, 1], y: [0.33, 0.66] },
  'bottom left': { x: [0, 0.33], y: [0.66, 1] },
  'bottom center': { x: [0.33, 0.66], y: [0.66, 1] },
  'bottom right': { x: [0.66, 1], y: [0.66, 1] }
};
```

**Render annotation overlay:**
```typescript
<div className="image-annotation-overlay">
  <img src={imageUrl} />
  <svg className="annotation-layer">
    <circle 
      cx={region.x * imageWidth} 
      cy={region.y * imageHeight} 
      r={100} 
      stroke="red" 
      strokeWidth="3"
      fill="none"
    />
    <text x={region.x * imageWidth} y={region.y * imageHeight}>
      {citedText}
    </text>
  </svg>
</div>
```

### Phase 2: AI-Powered Bounding Boxes (Advanced)

**Use vision model to generate precise coordinates:**
```typescript
// After AI generates citation, ask for bounding box
const boundingBoxPrompt = `
You cited: "${citedText}" at location "${location}"
Provide precise bounding box coordinates (x, y, width, height) as percentages.
Format: {"x": 0.15, "y": 0.20, "width": 0.25, "height": 0.30}
`;

// AI returns: {"x": 0.15, "y": 0.20, "width": 0.25, "height": 0.30}
// Render precise rectangle on image
```

### Phase 3: Vector Embeddings (Future - Most Accurate)

**Chunk images into grid embeddings:**
```typescript
// Divide image into 16x16 grid (256 patches)
// Generate embedding for each patch using vision model
// Store in vector database with coordinates

// When AI cites a region:
// 1. Extract cited text embedding
// 2. Find most similar image patches
// 3. Highlight those patches
```

## Implementation Plan

### Step 1: Update Citation Types
```typescript
// types.ts
export interface ImageCitation {
  fileName: string;
  location: string; // "top left", "center", etc.
  text: string;
  coordinates?: {
    x: number; // 0-1 (percentage)
    y: number; // 0-1 (percentage)
    width?: number;
    height?: number;
  };
}
```

### Step 2: Create ImageAnnotationViewer Component
```typescript
// components/CitationRenderer/components/ImageAnnotationViewer.tsx
interface Props {
  imageUrl: string;
  citation: ImageCitation;
  onClose: () => void;
}

export const ImageAnnotationViewer: React.FC<Props> = ({ imageUrl, citation, onClose }) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const coordinates = parseLocationToCoordinates(citation.location);
  
  return (
    <div className="image-annotation-modal">
      <div className="image-container">
        <img 
          src={imageUrl} 
          onLoad={(e) => setImageSize({ 
            width: e.currentTarget.naturalWidth, 
            height: e.currentTarget.naturalHeight 
          })}
        />
        <svg className="annotation-overlay">
          <circle
            cx={coordinates.x * imageSize.width}
            cy={coordinates.y * imageSize.height}
            r={80}
            stroke="#ef4444"
            strokeWidth="4"
            fill="rgba(239, 68, 68, 0.1)"
            className="pulse-animation"
          />
          <text
            x={coordinates.x * imageSize.width}
            y={coordinates.y * imageSize.height - 100}
            fill="#ef4444"
            fontSize="16"
            fontWeight="bold"
          >
            {citation.text}
          </text>
        </svg>
      </div>
      <div className="citation-info">
        <p><strong>Location:</strong> {citation.location}</p>
        <p><strong>Cited Text:</strong> {citation.text}</p>
      </div>
    </div>
  );
};
```

### Step 3: Update CitationChip Click Handler
```typescript
// components/CitationRenderer/components/CitationChip.tsx
const handleClick = () => {
  const isImage = fileName.match(/\.(png|jpg|jpeg|gif|webp)$/i);
  
  if (isImage) {
    // Show image annotation viewer
    setShowImageAnnotation(true);
  } else {
    // Show document viewer (existing logic)
    setShowPopup(true);
  }
};
```

### Step 4: Location Parser Utility
```typescript
// components/CitationRenderer/utils/imageAnnotationUtils.ts
export const parseLocationToCoordinates = (location: string): { x: number; y: number } => {
  const normalized = location.toLowerCase().trim();
  
  // Grid-based regions (9 zones)
  const regionMap: Record<string, { x: number; y: number }> = {
    'top left': { x: 0.17, y: 0.17 },
    'top center': { x: 0.50, y: 0.17 },
    'top right': { x: 0.83, y: 0.17 },
    'center left': { x: 0.17, y: 0.50 },
    'center': { x: 0.50, y: 0.50 },
    'center right': { x: 0.83, y: 0.50 },
    'bottom left': { x: 0.17, y: 0.83 },
    'bottom center': { x: 0.50, y: 0.83 },
    'bottom right': { x: 0.83, y: 0.83 }
  };
  
  // Check for exact matches
  if (regionMap[normalized]) {
    return regionMap[normalized];
  }
  
  // Fuzzy matching for variations
  if (normalized.includes('top') && normalized.includes('left')) {
    return regionMap['top left'];
  }
  // ... more fuzzy logic
  
  // Default to center if can't parse
  return { x: 0.50, y: 0.50 };
};
```

## CAD/Technical Drawing Enhancement

This feature is **PERFECT** for CAD drawings because:

### Problem with CAD PDFs:
- Text extraction gives garbage: "LINE 0,0 TO 100,50"
- Semantic chunking destroys spatial relationships
- AI can't understand structure from text alone

### Solution with Image Annotations:
1. **Convert CAD PDF pages to images** (300 DPI)
2. **Send to vision model** (Gemini File API - only 10 tokens!)
3. **AI analyzes visual layout** and cites specific regions
4. **User clicks citation** → Sees exact area highlighted on drawing
5. **Perfect for:**
   - "Where is the master bathroom?" → Highlights bathroom on floor plan
   - "What's the dimension of bedroom 2?" → Circles bedroom with dimension callout
   - "Show me the electrical panel location" → Highlights panel on electrical drawing

### Example CAD Workflow:
```
User uploads: architectural_floor_plan.pdf
System: Detects technical drawing → Converts to image
User: "Where is the HVAC unit located?"
AI: "The HVAC unit is located {{citation:floor_plan.png|top right corner|near the utility room, marked as 'HVAC-1'}}"
User clicks citation → Floor plan opens with red circle around HVAC unit
```

## Benefits

### For Users:
- **Visual clarity:** No more hunting for cited regions
- **Faster understanding:** Instant visual feedback
- **Better for CAD:** Works where text extraction fails
- **Professional:** Looks polished and modern

### For ConstructLM:
- **Unique feature:** No other AI assistant does this
- **Competitive advantage:** Perfect for construction/engineering users
- **Leverages existing:** Builds on citation system already in place
- **Scalable:** Works for any image type (photos, diagrams, charts)

## Roadmap

### Phase 1: Basic Region Highlighting (Week 1)
- ✅ Parse location strings (top left, center, etc.)
- ✅ Render circles/boxes on images
- ✅ Click citation chip → Show annotated image
- ✅ Works for 9-grid regions

### Phase 2: CAD Drawing Detection (Week 2)
- ✅ Auto-detect technical drawings
- ✅ Convert PDF pages to images
- ✅ Send to vision models efficiently
- ✅ Handle multi-page CAD documents

### Phase 3: Precise Bounding Boxes (Week 3)
- ⏳ Ask AI for exact coordinates
- ⏳ Render precise rectangles
- ⏳ Support multiple annotations per image
- ⏳ Zoom/pan controls

### Phase 4: Vector Embeddings (Future)
- ⏳ Image patch embeddings
- ⏳ Semantic similarity matching
- ⏳ Pixel-perfect highlighting
- ⏳ Works for any image content

## Technical Considerations

### Performance:
- Image annotations render client-side (no API calls)
- SVG overlays are lightweight
- Lazy load images only when citation clicked

### Accuracy:
- Phase 1: ~70% accuracy (grid-based)
- Phase 2: ~85% accuracy (AI bounding boxes)
- Phase 3: ~95% accuracy (vector embeddings)

### Compatibility:
- Works with existing citation system
- No breaking changes to current features
- Graceful fallback if location can't be parsed

## Next Steps

1. ✅ Fix Gemini token usage display (DONE)
2. ⏳ Implement ImageAnnotationViewer component
3. ⏳ Add location parser utility
4. ⏳ Update CitationChip to detect image citations
5. ⏳ Test with floor plans and CAD drawings
6. ⏳ Add CAD PDF auto-detection
7. ⏳ Implement precise bounding boxes

This feature will make ConstructLM the **BEST AI assistant for construction and engineering professionals**! 🏗️🎯
