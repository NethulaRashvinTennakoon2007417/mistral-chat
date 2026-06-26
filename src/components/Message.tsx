'use client';

import { Message as MessageType } from '@/types';
import { Copy, Check, RotateCcw, Edit2, ThumbsUp, ThumbsDown, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageProps {
  message: MessageType;
  isLatest?: boolean;
  isStreaming?: boolean;
  onRetry?: () => void;
  onEdit?: (content: string) => void;
}

export function Message({ message, isLatest, isStreaming, onRetry, onEdit }: MessageProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length);
    }
  }, [editing]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(editContent);
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const speak = () => {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-6 message-animate">
        <div className="max-w-[85%]">
          <div className="bg-[var(--primary)] text-white rounded-2xl rounded-tr-md px-5 py-3.5 shadow-sm">
            {editing ? (
              <div className="space-y-2">
                <textarea
                  ref={editRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none resize-none text-white placeholder-white/50"
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancelEdit}
                    className="text-xs px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="text-xs px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    Save &amp; Submit
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

  // Assistant message
  return (
    <div className="flex justify-start mb-6 message-animate">
      <div className="max-w-[85%]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
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
                            <div className="relative group">
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(code);
                                  }}
                                  className="text-xs px-2 py-1 rounded bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]"
                                >
                                  Copy
                                </button>
                              </div>
                              <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-lg !text-xs"
                              >
                                {code}
                              </SyntaxHighlighter>
                            </div>
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
              ) : isStreaming ? (
                <div className="flex items-center gap-1.5 py-1">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              ) : null}
            </div>
            {message.content && !isStreaming && (
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
                  title={speaking ? 'Stop reading' : 'Read aloud'}
                >
                  {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
                <button
                  onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                  className={`p-1 rounded transition-colors ${
                    feedback === 'up'
                      ? 'text-orange-500 bg-orange-500/10'
                      : 'hover:bg-[var(--muted)] text-[var(--muted-foreground)]'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                  className={`p-1 rounded transition-colors ${
                    feedback === 'down'
                      ? 'text-red-500 bg-red-500/10'
                      : 'hover:bg-[var(--muted)] text-[var(--muted-foreground)]'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown size={12} />
                </button>
                {isLatest && onRetry && (
                  <button
                    onClick={onRetry}
                    className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                    title="Regenerate"
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
