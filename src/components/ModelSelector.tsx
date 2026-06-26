'use client';

import { useState } from 'react';
import { MistralModel, MISTRAL_MODELS } from '@/types';
import { ChevronDown, Check, Zap, Brain, Code, Eye } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: MistralModel;
  onSelect: (model: MistralModel) => void;
}

const MODEL_ICONS: Record<string, React.ReactNode> = {
  'mistral-small-latest': <Zap size={14} className="text-blue-500" />,
  'mistral-medium-latest': <Brain size={14} className="text-purple-500" />,
  'mistral-large-latest': <Brain size={14} className="text-orange-500" />,
  'open-mixtral-8x7b': <Zap size={14} className="text-cyan-500" />,
  'open-mixtral-8x22b': <Brain size={14} className="text-cyan-500" />,
  'open-mistral-nemo': <Brain size={14} className="text-teal-500" />,
  'codestral-latest': <Code size={14} className="text-pink-500" />,
  'pixtral-large-latest': <Eye size={14} className="text-purple-500" />,
};

export function ModelSelector({ selectedModel, onSelect }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors text-sm h-8"
      >
        {MODEL_ICONS[selectedModel]}
        <span className="font-medium">{MISTRAL_MODELS[selectedModel].name}</span>
        <ChevronDown size={12} className={`text-[var(--muted-foreground)] transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-72 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden modal-panel">
            <div className="p-2 border-b border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] px-2 py-1">
                Select Model
              </p>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-1.5 stagger-children">
              {Object.entries(MISTRAL_MODELS).map(([id, model]) => (
                <button
                  key={id}
                  onClick={() => {
                    onSelect(id as MistralModel);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                    selectedModel === id
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : 'hover:bg-[var(--muted)] text-[var(--foreground)] hover:translate-x-0.5'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {MODEL_ICONS[id]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">{model.name}</p>
                      {model.supportsVision && (
                        <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                          <Eye size={9} />
                          Vision
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--muted-foreground)] truncate">{model.description}</p>
                  </div>
                  {selectedModel === id && (
                    <Check size={14} className="text-[var(--primary)] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
