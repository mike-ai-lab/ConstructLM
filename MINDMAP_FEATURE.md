# Mind Map Feature

## Overview
Interactive mind map visualization that converts document content into hierarchical visual structures using AI.

## How It Works

### 1. User Action
- Hover over any file in the sidebar
- Click the **Network icon** (purple) to generate mind map

### 2. AI Processing
- AI analyzes document structure (max 15K chars for efficiency)
- Extracts hierarchical relationships
- Generates JSON tree structure
- **Single API call** - no streaming, minimal tokens

### 3. Visualization
- D3.js renders interactive tree
- Click nodes to expand/collapse
- Scroll to zoom, drag to pan
- Fullscreen mode available

## Performance Optimizations

### AI Efficiency
- Content truncated to 15K chars (prevents token overflow)
- Temperature: 0.1 (consistent output)
- Single request (no streaming overhead)
- Structured JSON output (no parsing complexity)

### Client-Side Rendering
- D3.js handles all visualization (no AI involved)
- Smooth animations with hardware acceleration
- Lazy rendering (collapsed nodes not rendered)
- Efficient DOM updates

### Electron Compatibility
- No external dependencies beyond D3.js CDN
- Works offline after initial load
- No CORS issues (local files)
- Memory efficient (SVG-based)

## Supported Models
- ✅ Google Gemini (all variants)
- ✅ OpenAI GPT models
- ✅ Groq models
- ❌ Local models (not optimized for structured output)

## File Type Support
- PDF documents
- Excel/CSV files
- Text documents
- JSON files
- Any text-based content

## Usage Tips

### Best Results
- Use with structured documents (BOQ, specifications, reports)
- Works great with hierarchical data
- Ideal for construction/engineering docs

### Limitations
- Max 4 levels deep (prevents overcrowding)
- Large files truncated (15K chars)
- Requires API key for selected model

## Technical Details

### Data Flow
```
File Content → AI Model → JSON Structure → D3.js → Interactive SVG
```

### JSON Structure
```json
{
  "name": "Root Node",
  "color": "#2c3e50",
  "children": [
    {
      "name": "Child Node",
      "color": "#3498db",
      "children": [...]
    }
  ]
}
```

### Color Scheme
- Blue (#3498db): Main categories
- Red (#e74c3c): Important items
- Orange (#f39c12): Secondary items
- Purple (#9b59b6): Special sections
- Green (#27ae60): Details/specs

## Future Enhancements
- [ ] Export mind map as PNG/SVG
- [ ] Save/load mind map configurations
- [ ] Custom color schemes
- [ ] Search within mind map
- [ ] Collaborative editing
