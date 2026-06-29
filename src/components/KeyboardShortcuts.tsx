'use client';

import { useState } from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { category: 'Navigation', items: [
    { keys: ['Ctrl', 'B'], description: 'Toggle sidebar' },
    { keys: ['Ctrl', 'N'], description: 'New chat' },
    { keys: ['Esc'], description: 'Close panel / Deselect' },
  ]},
  { category: 'Chat', items: [
    { keys: ['Enter'], description: 'Send message' },
    { keys: ['Shift', 'Enter'], description: 'New line in message' },
    { keys: ['Ctrl', 'Enter'], description: 'Send message (alternative)' },
  ]},
  { category: 'Editing', items: [
    { keys: ['Ctrl', 'E'], description: 'Edit last user message' },
    { keys: ['Ctrl', 'Z'], description: 'Undo (in text input)' },
  ]},
];

export function KeyboardShortcuts({ onClose }: KeyboardShortcutsProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {SHORTCUTS.map(({ category, items }) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">{category}</h3>
              <div className="space-y-2">
                {items.map(({ keys, description }) => (
                  <div key={description} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground)]">{description}</span>
                    <div className="flex items-center gap-1">
                      {keys.map((key) => (
                        <kbd
                          key={key}
                          className="px-2 py-0.5 text-[11px] font-mono font-medium bg-[var(--muted)] border border-[var(--border)] rounded-md text-[var(--muted-foreground)] shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
