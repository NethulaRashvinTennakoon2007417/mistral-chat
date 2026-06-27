'use client';

import { useState } from 'react';
import { X, Download, Copy, Check, FileText } from 'lucide-react';
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content || '');
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

  const handleExportMarkdown = () => {
    const blob = new Blob([content || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] border-l border-[var(--border)] animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] flex-shrink-0">
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
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 text-xs"
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {fileData && (
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-all duration-200 text-xs font-medium">
                <Download size={13} />
                Export
              </button>
              <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                <button
                  onClick={handleExportMarkdown}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] rounded-t-lg transition-colors"
                >
                  <FileText size={14} />
                  Export as Markdown
                </button>
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] rounded-b-lg transition-colors"
                >
                  <Download size={14} />
                  Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content - formatted text like Langdock */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-10 py-8">
          {content ? (
            <div className="prose prose-base dark:prose-invert max-w-none
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
          ) : (
            <div className="text-center py-20">
              <FileText size={32} className="mx-auto text-[var(--muted-foreground)] mb-3 opacity-40" />
              <p className="text-sm text-[var(--muted-foreground)]">No content to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
