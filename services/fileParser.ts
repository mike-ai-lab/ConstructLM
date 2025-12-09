import { ProcessedFile } from '../types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const parseFile = async (file: File): Promise<ProcessedFile> => {
  const fileName = file.name.toLowerCase();
  let fileType: ProcessedFile['type'] = 'other';

  if (fileName.endsWith('.pdf')) {
    fileType = 'pdf';
  } else if (fileName.match(/\.(xlsx|xls|csv)$/)) {
    fileType = 'excel';
  }

  let content = '';
  let status: ProcessedFile['status'] = 'ready';

  try {
    if (fileType === 'pdf') {
      content = await extractPdfText(file);
    } else if (fileType === 'excel') {
      content = await extractExcelText(file);
    } else {
      // Fallback for text files or explicitly supported 'other' formats
      if (fileName.match(/\.(txt|md|json|xml|html|js|ts|css|py|java|c|cpp|h|cs)$/)) {
         content = await file.text();
      } else {
         content = "";
         if(!fileName.startsWith('.')) { // Ignore hidden files
             content = "[Binary or Unsupported File]";
         }
      }
    }
    
    if (!content.trim()) {
        content = "[Empty File] This file appears to have no readable text content.";
    }

  } catch (error) {
    console.error(`Error parsing ${file.name}:`, error);
    status = 'error';
    content = `Error reading file: ${(error as Error).message}. Ensure it is a valid ${fileType.toUpperCase()} file.`;
  }

  // Estimate token count (rough heuristic: 1 token ~= 4 chars)
  const tokenCount = Math.ceil(content.length / 4);

  return {
    id: generateId(),
    name: file.name,
    type: fileType,
    content,
    size: file.size,
    status,
    tokenCount,
    fileHandle: file, // Store the original file object
    path: file.webkitRelativePath || "" // Store relative path if available
  };
};

const extractPdfText = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Ensure the global worker/lib logic has finished
    if (window.pdfWorkerReady) {
        try {
            await window.pdfWorkerReady;
        } catch (e) {
            console.warn("PDF worker promise rejected, trying to proceed without worker optimization", e);
        }
    }

    // Now check if library exists
    if (!window.pdfjsLib) {
        throw new Error("PDF.js library failed to load. Please check your internet connection or try refreshing.");
    }

    // Use Uint8Array and provide CMap params to avoid "Invalid PDF structure"
    const pdf = await window.pdfjsLib.getDocument({ 
        data: new Uint8Array(arrayBuffer),
        cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
    }).promise;
    
    let fullText = `[METADATA: PDF Document "${file.name}", ${pdf.numPages} Pages]\n\n`;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Improved layout preservation:
      const pageText = textContent.items
        // @ts-ignore
        .map((item: any) => item.str)
        .join(' ');

      if (pageText.trim()) {
        fullText += `--- [Page ${i}] ---\n${pageText}\n\n`;
      } else {
        fullText += `--- [Page ${i}] ---\n(Empty Page or Scanned Image)\n\n`;
      }
    }

    return fullText;
  } catch (e) {
    console.error("PDF Parsing failed details:", e);
    const msg = (e instanceof Error) ? e.message : "Unknown error";
    throw new Error(`Failed to parse PDF structure: ${msg}`);
  }
};

const extractExcelText = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (!window.XLSX) throw new Error("SheetJS library not loaded");

    const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
    let fullText = `[METADATA: Excel Workbook "${file.name}", Sheets: ${workbook.SheetNames.join(', ')}]\n\n`;

    workbook.SheetNames.forEach((sheetName: string) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = window.XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      
      if (csv && csv.trim().length > 0) {
        fullText += `--- [Sheet: ${sheetName}] ---\n${csv}\n\n`;
      } else {
        fullText += `--- [Sheet: ${sheetName}] ---\n(Empty Sheet)\n\n`;
      }
    });

    return fullText;
  } catch (e) {
    console.error("Excel Parsing failed details:", e);
    throw new Error("Failed to parse Excel structure.");
  }
};