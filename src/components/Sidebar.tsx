'use client';

import { useChat } from '@/context/ChatContext';
import { formatRelativeTime, stripMarkdown } from '@/lib/utils';
import { Plus, MessageSquare, Trash2, Settings, Moon, Sun, Coffee, Sparkles, Pencil, ChevronLeft, Search } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Chat } from '@/types';

type Theme = 'light' | 'dark' | 'cream';

function groupChatsByTime(chats: Chat[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; chats: Chat[] }[] = [];
  const todayChats: Chat[] = [];
  const yesterdayChats: Chat[] = [];
  const weekChats: Chat[] = [];
  const olderChats: Chat[] = [];

  for (const chat of chats) {
    const d = new Date(chat.updatedAt);
    if (d >= today) todayChats.push(chat);
    else if (d >= yesterday) yesterdayChats.push(chat);
    else if (d >= weekAgo) weekChats.push(chat);
    else olderChats.push(chat);
  }

  if (todayChats.length) groups.push({ label: 'Today', chats: todayChats });
  if (yesterdayChats.length) groups.push({ label: 'Yesterday', chats: yesterdayChats });
  if (weekChats.length) groups.push({ label: 'Previous 7 days', chats: weekChats });
  if (olderChats.length) groups.push({ label: 'Older', chats: olderChats });

  return groups;
}

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  isCollapsed: boolean;
  editingId: string | null;
  editTitle: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (chat: Chat) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onRenameStart: (e: React.MouseEvent, chat: Chat) => void;
  onRenameSave: (id: string) => void;
  onEditTitleChange: (v: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent, id: string) => void;
}

function ChatItem({ chat, isActive, isCollapsed, editingId, editTitle, editInputRef, onSelect, onDelete, onRenameStart, onRenameSave, onEditTitleChange, onEditKeyDown }: ChatItemProps) {
  if (isCollapsed) {
    return (
      <button
        onClick={() => onSelect(chat)}
        className={`w-full flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all duration-200 group ${
          isActive
            ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
        }`}
        title={stripMarkdown(chat.title)}
      >
        <MessageSquare size={16} />
      </button>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
        isActive
          ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
          : 'text-[var(--foreground)] hover:bg-[var(--muted)]'
      }`}
      onClick={() => onSelect(chat)}
    >
      <MessageSquare size={14} className="flex-shrink-0 opacity-40" />
      <div className="flex-1 min-w-0">
        {editingId === chat.id ? (
          <input
            ref={editInputRef}
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            onKeyDown={(e) => onEditKeyDown(e, chat.id)}
            onBlur={() => onRenameSave(chat.id)}
            className="w-full bg-transparent border-b border-[var(--primary)] text-sm font-medium outline-none py-0"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-sm truncate">{stripMarkdown(chat.title)}</p>
        )}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => onRenameStart(e, chat)}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all active:scale-90"
          title="Rename"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={(e) => onDelete(e, chat.id)}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-500 transition-all active:scale-90"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { chats, currentChat, createNewChat, setCurrentChat, removeChat, updateChat, sidebarOpen, sidebarCollapsed: isCollapsed, toggleSidebarCollapse: setIsCollapsed, toggleSidebar, toggleSettings } = useChat();
  const [theme, setTheme] = useState<Theme>('light');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => groupChatsByTime(chats), [chats]);

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

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const isCurrent = currentChat?.id === id;
    const currentIndex = chats.findIndex((c) => c.id === id);
    const nextChat = isCurrent && chats.length > 1
      ? (chats[currentIndex + 1] || chats[currentIndex - 1])
      : undefined;
    removeChat(id, nextChat);
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

  const sidebarWidth = isCollapsed ? 60 : 260;

  return (
    <>
      {/* Backdrop on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      <div
        className={`sidebar-panel h-full bg-[var(--background)] border-r border-[var(--border)] flex flex-col fixed left-0 top-0 z-50`}
        style={{
          width: sidebarWidth,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Header */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3'} border-b border-[var(--border)]`}>
          {!isCollapsed && (
            <button
              onClick={() => setCurrentChat(null)}
              className="flex items-center gap-2.5 hover:opacity-80 transition-all duration-200 active:scale-95"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm shadow-orange-500/20">
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-[var(--foreground)]">Mistral Chat</span>
            </button>
          )}
        </div>

        {/* New Chat */}
        <div className={`px-3 pt-3 ${isCollapsed ? 'px-2' : ''}`}>
          <button
            onClick={() => createNewChat()}
            className={`${isCollapsed ? 'w-10 h-10 mx-auto flex items-center justify-center rounded-lg' : 'w-full flex items-center gap-2 px-3 py-2 rounded-lg'} bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-all duration-200 text-sm font-medium active:scale-[0.98]`}
            title="New Chat"
          >
            <Plus size={16} />
            {!isCollapsed && 'New Chat'}
          </button>
        </div>

        {/* Chat List */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 pt-3' : 'px-3 pt-4'}`}>
          {chats.length === 0 ? (
            !isCollapsed && (
              <div className="text-center py-16 px-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-3">
                  <MessageSquare size={18} className="text-[var(--muted-foreground)]" />
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">No conversations yet</p>
              </div>
            )
          ) : isCollapsed ? (
            <div className="flex flex-col items-center gap-1">
              {chats.slice(0, 10).map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={currentChat?.id === chat.id}
                  isCollapsed
                  editingId={editingId}
                  editTitle={editTitle}
                  editInputRef={editInputRef}
                  onSelect={setCurrentChat}
                  onDelete={handleDelete}
                  onRenameStart={handleRenameStart}
                  onRenameSave={handleRenameSave}
                  onEditTitleChange={setEditTitle}
                  onEditKeyDown={handleRenameKeyDown}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] px-3 mb-1.5">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.chats.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isActive={currentChat?.id === chat.id}
                        isCollapsed={false}
                        editingId={editingId}
                        editTitle={editTitle}
                        editInputRef={editInputRef}
                        onSelect={setCurrentChat}
                        onDelete={handleDelete}
                        onRenameStart={handleRenameStart}
                        onRenameSave={handleRenameSave}
                        onEditTitleChange={setEditTitle}
                        onEditKeyDown={handleRenameKeyDown}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`border-t border-[var(--border)] ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={cycleTheme}
                className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
                title={`Theme: ${theme}`}
              >
                <ThemeIcon size={16} />
              </button>
              <button
                onClick={toggleSettings}
                className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
                title="Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={cycleTheme}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 text-sm"
              >
                <ThemeIcon size={15} />
                <span>{theme === 'dark' ? 'Dark' : theme === 'cream' ? 'Cream' : 'Light'} mode</span>
              </button>
              <button
                onClick={toggleSettings}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 text-sm"
              >
                <Settings size={15} />
                <span>Settings</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
