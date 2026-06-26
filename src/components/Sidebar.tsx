'use client';

import { useChat } from '@/context/ChatContext';
import { formatRelativeTime, stripMarkdown } from '@/lib/utils';
import { Plus, MessageSquare, Trash2, X, Settings, Moon, Sun, Coffee, Sparkles, Pencil } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

type Theme = 'light' | 'dark' | 'cream';

export function Sidebar() {
  const { chats, currentChat, createNewChat, setCurrentChat, removeChat, updateChat, sidebarOpen, toggleSidebar, toggleSettings } = useChat();
  const [theme, setTheme] = useState<Theme>('light');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved && ['light', 'dark', 'cream'].includes(saved)) {
      setTheme(saved);
      document.documentElement.className = saved === 'dark' ? 'dark' : saved === 'cream' ? 'cream' : '';
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.className = 'dark';
    }
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const cycleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'cream' : 'light';
    setTheme(next);
    document.documentElement.className = next === 'dark' ? 'dark' : next === 'cream' ? 'cream' : '';
    localStorage.setItem('theme', next);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'cream' ? Coffee : Sun;
  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'cream' ? 'Cream' : 'Light';

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeChat(id);
  };

  const handleRenameStart = (e: React.MouseEvent, chat: { id: string; title: string }) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const handleRenameSave = (id: string) => {
    if (editTitle.trim()) {
      const chat = chats.find((c) => c.id === id);
      if (chat) {
        updateChat({ ...chat, title: editTitle.trim() });
      }
    }
    setEditingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') handleRenameSave(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  const handleGoHome = () => {
    setCurrentChat(null);
  };

  if (!sidebarOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop on mobile */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
        onClick={toggleSidebar}
      />

      <div className="w-72 h-full bg-[var(--background)] border-r border-[var(--border)] flex flex-col fixed left-0 top-0 z-50 sidebar-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleGoHome}
              className="flex items-center gap-2.5 hover:opacity-80 transition-all duration-200 active:scale-95"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20 ring-1 ring-orange-400/20">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="text-base font-bold text-[var(--foreground)]">Mistral Chat</span>
            </button>
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
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
            <div className="text-center py-12 px-4 animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={20} className="text-[var(--muted-foreground)]" />
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">No conversations yet</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1 opacity-60">Click &ldquo;New Chat&rdquo; to start</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {chats.map((chat, index) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out animate-stagger-in ${
                    currentChat?.id === chat.id
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm'
                      : 'hover:bg-[var(--muted)] text-[var(--foreground)] hover:translate-x-0.5'
                  }`}
                  style={{ animationDelay: `${index * 20}ms` }}
                  onClick={() => setCurrentChat(chat)}
                >
                  <MessageSquare size={14} className="flex-shrink-0 opacity-40" />
                  <div className="flex-1 min-w-0">
                    {editingId === chat.id ? (
                      <input
                        ref={editInputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => handleRenameKeyDown(e, chat.id)}
                        onBlur={() => handleRenameSave(chat.id)}
                        className="w-full bg-transparent border-b border-[var(--primary)] text-sm font-medium outline-none py-0 focus:border-[var(--primary)] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{stripMarkdown(chat.title)}</p>
                    )}
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {formatRelativeTime(chat.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => handleRenameStart(e, chat)}
                      className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
                      title="Rename"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, chat.id)}
                      className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-red-500 hover:text-white text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-1">
            <button
              onClick={cycleTheme}
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 text-sm active:scale-98"
            >
              <ThemeIcon size={14} />
              {themeLabel}
            </button>
            <button
              onClick={toggleSettings}
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
