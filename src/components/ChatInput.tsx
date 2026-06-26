'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, StopCircle, Image, FileText, Plus } from 'lucide-react';
import { Attachment } from '@/types';
import { generateId } from '@/lib/utils';

interface ChatInputProps {
  onSend: (content: string, attachments?: Attachment[]) => void;
  onStop?: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  variant?: 'default' | 'centered';
}

export function ChatInput({ onSend, onStop, isGenerating, disabled, variant = 'default' }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = variant === 'centered' ? 200 : 160;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  }, [content, variant]);

  const handleSubmit = () => {
    if ((!content.trim() && attachments.length === 0) || isGenerating) return;
    onSend(content, attachments);
    setContent('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      const attachment: Attachment = {
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
      };

      if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.md')) {
        const text = await file.text();
        attachment.content = text;
      }

      if (file.type.startsWith('image/')) {
        attachment.url = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
      mediaRecorder.onstop = () => stream.getTracks().forEach((track) => track.stop());

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (variant === 'centered') {
    return (
      <div className="relative">
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--muted)] rounded-lg text-xs border border-[var(--border)]"
              >
                {attachment.type.startsWith('image/') ? (
                  <Image size={12} className="text-[var(--muted-foreground)]" />
                ) : (
                  <FileText size={12} className="text-[var(--muted-foreground)]" />
                )}
                <span className="max-w-[120px] truncate text-[var(--foreground)]">{attachment.name}</span>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Centered Input Box - Claude.ai style */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm transition-all duration-200">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you today?"
            className="w-full bg-transparent border-none outline-none resize-none text-[var(--foreground)] placeholder-[var(--muted-foreground)] px-5 pt-5 pb-3 min-h-[60px] max-h-[200px] text-[15px] leading-relaxed"
            rows={1}
            disabled={disabled}
          />

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                title="Attach file"
              >
                <Plus size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.txt,.json,.md,.csv,.pdf"
              />

              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="p-2 rounded-lg text-red-500 animate-pulse-soft"
                  title="Stop recording"
                >
                  <MicOff size={18} />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                  title="Voice input"
                >
                  <Mic size={18} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {isGenerating ? (
                <button
                  onClick={onStop}
                  className="p-2 rounded-lg bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-opacity"
                  title="Stop generating"
                >
                  <StopCircle size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={(!content.trim() && attachments.length === 0) || disabled}
                  className="p-2 rounded-lg bg-[var(--foreground)] text-[var(--background)] disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  title="Send message"
                >
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Helper text */}
        <p className="text-center text-xs text-[var(--muted-foreground)] mt-3">
          AI can make mistakes. Please verify important information.
        </p>
      </div>
    );
  }

  // Default variant - compact input for chat view
  return (
    <div className="px-4 py-3">
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--muted)] rounded-lg text-xs border border-[var(--border)]"
            >
              {attachment.type.startsWith('image/') ? (
                <Image size={12} className="text-[var(--muted-foreground)]" />
              ) : (
                <FileText size={12} className="text-[var(--muted-foreground)]" />
              )}
              <span className="max-w-[120px] truncate text-[var(--foreground)]">{attachment.name}</span>
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 bg-[var(--card)] rounded-2xl border border-[var(--border)] transition-all duration-200">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          title="Attach file"
        >
          <Plus size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.txt,.json,.md,.csv,.pdf"
        />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="How can I help you today?"
          className="flex-1 bg-transparent border-none outline-none resize-none text-[var(--foreground)] placeholder-[var(--muted-foreground)] py-3 min-h-[24px] max-h-[160px] text-[15px] leading-relaxed"
          rows={1}
          disabled={disabled}
        />

        {isRecording ? (
          <button
            onClick={stopRecording}
            className="p-3 text-red-500 animate-pulse-soft"
            title="Stop recording"
          >
            <MicOff size={18} />
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="p-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title="Voice input"
          >
            <Mic size={18} />
          </button>
        )}

        {isGenerating ? (
          <button
            onClick={onStop}
            className="p-3 bg-[var(--foreground)] text-[var(--background)] rounded-xl m-1 hover:opacity-90 transition-opacity"
            title="Stop generating"
          >
            <StopCircle size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={(!content.trim() && attachments.length === 0) || disabled}
            className="p-3 bg-[var(--foreground)] text-[var(--background)] rounded-xl m-1 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            title="Send message"
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
