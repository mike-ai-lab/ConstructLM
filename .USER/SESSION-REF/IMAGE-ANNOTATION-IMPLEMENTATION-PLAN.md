# Image Citation Annotation Feature - Implementation Plan

## Executive Summary

This document outlines the implementation of **image citation annotations** - a revolutionary feature that allows AI to cite specific regions in images (floor plans, CAD drawings, diagrams) with visual highlighting, similar to how the app currently cites text in documents.

**Why This Matters:**
- **NO other AI assistant does this** - First-mover advantage
- **Perfect for construction/engineering professionals** - Target audience
- **Solves CAD PDF problem** - Where text extraction fails
- **Leverages existing citation system** - Minimal refactoring needed

---

## Current System Analysis

### Existing Citation Flow (Documents)

```typescript
// Citation format
{{citation:fileName|location|quote}}

// Example
{{citation:report.pdf|Page 3|The structural analysis shows...}}

// Renders as
[1] ← Numbered chip, clickable

// Click → Opens popup with:
- PDF page preview (if PDF)
- Text context viewer (if text/markdown)
- Quote highlighting
```

### Components Involved

1. **CitationRenderer.tsx** - Main parser, extracts citations from AI response
2. **CitationChip.tsx** - Numbered chip [1], [2], etc.
3. **CitationPopup.tsx** - Preview popup with document context
4. **citationUtils.ts** - Parsing logic, counter management

---

## Proposed Image Citation System

### Phase 1: Grid-Based Regions (MVP - 2-3 days)

**Citation Format:**
```typescript
{{citation:floor_plan.png|region:top-left|Master bedroom location}}
{{citation:diagram.jpg|region:center|Control panel}}
{{citation:cad_drawing.png|region:bottom-right|Dimension marker}}
```

**Grid System (9 zones):**
```
┌─────────┬─────────┬─────────┐
│top-left │  top    │top-right│
├─────────┼─────────┼─────────┤
│  left   │ center  │  right  │
├─────────┼─────────┼─────────┤
│bot-left │ bottom  │bot-right│
└─────────┴─────────┴─────────┘
```

**Pros:**
- Simple to implement
- No AI processing needed
- Works immediately
- ~70% accuracy for most use cases

**Cons:**
- Coarse granularity
- AI must guess which zone

---

### Phase 2: AI Bounding Boxes (Advanced - 1 week)

**Citation Format:**
```typescript
{{citation:floor_plan.png|bbox:15,20,35,45|Master bedroom}}
// bbox format: x,y,width,height (percentages)
```

**How It Works:**
1. AI analyzes image with vision model
2. AI provides bounding box coordinates
3. System draws precise rectangle on image

**Pros:**
- Precise highlighting (~85% accuracy)
- Professional appearance
- Works for complex layouts

**Cons:**
- Requires vision model support
- AI must calculate coordinates
- More complex prompt engineering

---

### Phase 3: Vector Embeddings (Future - 2 weeks)

**Citation Format:**
```typescript
{{citation:floor_plan.png|embedding:abc123|Master bedroom}}
// embedding: Vector ID for semantic search
```

**How It Works:**
1. Image chunked into tiles (e.g., 16x16 grid)
2. Each tile embedded using CLIP or similar
3. AI query embedded and matched to tiles
4. Highlight matching tiles

**Pros:**
- Semantic understanding (~95% accuracy)
- Works without explicit coordinates
- Handles rotated/scaled images

**Cons:**
- Complex implementation
- Requires CLIP model (large download)
- Processing overhead

---

## Implementation Roadmap

### Step 1: Extend Citation Parser (1 day)

**File:** `components/CitationRenderer/utils/citationUtils.ts`

```typescript
// Add image citation detection
export const isImageCitation = (fileName: string): boolean => {
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  return imageExts.some(ext => fileName.toLowerCase().endsWith(ext));
};

// Parse region from location field
export const parseImageRegion = (location: string): ImageRegion | null => {
  // Grid-based: "region:top-left"
  const gridMatch = location.match(/region:([\w-]+)/);
  if (gridMatch) {
    return { type: 'grid', zone: gridMatch[1] };
  }
  
  // Bbox-based: "bbox:15,20,35,45"
  const bboxMatch = location.match(/bbox:([\d.]+),([\d.]+),([\d.]+),([\d.]+)/);
  if (bboxMatch) {
    return {
      type: 'bbox',
      x: parseFloat(bboxMatch[1]),
      y: parseFloat(bboxMatch[2]),
      w: parseFloat(bboxMatch[3]),
      h: parseFloat(bboxMatch[4])
    };
  }
  
  return null;
};

// Map grid zones to coordinates
export const gridToCoords = (zone: string): { x: number; y: number; w: number; h: number } => {
  const zones: Record<string, { x: number; y: number; w: number; h: number }> = {
    'top-left': { x: 0, y: 0, w: 33, h: 33 },
    'top': { x: 33, y: 0, w: 34, h: 33 },
    'top-right': { x: 67, y: 0, w: 33, h: 33 },
    'left': { x: 0, y: 33, w: 33, h: 34 },
    'center': { x: 33, y: 33, w: 34, h: 34 },
    'right': { x: 67, y: 33, w: 33, h: 34 },
    'bottom-left': { x: 0, y: 67, w: 33, h: 33 },
    'bottom': { x: 33, y: 67, w: 34, h: 33 },
    'bottom-right': { x: 67, y: 67, w: 33, h: 33 }
  };
  return zones[zone] || zones['center'];
};

export interface ImageRegion {
  type: 'grid' | 'bbox';
  zone?: string; // For grid
  x?: number; // For bbox (percentage)
  y?: number;
  w?: number;
  h?: number;
}
```

---

### Step 2: Update CitationChip (1 day)

**File:** `components/CitationRenderer/components/CitationChip.tsx`

```typescript
// Add image detection
const isImage = isImageCitation(fileName);

// Update handleOpenFull
const handleOpenFull = () => {
  if (isUrl) {
    // ... existing URL logic
  } else if (isImage) {
    // Open image annotation viewer
    const region = parseImageRegion(location);
    onViewImageAnnotation(fileName, region, quote);
    setIsOpen(false);
  } else {
    // ... existing document logic
  }
};

// Add new prop
interface CitationChipProps {
  // ... existing props
  onViewImageAnnotation?: (fileName: string, region: ImageRegion | null, quote: string) => void;
}
```

---

### Step 3: Create ImageAnnotationViewer Component (2 days)

**File:** `components/ImageAnnotationViewer/index.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { ImageRegion, gridToCoords } from '../CitationRenderer/utils/citationUtils';

interface ImageAnnotationViewerProps {
  fileName: string;
  region: ImageRegion | null;
  quote: string;
  imageUrl: string; // Base64 or URL
  onClose: () => void;
  allCitations?: Array<{ region: ImageRegion; quote: string }>; // For navigation
}

export const ImageAnnotationViewer: React.FC<ImageAnnotationViewerProps> = ({
  fileName,
  region,
  quote,
  imageUrl,
  onClose,
  allCitations = []
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Calculate region coordinates
  const getRegionCoords = (reg: ImageRegion | null) => {
    if (!reg) return null;
    
    if (reg.type === 'grid' && reg.zone) {
      return gridToCoords(reg.zone);
    } else if (reg.type === 'bbox') {
      return { x: reg.x!, y: reg.y!, w: reg.w!, h: reg.h! };
    }
    
    return null;
  };

  const coords = getRegionCoords(region);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-6xl h-full flex flex-col relative">
        
        {/* Main Canvas */}
        <div className="flex-1 bg-black rounded-[40px] shadow-2xl overflow-hidden relative border border-white/10 flex items-center justify-center">
          
          {/* Image with overlay */}
          <div className="relative" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}>
            <img 
              src={imageUrl} 
              className="max-w-[85%] max-h-[85%] object-contain opacity-90" 
              alt={fileName} 
            />
            
            {/* Region Highlight Overlay */}
            {coords && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <rect
                  x={`${coords.x}%`}
                  y={`${coords.y}%`}
                  width={`${coords.w}%`}
                  height={`${coords.h}%`}
                  className="fill-transparent stroke-indigo-400 stroke-2 transition-all duration-500"
                  rx="8"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.5))'
                  }}
                />
                
                {/* Label */}
                <foreignObject
                  x={`${coords.x}%`}
                  y={`${coords.y - 5}%`}
                  width="200"
                  height="40"
                >
                  <div className="bg-indigo-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                    {quote.substring(0, 30)}...
                  </div>
                </foreignObject>
              </svg>
            )}
          </div>

          {/* Top Controls */}
          <div className="absolute top-8 left-8 right-8 flex justify-between items-start pointer-events-none">
            {/* Info Card */}
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-white max-w-xs pointer-events-auto">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                Citation Context
              </h4>
              <p className="text-xs text-neutral-300 leading-snug">{quote}</p>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose} 
              className="w-12 h-12 bg-white/10 hover:bg-white text-white hover:text-black rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-all pointer-events-auto"
            >
              <X size={20} />
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 pointer-events-auto bg-black/40 backdrop-blur-2xl p-2 rounded-full border border-white/10">
            
            {/* Navigation */}
            {allCitations.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentIndex((currentIndex - 1 + allCitations.length) % allCitations.length)} 
                  className="w-10 h-10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="px-2 flex flex-col items-center">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Citation</span>
                  <span className="text-sm font-bold text-white leading-none tracking-tighter">
                    {currentIndex + 1} / {allCitations.length}
                  </span>
                </div>
                
                <button 
                  onClick={() => setCurrentIndex((currentIndex + 1) % allCitations.length)} 
                  className="w-10 h-10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              <button 
                onClick={() => setZoom(Math.max(0.5, zoom - 0.2))} 
                className="w-8 h-8 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs text-white font-mono">{Math.round(zoom * 100)}%</span>
              <button 
                onClick={() => setZoom(Math.min(3, zoom + 0.2))} 
                className="w-8 h-8 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Rotation */}
            <button 
              onClick={() => setRotation((rotation + 90) % 360)} 
              className="w-8 h-8 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-all border-l border-white/10 ml-2 pl-2"
            >
              <RotateCw size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

### Step 4: Integrate with App.tsx (1 day)

```typescript
// Add state for image annotation viewer
const [imageAnnotationState, setImageAnnotationState] = useState<{
  fileName: string;
  region: ImageRegion | null;
  quote: string;
  imageUrl: string;
} | null>(null);

// Add handler
const handleViewImageAnnotation = (fileName: string, region: ImageRegion | null, quote: string) => {
  // Find image in uploaded images or files
  const uploadedImage = inputState.uploadedImages.find(img => img.file.name === fileName);
  
  if (uploadedImage) {
    setImageAnnotationState({
      fileName,
      region,
      quote,
      imageUrl: uploadedImage.preview
    });
  } else {
    console.warn('Image not found:', fileName);
  }
};

// Pass to CitationRenderer
<CitationRenderer
  text={message.content}
  files={fileState.files}
  onViewDocument={handleViewDocument}
  onViewImageAnnotation={handleViewImageAnnotation} // NEW
  onOpenWebViewer={handleOpenWebViewer}
  onOpenWebViewerNewTab={handleOpenWebViewerNewTab}
/>

// Render viewer
{imageAnnotationState && (
  <ImageAnnotationViewer
    fileName={imageAnnotationState.fileName}
    region={imageAnnotationState.region}
    quote={imageAnnotationState.quote}
    imageUrl={imageAnnotationState.imageUrl}
    onClose={() => setImageAnnotationState(null)}
  />
)}
```

---

### Step 5: Update System Prompt (1 day)

**File:** `services/llmService.ts` (in `constructBaseSystemPrompt`)

```typescript
// Add image citation instructions
if (hasImages) {
  systemPrompt += `

## IMAGE CITATION FORMAT

When referencing specific regions in images (floor plans, diagrams, CAD drawings):

**Grid-Based (9 zones):**
{{citation:image.png|region:top-left|Description}}
{{citation:floor_plan.jpg|region:center|Control panel location}}

Available zones: top-left, top, top-right, left, center, right, bottom-left, bottom, bottom-right

**Bounding Box (Advanced):**
{{citation:diagram.png|bbox:15,20,35,45|Specific component}}
Format: bbox:x,y,width,height (percentages 0-100)

**Examples:**
- "The master bedroom is located {{citation:floor_plan.png|region:top-right|in the upper right corner}}"
- "The control panel {{citation:cad_drawing.png|region:center|is centrally positioned}}"
- "Dimension marker {{citation:blueprint.jpg|bbox:85,10,10,15|shows 5000mm}}"

**When to use:**
- Floor plans, CAD drawings, architectural diagrams
- Technical schematics, circuit diagrams
- Annotated images with specific zones
- Any image where spatial reference is important
`;
}
```

---

## CAD Drawing Workflow Integration

### Problem Recap
- CAD PDFs have poor text extraction (coordinates, not semantic text)
- Semantic chunking fails (spatial relationships lost)
- Current approach: Send full PDF text → AI confused

### Solution: Convert CAD PDF → Images + Image Citations

**Flow:**
```
1. User uploads CAD PDF (floor_plan.pdf)
   ↓
2. Detect technical drawing (heuristics: low text density, high vector count)
   ↓
3. Convert each page to high-res PNG (300 DPI)
   ↓
4. Store as "floor_plan_page1.png", "floor_plan_page2.png"
   ↓
5. User asks: "Where is the master bathroom?"
   ↓
6. AI analyzes image with vision model
   ↓
7. AI responds: "The master bathroom is {{citation:floor_plan_page1.png|region:top-right|adjacent to bedroom 2}}"
   ↓
8. User clicks [1] → Image opens with top-right region highlighted
```

**Implementation:**

```typescript
// File: services/cadPdfConverter.ts

export const isTechnicalDrawing = (pdfMetadata: any): boolean => {
  // Check 1: Low text-to-vector ratio
  const textDensity = pdfMetadata.textElements / pdfMetadata.totalElements;
  if (textDensity < 0.1) return true;
  
  // Check 2: High line/path count
  if (pdfMetadata.vectorPaths > 1000) return true;
  
  // Check 3: Specific keywords
  const keywords = ['AutoCAD', 'Revit', 'SketchUp', 'DWG', 'DXF'];
  if (keywords.some(k => pdfMetadata.creator?.includes(k))) return true;
  
  return false;
};

export const convertPdfToImages = async (
  pdfFile: File,
  dpi: number = 300
): Promise<{ name: string; blob: Blob; page: number }[]> => {
  const pdfjsLib = await import('pdfjs-dist');
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const images: { name: string; blob: Blob; page: number }[] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: dpi / 72 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: context, viewport }).promise;
    
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    
    const baseName = pdfFile.name.replace('.pdf', '');
    images.push({
      name: `${baseName}_page${pageNum}.png`,
      blob,
      page: pageNum
    });
  }
  
  return images;
};
```

**Update File Upload Handler:**

```typescript
// File: App/handlers/fileHandlers.ts

export const handleFileUpload = async (files: FileList) => {
  for (const file of Array.from(files)) {
    if (file.type === 'application/pdf') {
      // Check if it's a CAD drawing
      const metadata = await extractPdfMetadata(file);
      
      if (isTechnicalDrawing(metadata)) {
        const shouldConvert = confirm(
          `🏗️ Technical drawing detected!\n\n` +
          `"${file.name}" appears to be a CAD/architectural drawing.\n\n` +
          `Convert to images for better AI analysis?\n` +
          `(Recommended for floor plans, blueprints, schematics)`
        );
        
        if (shouldConvert) {
          const images = await convertPdfToImages(file);
          
          // Upload as images instead
          for (const img of images) {
            const imageFile = new File([img.blob], img.name, { type: 'image/png' });
            await uploadImageFile(imageFile);
          }
          
          continue; // Skip normal PDF processing
        }
      }
    }
    
    // Normal file processing
    await processFile(file);
  }
};
```

---

## Testing Strategy

### Test Cases

**1. Grid-Based Citations**
```
Input: "Where is the master bedroom?"
Expected: "The master bedroom is {{citation:floor_plan.png|region:top-right|in the upper right corner}}"
Verify: Click [1] → Image opens with top-right region highlighted
```

**2. Multiple Citations**
```
Input: "Describe the layout"
Expected: "The layout includes {{citation:floor_plan.png|region:top-left|living room}}, {{citation:floor_plan.png|region:center|kitchen}}, and {{citation:floor_plan.png|region:bottom-right|bedrooms}}"
Verify: Click [1], [2], [3] → Each highlights correct region
```

**3. CAD PDF Conversion**
```
Input: Upload AutoCAD floor plan PDF
Expected: Prompt to convert to images
Verify: After conversion, AI can cite regions in images
```

**4. Bounding Box (Phase 2)**
```
Input: "Where is the control panel?"
Expected: "The control panel is {{citation:diagram.png|bbox:45,30,10,15|centrally located}}"
Verify: Precise rectangle drawn at 45%,30% with 10%x15% size
```

---

## Performance Considerations

### Image Storage
- **Problem:** Base64 images in chat history = large storage
- **Solution:** Store images in IndexedDB, reference by ID
- **Implementation:**
  ```typescript
  // Store image
  const imageId = await permanentStorage.storeImage(imageBlob);
  
  // Reference in message
  message.images = [{ id: imageId, fileName: 'floor_plan.png' }];
  
  // Retrieve when needed
  const imageBlob = await permanentStorage.getImage(imageId);
  const imageUrl = URL.createObjectURL(imageBlob);
  ```

### Token Optimization
- **Grid-based:** ~20 tokens per citation (efficient)
- **Bbox-based:** ~25 tokens per citation
- **Embedding-based:** ~30 tokens per citation + initial processing

### Rendering Performance
- Use CSS transforms for zoom/rotation (GPU-accelerated)
- Lazy load images (only when viewer opens)
- Debounce region calculations

---

## Future Enhancements

### 1. Multi-Image Comparison
```typescript
// Compare two floor plans
{{citation:plan_v1.png|region:center|Original layout}}
{{citation:plan_v2.png|region:center|Revised layout}}

// Side-by-side viewer
<ImageComparisonViewer images={[plan_v1, plan_v2]} />
```

### 2. Annotation Editing
- Let users manually adjust region boundaries
- Save custom annotations
- Export annotated images

### 3. 3D Model Support
- Extend to 3D CAD models (STEP, STL files)
- Use Three.js for rendering
- Cite specific components in 3D space

### 4. OCR Integration
- Extract text from CAD drawings
- Combine with image citations
- "The dimension {{citation:drawing.png|region:top|extracted via OCR}} shows 5000mm"

---

## Success Metrics

### User Experience
- ✅ Users can understand spatial references in images
- ✅ Citations open image viewer with highlighted regions
- ✅ Navigation between multiple citations is smooth
- ✅ Works on mobile and desktop

### Technical
- ✅ <100ms to render image annotation viewer
- ✅ <500ms to convert CAD PDF page to image
- ✅ <50MB storage per image (compressed PNG)
- ✅ 70%+ accuracy for grid-based citations

### Business
- ✅ Differentiation from competitors (unique feature)
- ✅ Increased engagement from construction professionals
- ✅ Positive user feedback on CAD drawing support

---

## Conclusion

This feature transforms ConstructLM into the **best AI assistant for visual/spatial analysis**, especially for construction, engineering, and design professionals. By extending the existing citation system to support images, we maintain consistency while adding revolutionary new capabilities.

**Next Steps:**
1. ✅ Review and approve this plan
2. Implement Phase 1 (Grid-based) - 2-3 days
3. Test with real CAD drawings
4. Gather user feedback
5. Implement Phase 2 (Bounding boxes) - 1 week
6. Consider Phase 3 (Vector embeddings) - Future

Ready to start implementation! 🚀
