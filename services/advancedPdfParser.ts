import { PDFSection } from '../types';

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface GroupedLine {
  y: number;
  text: string;
  fontSize: number;
  isBold: boolean;
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
    }).promise;

    const totalPages = pdf.numPages;
    const sections: PDFSection[] = [];
    let fullText = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Group text by lines with position info
      const lines = groupTextByLines(textContent.items as TextItem[]);
      
      // Detect sections based on formatting
      const pageSections = detectConstructionSections(lines, pageNum, file.name);
      
      sections.push(...pageSections);
      
      // Build full text
      fullText += `\n--- Page ${pageNum} ---\n`;
      lines.forEach(line => {
        fullText += line.text + '\n';
      });
      
      page.cleanup();
    }

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

function groupTextByLines(items: TextItem[]): GroupedLine[] {
  const lineMap = new Map<number, { texts: string[]; fontSize: number; isBold: boolean }>();
  
  items.forEach(item => {
    const y = Math.round(item.transform[5]); // Y position
    const fontSize = item.transform[0]; // Font size from transform matrix
    const isBold = item.str.length > 0 && /[A-Z]/.test(item.str[0]); // Heuristic for bold
    
    if (!lineMap.has(y)) {
      lineMap.set(y, { texts: [], fontSize, isBold });
    }
    lineMap.get(y)!.texts.push(item.str);
  });
  
  // Sort by Y position (top to bottom) and join texts
  return Array.from(lineMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([y, data]) => ({
      y,
      text: data.texts.join(' ').trim(),
      fontSize: data.fontSize,
      isBold: data.isBold
    }))
    .filter(line => line.text.length > 0);
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
