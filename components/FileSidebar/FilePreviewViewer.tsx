import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, Minus, Plus, X } from 'lucide-react';
import { ProcessedFile } from '../../types';
import DocumentViewer from '../DocumentViewer';
import PdfPageRenderer from './PdfPageRenderer';
import { sanitizeHtml } from './utils';

interface FilePreviewViewerProps {
  file: ProcessedFile;
  onClose: () => void;
}

// Cache for processed file previews
const previewCache = new Map<string, { pdfDoc?: any; numPages?: number; excelHtml?: string; imageUrl?: string }>();

// Clear cache when it gets too large (keep last 10 files)
const MAX_CACHE_SIZE = 10;
const clearOldCache = () => {
  if (previewCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(previewCache.entries());
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toRemove.forEach(([key, value]) => {
      if (value.imageUrl) URL.revokeObjectURL(value.imageUrl);
      previewCache.delete(key);
    });
  }
};

const FilePreviewViewer: React.FC<FilePreviewViewerProps> = ({ file, onClose }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [excelHtml, setExcelHtml] = useState('');
  const [pdfScale, setPdfScale] = useState(1.5);
  const abortControllerRef = useRef<AbortController | null>(null);

  const imageUrl = useMemo(() => {
    const cached = previewCache.get(file.id);
    if (cached?.imageUrl) return cached.imageUrl;
    
    if (file.type === 'image' && file.fileHandle && file.fileHandle instanceof File) {
      const url = URL.createObjectURL(file.fileHandle);
      previewCache.set(file.id, { ...previewCache.get(file.id), imageUrl: url });
      return url;
    }
    return null;
  }, [file]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const cached = previewCache.get(file.id);
    if (cached) {
      if (cached.pdfDoc) {
        setPdfDoc(cached.pdfDoc);
        setNumPages(cached.numPages || 0);
      }
      if (cached.excelHtml) {
        setExcelHtml(cached.excelHtml);
      }
      setLoading(false);
      return;
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    setLoading(true);
    
    if (file.type === 'pdf' && file.fileHandle && file.fileHandle instanceof File) {
      const loadPdf = async () => {
        try {
          const arrayBuffer = await file.fileHandle.arrayBuffer();
          if (signal.aborted) return;
          
          const pdf = await (window as any).pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
          if (signal.aborted) return;
          
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          previewCache.set(file.id, { pdfDoc: pdf, numPages: pdf.numPages });
          clearOldCache();
          setLoading(false);
        } catch (err) {
          if (!signal.aborted) {
            console.error('PDF load error:', err);
            setLoading(false);
          }
        }
      };
      loadPdf();
    } else if ((file.type === 'excel' || file.type === 'csv') && file.fileHandle && file.fileHandle instanceof File) {
      const loadExcel = async () => {
        try {
          const arrayBuffer = await file.fileHandle.arrayBuffer();
          if (signal.aborted) return;
          
          const XLSX = (window as any).XLSX;
          if (!XLSX) throw new Error('XLSX library not loaded');

          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          if (signal.aborted) return;
          
          let html = '';
          workbook.SheetNames.forEach((sheetName: string) => {
            const sheet = workbook.Sheets[sheetName];
            const sheetHtml = XLSX.utils.sheet_to_html(sheet);
            const sanitizedName = sanitizeHtml(sheetName);
            html += `<div class="mb-6"><h3 class="text-lg font-bold mb-2 text-gray-800 dark:text-gray-200">${sanitizedName}</h3>${sheetHtml}</div>`;
          });
          
          if (signal.aborted) return;
          setExcelHtml(html);
          previewCache.set(file.id, { excelHtml: html });
          clearOldCache();
          setLoading(false);
        } catch (err) {
          if (!signal.aborted) {
            console.error('Excel load error:', err);
            setLoading(false);
          }
        }
      };
      loadExcel();
    } else {
      setLoading(false);
    }
  }, [file]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading preview...</p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

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
