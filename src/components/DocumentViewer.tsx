'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Copy, Check, FileText, ChevronDown, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface DocumentViewerProps {
  title: string;
  content?: string;
  fileName?: string;
  fileData?: string;
  onClose: () => void;
}

export function DocumentViewer({ title, content, fileName, fileData, onClose }: DocumentViewerProps) {
  const [copied, setCopied] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [rendering, setRendering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load PDF document
  useEffect(() => {
    if (!fileData) return;

    const loadPdf = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        let data: ArrayBuffer;
        if (fileData.startsWith('data:')) {
          const response = await fetch(fileData);
          data = await response.arrayBuffer();
        } else {
          const binary = atob(fileData);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          data = bytes.buffer;
        }

        const doc = await pdfjsLib.getDocument({ data }).promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error('Failed to load PDF:', err);
      }
    };

    loadPdf();
  }, [fileData]);

  // Render current page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current || rendering) return;

    setRendering(true);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error('Failed to render page:', err);
    }
    setRendering(false);
  }, [pdfDoc, scale, rendering]);

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, scale, renderPage]);

  const handleCopy = async () => {
    const text = content || 'PDF content';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!fileData) return;
    const a = document.createElement('a');
    a.href = fileData;
    a.download = fileName || 'document.pdf';
    a.click();
  };

  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const prevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const nextPage = () => setCurrentPage(p => Math.min(numPages, p + 1));

  const hasPdf = !!fileData;

  return (
    <div className="flex flex-col h-full bg-[var(--background)] border-l border-[var(--border)] animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 flex-shrink-0"
          >
            <X size={16} />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--foreground)] truncate">{title}</h2>
            {fileName && (
              <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                <FileText size={10} />
                {fileName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {hasPdf && (
            <>
              <button onClick={zoomOut} className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all" title="Zoom out">
                <ZoomOut size={14} />
              </button>
              <span className="text-xs text-[var(--muted-foreground)] min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all" title="Zoom in">
                <ZoomIn size={14} />
              </button>
              <div className="w-px h-5 bg-[var(--border)] mx-1" />
            </>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 text-xs"
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {hasPdf && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-all duration-200 text-xs font-medium"
            >
              <Download size={13} />
              Download
            </button>
          )}
        </div>
      </div>

      {/* PDF Renderer */}
      {hasPdf ? (
        <>
          {/* Page Navigation */}
          {numPages > 0 && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-[var(--border)] bg-[var(--background)]">
              <button
                onClick={prevPage}
                disabled={currentPage <= 1}
                className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-[var(--muted-foreground)]">
                Page {currentPage} of {numPages}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage >= numPages}
                className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Canvas Container */}
          <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 dark:bg-[#2a2a2a] flex justify-center p-4">
            <canvas
              ref={canvasRef}
              className="shadow-lg rounded-sm bg-white"
            />
          </div>
        </>
      ) : (
        /* Text Content Fallback */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-8">
            <div className="prose prose-sm dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-[var(--foreground)]
              prose-h1:text-2xl prose-h1:mb-4
              prose-h2:text-xl prose-h2:mb-3
              prose-p:text-[var(--foreground)] prose-p:leading-relaxed
              prose-strong:text-[var(--foreground)]
            ">
              {content || 'No content available'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
