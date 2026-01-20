import { ProcessedFile } from '../types';
import { compressText } from './compressionService';
import { permanentStorage } from './permanentStorage';
import { extractStructuredPDF } from './advancedPdfParser';
import { activityLogger } from './activityLogger';
import { diagnosticLogger } from './diagnosticLogger';

const MAX_PDF_PAGES = 200;

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const parseFile = async (file: File, forceUpload: boolean = false): Promise<ProcessedFile> => {
  const fileName = file.name.toLowerCase();
  let fileType: ProcessedFile['type'] = 'other';
  
  // Generate content hash for deduplication
  let contentHash = '';
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback: use file size + name as hash
      contentHash = `${file.size}-${file.name}-${Date.now()}`;
    }
  } catch (e) {
    // Fallback if crypto fails
    contentHash = `${file.size}-${file.name}-${Date.now()}`;
  }
  
  // Check if file already processed
  const existing = await permanentStorage.getFileByHash(contentHash);
  if (existing && !forceUpload) {
    console.log(`✅ File "${file.name}" already processed (hash match) - reusing. To reprocess, delete the file first and re-upload.`);
    return { ...existing, fileHandle: file, status: 'ready' };
  }
  
  if (existing && forceUpload) {
    console.log(`🔄 File "${file.name}" already exists but force upload enabled - reprocessing`);
    await permanentStorage.deleteFile(existing.id);
  }

  if (fileName.endsWith('.pdf')) {
    fileType = 'pdf';
  } else if (fileName.endsWith('.csv')) {
    fileType = 'csv';
  } else if (fileName.match(/\.(xlsx|xls)$/)) {
    fileType = 'excel';
  } else if (fileName.endsWith('.md')) {
    fileType = 'markdown';
  } else if (fileName.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/)) {
    fileType = 'image';
  } else if (fileName.match(/\.(doc|docx|ppt|pptx|txt|json|xml|html)$/)) {
    fileType = 'document';
  }

  console.log(`Processing file: ${file.name}, type: ${fileType}, size: ${file.size}`);
  activityLogger.logFileParsingStart(file.name, fileType, file.size);

  // DIAGNOSTIC: 1. INGESTION & EXTRACTION LOG
  diagnosticLogger.log('1. INGESTION & EXTRACTION', {
    file_name: file.name,
    file_type: fileType,
    file_size: file.size,
    page_count: null, // Will be updated for PDF
    sheet_count: null, // Will be updated for Excel
    extraction_method: null, // Will be updated based on type
    output_unit_type: null // Will be updated after extraction
  });

  let content = '';
  let status: ProcessedFile['status'] = 'ready';

  try {
    if (fileType === 'pdf') {
      // Use advanced structured extraction for PDFs
      try {
        const structured = await extractStructuredPDF(file);
        content = structured.fullText;
        
        // DIAGNOSTIC: Update extraction details for PDF
        diagnosticLogger.log('1. INGESTION & EXTRACTION (PDF)', {
          file_name: file.name,
          file_type: 'pdf',
          file_size: file.size,
          page_count: structured.sections.length,
          extraction_method: 'structured_pdf_parser',
          output_unit_type: 'sections',
          sections_extracted: structured.sections.length
        });
        
        // Store sections separately
        const processedFile: ProcessedFile = {
          id: generateId(),
          name: file.name,
          type: fileType,
          content: compressText(content),
          size: file.size,
          status: 'ready',
          tokenCount: Math.ceil(content.length / 4),
          fileHandle: file,
          path: file.webkitRelativePath || "",
          uploadedAt: Date.now(),
          contentHash,
          sections: structured.sections
        };
        
        // Save to permanent storage
        await permanentStorage.saveFile(processedFile);
        if (structured.sections && structured.sections.length > 0) {
          await permanentStorage.saveSections(structured.sections, processedFile.id);
        }
        
        console.log(`✅ PDF "${file.name}" processed: ${structured.sections.length} sections`);
        activityLogger.logFileParsingComplete(file.name, content.length, processedFile.tokenCount, structured.sections.length);
        return processedFile;
      } catch (structuredError) {
        console.warn('Structured PDF parsing failed, falling back to basic extraction:', structuredError);
        content = await extractPdfText(file);
      }
    } else if (fileType === 'csv') {
      content = await extractExcelText(file);
    } else if (fileType === 'excel') {
      content = await extractExcelText(file);
    } else if (fileType === 'markdown') {
      const text = await file.text();
      content = text; // Keep raw markdown without metadata
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
  
  activityLogger.logFileParsingComplete(file.name, content.length, tokenCount);

  const processedFile: ProcessedFile = {
    id: generateId(),
    name: file.name,
    type: fileType,
    content: compressed,
    size: file.size,
    status,
    tokenCount,
    fileHandle: file,
    path: file.webkitRelativePath || "",
    uploadedAt: Date.now(),
    contentHash
  };
  
  // Save to permanent storage
  await permanentStorage.saveFile(processedFile);
  
  return processedFile;
};

const extractPdfText = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    if (window.pdfWorkerReady) {
        try {
            await window.pdfWorkerReady;
        } catch (e) {
            console.warn("PDF worker promise rejected, trying to proceed without worker optimization", e);
        }
    }

    if (!window.pdfjsLib) {
        throw new Error("PDF.js library failed to load. Please check your internet connection or try refreshing.");
    }

    const pdf = await window.pdfjsLib.getDocument({ 
        data: new Uint8Array(arrayBuffer),
        cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
    }).promise;
    
    const totalPages = pdf.numPages;
    const pagesToProcess = Math.min(totalPages, MAX_PDF_PAGES);
    let fullText = `[METADATA: PDF "${file.name}", ${totalPages}p${totalPages > MAX_PDF_PAGES ? ` (processing first ${MAX_PDF_PAGES})` : ''}]\n`;

    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // @ts-ignore
        .map((item: any) => item.str)
        .join(' ');

      if (pageText.trim()) {
        fullText += `--- [Page ${i}] ---\n${pageText}\n`;
      }
      
      page.cleanup();
    }
    
    if (totalPages > MAX_PDF_PAGES) {
      fullText += `\n[NOTE: This PDF has ${totalPages} pages. Only the first ${MAX_PDF_PAGES} pages were processed.]`;
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
      
      fullText += `--- [Sheet: ${sheetName}] ---\n`;
      
      // Use sheet_to_csv for proper CSV conversion
      const csv = (window as any).XLSX.utils.sheet_to_csv(sheet, { 
        FS: ',',
        RS: '\n',
        blankrows: false
      });
      
      fullText += csv + '\n\n';
    });

    return fullText;
  } catch (e) {
    console.error("Excel Parsing failed:", e);
    throw new Error("Failed to parse Excel structure.");
  }
};

const extractImageInfo = async (file: File): Promise<string> => {
  try {
    // Convert image to base64 for AI model processing
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Get image dimensions
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    return new Promise((resolve) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        const sizeKB = Math.round(file.size / 1024);
        // Store base64 data with special marker for AI processing
        const content = `[IMAGE_DATA:${base64}]\n` +
                      `[METADATA: Image File "${file.name}"]\n` +
                      `Type: ${file.type || 'image/jpeg'}\n` +
                      `Dimensions: ${img.width} x ${img.height} pixels\n` +
                      `Size: ${sizeKB} KB`;
        resolve(content);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const sizeKB = Math.round(file.size / 1024);
        // Still include base64 even if dimensions fail
        const content = `[IMAGE_DATA:${base64}]\n` +
                      `[METADATA: Image File "${file.name}"]\n` +
                      `Type: ${file.type || 'image/jpeg'}\n` +
                      `Size: ${sizeKB} KB`;
        resolve(content);
      };
      
      img.src = url;
    });
  } catch (e) {
    console.error("Image processing failed:", e);
    const sizeKB = Math.round(file.size / 1024);
    return `[METADATA: Image File "${file.name}"]\n` +
           `Size: ${sizeKB} KB\n\n` +
           `[ERROR: Unable to process image data]`;
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
