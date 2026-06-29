'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Circle, CheckCircle2, Loader2, X } from 'lucide-react';
import { TodoItem } from '@/types';

interface TodoMessageProps {
  todos: TodoItem[];
  chatId: string;
  onToggle: (todoId: string) => void;
  onClear: () => void;
}

export function TodoMessage({ todos, chatId, onToggle, onClear }: TodoMessageProps) {
  const [collapsed, setCollapsed] = useState(false);
  const completedCount = todos.filter(t => t.status === 'completed').length;
  const totalCount = todos.length;

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
          <span>{completedCount} of {totalCount} todos completed</span>
        </button>
        <button
          onClick={onClear}
          className="flex items-center justify-center w-5 h-5 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
          title="Clear todos"
        >
          <X size={12} />
        </button>
      </div>

      {/* Todo items */}
      {!collapsed && (
        <div className="border-t border-[var(--border)]">
          {todos.map((todo) => (
            <button
              key={todo.id}
              onClick={() => onToggle(todo.id)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--muted)] transition-colors text-left"
            >
              <div className="mt-px">
                {getStatusIcon(todo.status)}
              </div>
              <span className={`text-sm leading-relaxed ${getStatusStyle(todo.status)}`}>
                {todo.text}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
