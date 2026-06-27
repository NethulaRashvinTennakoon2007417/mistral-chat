'use client';

import { useState, useRef } from 'react';
import { X, Download, Copy, Check, FileText, Bold, Italic, Strikethrough, Heading1, Undo2, Redo2, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DocumentViewerProps {
  title: string;
  content?: string;
  fileName?: string;
  fileData?: string;
  onClose: () => void;
}

export function DocumentViewer({ title, content, fileName, fileData, onClose }: DocumentViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'pdf'>('formatted');
  const contentRef = useRef<HTMLDivElement>(null);

  const isPDF = fileData?.startsWith('data:application/pdf');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    if (!fileData) return;
    const a = document.createElement('a');
    a.href = fileData;
    a.download = fileName || 'document.pdf';
    a.click();
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([content || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportText = () => {
    const blob = new Blob([content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] border-l border-[var(--border)] animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] flex-shrink-0 bg-[var(--background)]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 flex-shrink-0"
          >
            <X size={15} />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-[var(--foreground)] truncate max-w-[200px]">{title}</h2>
            {fileName && (
              <p className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[200px]">{fileName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 text-xs"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {isPDF && (
            <div className="flex items-center bg-[var(--muted)] rounded-md p-0.5">
              <button
                onClick={() => setViewMode('formatted')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all duration-200 ${
                  viewMode === 'formatted'
                    ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setViewMode('pdf')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all duration-200 ${
                  viewMode === 'pdf'
                    ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                PDF
              </button>
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-all duration-200 text-xs font-medium"
            >
              Export
              <ChevronDown size={11} />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 overflow-hidden">
                  {isPDF && (
                    <button
                      onClick={handleDownloadPDF}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                    >
                      <FileText size={13} />
                      Download PDF
                    </button>
                  )}
                  <button
                    onClick={handleExportMarkdown}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <FileText size={13} />
                    Export as Markdown
                  </button>
                  <button
                    onClick={handleExportText}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <FileText size={13} />
                    Export as Text
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {viewMode === 'formatted' && (
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--background)] flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowHeadingMenu(!showHeadingMenu)}
              className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 text-xs"
            >
              <Heading1 size={14} />
              <ChevronDown size={10} />
            </button>
            {showHeadingMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHeadingMenu(false)} />
                <div className="absolute left-0 top-full mt-1 w-36 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => { execCommand('formatBlock', 'h1'); setShowHeadingMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors text-left font-bold"
                  >
                    Heading 1
                  </button>
                  <button
                    onClick={() => { execCommand('formatBlock', 'h2'); setShowHeadingMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors text-left font-semibold"
                  >
                    Heading 2
                  </button>
                  <button
                    onClick={() => { execCommand('formatBlock', 'h3'); setShowHeadingMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors text-left font-medium"
                  >
                    Heading 3
                  </button>
                  <button
                    onClick={() => { execCommand('formatBlock', 'p'); setShowHeadingMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors text-left"
                  >
                    Paragraph
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-4 bg-[var(--border)] mx-1" />

          <button
            onClick={() => execCommand('bold')}
            className="flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => execCommand('italic')}
            className="flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
            title="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => execCommand('strikeThrough')}
            className="flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
            title="Strikethrough"
          >
            <Strikethrough size={14} />
          </button>

          <div className="w-px h-4 bg-[var(--border)] mx-1" />

          <button
            onClick={() => execCommand('undo')}
            className="flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
            title="Undo"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={() => execCommand('redo')}
            className="flex items-center justify-center w-7 h-7 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
            title="Redo"
          >
            <Redo2 size={14} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {viewMode === 'pdf' && isPDF ? (
          <iframe
            src={fileData}
            className="w-full h-full border-none"
            title={title}
          />
        ) : content ? (
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            className="h-full overflow-y-auto px-10 py-8 focus:outline-none"
          >
            <div className="max-w-3xl mx-auto prose prose-base dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-[var(--foreground)] prose-headings:tracking-tight
              prose-h1:text-2xl prose-h1:mb-6 prose-h1:mt-0
              prose-h2:text-xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:pb-2 prose-h2:border-b prose-h2:border-[var(--border)]
              prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-6
              prose-p:text-[var(--foreground)] prose-p:leading-[1.8] prose-p:mb-4
              prose-li:text-[var(--foreground)] prose-li:leading-[1.8]
              prose-ol:space-y-2 prose-ul:space-y-2
              prose-strong:text-[var(--foreground)] prose-strong:font-semibold
              prose-code:text-[var(--primary)] prose-code:bg-[var(--muted)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal
              prose-pre:bg-[var(--muted)] prose-pre:border prose-pre:border-[var(--border)] prose-pre:rounded-lg
              prose-blockquote:border-l-[var(--primary)] prose-blockquote:text-[var(--muted-foreground)] prose-blockquote:italic
              prose-a:text-[var(--primary)] prose-a:no-underline hover:prose-a:underline
              prose-hr:border-[var(--border)] prose-hr:my-8
            ">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center mb-4">
              <FileText size={28} className="text-[var(--muted-foreground)] opacity-50" />
            </div>
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">No content to display</p>
            <p className="text-xs text-[var(--muted-foreground)]">This document has no extractable text content.</p>
            {isPDF && (
              <button
                onClick={() => setViewMode('pdf')}
                className="mt-4 px-3 py-1.5 rounded-md bg-[var(--foreground)] text-[var(--background)] text-xs font-medium hover:opacity-90 transition-all duration-200"
              >
                View as PDF
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
