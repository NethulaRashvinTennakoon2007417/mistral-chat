'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useChat } from '@/context/ChatContext';
import { Message } from '@/components/Message';
import { ChatInput } from '@/components/ChatInput';
import { DocumentViewer } from '@/components/DocumentViewer';
import { streamChatCompletion, generateTitle } from '@/lib/mistral';
import { detectModel } from '@/lib/auto-model';
import { Message as MessageType, Attachment, MistralModel, ResolvedModel } from '@/types';
import { Menu, Share2, Check, AlertCircle, X, Plus, Sparkles, FileText } from 'lucide-react';
import { stripMarkdown } from '@/lib/utils';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const PROMPT_CATEGORIES = [
  { icon: '✍️', label: 'Write', prompt: 'Help me write an email' },
  { icon: '📚', label: 'Learn', prompt: 'Explain a complex topic' },
  { icon: '💻', label: 'Code', prompt: 'Help me debug my code' },
  { icon: '🧩', label: 'Life stuff', prompt: 'Help me plan my day' },
  { icon: '📝', label: 'From text', prompt: 'Summarize this text for me' },
];

export function ChatInterface() {
  const {
    currentChat,
    settings,
    isGenerating,
    toggleSidebar,
    updateChat,
    setIsGenerating,
    createNewChat,
    toggleSettings,
    documentAttachment,
    openDocument,
    closeDocument,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingChatRef = useRef<string | null>(null);
  const currentChatRef = useRef(currentChat);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [resolvedModel, setResolvedModel] = useState<ResolvedModel | null>(null);

  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, scrollToBottom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    if (!settings.apiKey) {
      toggleSettings();
      return;
    }

    let chat = currentChatRef.current;
    if (!chat) {
      chat = createNewChat();
    }

    if (isGenerating && streamingChatRef.current === chat.id) return;

    // Resolve auto model → actual model
    const selectedModel = detectModel(content, attachments, chat.model);
    setResolvedModel(selectedModel);

    const userMsgId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const assistantMsgId = Math.random().toString(36).substring(2) + Date.now().toString(36) + '-assistant';

    const userMsg: MessageType = {
      id: userMsgId,
      role: 'user',
      content,
      attachments,
      timestamp: new Date(),
    };

    // Auto-open PDF in document viewer
    if (attachments && attachments.length > 0) {
      const pdfAttachment = attachments.find(a => a.type === 'application/pdf');
      if (pdfAttachment) {
        openDocument(pdfAttachment);
      }
    }

    const assistantMsg: MessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    const messagesWithBoth = [...chat.messages, userMsg, assistantMsg];
    const updatedChat = { ...chat, messages: messagesWithBoth, updatedAt: new Date() };
    updateChat(updatedChat);

    if (chat.messages.length === 0) {
      generateTitle(settings.apiKey, content, chat.model)
        .then((title) => {
          updateChat({ ...updatedChat, title });
        })
        .catch(() => {});
    }

    setIsGenerating(true);
    setStreamingMessageId(assistantMsgId);
    streamingChatRef.current = chat.id;
    abortControllerRef.current = new AbortController();

    try {
      const apiMessages: MessageType[] = [...chat.messages, userMsg];
      let responseContent = '';

      for await (const chunk of streamChatCompletion(
        settings.apiKey,
        apiMessages,
        selectedModel,
        settings.temperature,
        settings.maxTokens,
        settings.systemPrompt || undefined
      )) {
        if (abortControllerRef.current?.signal.aborted) break;

        responseContent += chunk;

        updateChat((prev) => {
          if (!prev) return prev;
          const updatedMessages = prev.messages.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: responseContent } : msg
          );
          return { ...prev, messages: updatedMessages, updatedAt: new Date() };
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Generation aborted');
      } else {
        console.error('Generation failed:', error);
        const errorMsg: MessageType = {
          id: Math.random().toString(36).substring(2) + Date.now().toString(36) + '-error',
          role: 'assistant',
          content: `Sorry, something went wrong. ${error instanceof Error ? error.message : 'Please try again.'}`,
          timestamp: new Date(),
        };
        updateChat((prev) => {
          if (!prev) return prev;
          return { ...prev, messages: [...prev.messages.slice(0, -1), errorMsg], updatedAt: new Date() };
        });
      }
    } finally {
      setIsGenerating(false);
      setStreamingMessageId(null);
      streamingChatRef.current = null;
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setStreamingMessageId(null);
    streamingChatRef.current = null;
  };

  const handleRetry = () => {
    const chat = currentChatRef.current;
    if (!chat || chat.messages.length < 2) return;

    const lastMsg = chat.messages[chat.messages.length - 1];
    const secondLastMsg = chat.messages[chat.messages.length - 2];

    let lastUserMessage: MessageType | undefined;

    if (lastMsg.role === 'user') {
      lastUserMessage = lastMsg;
    } else if (secondLastMsg?.role === 'user') {
      lastUserMessage = secondLastMsg;
    }

    if (!lastUserMessage) return;

    const userMsgIndex = chat.messages.findIndex((m) => m.id === lastUserMessage!.id);
    updateChat({
      ...chat,
      messages: chat.messages.slice(0, userMsgIndex),
    });

    setTimeout(() => {
      handleSend(lastUserMessage!.content, lastUserMessage!.attachments);
    }, 50);
  };

  const handleEditMessage = (messageId: string, content: string) => {
    const chat = currentChatRef.current;
    if (!chat) return;

    const msgIndex = chat.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const targetMsg = chat.messages[msgIndex];

    if (targetMsg.role === 'user') {
      updateChat({
        ...chat,
        messages: chat.messages.slice(0, msgIndex),
      });

      setTimeout(() => {
        handleSend(content, targetMsg.attachments);
      }, 50);
    } else {
      const updatedMessages = chat.messages.map((msg, i) =>
        i === msgIndex ? { ...msg, content } : msg
      );
      updateChat({ ...chat, messages: updatedMessages });
    }
  };

  const handleShare = async () => {
    if (!currentChat) return;
    const shareData = {
      title: currentChat.title,
      messages: currentChat.messages.map((m) => ({ role: m.role, content: m.content })),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(shareData, null, 2));
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(shareData, null, 2);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleModelChange = (model: MistralModel) => {
    if (!currentChat) return;
    updateChat({ ...currentChat, model });
  };

  const handlePromptCategory = (prompt: string) => {
    handleSend(prompt);
  };

  const hasMessages = currentChat && currentChat.messages.length > 0;

  return (
    <div className="flex-1 flex flex-row bg-[var(--background)] relative overflow-hidden">
      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
      {/* Header - only show when there are messages */}
      {hasMessages && (
        <header className="flex items-center justify-between px-3 h-12 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm sticky top-0 z-40 animate-slide-down">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
              title="Toggle sidebar (Ctrl+B)"
            >
              <Menu size={18} />
            </button>
            <span className="text-sm font-medium text-[var(--foreground)] line-clamp-1">
              {stripMarkdown(currentChat?.title || 'New Chat')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => createNewChat()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 text-sm h-8 active:scale-95"
              title="New Chat"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">New Chat</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
              title="Share chat"
            >
              {copiedShare ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
            </button>
          </div>
        </header>
      )}

      {/* Empty state header - just sidebar toggle */}
      {!hasMessages && (
        <header className="flex items-center justify-between px-3 h-12 bg-[var(--background)] sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
              title="Toggle sidebar (Ctrl+B)"
            >
              <Menu size={18} />
            </button>
          </div>
        </header>
      )}

      {/* Status Banner */}
      {!settings.apiKey && showBanner && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/30 px-4 py-2.5 flex items-center justify-between animate-slide-down">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <AlertCircle size={16} />
            <span>Set your API key in Settings to start chatting</span>
            <button
              onClick={toggleSettings}
              className="underline font-medium hover:no-underline transition-all duration-200"
            >
              Open Settings
            </button>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors duration-200">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4">
          {hasMessages ? (
            <div className="py-4">
              {currentChat.messages.map((message, index) => (
                <Message
                  key={message.id}
                  message={message}
                  isLatest={index === currentChat.messages.length - 1 && message.role === 'assistant'}
                  isStreaming={streamingMessageId === message.id}
                  onRetry={message.role === 'assistant' && index === currentChat.messages.length - 1 ? handleRetry : undefined}
                  onEdit={
                    message.role === 'user'
                      ? (content) => handleEditMessage(message.id, content)
                      : undefined
                  }
                  onOpenDocument={openDocument}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            /* Empty State - Claude.ai style */
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
              {/* Greeting */}
              <div className="text-center mb-8 px-4 hero-animate">
                <p className="text-2xl sm:text-3xl font-semibold text-[var(--foreground)]">
                  {getGreeting()}
                </p>
              </div>

              {/* Centered Input */}
              <div className="w-full max-w-2xl px-4 hero-animate" style={{ animationDelay: '100ms' }}>
                <div className="relative">
                  <ChatInput
                    onSend={handleSend}
                    onStop={handleStop}
                    isGenerating={isGenerating}
                    disabled={!settings.apiKey}
                    variant="centered"
                    selectedModel={currentChat?.model || 'auto'}
                    onSelectModel={handleModelChange}
                    resolvedModel={resolvedModel}
                  />
                </div>

                {/* Prompt Categories */}
                <div className="flex items-center justify-center gap-2 mt-4 flex-wrap stagger-children">
                  {PROMPT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.label}
                      onClick={() => handlePromptCategory(cat.prompt)}
                      disabled={isGenerating || !settings.apiKey}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--muted)] hover:border-[var(--primary)] hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Input - when there are messages */}
      {hasMessages && (
        <div className="border-t border-[var(--background)] bg-[var(--background)]">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={handleSend}
              onStop={handleStop}
              isGenerating={isGenerating}
              disabled={!settings.apiKey}
              selectedModel={currentChat?.model || 'auto'}
              onSelectModel={handleModelChange}
              resolvedModel={resolvedModel}
            />
          </div>
        </div>
      )}
      </div>

      {/* Document Viewer Panel */}
      {documentAttachment && (
        <div className="w-[55%] flex-shrink-0">
          <DocumentViewer
            title={documentAttachment.name}
            content={documentAttachment.extractedText || documentAttachment.content || 'No content available'}
            fileName={documentAttachment.name}
            fileData={documentAttachment.url}
            onClose={closeDocument}
          />
        </div>
      )}
    </div>
  );
}
