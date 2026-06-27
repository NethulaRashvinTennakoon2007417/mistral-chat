'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MistralModel, MISTRAL_MODELS } from '@/types';
import { ChevronDown, Check, Zap, Brain, Code, Eye, Sparkles } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: MistralModel;
  onSelect: (model: MistralModel) => void;
  resolvedModel?: string | null;
}

const MODEL_ICONS: Record<string, React.ReactNode> = {
  'auto': <Sparkles size={14} className="text-amber-500" />,
  'mistral-small-latest': <Zap size={14} className="text-blue-500" />,
  'mistral-medium-latest': <Brain size={14} className="text-purple-500" />,
  'mistral-large-latest': <Brain size={14} className="text-orange-500" />,
  'open-mixtral-8x7b': <Zap size={14} className="text-cyan-500" />,
  'open-mixtral-8x22b': <Brain size={14} className="text-cyan-500" />,
  'open-mistral-nemo': <Brain size={14} className="text-teal-500" />,
  'codestral-latest': <Code size={14} className="text-pink-500" />,
  'pixtral-large-latest': <Eye size={14} className="text-purple-500" />,
};

const DROPDOWN_HEIGHT = 420;

export function ModelSelector({ selectedModel, onSelect, resolvedModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const displayName = selectedModel === 'auto' && resolvedModel
    ? `Auto → ${MISTRAL_MODELS[resolvedModel as MistralModel]?.name || resolvedModel}`
    : MISTRAL_MODELS[selectedModel].name;

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow;

      let top: number;
      if (openUpward) {
        top = Math.max(8, rect.top - DROPDOWN_HEIGHT - 4);
      } else {
        top = Math.min(rect.bottom + 4, window.innerHeight - DROPDOWN_HEIGHT - 8);
      }

      setDropdownStyle({
        position: 'fixed',
        width: 320,
        top,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--foreground)] transition-all duration-200 text-sm h-8 active:scale-95"
      >
        {MODEL_ICONS[selectedModel]}
        <span className="font-medium">{displayName}</span>
        <ChevronDown size={12} className={`text-[var(--muted-foreground)] transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
          <div
            className="fixed bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-[70] modal-panel"
            style={dropdownStyle}
          >
            <div className="p-2 border-b border-[var(--border)]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] px-2 py-1">
                Select Model
              </p>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-1.5">
              {Object.entries(MISTRAL_MODELS).map(([id, model], index) => (
                <button
                  key={id}
                  onClick={() => {
                    onSelect(id as MistralModel);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 animate-stagger-in ${
                    selectedModel === id
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm'
                      : 'hover:bg-[var(--muted)] text-[var(--foreground)] hover:translate-x-0.5'
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex-shrink-0">
                    {MODEL_ICONS[id]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">{model.name}</p>
                      {id === 'auto' && (
                        <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          <Sparkles size={9} />
                          Smart
                        </span>
                      )}
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
        </>,
        document.body
      )}
    </div>
  );
}
