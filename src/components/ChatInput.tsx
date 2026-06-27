'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, StopCircle, Image, FileText, Plus, PanelRight } from 'lucide-react';
import { Attachment, MistralModel } from '@/types';
import { generateId } from '@/lib/utils';
import { ModelSelector } from './ModelSelector';

interface ChatInputProps {
  onSend: (content: string, attachments?: Attachment[]) => void;
  onStop?: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  variant?: 'default' | 'centered';
  selectedModel?: MistralModel;
  onSelectModel?: (model: MistralModel) => void;
  resolvedModel?: string | null;
  showCanvas?: boolean;
  onToggleCanvas?: () => void;
}

export function ChatInput({ onSend, onStop, isGenerating, disabled, variant = 'default', selectedModel, onSelectModel, resolvedModel, showCanvas, onToggleCanvas }: ChatInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
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

  useEffect(() => {
    if (variant === 'centered' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [variant]);

  const handleSubmit = () => {
    if ((!content.trim() && attachments.length === 0) || isGenerating || disabled) return;
    onSend(content, attachments.length > 0 ? attachments : undefined);
    setContent('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
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

      if (file.type === 'application/pdf') {
        // Store PDF as base64 for rendering
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        attachment.url = `data:application/pdf;base64,${base64}`;

        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const textParts: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pageText = (content.items as any[]).filter((item: any) => item.str).map((item: any) => item.str).join(' ');
            textParts.push(pageText);
            // Yield to main thread every 5 pages to prevent freezing
            if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
          }
          attachment.extractedText = textParts.join('\n\n').slice(0, 30000);
        } catch (err) {
          console.error('PDF extraction failed:', err);
          attachment.extractedText = '[Could not extract text from PDF]';
        }
      } else if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        attachment.content = await file.text();
      }

      if (file.type.startsWith('image/')) {
        attachment.url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
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

  const hasContent = content.trim().length > 0 || attachments.length > 0;

  if (variant === 'centered') {
    return (
      <div className="relative">
        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3 animate-slide-up">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--muted)] rounded-lg text-xs border border-[var(--border)] group hover:border-[var(--primary)] transition-colors duration-200"
              >
                {attachment.type.startsWith('image/') ? (
                  <Image size={12} className="text-[var(--muted-foreground)]" />
                ) : (
                  <FileText size={12} className="text-[var(--muted-foreground)]" />
                )}
                <span className="max-w-[120px] truncate text-[var(--foreground)]">{attachment.name}</span>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors opacity-0 group-hover:opacity-100 ml-1"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Centered Input Box */}
        <div 
          className={`bg-[var(--card)] border rounded-2xl transition-all duration-300 ease-out overflow-visible ${
            isFocused 
              ? 'border-[var(--primary)] shadow-[0_0_0_3px_rgba(217,119,6,0.08)]' 
              : 'border-[var(--border)] shadow-sm hover:shadow-md hover:border-[var(--muted-foreground)]'
          }`}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="How can I help you today?"
            className="w-full bg-transparent border-none outline-none resize-none text-[var(--foreground)] placeholder-[var(--muted-foreground)] px-5 pt-5 pb-3 min-h-[60px] max-h-[200px] text-[15px] leading-relaxed"
            rows={1}
            disabled={disabled}
          />

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all duration-200 active:scale-95"
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

              {selectedModel && onSelectModel && (
                <ModelSelector
                  selectedModel={selectedModel}
                  onSelect={onSelectModel}
                  resolvedModel={resolvedModel}
                />
              )}

              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse-soft"
                  title="Stop recording"
                >
                  <MicOff size={18} />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all duration-200 active:scale-95"
                  title="Voice input"
                >
                  <Mic size={18} />
                </button>
              )}

              {onToggleCanvas && (
                <button
                  onClick={onToggleCanvas}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 active:scale-95 ${
                    showCanvas
                      ? 'bg-[var(--primary)] text-white'
                      : 'hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                  title={showCanvas ? 'Close Canvas' : 'Open Canvas'}
                >
                  <PanelRight size={18} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              {isGenerating ? (
                <button
                  onClick={onStop}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-all duration-200 active:scale-95"
                  title="Stop generating"
                >
                  <StopCircle size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!hasContent || disabled}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--foreground)] text-[var(--background)] disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all duration-200 active:scale-95"
                  title="Send message"
                >
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Helper text */}
        <p className="text-center text-xs text-[var(--muted-foreground)] mt-3 opacity-60">
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
        <div className="flex gap-2 flex-wrap mb-3 animate-slide-up">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--muted)] rounded-lg text-xs border border-[var(--border)] group hover:border-[var(--primary)] transition-colors duration-200"
            >
              {attachment.type.startsWith('image/') ? (
                <Image size={12} className="text-[var(--muted-foreground)]" />
              ) : (
                <FileText size={12} className="text-[var(--muted-foreground)]" />
              )}
              <span className="max-w-[120px] truncate text-[var(--foreground)]">{attachment.name}</span>
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors opacity-0 group-hover:opacity-100 ml-1"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div 
        className={`flex items-center gap-1 bg-[var(--card)] rounded-2xl border transition-all duration-300 ease-out overflow-visible ${
          isFocused 
            ? 'border-[var(--primary)] shadow-[0_0_0_3px_rgba(217,119,6,0.08)]' 
            : 'border-[var(--border)] hover:shadow-sm hover:border-[var(--muted-foreground)]'
        }`}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center w-10 h-10 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all duration-200 flex-shrink-0 active:scale-95"
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

        {selectedModel && onSelectModel && (
          <ModelSelector
            selectedModel={selectedModel}
            onSelect={onSelectModel}
            resolvedModel={resolvedModel}
          />
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="How can I help you today?"
          className="flex-1 bg-transparent border-none outline-none resize-none text-[var(--foreground)] placeholder-[var(--muted-foreground)] py-2.5 min-h-[40px] max-h-[160px] text-[15px] leading-relaxed"
          rows={1}
          disabled={disabled}
        />

        {isRecording ? (
          <button
            onClick={stopRecording}
            className="flex items-center justify-center w-10 h-10 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg animate-pulse-soft flex-shrink-0"
            title="Stop recording"
          >
            <MicOff size={18} />
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="flex items-center justify-center w-10 h-10 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all duration-200 flex-shrink-0 active:scale-95"
            title="Voice input"
          >
            <Mic size={18} />
          </button>
        )}

        {onToggleCanvas && (
          <button
            onClick={onToggleCanvas}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 flex-shrink-0 active:scale-95 ${
              showCanvas
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            title={showCanvas ? 'Close Canvas' : 'Open Canvas'}
          >
            <PanelRight size={18} />
          </button>
        )}

        {isGenerating ? (
          <button
            onClick={onStop}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--foreground)] text-[var(--background)] mr-1.5 hover:opacity-90 transition-all duration-200 flex-shrink-0 active:scale-95"
            title="Stop generating"
          >
            <StopCircle size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!hasContent || disabled}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--foreground)] text-[var(--background)] mr-1.5 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all duration-200 flex-shrink-0 active:scale-95"
            title="Send message"
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
