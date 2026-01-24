import { PDFSection } from '../types';

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface PositionedText {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
}

interface TableCell {
  text: string;
  row: number;
  col: number;
  x: number;
  y: number;
}

interface DetectedTable {
  cells: TableCell[];
  rows: number;
  cols: number;
  bbox: { x: number; y: number; width: number; height: number };
}

export async function extractStructuredPDF(file: File): Promise<{
  sections: PDFSection[];
  fullText: string;
  metadata: { totalPages: number; title?: string };
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    if (window.pdfWorkerReady) {
      try {
        await window.pdfWorkerReady;
      } catch (e) {
        console.warn("PDF worker not ready, proceeding anyway");
      }
    }

    if (!window.pdfjsLib) {
      throw new Error("PDF.js library not loaded");
    }

    const pdf = await window.pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      useSystemFonts: true,
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
    }).promise;

    const totalPages = pdf.numPages;
    const sections: PDFSection[] = [];
    let fullText = '';

    console.log(`🔍 Starting enhanced PDF extraction for "${file.name}" (${totalPages} pages)`);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      
      // Extract positioned text elements
      const positionedTexts = extractPositionedText(textContent.items as any[], viewport);
      
      // Detect tables on this page
      const tables = detectTables(positionedTexts);
      
      console.log(`📄 Page ${pageNum}: Found ${tables.length} tables, ${positionedTexts.length} text elements`);
      
      // Build structured content with tables preserved
      const pageContent = buildStructuredContent(positionedTexts, tables, pageNum);
      
      // Detect sections based on formatting and structure
      const pageSections = detectConstructionSections(pageContent, pageNum, file.name);
      
      sections.push(...pageSections);
      
      // Build full text with preserved structure
      fullText += `\n--- Page ${pageNum} ---\n${pageContent.fullText}\n`;
      
      page.cleanup();
    }

    console.log(`✅ Extraction complete: ${sections.length} sections extracted`);

    return {
      sections,
      fullText,
      metadata: {
        totalPages,
        title: file.name
      }
    };
  } catch (error) {
    console.error('Advanced PDF parsing failed:', error);
    throw error;
  }
}


function extractPositionedText(items: any[], viewport: any): PositionedText[] {
  const positioned: PositionedText[] = [];
  
  items.forEach(item => {
    if (!item.str || item.str.trim().length === 0) return;
    
    const transform = item.transform;
    const x = transform[4];
    const y = viewport.height - transform[5]; // Flip Y coordinate
    const fontSize = Math.abs(transform[0]);
    const width = item.width || 0;
    const height = item.height || fontSize;
    
    positioned.push({
      text: item.str.trim(),
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
      fontSize: Math.round(fontSize * 10) / 10,
      fontName: item.fontName || ''
    });
  });
  
  return positioned;
}

function detectTables(texts: PositionedText[]): DetectedTable[] {
  const tables: DetectedTable[] = [];
  
  // Group texts by Y position (rows)
  const rowMap = new Map<number, PositionedText[]>();
  const Y_THRESHOLD = 5; // pixels tolerance for same row
  
  texts.forEach(text => {
    let foundRow = false;
    for (const [y, items] of rowMap.entries()) {
      if (Math.abs(text.y - y) < Y_THRESHOLD) {
        items.push(text);
        foundRow = true;
        break;
      }
    }
    if (!foundRow) {
      rowMap.set(text.y, [text]);
    }
  });
  
  // Sort rows by Y position
  const rows = Array.from(rowMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([y, items]) => items.sort((a, b) => a.x - b.x));
  
  // Detect table patterns: multiple rows with aligned columns
  let currentTable: TableCell[] = [];
  let tableStartRow = -1;
  let columnPositions: number[] = [];
  
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    
    // Check if this row has multiple aligned elements (potential table row)
    if (row.length >= 2) {
      const currentCols = row.map(t => Math.round(t.x / 10) * 10); // Round to 10px grid
      
      if (currentTable.length === 0) {
        // Start new table
        tableStartRow = rowIdx;
        columnPositions = currentCols;
        row.forEach((text, colIdx) => {
          currentTable.push({
            text: text.text,
            row: 0,
            col: colIdx,
            x: text.x,
            y: text.y
          });
        });
      } else {
        // Check if columns align with existing table
        const alignmentScore = calculateColumnAlignment(currentCols, columnPositions);
        
        if (alignmentScore > 0.5 && row.length >= 2) {
          // Add to current table
          const relativeRow = rowIdx - tableStartRow;
          row.forEach((text, colIdx) => {
            // Find best matching column
            const bestCol = findBestColumn(text.x, columnPositions);
            currentTable.push({
              text: text.text,
              row: relativeRow,
              col: bestCol,
              x: text.x,
              y: text.y
            });
          });
          
          // Update column positions (average)
          currentCols.forEach((x, idx) => {
            if (idx < columnPositions.length) {
              columnPositions[idx] = (columnPositions[idx] + x) / 2;
            }
          });
        } else {
          // End current table if it has enough rows
          if (currentTable.length >= 4) { // At least 2 rows with 2 columns
            const maxRow = Math.max(...currentTable.map(c => c.row));
            const maxCol = Math.max(...currentTable.map(c => c.col));
            
            if (maxRow >= 1 && maxCol >= 1) {
              const bbox = calculateBoundingBox(currentTable);
              tables.push({
                cells: currentTable,
                rows: maxRow + 1,
                cols: maxCol + 1,
                bbox
              });
            }
          }
          
          // Start new table
          tableStartRow = rowIdx;
          columnPositions = currentCols;
          currentTable = row.map((text, colIdx) => ({
            text: text.text,
            row: 0,
            col: colIdx,
            x: text.x,
            y: text.y
          }));
        }
      }
    } else {
      // Single element row - might be end of table
      if (currentTable.length >= 4) {
        const maxRow = Math.max(...currentTable.map(c => c.row));
        const maxCol = Math.max(...currentTable.map(c => c.col));
        
        if (maxRow >= 1 && maxCol >= 1) {
          const bbox = calculateBoundingBox(currentTable);
          tables.push({
            cells: currentTable,
            rows: maxRow + 1,
            cols: maxCol + 1,
            bbox
          });
        }
      }
      currentTable = [];
      columnPositions = [];
    }
  }
  
  // Don't forget last table
  if (currentTable.length >= 4) {
    const maxRow = Math.max(...currentTable.map(c => c.row));
    const maxCol = Math.max(...currentTable.map(c => c.col));
    
    if (maxRow >= 1 && maxCol >= 1) {
      const bbox = calculateBoundingBox(currentTable);
      tables.push({
        cells: currentTable,
        rows: maxRow + 1,
        cols: maxCol + 1,
        bbox
      });
    }
  }
  
  return tables;
}

function calculateColumnAlignment(cols1: number[], cols2: number[]): number {
  if (cols1.length === 0 || cols2.length === 0) return 0;
  
  const ALIGNMENT_THRESHOLD = 30; // pixels
  let matches = 0;
  
  cols1.forEach(x1 => {
    if (cols2.some(x2 => Math.abs(x1 - x2) < ALIGNMENT_THRESHOLD)) {
      matches++;
    }
  });
  
  return matches / Math.max(cols1.length, cols2.length);
}

function findBestColumn(x: number, columnPositions: number[]): number {
  let bestCol = 0;
  let minDist = Infinity;
  
  columnPositions.forEach((colX, idx) => {
    const dist = Math.abs(x - colX);
    if (dist < minDist) {
      minDist = dist;
      bestCol = idx;
    }
  });
  
  return bestCol;
}

function calculateBoundingBox(cells: TableCell[]): { x: number; y: number; width: number; height: number } {
  const xs = cells.map(c => c.x);
  const ys = cells.map(c => c.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function buildStructuredContent(
  texts: PositionedText[],
  tables: DetectedTable[],
  pageNum: number
): { fullText: string; blocks: any[] } {
  let fullText = '';
  const blocks: any[] = [];
  
  // Mark which texts are part of tables
  const tableTexts = new Set<string>();
  tables.forEach(table => {
    table.cells.forEach(cell => {
      tableTexts.add(`${cell.x}_${cell.y}_${cell.text}`);
    });
  });
  
  // Sort tables by Y position
  const sortedTables = tables.sort((a, b) => a.bbox.y - b.bbox.y);
  
  // Sort texts by Y position
  const sortedTexts = texts.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 5) return a.x - b.x; // Same line, sort by X
    return a.y - b.y;
  });
  
  let textIdx = 0;
  let tableIdx = 0;
  
  // Interleave tables and text based on Y position
  while (textIdx < sortedTexts.length || tableIdx < sortedTables.length) {
    const nextText = sortedTexts[textIdx];
    const nextTable = sortedTables[tableIdx];
    
    if (!nextTable || (nextText && nextText.y < nextTable.bbox.y)) {
      // Add text if it's not part of a table
      const key = `${nextText.x}_${nextText.y}_${nextText.text}`;
      if (!tableTexts.has(key)) {
        fullText += nextText.text + ' ';
        
        // Check for line break (significant Y change)
        if (textIdx + 1 < sortedTexts.length) {
          const nextY = sortedTexts[textIdx + 1].y;
          if (Math.abs(nextY - nextText.y) > 5) {
            fullText += '\n';
          }
        }
      }
      textIdx++;
    } else {
      // Add table
      const tableMarkdown = formatTableAsMarkdown(nextTable);
      fullText += '\n' + tableMarkdown + '\n';
      blocks.push({ type: 'table', content: tableMarkdown, bbox: nextTable.bbox });
      
      // Skip texts that are part of this table
      while (textIdx < sortedTexts.length && sortedTexts[textIdx].y <= nextTable.bbox.y + nextTable.bbox.height) {
        textIdx++;
      }
      
      tableIdx++;
    }
  }
  
  return { fullText, blocks };
}

function formatTableAsMarkdown(table: DetectedTable): string {
  // Create 2D array for table
  const grid: string[][] = Array(table.rows).fill(null).map(() => Array(table.cols).fill(''));
  
  // Fill grid with cell data
  table.cells.forEach(cell => {
    if (cell.row < table.rows && cell.col < table.cols) {
      grid[cell.row][cell.col] = cell.text;
    }
  });
  
  // Format as markdown table
  let markdown = '\n';
  
  // Header row
  markdown += '| ' + grid[0].join(' | ') + ' |\n';
  
  // Separator
  markdown += '| ' + Array(table.cols).fill('---').join(' | ') + ' |\n';
  
  // Data rows
  for (let i = 1; i < table.rows; i++) {
    markdown += '| ' + grid[i].join(' | ') + ' |\n';
  }
  
  return markdown;
}

function detectConstructionSections(
  lines: GroupedLine[],
  pageNumber: number,
  filename: string
): PDFSection[] {
  const sections: PDFSection[] = [];
  let currentSection: PDFSection | null = null;
  
  // Patterns for construction document headers
  const sectionPatterns = [
    /^\d+\.\d*\s+[A-Z]/,                    // "1.1 SECTION NAME"
    /^[A-Z\s]{5,}$/,                        // "SECTION NAME" (all caps, 5+ chars)
    /^SECTION\s+\d+/i,                      // "SECTION 1"
    /^DETAIL\s+[A-Z0-9]/i,                  // "DETAIL A1"
    /^SPECIFICATION/i,                      // "SPECIFICATION"
    /^SCOPE\s+OF\s+WORK/i,                  // "SCOPE OF WORK"
    /^MATERIALS?\s*:/i,                     // "MATERIALS:"
    /^DESCRIPTION\s*:/i,                    // "DESCRIPTION:"
    /^NOTES?\s*:/i,                         // "NOTES:"
    /^GENERAL\s+REQUIREMENTS/i,             // "GENERAL REQUIREMENTS"
    /^FIRE\s+RATING/i,                      // "FIRE RATING"
    /^ACOUSTIC\s+RATING/i,                  // "ACOUSTIC RATING"
    /^DOOR\s+SCHEDULE/i,                    // "DOOR SCHEDULE"
    /^WINDOW\s+SCHEDULE/i,                  // "WINDOW SCHEDULE"
    /^TYPICAL\s+DETAIL/i,                   // "TYPICAL DETAIL"
  ];
  
  lines.forEach((line, index) => {
    // Check if line is a header
    const isHeader = sectionPatterns.some(pattern => pattern.test(line.text)) ||
                     (line.fontSize > 12 && line.isBold) ||
                     (line.text.length < 50 && /^[A-Z0-9\s\.\-:]+$/.test(line.text));
    
    if (isHeader) {
      // Save previous section
      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        id: `${filename}_p${pageNumber}_s${sections.length}`,
        title: line.text,
        content: '',
        pageNumber,
        tokens: 0
      };
    } else if (currentSection) {
      // Add content to current section, preserving spacing
      currentSection.content += line.text + '\n';
    } else {
      // Content before first header - create intro section
      if (sections.length === 0) {
        currentSection = {
          id: `${filename}_p${pageNumber}_intro`,
          title: `Page ${pageNumber} - Introduction`,
          content: line.text + '\n',
          pageNumber,
          tokens: 0
        };
      }
    }
  });
  
  // Save last section
  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  // Calculate tokens for each section
  sections.forEach(section => {
    section.tokens = estimateTokens(section.title + '\n' + section.content);
  });
  
  return sections;
}

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
