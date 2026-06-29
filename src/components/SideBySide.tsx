'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Send, Copy, Check, Loader2, ArrowLeftRight } from 'lucide-react';
import { MistralModel, MISTRAL_MODELS, Message as MessageType } from '@/types';
import { streamChatCompletion } from '@/lib/mistral';
import { detectModel } from '@/lib/auto-model';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SideBySideProps {
  apiKey: string;
  systemPrompt?: string;
  onClose: () => void;
}

interface ComparisonResult {
  modelA: { model: MistralModel; content: string; loading: boolean; time: number };
  modelB: { model: MistralModel; content: string; loading: boolean; time: number };
}

export function SideBySide({ apiKey, systemPrompt, onClose }: SideBySideProps) {
  const [prompt, setPrompt] = useState('');
  const [modelA, setModelA] = useState<MistralModel>('mistral-small-latest');
  const [modelB, setModelB] = useState<MistralModel>('mistral-large-latest');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const abortARef = useRef<AbortController | null>(null);
  const abortBRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runComparison = useCallback(async () => {
    if (!prompt.trim() || isRunning) return;
    setIsRunning(true);

    const initial: ComparisonResult = {
      modelA: { model: modelA, content: '', loading: true, time: 0 },
      modelB: { model: modelB, content: '', loading: true, time: 0 },
    };
    setResult(initial);

    const userMsg: MessageType = { id: '1', role: 'user', content: prompt, timestamp: new Date() };

    // Run both in parallel
    const runModel = async (
      model: MistralModel,
      updateFn: (updater: (prev: ComparisonResult) => ComparisonResult) => void,
      side: 'modelA' | 'modelB'
    ) => {
      const start = Date.now();
      abortARef.current = side === 'modelA' ? new AbortController() : abortARef.current;
      abortBRef.current = side === 'modelB' ? new AbortController() : abortBRef.current;
      const abort = side === 'modelA' ? abortARef.current : abortBRef.current;

      let content = '';
      try {
        const resolved = detectModel(prompt, undefined, model);
        for await (const chunk of streamChatCompletion(apiKey, [userMsg], resolved, 0.7, 2048, systemPrompt)) {
          if (abort?.signal.aborted) break;
          content += chunk;
          updateFn((prev) => ({
            ...prev,
            [side]: { ...prev[side], content, loading: true, time: Date.now() - start },
          }));
        }
      } catch (err) {
        content += `\n\nError: ${err instanceof Error ? err.message : 'Failed'}`;
      }
      updateFn((prev) => ({
        ...prev,
        [side]: { ...prev[side], content, loading: false, time: Date.now() - start },
      }));
    };

    await Promise.all([
      runModel(modelA, setResult, 'modelA'),
      runModel(modelB, setResult, 'modelB'),
    ]);
    setIsRunning(false);
  }, [prompt, modelA, modelB, apiKey, systemPrompt, isRunning]);

  const stopAll = () => {
    abortARef.current?.abort();
    abortBRef.current?.abort();
    setIsRunning(false);
    if (result) {
      setResult({
        ...result,
        modelA: { ...result.modelA, loading: false },
        modelB: { ...result.modelB, loading: false },
      });
    }
  };

  const swapModels = () => {
    setModelA(modelB);
    setModelB(modelA);
    if (result) {
      setResult({
        modelA: { ...result.modelB, model: modelB },
        modelB: { ...result.modelA, model: modelA },
      });
    }
  };

  const MODEL_OPTIONS = Object.entries(MISTRAL_MODELS)
    .filter(([k]) => k !== 'auto')
    .map(([key, val]) => ({ key: key as MistralModel, name: val.name }));

  const renderResult = (data: ComparisonResult['modelA'], label: string) => (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--muted)]">
        <span className="text-xs font-semibold text-[var(--foreground)]">{label}</span>
        {data.time > 0 && (
          <span className="text-[10px] text-[var(--muted-foreground)]">{(data.time / 1000).toFixed(1)}s</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm">
        {data.loading && !data.content && (
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Generating...</span>
          </div>
        )}
        {data.content && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" className="rounded-xl text-xs">
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>{children}</code>
                  );
                },
              }}
            >
              {data.content}
            </ReactMarkdown>
          </div>
        )}
        {!data.loading && !data.content && (
          <p className="text-xs text-[var(--muted-foreground)] italic">No response yet</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Side-by-Side Comparison</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Model Selection */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border)]">
          <select
            value={modelA}
            onChange={(e) => setModelA(e.target.value as MistralModel)}
            className="flex-1 bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          >
            {MODEL_OPTIONS.map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
          </select>
          <button
            onClick={swapModels}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-95"
            title="Swap models"
          >
            <ArrowLeftRight size={16} />
          </button>
          <select
            value={modelB}
            onChange={(e) => setModelB(e.target.value as MistralModel)}
            className="flex-1 bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          >
            {MODEL_OPTIONS.map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
          </select>
        </div>

        {/* Results */}
        {result && (
          <div className="flex flex-1 min-h-0 divide-x divide-[var(--border)]">
            {renderResult(result.modelA, MISTRAL_MODELS[modelA].name)}
            {renderResult(result.modelB, MISTRAL_MODELS[modelB].name)}
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-4 border-t border-[var(--border)]">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runComparison(); } }}
              placeholder="Enter a prompt to compare both models..."
              className="flex-1 bg-[var(--muted)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none resize-none min-h-[44px] max-h-[120px]"
              rows={1}
            />
            {isRunning ? (
              <button
                onClick={stopAll}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all duration-200 active:scale-95 flex-shrink-0"
              >
                <X size={18} />
              </button>
            ) : (
              <button
                onClick={runComparison}
                disabled={!prompt.trim()}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--foreground)] text-[var(--background)] disabled:opacity-30 hover:opacity-90 transition-all duration-200 active:scale-95 flex-shrink-0"
              >
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
