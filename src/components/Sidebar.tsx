'use client';

import { useChat } from '@/context/ChatContext';
import { stripMarkdown } from '@/lib/utils';
import { Plus, MessageSquare, Trash2, Settings, Moon, Coffee, Sparkles, Pencil, FileText, Search, Wrench } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Chat, Attachment } from '@/types';

type Theme = 'dark' | 'cream';
type ActiveTab = 'chat' | 'documents' | 'tools';

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

function ChatItem({ chat, isActive, editingId, editTitle, editInputRef, onSelect, onDelete, onRenameStart, onRenameSave, onEditTitleChange, onEditKeyDown }: ChatItemProps) {
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
  const { chats, currentChat, createNewChat, setCurrentChat, removeChat, updateChat, sidebarOpen, toggleSidebar, toggleSettings, openDocument, documentAttachment } = useChat();
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => groupChatsByTime(chats), [chats]);

  // Collect all PDFs from all chat messages
  const allDocuments = useMemo(() => {
    const docs: { attachment: Attachment; chatTitle: string }[] = [];
    const seen = new Set<string>();
    for (const chat of chats) {
      for (const msg of chat.messages) {
        if (msg.attachments) {
          for (const att of msg.attachments) {
            if (att.type === 'application/pdf' && !seen.has(att.id)) {
              seen.add(att.id);
              docs.push({ attachment: att, chatTitle: chat.title });
            }
          }
        }
      }
    }
    return docs;
  }, [chats]);

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved && ['dark', 'cream'].includes(saved)) {
      setTheme(saved);
      document.documentElement.className = saved;
    } else {
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
    const next: Theme = theme === 'dark' ? 'cream' : 'dark';
    setTheme(next);
    document.documentElement.className = next;
    localStorage.setItem('theme', next);
  };

  const ThemeIcon = theme === 'dark' ? Moon : Coffee;

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

  return (
    <>
      {/* Backdrop on mobile */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={toggleSidebar}
      />

      {/* Sidebar Panel - Claude style floating panel with rounded corners */}
      <div
        className={`sidebar-panel fixed left-3 top-3 bottom-3 z-50 bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl flex flex-col overflow-hidden ${
          sidebarOpen 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
        style={{ 
          width: 280,
          transform: sidebarOpen ? 'translateX(0) scale(1)' : 'translateX(-110%) scale(0.95)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Tabs - Chat / Documents / Tools */}
        <div className="flex items-center gap-1 px-3 pt-3 pb-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'chat'
                ? 'bg-[var(--muted)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            <MessageSquare size={14} />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'documents'
                ? 'bg-[var(--muted)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            <FileText size={14} />
            Docs
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'tools'
                ? 'bg-[var(--muted)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            <Wrench size={14} />
            Tools
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-3 pb-2 space-y-1">
          <button
            onClick={() => createNewChat()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-[var(--foreground)] transition-all duration-200 text-sm"
          >
            <Plus size={15} />
            New chat
          </button>
          <button
            onClick={toggleSettings}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--muted)] text-[var(--foreground)] transition-all duration-200 text-sm"
          >
            <Settings size={15} />
            Customize
          </button>
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-[var(--border)]" />

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-3 pt-2">
          {activeTab === 'chat' && (
            chats.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-3">
                  <MessageSquare size={18} className="text-[var(--muted-foreground)]" />
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">No conversations yet</p>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-medium text-[var(--muted-foreground)] px-3 mb-1.5">
                  Recents
                </p>
                <div className="space-y-0.5">
                  {grouped.flatMap((group) =>
                    group.chats.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isActive={currentChat?.id === chat.id}
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
                    ))
                  )}
                </div>
              </div>
            )
          )}

          {activeTab === 'documents' && (
            allDocuments.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-3">
                  <FileText size={18} className="text-[var(--muted-foreground)]" />
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">No documents yet</p>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Upload a PDF in any chat to see it here</p>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-medium text-[var(--muted-foreground)] px-3 mb-1.5">
                  Documents
                </p>
                <div className="space-y-0.5">
                  {allDocuments.map(({ attachment, chatTitle }) => (
                    <button
                      key={attachment.id}
                      onClick={() => openDocument(attachment)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 text-left ${
                        documentAttachment?.id === attachment.id
                          ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                          : 'text-[var(--foreground)] hover:bg-[var(--muted)]'
                      }`}
                    >
                      <FileText size={14} className="flex-shrink-0 opacity-40" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{attachment.name}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)] truncate">{stripMarkdown(chatTitle)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          )}

          {activeTab === 'tools' && (
            <div className="py-2">
              <p className="text-[11px] font-medium text-[var(--muted-foreground)] mb-2">
                Quick Tools
              </p>
              <div className="space-y-1">
                {[
                  { id: 'word-counter', name: 'Word Counter', desc: 'Count words & characters', icon: '📝' },
                  { id: 'case-converter', name: 'Case Converter', desc: 'UPPER, lower, Title', icon: '🔄' },
                  { id: 'json-formatter', name: 'JSON Formatter', desc: 'Format & validate JSON', icon: '{ }' },
                  { id: 'base64', name: 'Base64', desc: 'Encode & decode', icon: '🔐' },
                  { id: 'hash-generator', name: 'Hash Generator', desc: 'MD5, SHA-256', icon: '#️⃣' },
                  { id: 'uuid-generator', name: 'UUID Generator', desc: 'Generate UUIDs', icon: '🆔' },
                  { id: 'image-to-pdf', name: 'Image to PDF', desc: 'Convert images to PDF', icon: '🖼️' },
                  { id: 'color-picker', name: 'Color Picker', desc: 'Pick colors & codes', icon: '🎨' },
                ].map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setCurrentChat(null);
                      window.dispatchEvent(new CustomEvent('select-tool', { detail: tool.id }));
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)] transition-all duration-150 text-left"
                  >
                    <span className="text-base">{tool.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tool.name}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">{tool.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - User Profile */}
        <div className="border-t border-[var(--border)] p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentChat(null)}
              className="flex items-center gap-2.5 hover:opacity-80 transition-all duration-200 active:scale-95"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                M
              </div>
              <div className="text-sm text-left">
                <p className="font-medium text-[var(--foreground)]">Mistral Chat</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Free</p>
              </div>
            </button>
            <button
              onClick={cycleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
              title={`Theme: ${theme}`}
            >
              <ThemeIcon size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
