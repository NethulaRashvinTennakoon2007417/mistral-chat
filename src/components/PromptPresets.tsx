'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Sparkles } from 'lucide-react';

interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
}

interface PromptPresetsProps {
  currentPrompt: string;
  onSelect: (prompt: string) => void;
  onClose: () => void;
}

const STORAGE_KEY = 'mistral-prompt-presets';

function getPresets(): PromptPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function savePresets(presets: PromptPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

const DEFAULT_PRESETS: PromptPreset[] = [
  { id: 'default', name: 'Default Assistant', prompt: 'You are Mistral Chat, a friendly and capable AI assistant running inside a web application called Mistral Chat. You are powered by Mistral AI\'s language models. Be helpful, concise, and friendly. When users attach files, reference and use the file content in your responses.' },
  { id: 'coder', name: 'Code Expert', prompt: 'You are an expert software engineer. When helping with code, always provide clean, well-commented code with proper error handling. Explain your approach before and after code snippets. Follow best practices for the language being used. If there are multiple approaches, briefly mention trade-offs.' },
  { id: 'writer', name: 'Writing Coach', prompt: 'You are a professional writing coach. Help users improve their writing by providing constructive feedback, suggesting better word choices, and improving clarity. When editing text, explain your changes. Be encouraging but honest about areas for improvement.' },
  { id: 'teacher', name: 'Patient Teacher', prompt: 'You are a patient, knowledgeable teacher. Explain concepts step-by-step, use simple language and real-world analogies. Check for understanding. If a student seems confused, try a different approach. Never make the student feel bad for asking questions.' },
  { id: 'analyst', name: 'Data Analyst', prompt: 'You are a data analyst. When analyzing data or trends, provide specific numbers and sources. Present findings clearly with bullet points or tables. Be objective and highlight both strengths and weaknesses. If data is incomplete, note what additional information would help.' },
  { id: 'creative', name: 'Creative Brainstormer', prompt: 'You are a creative brainstorming partner. Think outside the box. When generating ideas, aim for quantity AND quality. Build on the user\'s ideas and suggest unexpected combinations. Use techniques like mind mapping, SCAMPER, or lateral thinking. Never dismiss any idea as bad during brainstorming.' },
];

export function PromptPresets({ currentPrompt, onSelect, onClose }: PromptPresetsProps) {
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const saved = getPresets();
    if (saved.length === 0) {
      savePresets(DEFAULT_PRESETS);
      setPresets(DEFAULT_PRESETS);
    } else {
      setPresets(saved);
    }
  }, []);

  const addPreset = () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    const preset: PromptPreset = { id: Date.now().toString(), name: newName.trim(), prompt: newPrompt.trim() };
    const updated = [...presets, preset];
    setPresets(updated);
    savePresets(updated);
    setNewName('');
    setNewPrompt('');
    setIsAdding(false);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    savePresets(updated);
  };

  const saveAsCurrent = () => {
    const name = prompt('Name for this preset:');
    if (!name) return;
    const preset: PromptPreset = { id: Date.now().toString(), name, prompt: currentPrompt };
    const updated = [...presets, preset];
    setPresets(updated);
    savePresets(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">System Prompt Presets</h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Add New */}
        <div className="px-6 pt-4">
          {isAdding ? (
            <div className="space-y-2 p-3 rounded-xl border border-[var(--primary)] bg-[var(--muted)]">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Preset name..."
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
                autoFocus
              />
              <textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="System prompt..."
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none resize-none h-24"
              />
              <div className="flex gap-2">
                <button onClick={addPreset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--primary)] text-white rounded-lg hover:opacity-90">
                  <Check size={12} /> Save
                </button>
                <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all duration-200"
            >
              <Plus size={14} />
              Add new preset
            </button>
          )}
        </div>

        {/* Presets List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)] transition-all duration-200 group"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => { onSelect(preset.prompt); onClose(); }}>
                  <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{preset.name}</p>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{preset.prompt}</p>
                </div>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="flex items-center justify-center w-6 h-6 rounded text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0"
                  title="Delete preset"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
