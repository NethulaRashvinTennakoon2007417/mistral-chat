'use client';

import { Message as MessageType } from '@/types';
import { Copy, Check, RotateCcw, Edit2, ThumbsUp, ThumbsDown, Volume2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageProps {
  message: MessageType;
  isLatest?: boolean;
  onRetry?: () => void;
  onEdit?: (content: string) => void;
}

export function Message({ message, isLatest, onRetry, onEdit }: MessageProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    onEdit?.(editContent);
    setEditing(false);
  };

  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(message.content);
    speechSynthesis.speak(utterance);
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-6 animate-fade-in">
        <div className="max-w-[85%]">
          <div className="bg-[var(--primary)] text-white rounded-2xl rounded-tr-md px-5 py-3.5 shadow-sm">
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none resize-none text-white placeholder-white/50"
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditing(false)}
                    className="text-xs px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="text-xs px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
          {!editing && (
            <div className="flex items-center justify-end gap-1 mt-1.5 px-1">
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={copyToClipboard}
                className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                title="Copy"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                title="Edit"
              >
                <Edit2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6 animate-fade-in">
      <div className="max-w-[85%]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-[var(--muted)] rounded-2xl rounded-tl-md px-5 py-3.5">
              {message.content ? (
                <div className="markdown-content text-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const code = String(children).replace(/\n$/, '');
                        if (match) {
                          return (
                            <SyntaxHighlighter
                              style={oneDark}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-lg !text-xs"
                            >
                              {code}
                            </SyntaxHighlighter>
                          );
                        }
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              )}
            </div>
            {message.content && (
              <div className="flex items-center gap-0.5 mt-1.5 px-1">
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={copyToClipboard}
                  className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                  title="Copy"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
                <button
                  onClick={speak}
                  className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                  title="Read aloud"
                >
                  <Volume2 size={12} />
                </button>
                <button
                  className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                  title="Helpful"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                  title="Not helpful"
                >
                  <ThumbsDown size={12} />
                </button>
                {isLatest && onRetry && (
                  <button
                    onClick={onRetry}
                    className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                    title="Retry"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
