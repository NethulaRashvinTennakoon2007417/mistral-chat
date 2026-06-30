'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Circle, CheckCircle2, Loader2, X, Pencil, Trash2 } from 'lucide-react';
import { TodoItem } from '@/types';

interface TodoMessageProps {
  todos: TodoItem[];
  chatId: string;
  onToggle: (todoId: string) => void;
  onUpdate: (todoId: string, text: string) => void;
  onDelete: (todoId: string) => void;
  onClear: () => void;
}

export function TodoMessage({ todos, chatId, onToggle, onUpdate, onDelete, onClear }: TodoMessageProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLInputElement>(null);
  const completedCount = todos.filter(t => t.status === 'completed').length;
  const totalCount = todos.length;

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const handleToggle = useCallback((todoId: string) => {
    onToggle(todoId);
  }, [onToggle]);

  const startEdit = useCallback((todo: TodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  }, []);

  const saveEdit = useCallback(() => {
    if (editingId && editText.trim()) {
      onUpdate(editingId, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  }, [editingId, editText, onUpdate]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  }, [saveEdit, cancelEdit]);

  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
      case 'in_progress':
        return <Loader2 size={16} className="text-amber-400 shrink-0 animate-spin" />;
      default:
        return <Circle size={16} className="text-[var(--muted-foreground)] shrink-0" />;
    }
  };

  const getStatusStyle = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return 'line-through text-[var(--muted-foreground)]';
      case 'in_progress':
        return 'text-[var(--foreground)]';
      default:
        return 'text-[var(--foreground)]';
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden mb-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
        >
          {collapsed ? (
            <ChevronRight size={14} className="text-[var(--muted-foreground)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
          )}
          <span>{completedCount} of {totalCount} completed</span>
        </button>
        <button
          onClick={onClear}
          className="flex items-center justify-center w-5 h-5 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
          title="Clear all todos"
        >
          <X size={12} />
        </button>
      </div>

      {/* Todo items */}
      {!collapsed && (
        <div className="border-t border-[var(--border)]">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[var(--muted)] transition-colors group"
            >
              <button
                onClick={() => handleToggle(todo.id)}
                className="mt-px shrink-0 focus:outline-none"
                title={`Status: ${todo.status}`}
              >
                {getStatusIcon(todo.status)}
              </button>

              {editingId === todo.id ? (
                <input
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={saveEdit}
                  className="flex-1 text-sm bg-transparent border-b border-[var(--primary)] outline-none py-0.5"
                />
              ) : (
                <span
                  className={`flex-1 text-sm leading-relaxed text-left cursor-pointer ${getStatusStyle(todo.status)}`}
                  onClick={() => handleToggle(todo.id)}
                >
                  {todo.text}
                </span>
              )}

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {editingId !== todo.id && (
                  <button
                    onClick={() => startEdit(todo)}
                    className="flex items-center justify-center w-5 h-5 rounded hover:bg-[var(--background)] text-[var(--muted-foreground)] transition-colors"
                    title="Edit"
                  >
                    <Pencil size={10} />
                  </button>
                )}
                <button
                  onClick={() => onDelete(todo.id)}
                  className="flex items-center justify-center w-5 h-5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
