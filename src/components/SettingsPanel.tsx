'use client';

import { useChat } from '@/context/ChatContext';
import { X, Save, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { MistralModel, MISTRAL_MODELS } from '@/types';

export function SettingsPanel() {
  const { settings, updateSettings, settingsOpen, toggleSettings } = useChat();
  const [localSettings, setLocalSettings] = useState(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync local settings when panel opens
  useEffect(() => {
    if (settingsOpen) {
      setLocalSettings(settings);
      setShowApiKey(false);
    }
  }, [settingsOpen, settings]);

  // Escape key to close
  useEffect(() => {
    if (!settingsOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleSettings();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [settingsOpen, toggleSettings]);

  // Click outside to close
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div ref={panelRef} className="w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Settings</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Configure your Mistral Chat experience</p>
          </div>
          <button
            onClick={toggleSettings}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* API Key */}
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={localSettings.apiKey}
                onChange={(e) => setLocalSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter your Mistral API key"
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
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
                className="text-[var(--primary)] hover:underline inline-flex items-center gap-0.5"
              >
                console.mistral.ai
                <ExternalLink size={10} />
              </a>
            </p>
          </div>

          {/* Default Model */}
          <div>
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
              className="input cursor-pointer"
            >
              {Object.entries(MISTRAL_MODELS).map(([id, model]) => (
                <option key={id} value={id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[var(--foreground)]">
                Temperature
              </label>
              <span className="text-sm font-mono text-[var(--primary)] bg-[var(--accent)] px-2 py-0.5 rounded">
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
              className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
            />
            <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-1">
              <span>Precise (0)</span>
              <span>Creative (1)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
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
              className="input"
            />
          </div>

          {/* System Prompt */}
          <div>
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
              className="input resize-none"
            />
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
