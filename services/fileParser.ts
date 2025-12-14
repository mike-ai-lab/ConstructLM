import { ProcessedFile } from '../types';
import { compressText } from './compressionService';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const parseFile = async (file: File): Promise<ProcessedFile> => {
  const fileName = file.name.toLowerCase();
  let fileType: ProcessedFile['type'] = 'other';

  if (fileName.endsWith('.pdf')) {
    fileType = 'pdf';
  } else if (fileName.match(/\.(xlsx|xls|csv)$/)) {
    fileType = 'excel';
  } else if (fileName.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/)) {
    fileType = 'image';
  } else if (fileName.match(/\.(doc|docx|ppt|pptx|txt|md|json|xml|html)$/)) {
    fileType = 'document';
  }

  let content = '';
  let status: ProcessedFile['status'] = 'ready';

  try {
    if (fileType === 'pdf') {
      content = await extractPdfText(file);
    } else if (fileType === 'excel') {
      content = await extractExcelText(file);
    } else if (fileType === 'image') {
      content = await extractImageInfo(file);
    } else if (fileType === 'document') {
      content = await extractDocumentText(file);
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

  // Compress content to reduce token usage
  const compressed = compressText(content);
  const tokenCount = Math.ceil(compressed.length / 4);

  return {
    id: generateId(),
    name: file.name,
    type: fileType,
    content: compressed,
    size: file.size,
    status,
    tokenCount,
    fileHandle: file,
    path: file.webkitRelativePath || ""
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
    
    let fullText = `[METADATA: PDF "${file.name}", ${pdf.numPages}p]\n`;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // @ts-ignore
        .map((item: any) => item.str)
        .join(' ');

      if (pageText.trim()) {
        fullText += `--- [Page ${i}] ---\n${pageText}\n`;
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
  // Wait for library to load
  let attempts = 0;
  while (!(window as any).XLSX && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!(window as any).XLSX) {
    throw new Error("SheetJS library failed to load. Please refresh the page.");
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = (window as any).XLSX.read(arrayBuffer, { type: 'array' });
    let fullText = `[METADATA: Excel "${file.name}"]\n`;

    workbook.SheetNames.forEach((sheetName: string) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = (window as any).XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      
      if (csv && csv.trim().length > 0) {
        fullText += `--- [Sheet: ${sheetName}] ---\n${csv}\n`;
      }
    });

    return fullText;
  } catch (e) {
    console.error("Excel Parsing failed:", e);
    throw new Error("Failed to parse Excel structure.");
  }
};

const extractImageInfo = async (file: File): Promise<string> => {
  try {
    // Create image element to get dimensions
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    return new Promise((resolve) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        const sizeKB = Math.round(file.size / 1024);
        const content = `[METADATA: Image File "${file.name}"]\n` +
                      `Type: ${file.type || 'Unknown'}\n` +
                      `Dimensions: ${img.width} x ${img.height} pixels\n` +
                      `Size: ${sizeKB} KB\n\n` +
                      `[IMAGE CONTENT: This is an image file that can be viewed but not processed as text. ` +
                      `You can ask questions about this image and I'll help analyze it based on the filename and metadata.]`;
        resolve(content);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const sizeKB = Math.round(file.size / 1024);
        const content = `[METADATA: Image File "${file.name}"]\n` +
                      `Type: ${file.type || 'Unknown'}\n` +
                      `Size: ${sizeKB} KB\n\n` +
                      `[IMAGE CONTENT: This is an image file. Unable to read dimensions.]`;
        resolve(content);
      };
      
      img.src = url;
    });
  } catch (e) {
    console.error("Image processing failed:", e);
    const sizeKB = Math.round(file.size / 1024);
    return `[METADATA: Image File "${file.name}"]\n` +
           `Size: ${sizeKB} KB\n\n` +
           `[IMAGE CONTENT: This is an image file.]`;
  }
};

const extractDocumentText = async (file: File): Promise<string> => {
  const fileName = file.name.toLowerCase();
  
  try {
    // Handle text-based documents
    if (fileName.match(/\.(txt|md|json|xml|html)$/)) {
      const text = await file.text();
      return `[METADATA: Document "${file.name}"]\n\n${text}`;
    }
    
    // For binary documents (doc, docx, ppt, pptx), provide metadata only
    const sizeKB = Math.round(file.size / 1024);
    let docType = 'Document';
    
    if (fileName.match(/\.(doc|docx)$/)) {
      docType = 'Word Document';
    } else if (fileName.match(/\.(ppt|pptx)$/)) {
      docType = 'PowerPoint Presentation';
    }
    
    return `[METADATA: ${docType} "${file.name}"]\n` +
           `Type: ${file.type || 'Unknown'}\n` +
           `Size: ${sizeKB} KB\n\n` +
           `[DOCUMENT CONTENT: This is a ${docType.toLowerCase()} file. ` +
           `While I cannot extract the full text content, I can help you with questions about this document ` +
           `based on its filename and type. Consider converting to PDF or plain text for full content analysis.]`;
  } catch (e) {
    console.error("Document processing failed:", e);
    const sizeKB = Math.round(file.size / 1024);
    return `[METADATA: Document "${file.name}"]\n` +
           `Size: ${sizeKB} KB\n\n` +
           `[DOCUMENT CONTENT: Unable to process this document.]`;
  }
};