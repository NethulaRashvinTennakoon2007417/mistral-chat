'use client';

import { useChat } from '@/context/ChatContext';
import { formatRelativeTime } from '@/lib/utils';
import { Plus, MessageSquare, Trash2, X, Settings, Moon, Sun, Sparkles, Pencil, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function Sidebar() {
  const { chats, currentChat, createNewChat, setCurrentChat, removeChat, updateChat, sidebarOpen, toggleSidebar, toggleSettings } = useChat();
  const [isDark, setIsDark] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

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

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId === id) {
      removeChat(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
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

  if (!sidebarOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop on mobile */}
      <div
        className="fixed inset-0 bg-black/20 z-40 lg:hidden"
        onClick={toggleSidebar}
      />

      <div className="w-72 h-full bg-[var(--background)] border-r border-[var(--border)] flex flex-col fixed left-0 top-0 z-50 sidebar-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="text-base font-bold text-[var(--foreground)]">Mistral Chat</span>
            </div>
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
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
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Click &ldquo;New Chat&rdquo; to start</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                    currentChat?.id === chat.id
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : 'hover:bg-[var(--muted)] text-[var(--foreground)]'
                  }`}
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
                        className="w-full bg-transparent border-b border-[var(--primary)] text-sm font-medium outline-none py-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{chat.title}</p>
                    )}
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {formatRelativeTime(chat.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleRenameStart(e, chat)}
                      className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                      title="Rename"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, chat.id)}
                      className={`flex items-center justify-center w-6 h-6 rounded-md transition-all ${
                        deletingId === chat.id
                          ? 'bg-[var(--destructive)] text-white opacity-100'
                          : 'hover:bg-[var(--destructive)] hover:text-white text-[var(--muted-foreground)]'
                      }`}
                      title={deletingId === chat.id ? 'Click again to confirm' : 'Delete'}
                    >
                      {deletingId === chat.id ? <Check size={12} /> : <Trash2 size={12} />}
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
            onClick={toggleTheme}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors text-sm"
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            {isDark ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={toggleSettings}
            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
