'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Copy, Check, Download, Trash2, RefreshCw } from 'lucide-react';

type ToolId =
  | 'word-counter' | 'case-converter' | 'text-diff' | 'lorem-ipsum'
  | 'find-replace' | 'remove-spaces' | 'sort-lines' | 'remove-duplicates'
  | 'json-formatter' | 'base64' | 'url-encode' | 'hash-generator' | 'uuid-generator' | 'regex-tester' | 'jwt-decoder'
  | 'color-picker' | 'image-to-pdf' | 'qr-generator';

interface ToolDef {
  id: ToolId;
  name: string;
  desc: string;
  icon: string;
}

interface Category {
  name: string;
  icon: string;
  tools: ToolDef[];
}

const categories: Category[] = [
  {
    name: 'Text',
    icon: '📝',
    tools: [
      { id: 'word-counter', name: 'Word Counter', desc: 'Count words & characters', icon: '📝' },
      { id: 'case-converter', name: 'Case Converter', desc: 'UPPER, lower, Title', icon: '🔄' },
      { id: 'text-diff', name: 'Text Diff', desc: 'Compare two texts', icon: '🔍' },
      { id: 'lorem-ipsum', name: 'Lorem Ipsum', desc: 'Placeholder text', icon: '📄' },
      { id: 'find-replace', name: 'Find & Replace', desc: 'Search and replace text', icon: '🔎' },
      { id: 'remove-spaces', name: 'Remove Extra Spaces', desc: 'Clean whitespace', icon: '✨' },
      { id: 'sort-lines', name: 'Sort Lines', desc: 'Sort text lines', icon: '📋' },
      { id: 'remove-duplicates', name: 'Remove Duplicates', desc: 'Remove duplicate lines', icon: '🗑️' },
    ],
  },
  {
    name: 'Developer',
    icon: '💻',
    tools: [
      { id: 'json-formatter', name: 'JSON Formatter', desc: 'Format & validate JSON', icon: '{ }' },
      { id: 'base64', name: 'Base64', desc: 'Encode & decode', icon: '🔐' },
      { id: 'url-encode', name: 'URL Encode', desc: 'Encode & decode URLs', icon: '🔗' },
      { id: 'hash-generator', name: 'Hash Generator', desc: 'MD5, SHA-256', icon: '#️⃣' },
      { id: 'uuid-generator', name: 'UUID Generator', desc: 'Generate UUIDs', icon: '🆔' },
      { id: 'regex-tester', name: 'Regex Tester', desc: 'Test regular expressions', icon: '⚡' },
      { id: 'jwt-decoder', name: 'JWT Decoder', desc: 'Decode JWT tokens', icon: '🎫' },
    ],
  },
  {
    name: 'Image',
    icon: '🖼️',
    tools: [
      { id: 'color-picker', name: 'Color Picker', desc: 'Pick colors', icon: '🎨' },
      { id: 'qr-generator', name: 'QR Generator', desc: 'Create QR codes', icon: '📱' },
      { id: 'image-to-pdf', name: 'Image to PDF', desc: 'Convert images to PDF', icon: '🖼️' },
    ],
  },
];

function getToolById(id: ToolId): ToolDef | undefined {
  for (const cat of categories) {
    const t = cat.tools.find((tool) => tool.id === id);
    if (t) return t;
  }
  return undefined;
}

interface ToolsPanelProps {
  initialTool?: ToolId | null;
  onBack?: () => void;
}

export function ToolsPanel({ initialTool, onBack }: ToolsPanelProps) {
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(initialTool || null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: CustomEvent) => setSelectedTool(e.detail as ToolId);
    window.addEventListener('select-tool', handler as EventListener);
    return () => window.removeEventListener('select-tool', handler as EventListener);
  }, []);

  useEffect(() => {
    if (initialTool) setSelectedTool(initialTool);
  }, [initialTool]);

  if (selectedTool) {
    const tool = getToolById(selectedTool);
    return (
      <div className="flex-1 flex flex-col bg-[var(--background)] overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)]">
          <button
            onClick={() => { setSelectedTool(null); setSelectedCategory(null); }}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-lg font-bold text-[var(--foreground)]">{tool?.icon}</span>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{tool?.name}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0">
          {selectedTool === 'word-counter' && <WordCounter />}
          {selectedTool === 'case-converter' && <CaseConverter />}
          {selectedTool === 'text-diff' && <TextDiff />}
          {selectedTool === 'lorem-ipsum' && <LoremIpsum />}
          {selectedTool === 'find-replace' && <FindReplace />}
          {selectedTool === 'remove-spaces' && <RemoveSpaces />}
          {selectedTool === 'sort-lines' && <SortLines />}
          {selectedTool === 'remove-duplicates' && <RemoveDuplicates />}
          {selectedTool === 'json-formatter' && <JSONFormatter />}
          {selectedTool === 'base64' && <Base64Tool />}
          {selectedTool === 'url-encode' && <URLEncode />}
          {selectedTool === 'hash-generator' && <HashGenerator />}
          {selectedTool === 'uuid-generator' && <UUIDGenerator />}
          {selectedTool === 'regex-tester' && <RegexTester />}
          {selectedTool === 'jwt-decoder' && <JWTDecoder />}
          {selectedTool === 'color-picker' && <ColorPicker />}
          {selectedTool === 'qr-generator' && <QRGenerator />}
          {selectedTool === 'image-to-pdf' && <ImageToPDF />}
        </div>
      </div>
    );
  }

  if (selectedCategory) {
    const cat = categories.find((c) => c.name === selectedCategory);
    return (
      <div className="flex-1 flex flex-col bg-[var(--background)] overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)]">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-lg">{cat?.icon}</span>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{cat?.name} Tools</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
            {cat?.tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--primary)] transition-all duration-200 active:scale-95"
              >
                <span className="text-2xl">{tool.icon}</span>
                <span className="text-sm font-medium text-[var(--foreground)]">{tool.name}</span>
                <span className="text-[10px] text-[var(--muted-foreground)]">{tool.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[var(--background)] p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Tools</h2>
        <p className="text-sm text-[var(--muted-foreground)]">Free tools that run in your browser — nothing uploaded</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg w-full">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--primary)] transition-all duration-200 active:scale-95"
          >
            <span className="text-2xl">{cat.icon}</span>
            <span className="text-sm font-medium text-[var(--foreground)]">{cat.name}</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">{cat.tools.length} tools</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all flex-shrink-0"
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  );
}

const inputClass = "w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none transition-colors font-mono";
const textareaClass = "w-full h-48 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] resize-none focus:border-[var(--primary)] focus:outline-none transition-colors font-mono";

function WordCounter() {
  const [text, setText] = useState('');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const sentences = text.trim() ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0;
  const paragraphs = text.trim() ? text.split(/\n\n+/).filter(p => p.trim()).length : 0;
  const lines = text.trim() ? text.split('\n').length : 0;

  return (
    <div className="max-w-2xl space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type or paste your text here..."
        className="w-full h-48 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-[var(--foreground)] placeholder-[var(--muted-foreground)] resize-none focus:border-[var(--primary)] focus:outline-none transition-colors"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Words', value: words },
          { label: 'Characters', value: chars },
          { label: 'No Spaces', value: charsNoSpaces },
          { label: 'Sentences', value: sentences },
          { label: 'Paragraphs', value: paragraphs },
          { label: 'Lines', value: lines },
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
  const cases = [
    { name: 'UPPER CASE', value: text.toUpperCase() },
    { name: 'lower case', value: text.toLowerCase() },
    { name: 'Title Case', value: text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) },
    { name: 'Sentence case', value: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() },
    { name: 'camelCase', value: text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()) },
    { name: 'snake_case', value: text.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') },
    { name: 'kebab-case', value: text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') },
    { name: 'CONSTANT_CASE', value: text.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '') },
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
            <CopyButton text={c.value} />
          </div>
        ))}
      </div>
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
          <textarea value={text1} onChange={(e) => setText1(e.target.value)} placeholder="Paste first text..." className={textareaClass} />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)] mb-2">Text B</p>
          <textarea value={text2} onChange={(e) => setText2(e.target.value)} placeholder="Paste second text..." className={textareaClass} />
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
  const generate = useCallback(() => {
    const shuffled = [...paragraphs].sort(() => Math.random() - 0.5);
    setResult(shuffled.slice(0, count).join('\n\n'));
  }, [count]);
  useEffect(() => { generate(); }, [generate]);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-[var(--muted-foreground)]">Paragraphs:</label>
        {[3, 5, 7, 10].map((n) => (
          <button key={n} onClick={() => setCount(n)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${count === n ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'}`}>{n}</button>
        ))}
        <button onClick={generate} className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)] text-xs font-medium transition-all">
          <RefreshCw size={12} /> Regenerate
        </button>
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{result}</div>
    </div>
  );
}

function FindReplace() {
  const [text, setText] = useState('');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const getResult = () => {
    if (!find) return text;
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = useRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return text.replace(new RegExp(pattern, flags), replace);
    } catch {
      return text;
    }
  };

  const result = getResult();
  const matchCount = (() => {
    if (!find) return 0;
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = useRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return (text.match(new RegExp(pattern, flags)) || []).length;
    } catch { return 0; }
  })();

  return (
    <div className="max-w-2xl space-y-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter your text here..." className={textareaClass} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Find</label>
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search text or regex..." className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Replace with</label>
          <input value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="Replacement text..." className={inputClass} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
          <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} className="rounded" /> Regex
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer">
          <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} className="rounded" /> Case sensitive
        </label>
        {find && <span className="text-xs text-[var(--muted-foreground)]">{matchCount} match{matchCount !== 1 ? 'es' : ''}</span>}
      </div>
      {text && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Result</p>
            <CopyButton text={result} />
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{result}</div>
        </div>
      )}
    </div>
  );
}

function RemoveSpaces() {
  const [text, setText] = useState('');
  const result = text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '');
  const saved = text.length - result.length;

  return (
    <div className="max-w-2xl space-y-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text with extra spaces..." className={textareaClass} />
      {text && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Result {saved > 0 && <span className="text-green-500">({saved} chars removed)</span>}</p>
            <CopyButton text={result} />
          </div>
          <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{result}</div>
        </div>
      )}
    </div>
  );
}

function SortLines() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'az' | 'za' | 'len' | 'random'>('az');

  const sortLines = () => {
    const lines = text.split('\n');
    switch (mode) {
      case 'az': return [...lines].sort((a, b) => a.localeCompare(b));
      case 'za': return [...lines].sort((a, b) => b.localeCompare(a));
      case 'len': return [...lines].sort((a, b) => a.length - b.length);
      case 'random': return [...lines].sort(() => Math.random() - 0.5);
    }
  };

  const result = text ? sortLines().join('\n') : '';
  const modes = [
    { id: 'az' as const, label: 'A → Z' },
    { id: 'za' as const, label: 'Z → A' },
    { id: 'len' as const, label: 'By length' },
    { id: 'random' as const, label: 'Random' },
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter lines of text..." className={textareaClass} />
      <div className="flex items-center gap-2 flex-wrap">
        {modes.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${mode === m.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'}`}>{m.label}</button>
        ))}
      </div>
      {result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Sorted ({result.split('\n').length} lines)</p>
            <CopyButton text={result} />
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{result}</div>
        </div>
      )}
    </div>
  );
}

function RemoveDuplicates() {
  const [text, setText] = useState('');
  const lines = text.split('\n');
  const unique = [...new Set(lines)];
  const removed = lines.length - unique.length;
  const result = unique.join('\n');

  return (
    <div className="max-w-2xl space-y-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text with duplicate lines..." className={textareaClass} />
      {text && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              {removed > 0 ? `${removed} duplicate${removed !== 1 ? 's' : ''} removed` : 'No duplicates found'}
            </p>
            <CopyButton text={result} />
          </div>
          <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{result}</div>
        </div>
      )}
    </div>
  );
}

function JSONFormatter() {
  const [text, setText] = useState('');
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const format = () => {
    try {
      const parsed = JSON.parse(text);
      setResult(JSON.stringify(parsed, null, indent));
      setError('');
    } catch (e: any) {
      setError(e.message);
      setResult('');
    }
  };

  const minify = () => {
    try {
      const parsed = JSON.parse(text);
      setResult(JSON.stringify(parsed));
      setError('');
    } catch (e: any) {
      setError(e.message);
      setResult('');
    }
  };

  useEffect(() => {
    if (text.trim()) format();
    else { setResult(''); setError(''); }
  }, [text, indent]);

  return (
    <div className="max-w-2xl space-y-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder='Paste JSON here...\n{\n  "key": "value"\n}' className={textareaClass} />
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-[var(--muted-foreground)]">Indent:</label>
        {[2, 4].map((n) => (
          <button key={n} onClick={() => setIndent(n)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${indent === n ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>{n} spaces</button>
        ))}
        <button onClick={minify} className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)] transition-all">Minify</button>
      </div>
      {error && <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}
      {result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Formatted</p>
            <CopyButton text={result} />
          </div>
          <pre className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{result}</pre>
        </div>
      )}
    </div>
  );
}

function Base64Tool() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [error, setError] = useState('');

  const process = () => {
    try {
      setError('');
      if (mode === 'encode') {
        return btoa(unescape(encodeURIComponent(text)));
      } else {
        return decodeURIComponent(escape(atob(text)));
      }
    } catch (e: any) {
      setError('Invalid input for decoding');
      return '';
    }
  };

  const result = text ? process() : '';

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        {(['encode', 'decode'] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); setError(''); }} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${mode === m ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'}`}>{m === 'encode' ? 'Encode' : 'Decode'}</button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 to decode...'} className={textareaClass} />
      {error && <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}
      {result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Result</p>
            <CopyButton text={result} />
          </div>
          <pre className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono max-h-64 overflow-y-auto break-all">{result}</pre>
        </div>
      )}
    </div>
  );
}

function URLEncode() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [error, setError] = useState('');

  const process = () => {
    try {
      setError('');
      return mode === 'encode' ? encodeURIComponent(text) : decodeURIComponent(text);
    } catch (e: any) {
      setError('Invalid input');
      return '';
    }
  };

  const result = text ? process() : '';

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        {(['encode', 'decode'] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); setError(''); }} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${mode === m ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'}`}>{m === 'encode' ? 'Encode' : 'Decode'}</button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'encode' ? 'Enter text to URL encode...' : 'Enter URL-encoded text to decode...'} className={textareaClass} />
      {error && <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}
      {result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Result</p>
            <CopyButton text={result} />
          </div>
          <pre className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono max-h-64 overflow-y-auto break-all">{result}</pre>
        </div>
      )}
    </div>
  );
}

async function computeHash(text: string, algorithm: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function HashGenerator() {
  const [text, setText] = useState('');
  const [algorithm, setAlgorithm] = useState('SHA-256');
  const [results, setResults] = useState<Record<string, string>>({});

  const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

  const generate = async () => {
    if (!text) return;
    const newResults: Record<string, string> = {};
    for (const algo of algorithms) {
      newResults[algo] = await computeHash(text, algo);
    }
    setResults(newResults);
  };

  useEffect(() => {
    if (text) generate();
    else setResults({});
  }, [text]);

  return (
    <div className="max-w-2xl space-y-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text to hash..." className={textareaClass} />
      {Object.keys(results).length > 0 && (
        <div className="space-y-2">
          {algorithms.map((algo) => (
            <div key={algo} className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[var(--muted-foreground)] mb-1">{algo}</p>
                <p className="text-xs text-[var(--foreground)] truncate font-mono">{results[algo]}</p>
              </div>
              <CopyButton text={results[algo]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UUIDGenerator() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);

  const generate = () => {
    const newUuids: string[] = [];
    for (let i = 0; i < count; i++) {
      newUuids.push(crypto.randomUUID());
    }
    setUuids(newUuids);
  };

  useEffect(() => { generate(); }, [count]);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-[var(--muted-foreground)]">Count:</label>
        {[1, 5, 10, 20].map((n) => (
          <button key={n} onClick={() => setCount(n)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${count === n ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'}`}>{n}</button>
        ))}
        <button onClick={generate} className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)] text-xs font-medium transition-all">
          <RefreshCw size={12} /> Regenerate
        </button>
      </div>
      <div className="space-y-2">
        {uuids.map((uuid, i) => (
          <div key={i} className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-lg p-3">
            <span className="text-sm font-mono text-[var(--foreground)] flex-1">{uuid}</span>
            <CopyButton text={uuid} />
          </div>
        ))}
      </div>
      <button onClick={() => { navigator.clipboard.writeText(uuids.join('\n')); }} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-xl text-sm font-medium hover:bg-[var(--border)] transition-all">
        <Copy size={14} /> Copy all
      </button>
    </div>
  );
}

function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [testString, setTestString] = useState('');
  const [error, setError] = useState('');

  const getMatches = () => {
    if (!pattern || !testString) return [];
    try {
      setError('');
      const regex = new RegExp(pattern, flags);
      const matches: { match: string; index: number }[] = [];
      let m;
      if (flags.includes('g')) {
        while ((m = regex.exec(testString)) !== null) {
          matches.push({ match: m[0], index: m.index });
          if (m.index === regex.lastIndex) regex.lastIndex++;
        }
      } else {
        m = regex.exec(testString);
        if (m) matches.push({ match: m[0], index: m.index });
      }
      return matches;
    } catch (e: any) {
      setError(e.message);
      return [];
    }
  };

  const matches = getMatches();

  const highlightText = () => {
    if (!pattern || !testString || error) return testString;
    try {
      const regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
      return testString.replace(regex, (m) => `\x01${m}\x02`);
    } catch { return testString; }
  };

  const highlighted = highlightText().split(/(\x01|\x02)/).reduce<{ parts: React.ReactNode[]; inMatch: boolean }>((acc, part) => {
    if (part === '\x01') return { ...acc, inMatch: true };
    if (part === '\x02') return { ...acc, inMatch: false };
    acc.parts.push(acc.inMatch
      ? <mark key={acc.parts.length} className="bg-yellow-500/30 text-[var(--foreground)] rounded px-0.5">{part}</mark>
      : <span key={acc.parts.length}>{part}</span>
    );
    return acc;
  }, { parts: [], inMatch: false }).parts;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Regex pattern..." className={inputClass} />
        <input value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="Flags" className="w-16 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--foreground)] text-center font-mono focus:border-[var(--primary)] focus:outline-none transition-colors" />
      </div>
      <textarea value={testString} onChange={(e) => setTestString(e.target.value)} placeholder="Enter test string..." className={textareaClass} />
      {error && <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}
      {pattern && testString && !error && (
        <div className="space-y-3">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-sm font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{highlighted}</div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-sm font-medium text-[var(--muted-foreground)] mb-2">{matches.length} match{matches.length !== 1 ? 'es' : ''}</p>
            {matches.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {matches.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[var(--muted-foreground)]">#{i + 1}</span>
                    <span className="text-[var(--primary)]">{m.match}</span>
                    <span className="text-[var(--muted-foreground)]">at index {m.index}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function JWTDecoder() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const decode = () => {
    try {
      setError('');
      const parts = token.trim().split('.');
      if (parts.length < 2) throw new Error('Invalid JWT format');
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return { header, payload, signature: parts[2] || '' };
    } catch (e: any) {
      setError('Invalid JWT token');
      return null;
    }
  };

  const result = token.trim() ? decode() : null;

  return (
    <div className="max-w-2xl space-y-4">
      <textarea
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Paste a JWT token here..."
        className={textareaClass}
      />
      {error && <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">{error}</div>}
      {result && (
        <div className="space-y-3">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Header</p>
              <CopyButton text={JSON.stringify(result.header, null, 2)} />
            </div>
            <pre className="text-xs font-mono text-[var(--foreground)] whitespace-pre-wrap">{JSON.stringify(result.header, null, 2)}</pre>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Payload</p>
              <CopyButton text={JSON.stringify(result.payload, null, 2)} />
            </div>
            <pre className="text-xs font-mono text-[var(--foreground)] whitespace-pre-wrap">{JSON.stringify(result.payload, null, 2)}</pre>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Signature</p>
              <CopyButton text={result.signature} />
            </div>
            <p className="text-xs font-mono text-[var(--foreground)] break-all">{result.signature}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorPicker() {
  const [color, setColor] = useState('#d97706');
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

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-4">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-20 h-20 rounded-xl border border-[var(--border)] cursor-pointer" />
        <div className="space-y-2">
          {[
            { label: 'HEX', value: hex },
            { label: 'RGB', value: rgb },
            { label: 'HSL', value: hsl },
          ].map((fmt) => (
            <div key={fmt.label} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm">
              <span className="text-[10px] text-[var(--muted-foreground)] w-8">{fmt.label}</span>
              <span className="font-mono text-[var(--foreground)] flex-1">{fmt.value}</span>
              <CopyButton text={fmt.value} />
            </div>
          ))}
        </div>
      </div>
      <div className="w-full h-32 rounded-xl border border-[var(--border)]" style={{ backgroundColor: color }} />
    </div>
  );
}

function QRGenerator() {
  const [text, setText] = useState('https://');
  const [size, setSize] = useState(200);
  const qrUrl = text ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}` : '';

  return (
    <div className="max-w-2xl space-y-4">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter URL or text..." className={inputClass} />
      <div className="flex items-center gap-2">
        <label className="text-sm text-[var(--muted-foreground)]">Size:</label>
        {[150, 200, 300, 400].map((s) => (
          <button key={s} onClick={() => setSize(s)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${size === s ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'}`}>{s}px</button>
        ))}
      </div>
      {qrUrl && (
        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <img src={qrUrl} alt="QR Code" className="rounded-lg" />
          <a href={qrUrl} download="qrcode.png" className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all">
            <Download size={14} /> Download QR Code
          </a>
        </div>
      )}
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
    setImages((prev) => { URL.revokeObjectURL(prev[index].url); return prev.filter((_, i) => i !== index); });
  };

  const moveImage = (from: number, to: number) => {
    setImages((prev) => { const arr = [...prev]; const [item] = arr.splice(from, 1); arr.splice(to, 0, item); return arr; });
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
        pdf.addImage(img.url, 'JPEG', (pageW - w) / 2, (pageH - h) / 2, w, h);
      }
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(url);
      setPdfFileName('images.pdf');
    } catch (err) { console.error('PDF generation failed:', err); }
    finally { setProcessing(false); }
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
      <div className={`space-y-4 ${pdfBlobUrl ? 'w-1/3' : 'w-full max-w-2xl'}`}>
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
          className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:border-[var(--primary)] transition-colors cursor-pointer"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*';
            input.onchange = (e) => { const files = (e.target as HTMLInputElement).files; if (files) handleFiles(files); };
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
                    <button onClick={() => moveImage(i, Math.max(0, i - 1))} disabled={i === 0} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)] disabled:opacity-30 text-xs">↑</button>
                    <button onClick={() => moveImage(i, Math.min(images.length - 1, i + 1))} disabled={i === images.length - 1} className="w-7 h-7 rounded flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)] disabled:opacity-30 text-xs">↓</button>
                    <button onClick={() => removeImage(i)} className="w-7 h-7 rounded flex items-center justify-center hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={generatePDF} disabled={processing} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50">
              {processing ? 'Generating...' : `Generate PDF (${images.length} image${images.length > 1 ? 's' : ''})`}
            </button>
          </>
        )}
      </div>
      {pdfBlobUrl && (
        <div className="w-2/3 border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[var(--muted)] border-b border-[var(--border)]">
            <p className="text-sm font-medium text-[var(--foreground)]">{pdfFileName}</p>
            <button onClick={downloadPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 transition-all">
              <Download size={12} /> Download
            </button>
          </div>
          <iframe src={pdfBlobUrl} className="w-full border-none" style={{ height: '500px' }} title="PDF Preview" />
        </div>
      )}
    </div>
  );
}
