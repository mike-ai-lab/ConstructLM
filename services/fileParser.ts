import { ProcessedFile } from '../types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const parseFile = async (file: File): Promise<ProcessedFile> => {
  const fileType = file.name.toLowerCase().endsWith('.pdf')
    ? 'pdf'
    : file.name.toLowerCase().match(/\.(xlsx|xls|csv)$/)
    ? 'excel'
    : 'other';

  let content = '';
  let status: ProcessedFile['status'] = 'ready';

  try {
    if (fileType === 'pdf') {
      content = await extractPdfText(file);
    } else if (fileType === 'excel') {
      content = await extractExcelText(file);
    } else {
      content = await file.text();
    }
  } catch (error) {
    console.error(`Error parsing ${file.name}:`, error);
    status = 'error';
    content = 'Error reading file content.';
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
  };
};

const extractPdfText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  // Using the global pdfjsLib loaded via CDN
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // @ts-ignore - items usually have 'str' property in standard PDF.js output
      .map((item: any) => item.str)
      .join(' ');
    fullText += `[Page ${i}] ${pageText}\n`;
  }

  return fullText;
};

const extractExcelText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  // Using the global XLSX loaded via CDN
  const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
  let fullText = '';

  workbook.SheetNames.forEach((sheetName: string) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = window.XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim().length > 0) {
      fullText += `[Sheet: ${sheetName}]\n${csv}\n`;
    }
  });

  return fullText;
};