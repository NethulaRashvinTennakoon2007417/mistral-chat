'use client';

import { useChat } from '@/context/ChatContext';
import { X, Save, ExternalLink, Eye, EyeOff, Plus, Trash2, Brain } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { MistralModel, MISTRAL_MODELS } from '@/types';

export function SettingsPanel() {
  const { settings, updateSettings, settingsOpen, toggleSettings } = useChat();
  const [localSettings, setLocalSettings] = useState(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newMemory, setNewMemory] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settingsOpen) {
      setLocalSettings(settings);
      setShowApiKey(false);
    }
  }, [settingsOpen, settings]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleSettings();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [settingsOpen, toggleSettings]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        toggleSettings();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen, toggleSettings]);

  if (!settingsOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    toggleSettings();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm modal-backdrop">
      <div ref={panelRef} className="w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden modal-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Settings</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Configure your Mistral Chat experience</p>
          </div>
          <button
            onClick={toggleSettings}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* API Key */}
          <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              API Key
            </label>
            <div className="relative group">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={localSettings.apiKey}
                onChange={(e) => setLocalSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter your Mistral API key"
                className="input pr-10 focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(217,119,6,0.08)] transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all duration-200 active:scale-90"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              Get your free key from{' '}
              <a
                href="https://console.mistral.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline inline-flex items-center gap-0.5 transition-colors duration-200"
              >
                console.mistral.ai
                <ExternalLink size={10} />
              </a>
            </p>
          </div>

          {/* Default Model */}
          <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Default Model
            </label>
            <select
              value={localSettings.defaultModel}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  defaultModel: e.target.value as MistralModel,
                }))
              }
              className="input cursor-pointer hover:border-[var(--muted-foreground)] transition-all duration-200"
            >
              {Object.entries(MISTRAL_MODELS).map(([id, model]) => (
                <option key={id} value={id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[var(--foreground)]">
                Temperature
              </label>
              <span className="text-sm font-mono text-[var(--primary)] bg-[var(--accent)] px-2 py-0.5 rounded transition-colors duration-200">
                {localSettings.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localSettings.temperature}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  temperature: parseFloat(e.target.value),
                }))
              }
              className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)] transition-all duration-200"
            />
            <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1">
              <span>Precise (0)</span>
              <span>Creative (1)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              Max Tokens
            </label>
            <input
              type="number"
              min="100"
              max="128000"
              value={localSettings.maxTokens}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  maxTokens: parseInt(e.target.value) || 4096,
                }))
              }
              className="input hover:border-[var(--muted-foreground)] focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(217,119,6,0.08)] transition-all duration-200"
            />
          </div>

          {/* System Prompt */}
          <div className="animate-slide-up" style={{ animationDelay: '250ms' }}>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              System Prompt
              <span className="text-[var(--muted-foreground)] font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={localSettings.systemPrompt}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  systemPrompt: e.target.value,
                }))
              }
              placeholder="Customize the AI's behavior..."
              rows={3}
              className="input resize-none hover:border-[var(--muted-foreground)] focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(217,119,6,0.08)] transition-all duration-200"
            />
          </div>

          {/* Memory */}
          <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2 mb-2">
              <Brain size={16} className="text-[var(--primary)]" />
              <label className="text-sm font-semibold text-[var(--foreground)]">
                Memory
              </label>
              <span className="text-[var(--muted-foreground)] font-normal text-xs">
                Facts the AI remembers across all chats
              </span>
            </div>
            
            {/* Add new memory */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMemory.trim()) {
                    setLocalSettings((prev) => ({
                      ...prev,
                      memories: [...prev.memories, newMemory.trim()],
                    }));
                    setNewMemory('');
                  }
                }}
                placeholder="e.g. I'm a software developer, I prefer concise answers..."
                className="input flex-1 text-sm"
              />
              <button
                onClick={() => {
                  if (newMemory.trim()) {
                    setLocalSettings((prev) => ({
                      ...prev,
                      memories: [...prev.memories, newMemory.trim()],
                    }));
                    setNewMemory('');
                  }
                }}
                disabled={!newMemory.trim()}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--primary)] text-white disabled:opacity-30 hover:opacity-90 transition-all duration-200 active:scale-95 flex-shrink-0"
                title="Add memory"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Memory list */}
            {localSettings.memories.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {localSettings.memories.map((memory, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--muted)] rounded-lg text-sm group"
                  >
                    <span className="flex-1 text-[var(--foreground)]">{memory}</span>
                    <button
                      onClick={() => {
                        setLocalSettings((prev) => ({
                          ...prev,
                          memories: prev.memories.filter((_, i) => i !== index),
                        }));
                      }}
                      className="flex items-center justify-center w-6 h-6 rounded hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)] italic px-1">
                No memories yet. Add facts about yourself so the AI remembers your preferences across chats.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--border)] bg-[var(--muted)]">
          <button
            onClick={toggleSettings}
            className="btn btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary text-sm"
          >
            <Save size={14} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
