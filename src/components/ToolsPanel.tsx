'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Copy, Check, Download, Upload, Trash2, RefreshCw } from 'lucide-react';

type Tool = 'Word Counter' | 'Case Converter' | 'QR Generator' | 'Text Diff' | 'Lorem Ipsum' | 'Color Picker' | 'Image to PDF';

interface ToolsPanelProps {
  initialTool?: Tool | null;
  onBack?: () => void;
}

export function ToolsPanel({ initialTool, onBack }: ToolsPanelProps) {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(initialTool || null);

  useEffect(() => {
    const handler = (e: CustomEvent) => setSelectedTool(e.detail as Tool);
    window.addEventListener('select-tool', handler as EventListener);
    return () => window.removeEventListener('select-tool', handler as EventListener);
  }, []);

  useEffect(() => {
    if (initialTool) setSelectedTool(initialTool);
  }, [initialTool]);

  if (!selectedTool) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--background)] p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Tools</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Select a tool from the sidebar to get started</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg w-full">
          {[
            { name: 'Word Counter' as Tool, icon: '📝', desc: 'Count words & characters' },
            { name: 'Case Converter' as Tool, icon: '🔄', desc: 'UPPER, lower, Title' },
            { name: 'QR Generator' as Tool, icon: '📱', desc: 'Create QR codes' },
            { name: 'Text Diff' as Tool, icon: '🔍', desc: 'Compare two texts' },
            { name: 'Lorem Ipsum' as Tool, icon: '📄', desc: 'Placeholder text' },
            { name: 'Color Picker' as Tool, icon: '🎨', desc: 'Pick colors' },
            { name: 'Image to PDF' as Tool, icon: '🖼️', desc: 'Convert images to PDF' },
          ].map((tool) => (
            <button
              key={tool.name}
              onClick={() => setSelectedTool(tool.name)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--primary)] transition-all duration-200 active:scale-95"
            >
              <span className="text-2xl">{tool.icon}</span>
              <span className="text-sm font-medium text-[var(--foreground)]">{tool.name}</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">{tool.desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)]">
        <button
          onClick={() => setSelectedTool(null)}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-[var(--foreground)]">{selectedTool}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0">
        {selectedTool === 'Word Counter' && <WordCounter />}
        {selectedTool === 'Case Converter' && <CaseConverter />}
        {selectedTool === 'QR Generator' && <QRGenerator />}
        {selectedTool === 'Text Diff' && <TextDiff />}
        {selectedTool === 'Lorem Ipsum' && <LoremIpsum />}
        {selectedTool === 'Color Picker' && <ColorPicker />}
        {selectedTool === 'Image to PDF' && <ImageToPDF />}
      </div>
    </div>
  );
}

function WordCounter() {
  const [text, setText] = useState('');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const sentences = text.trim() ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0;
  const paragraphs = text.trim() ? text.split(/\n\n+/).filter(p => p.trim()).length : 0;

  return (
    <div className="max-w-2xl space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste your text here..."
        className="w-full h-48 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-[var(--foreground)] placeholder-[var(--muted-foreground)] resize-none focus:border-[var(--primary)] focus:outline-none transition-colors"
      />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Words', value: words },
          { label: 'Characters', value: chars },
          { label: 'No Spaces', value: charsNoSpaces },
          { label: 'Sentences', value: sentences },
          { label: 'Paragraphs', value: paragraphs },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-[var(--primary)]">{stat.value}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaseConverter() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cases = [
    { name: 'UPPER CASE', value: text.toUpperCase() },
    { name: 'lower case', value: text.toLowerCase() },
    { name: 'Title Case', value: text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) },
    { name: 'Sentence case', value: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() },
    { name: 'camelCase', value: text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()) },
    { name: 'snake_case', value: text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') },
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste your text here..."
        className="w-full h-32 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-[var(--foreground)] placeholder-[var(--muted-foreground)] resize-none focus:border-[var(--primary)] focus:outline-none transition-colors"
      />
      <div className="space-y-2">
        {cases.map((c) => (
          <div key={c.name} className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-lg p-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[var(--muted-foreground)] mb-1">{c.name}</p>
              <p className="text-sm text-[var(--foreground)] truncate">{c.value || '—'}</p>
            </div>
            <button
              onClick={() => copy(c.value)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all flex-shrink-0"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function QRGenerator() {
  const [text, setText] = useState('https://');
  const [size, setSize] = useState(200);

  const qrUrl = text
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`
    : '';

  return (
    <div className="max-w-2xl space-y-4">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter URL or text..."
        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none transition-colors"
      />
      <div className="flex items-center gap-2">
        <label className="text-sm text-[var(--muted-foreground)]">Size:</label>
        {[150, 200, 300, 400].map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              size === s ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
            }`}
          >
            {s}px
          </button>
        ))}
      </div>
      {qrUrl && (
        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <img src={qrUrl} alt="QR Code" className="rounded-lg" />
          <a
            href={qrUrl}
            download="qrcode.png"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all"
          >
            <Download size={14} />
            Download QR Code
          </a>
        </div>
      )}
    </div>
  );
}

function TextDiff() {
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');

  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const maxLen = Math.max(lines1.length, lines2.length);

  return (
    <div className="max-w-4xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Text A</p>
          <textarea
            value={text1}
            onChange={(e) => setText1(e.target.value)}
            placeholder="Paste first text..."
            className="w-full h-48 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] resize-none focus:border-[var(--primary)] focus:outline-none transition-colors font-mono"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Text B</p>
          <textarea
            value={text2}
            onChange={(e) => setText2(e.target.value)}
            placeholder="Paste second text..."
            className="w-full h-48 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] resize-none focus:border-[var(--primary)] focus:outline-none transition-colors font-mono"
          />
        </div>
      </div>
      {text1 && text2 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <p className="text-sm font-medium text-[var(--muted-foreground)] mb-3">Result</p>
          <div className="space-y-1 font-mono text-sm">
            {Array.from({ length: maxLen }).map((_, i) => {
              const a = lines1[i] ?? '';
              const b = lines2[i] ?? '';
              const isSame = a === b;
              return (
                <div key={i} className={`flex ${isSame ? '' : 'bg-red-500/10 dark:bg-red-500/20 rounded'}`}>
                  <span className="w-8 text-right pr-2 text-[var(--muted-foreground)] text-xs select-none">{i + 1}</span>
                  <span className={`flex-1 ${isSame ? 'text-[var(--muted-foreground)]' : 'text-red-500'}`}>
                    {isSame ? a : `− ${a}  + ${b}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LoremIpsum() {
  const [count, setCount] = useState(5);
  const [result, setResult] = useState('');

  const generate = useCallback(() => {
    const paragraphs = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
      'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
      'Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.',
      'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.',
    ];
    const shuffled = [...paragraphs].sort(() => Math.random() - 0.5);
    setResult(shuffled.slice(0, count).join('\n\n'));
  }, [count]);

  useEffect(() => { generate(); }, [generate]);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-[var(--muted-foreground)]">Paragraphs:</label>
        {[3, 5, 7, 10].map((n) => (
          <button
            key={n}
            onClick={() => setCount(n)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              count === n ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
            }`}
          >
            {n}
          </button>
        ))}
        <button onClick={generate} className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)] text-xs font-medium transition-all">
          <RefreshCw size={12} /> Regenerate
        </button>
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
        {result}
      </div>
    </div>
  );
}

function ColorPicker() {
  const [color, setColor] = useState('#d97706');
  const [copied, setCopied] = useState('');

  const hex = color;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const rgb = `rgb(${r}, ${g}, ${b})`;
  const hsl = (() => {
    const rr = r / 255, gg = g / 255, bb = b / 255;
    const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
    const l = (max + min) / 2;
    if (max === min) return `hsl(0, 0%, ${Math.round(l * 100)}%)`;
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === rr ? ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6 : max === gg ? ((bb - rr) / d + 2) / 6 : ((rr - gg) / d + 4) / 6;
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  })();

  const copyValue = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(val);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-20 h-20 rounded-xl border border-[var(--border)] cursor-pointer"
        />
        <div className="space-y-2">
          {[
            { label: 'HEX', value: hex },
            { label: 'RGB', value: rgb },
            { label: 'HSL', value: hsl },
          ].map((fmt) => (
            <button
              key={fmt.label}
              onClick={() => copyValue(fmt.value)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-all text-sm w-full"
            >
              <span className="text-[10px] text-[var(--muted-foreground)] w-8">{fmt.label}</span>
              <span className="font-mono text-[var(--foreground)] flex-1 text-left">{fmt.value}</span>
              {copied === fmt.value ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-[var(--muted-foreground)]" />}
            </button>
          ))}
        </div>
      </div>
      <div
        className="w-full h-32 rounded-xl border border-[var(--border)]"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

function ImageToPDF() {
  const [images, setImages] = useState<{ name: string; url: string; width: number; height: number }[]>([]);
  const [processing, setProcessing] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('images.pdf');

  const handleFiles = async (files: FileList) => {
    const newImages: { name: string; url: string; width: number; height: number }[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.src = url;
      });
      newImages.push({ name: file.name, url, width: img.width, height: img.height });
    }
    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveImage = (from: number, to: number) => {
    setImages((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const generatePDF = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < images.length; i++) {
        if (i > 0) pdf.addPage();
        const img = images[i];
        const ratio = Math.min(pageW / img.width, pageH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (pageW - w) / 2;
        const y = (pageH - h) / 2;
        pdf.addImage(img.url, 'JPEG', x, y, w, h);
      }

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(url);
      setPdfFileName('images.pdf');
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = pdfFileName;
    a.click();
  };

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* Left side - Upload & Image List */}
      <div className={`space-y-4 ${pdfBlobUrl ? 'w-1/2' : 'w-full max-w-2xl'}`}>
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
          className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:border-[var(--primary)] transition-colors cursor-pointer"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*';
            input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files) handleFiles(files);
            };
            input.click();
          }}
        >
          <div className="text-3xl mb-2">🖼️</div>
          <p className="text-sm font-medium text-[var(--foreground)]">Drop images here or click to upload</p>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Supports JPG, PNG, GIF, WebP</p>
        </div>

      {images.length > 0 && (
        <>
          <div className="space-y-2">
            {images.map((img, i) => (
              <div key={i} className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-lg p-3">
                <img src={img.url} alt={img.name} className="w-12 h-12 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-[var(--foreground)]">{img.name}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{img.width} × {img.height}px</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveImage(i, Math.max(0, i - 1))}
                    disabled={i === 0}
                    className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)] disabled:opacity-30 text-xs"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveImage(i, Math.min(images.length - 1, i + 1))}
                    disabled={i === images.length - 1}
                    className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)] disabled:opacity-30 text-xs"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeImage(i)}
                    className="w-7 h-7 rounded flex items-center justify-center hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={generatePDF}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50"
          >
            {processing ? 'Generating...' : `Generate PDF (${images.length} image${images.length > 1 ? 's' : ''})`}
          </button>
        </>
      )}
      </div>

      {pdfBlobUrl && (
        <div className="w-1/2 border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[var(--muted)] border-b border-[var(--border)]">
            <p className="text-sm font-medium text-[var(--foreground)]">{pdfFileName}</p>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 transition-all"
            >
              <Download size={12} />
              Download
            </button>
          </div>
          <iframe
            src={pdfBlobUrl}
            className="w-full border-none"
            style={{ height: '500px' }}
            title="PDF Preview"
          />
        </div>
      )}
    </div>
  );
}
