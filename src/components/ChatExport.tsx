'use client';

import { useState } from 'react';
import { X, Download, FileText, FileJson, FileImage } from 'lucide-react';
import { Chat } from '@/types';

interface ChatExportProps {
  chat: Chat;
  onClose: () => void;
}

export function ChatExport({ chat, onClose }: ChatExportProps) {
  const [exporting, setExporting] = useState(false);

  const exportMarkdown = () => {
    setExporting(true);
    let md = `# ${chat.title}\n\n`;
    md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

    for (const msg of chat.messages) {
      const role = msg.role === 'user' ? '**You**' : '**Assistant**';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      md += `### ${role} _${time}_\n\n${msg.content}\n\n`;
      if (msg.attachments && msg.attachments.length > 0) {
        md += `_Attachments: ${msg.attachments.map(a => a.name).join(', ')}_\n\n`;
      }
      md += `---\n\n`;
    }

    downloadFile(md, `${sanitizeFilename(chat.title)}.md`, 'text/markdown');
    setExporting(false);
  };

  const exportJSON = () => {
    setExporting(true);
    const data = {
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      model: chat.model,
      messages: chat.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        attachments: m.attachments?.map(a => ({ name: a.name, type: a.type })) || [],
      })),
    };

    downloadFile(JSON.stringify(data, null, 2), `${sanitizeFilename(chat.title)}.json`, 'application/json');
    setExporting(false);
  };

  const exportText = () => {
    setExporting(true);
    let txt = `${chat.title}\n${'='.repeat(chat.title.length)}\n\n`;

    for (const msg of chat.messages) {
      const role = msg.role === 'user' ? 'You' : 'Assistant';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      txt += `[${role}] ${time}\n${msg.content}\n\n`;
    }

    downloadFile(txt, `${sanitizeFilename(chat.title)}.txt`, 'text/plain');
    setExporting(false);
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - 2 * margin;
      let y = margin;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(chat.title, maxWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 8 + 4;

      // Date
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(`Exported on ${new Date().toLocaleString()}`, margin, y);
      y += 8;
      doc.setTextColor(0, 0, 0);

      // Messages
      for (const msg of chat.messages) {
        if (y > 260) {
          doc.addPage();
          y = margin;
        }

        const role = msg.role === 'user' ? 'You' : 'Assistant';
        const time = new Date(msg.timestamp).toLocaleTimeString();

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${role} - ${time}`, margin, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(msg.content || '(empty)', maxWidth);
        doc.text(lines, margin, y);
        y += lines.length * 4.5 + 6;

        // Separator
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 6;
      }

      doc.save(`${sanitizeFilename(chat.title)}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
    setExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Download size={20} className="text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Export Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={exportMarkdown}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--primary)] transition-all duration-200 text-left group active:scale-[0.98] disabled:opacity-50"
          >
            <FileText size={20} className="text-blue-500" />
            <div>
              <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">Markdown</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">Formatted text with headers and separators</p>
            </div>
          </button>

          <button
            onClick={exportJSON}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--primary)] transition-all duration-200 text-left group active:scale-[0.98] disabled:opacity-50"
          >
            <FileJson size={20} className="text-green-500" />
            <div>
              <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">JSON</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">Structured data for import or backup</p>
            </div>
          </button>

          <button
            onClick={exportText}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--primary)] transition-all duration-200 text-left group active:scale-[0.98] disabled:opacity-50"
          >
            <FileText size={20} className="text-gray-500" />
            <div>
              <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">Plain Text</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">Simple text format for any editor</p>
            </div>
          </button>

          <button
            onClick={exportPDF}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--primary)] transition-all duration-200 text-left group active:scale-[0.98] disabled:opacity-50"
          >
            <FileImage size={20} className="text-red-500" />
            <div>
              <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">PDF</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">Downloadable document</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50);
}
