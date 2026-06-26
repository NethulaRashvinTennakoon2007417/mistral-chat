'use client';

import { useChat } from '@/context/ChatContext';
import { formatRelativeTime } from '@/lib/utils';
import { Plus, MessageSquare, Trash2, X, Settings, Moon, Sun, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Sidebar() {
  const { chats, currentChat, createNewChat, setCurrentChat, removeChat, sidebarOpen, toggleSidebar, toggleSettings } = useChat();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  if (!sidebarOpen) {
    return null;
  }

  return (
    <div className="w-72 h-full bg-[var(--background)] border-r border-[var(--border)] flex flex-col fixed left-0 top-0 z-50">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-base font-bold text-[var(--foreground)]">Mistral Chat</span>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <button
          onClick={() => createNewChat()}
          className="w-full btn btn-primary text-sm py-2.5"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2">
        {chats.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={20} className="text-[var(--muted-foreground)]" />
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">No conversations yet</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Click "New Chat" to start</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  currentChat?.id === chat.id
                    ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                    : 'hover:bg-[var(--muted)] text-[var(--foreground)]'
                }`}
                onClick={() => setCurrentChat(chat)}
              >
                <MessageSquare size={14} className="flex-shrink-0 opacity-40" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chat.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {formatRelativeTime(chat.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChat(chat.id);
                  }}
                  className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--destructive)] hover:text-white transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="flex-1 btn btn-ghost text-sm py-2 justify-start gap-2"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={toggleSettings}
            className="btn btn-ghost p-2"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
