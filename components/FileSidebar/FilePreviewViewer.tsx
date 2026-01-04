import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Minus, Plus, X } from 'lucide-react';
import { ProcessedFile } from '../../types';
import DocumentViewer from '../DocumentViewer';
import PdfPageRenderer from './PdfPageRenderer';
import { sanitizeHtml } from './utils';

interface FilePreviewViewerProps {
  file: ProcessedFile;
  onClose: () => void;
}

const FilePreviewViewer: React.FC<FilePreviewViewerProps> = ({ file, onClose }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [excelHtml, setExcelHtml] = useState('');
  const [pdfScale, setPdfScale] = useState(1.5);

  const imageUrl = useMemo(() => {
    if (file.type === 'image' && file.fileHandle && file.fileHandle instanceof File) {
      return URL.createObjectURL(file.fileHandle);
    }
    return null;
  }, [file]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    setLoading(true);
    if (file.type === 'pdf' && file.fileHandle && file.fileHandle instanceof File) {
      const loadPdf = async () => {
        try {
          const arrayBuffer = await file.fileHandle.arrayBuffer();
          const pdf = await (window as any).pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setLoading(false);
        } catch (err) {
          console.error('PDF load error:', err);
          setLoading(false);
        }
      };
      loadPdf();
    } else if ((file.type === 'excel' || file.type === 'csv') && file.fileHandle && file.fileHandle instanceof File) {
      const loadExcel = async () => {
        try {
          const arrayBuffer = await file.fileHandle.arrayBuffer();
          const XLSX = (window as any).XLSX;
          if (!XLSX) throw new Error('XLSX library not loaded');

          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          let html = '';
          workbook.SheetNames.forEach((sheetName: string) => {
            const sheet = workbook.Sheets[sheetName];
            const sheetHtml = XLSX.utils.sheet_to_html(sheet);
            const sanitizedName = sanitizeHtml(sheetName);
            html += `<div class="mb-6"><h3 class="text-lg font-bold mb-2 text-gray-800 dark:text-gray-200">${sanitizedName}</h3>${sheetHtml}</div>`;
          });
          setExcelHtml(html);
          setLoading(false);
        } catch (err) {
          console.error('Excel load error:', err);
          setLoading(false);
        }
      };
      loadExcel();
    } else {
      setLoading(false);
    }
  }, [file]);

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{file.name}</h3>
        <div className="flex items-center gap-2">
          {file.type === 'pdf' && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button onClick={() => setPdfScale(s => Math.max(0.5, s - 0.2))} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors">
                <Minus size={14} className="text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[45px] text-center">{Math.round(pdfScale * 100)}%</span>
              <button onClick={() => setPdfScale(s => Math.min(3, s + 0.2))} className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors">
                <Plus size={14} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>
      {file.type === 'pdf' && pdfDoc && (
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-[#1a1a1a] scroll-smooth">
          <div className="space-y-4 py-4">
            {Array.from({ length: numPages }, (_, i) => (
              <PdfPageRenderer key={i + 1} pdf={pdfDoc} pageNum={i + 1} scale={pdfScale} />
            ))}
          </div>
        </div>
      )}
      {(file.type === 'excel' || file.type === 'csv') && (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a] p-6 scroll-smooth">
          <style>{`
            table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: 600; }
            tr:nth-child(even) { background-color: #f9fafb; }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: excelHtml }} />
        </div>
      )}
      {file.type === 'markdown' && <DocumentViewer file={file} onClose={onClose} />}
      {(file.type === 'document' || file.type === 'other') && (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1a1a1a] p-6 scroll-smooth">
          <pre className="whitespace-pre-wrap text-sm">{file.content}</pre>
        </div>
      )}
      {imageUrl && (
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center scroll-smooth">
          <img src={imageUrl} alt={file.name} className="max-w-full max-h-full object-contain" />
        </div>
      )}
      {!['pdf', 'excel', 'csv', 'markdown', 'document', 'other', 'image'].includes(file.type) && (
        <div className="p-8 text-center">Preview not available for this file type</div>
      )}
    </>
  );
};

export default FilePreviewViewer;
