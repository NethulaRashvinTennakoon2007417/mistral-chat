'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Circle, CheckCircle2, Loader2 } from 'lucide-react';

export interface TodoItem {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
}

interface TodoMessageProps {
  todos: TodoItem[];
  onUpdate?: (todos: TodoItem[]) => void;
  readOnly?: boolean;
}

export function TodoMessage({ todos, onUpdate, readOnly = false }: TodoMessageProps) {
  const [collapsed, setCollapsed] = useState(false);
  const completedCount = todos.filter(t => t.status === 'completed').length;
  const totalCount = todos.length;

  const toggleTodo = (id: string) => {
    if (readOnly || !onUpdate) return;
    onUpdate(todos.map(t => {
      if (t.id !== id) return t;
      if (t.status === 'completed') return { ...t, status: 'pending' as const };
      if (t.status === 'pending') return { ...t, status: 'in_progress' as const };
      if (t.status === 'in_progress') return { ...t, status: 'completed' as const };
      return t;
    }));
  };

  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />;
      case 'in_progress':
        return <Loader2 size={18} className="text-amber-400 shrink-0 animate-spin" />;
      case 'cancelled':
        return <Circle size={18} className="text-[var(--muted-foreground)] shrink-0 opacity-40" />;
      default:
        return <Circle size={18} className="text-[var(--muted-foreground)] shrink-0" />;
    }
  };

  const getStatusStyle = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return 'line-through text-[var(--muted-foreground)]';
      case 'cancelled':
        return 'line-through text-[var(--muted-foreground)] opacity-50';
      case 'in_progress':
        return 'text-[var(--foreground)]';
      default:
        return 'text-[var(--foreground)]';
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden my-2 max-w-2xl">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)] transition-colors"
      >
        <span className="text-sm font-medium text-[var(--foreground)]">
          {completedCount} of {totalCount} todos completed
        </span>
        {collapsed ? (
          <ChevronRight size={16} className="text-[var(--muted-foreground)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--muted-foreground)]" />
        )}
      </button>

      {/* Todo items */}
      {!collapsed && (
        <div className="border-t border-[var(--border)]">
          {todos.map((todo, i) => (
            <div
              key={todo.id}
              className={`flex items-start gap-3 px-4 py-2.5 ${
                i < todos.length - 1 ? 'border-b border-[var(--border)]' : ''
              } ${!readOnly ? 'hover:bg-[var(--muted)] cursor-pointer' : ''} transition-colors`}
              onClick={() => toggleTodo(todo.id)}
            >
              <div className="mt-0.5">
                {getStatusIcon(todo.status)}
              </div>
              <span className={`text-sm leading-relaxed ${getStatusStyle(todo.status)}`}>
                {todo.text}
              </span>
              {todo.priority && todo.priority !== 'medium' && (
                <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                  todo.priority === 'high'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {todo.priority}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
