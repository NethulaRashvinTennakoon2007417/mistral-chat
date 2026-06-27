'use client';

import { Message as MessageType } from '@/types';
import { Copy, Check, RotateCcw, Edit2, ThumbsUp, ThumbsDown, Volume2, VolumeX, Sparkles, FileText, Image as ImageIcon } from 'lucide-react';
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
  onOpenDocument?: (attachment: { id: string; name: string; type: string; size: number; url?: string; content?: string; extractedText?: string }) => void;
}

export function Message({ message, isLatest, isStreaming, onRetry, onEdit, onOpenDocument }: MessageProps) {
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
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.style.height = 'auto';
      editRef.current.style.height = editRef.current.scrollHeight + 'px';
    }
  }, [editContent, editing]);

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
      <div className="flex justify-end mb-6 animate-message-in">
        <div className="max-w-[85%] group">
          <div className="bg-[var(--primary)] text-white rounded-2xl rounded-tr-md px-5 py-3.5 shadow-sm hover:shadow-md transition-shadow duration-200">
            {editing ? (
              <div className="space-y-2">
                <textarea
                  ref={editRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none resize-none text-white placeholder-white/50 max-h-60 overflow-y-auto focus:border-white/40 transition-colors"
                  rows={1}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancelEdit}
                    className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-all duration-200 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="text-xs px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 transition-all duration-200 active:scale-95"
                  >
                    Save &amp; Submit
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {message.attachments && message.attachments.filter(a => a.url && a.type.startsWith('image/')).length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {message.attachments.filter(a => a.url && a.type.startsWith('image/')).map(att => (
                      <img
                        key={att.id}
                        src={att.url}
                        alt={att.name}
                        className="max-w-[200px] max-h-[150px] rounded-lg border border-white/20 object-cover"
                      />
                    ))}
                  </div>
                )}
                {message.attachments && message.attachments.filter(a => !a.type.startsWith('image/')).length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {message.attachments.filter(a => !a.type.startsWith('image/')).map(att => (
                      <button
                        key={att.id}
                        onClick={() => onOpenDocument?.(att)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-md text-xs hover:bg-white/20 transition-colors cursor-pointer"
                      >
                        <FileText size={10} />
                        <span className="truncate max-w-[100px]">{att.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            )}
          </div>
          {!editing && (
            <div className="flex items-center justify-end gap-0 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-[10px] text-[var(--muted-foreground)] mr-1">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={copyToClipboard}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
                title="Copy"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
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
    <div className="flex justify-start mb-6 animate-message-in">
      <div className="max-w-[85%] group">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-orange-400/20">
            <Sparkles size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`bg-[var(--muted)] rounded-2xl rounded-tl-md px-5 py-3.5 transition-all duration-300 ${isStreaming ? 'message-streaming' : 'hover:shadow-sm'}`}>
              {message.content ? (
                <div className="markdown-content text-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const code = String(children).replace(/\n$/, '');
                        if (match) {
                          return (
                            <div className="relative group/code">
                              <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity duration-200">
                                <button
                                  onClick={() => navigator.clipboard.writeText(code)}
                                  className="text-xs px-2 py-1 rounded bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)] transition-all duration-200 active:scale-95"
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
              <div className="flex items-center gap-0 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-[10px] text-[var(--muted-foreground)] mr-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
                  title="Copy"
                >
                  {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                </button>
                <button
                  onClick={speak}
                  className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
                  title={speaking ? 'Stop reading' : 'Read aloud'}
                >
                  {speaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
                <button
                  onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                  className={`flex items-center justify-center w-6 h-6 rounded transition-all duration-200 active:scale-90 ${
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
                  className={`flex items-center justify-center w-6 h-6 rounded transition-all duration-200 active:scale-90 ${
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
                    className="flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
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
