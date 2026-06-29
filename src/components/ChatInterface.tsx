'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useChat } from '@/context/ChatContext';
import { Message } from '@/components/Message';
import { ChatInput } from '@/components/ChatInput';
import { DocumentViewer } from '@/components/DocumentViewer';
import { PromptTemplates } from '@/components/PromptTemplates';
import { ChatExport } from '@/components/ChatExport';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { SideBySide } from '@/components/SideBySide';
import { UsageDashboard } from '@/components/UsageDashboard';
import { PromptPresets } from '@/components/PromptPresets';
import { TodoMessage } from '@/components/TodoMessage';
import { streamChatCompletion, generateTitle } from '@/lib/mistral';
import { detectModel } from '@/lib/auto-model';
import { TodoItem } from '@/types';
import { Message as MessageType, Attachment, MistralModel, ResolvedModel } from '@/types';
import { Menu, Share2, Check, AlertCircle, X, Plus, Sparkles, FileText, Download, Keyboard, ArrowLeftRight, BarChart3, BookOpen, ChevronDown } from 'lucide-react';
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
    canvasOpen,
    openDocument,
    closeDocument,
    toggleCanvas,
    updateSettings,
    setTodos,
    toggleTodo,
    clearTodos,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingChatRef = useRef<string | null>(null);
  const currentChatRef = useRef(currentChat);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [resolvedModel, setResolvedModel] = useState<ResolvedModel | null>(null);
  const [showPromptTemplates, setShowPromptTemplates] = useState(false);
  const [showChatExport, setShowChatExport] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showSideBySide, setShowSideBySide] = useState(false);
  const [showUsageDashboard, setShowUsageDashboard] = useState(false);
  const [showPromptPresets, setShowPromptPresets] = useState(false);

  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  const lastScrollTime = useRef(0);

  const scrollToBottom = useCallback(() => {
    const now = Date.now();
    if (now - lastScrollTime.current < 100) return;
    lastScrollTime.current = now;
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createNewChat();
      }
      if (e.key === 'Escape') {
        setShowPromptTemplates(false);
        setShowChatExport(false);
        setShowKeyboardShortcuts(false);
        setShowSideBySide(false);
        setShowUsageDashboard(false);
        setShowPromptPresets(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, createNewChat]);

  const getSystemPrompt = useCallback(() => {
    const parts: string[] = [];
    if (settings.systemPrompt) parts.push(settings.systemPrompt);
    if (settings.memories && settings.memories.length > 0) {
      parts.push(`\nFacts about the user (remember these across conversations):\n${settings.memories.map(m => `- ${m}`).join('\n')}`);
    }
    return parts.length > 0 ? parts.join('\n') : undefined;
  }, [settings.systemPrompt, settings.memories]);

  const handleCanvasToggle = useCallback(() => {
    if (documentAttachment) {
      closeDocument();
    } else if (currentChat) {
      // Find the last PDF attachment in the chat
      for (let i = currentChat.messages.length - 1; i >= 0; i--) {
        const msg = currentChat.messages[i];
        if (msg.attachments) {
          const pdf = msg.attachments.find(a => a.type === 'application/pdf');
          if (pdf) {
            openDocument(pdf);
            return;
          }
        }
      }
    }
  }, [documentAttachment, currentChat, closeDocument, openDocument]);

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
          updateChat((prev) => {
            if (!prev) return prev;
            return { ...prev, title, updatedAt: new Date() };
          });
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
      let lastFlushTime = 0;
      let rafId: number | null = null;
      const FLUSH_INTERVAL = 50;

      const flushToState = () => {
        updateChat((prev) => {
          if (!prev) return prev;
          const updatedMessages = prev.messages.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: responseContent } : msg
          );
          return { ...prev, messages: updatedMessages, updatedAt: new Date() };
        });
        lastFlushTime = Date.now();
      };

      for await (const chunk of streamChatCompletion(
        settings.apiKey,
        apiMessages,
        selectedModel,
        settings.temperature,
        settings.maxTokens,
        getSystemPrompt()
      )) {
        if (abortControllerRef.current?.signal.aborted) break;

        responseContent += chunk;

        const now = Date.now();
        if (now - lastFlushTime >= FLUSH_INTERVAL) {
          flushToState();
        } else if (!rafId) {
          rafId = requestAnimationFrame(() => {
            flushToState();
            rafId = null;
          });
        }
      }

      // Final flush
      if (rafId) cancelAnimationFrame(rafId);
      flushToState();

      // Parse [TODO] tags from response
      if (currentChat) {
        const todoMatch = responseContent.match(/\[TODO\]\s*\n((?:- .+\n?)+)/i);
        if (todoMatch) {
          const lines = todoMatch[1].split('\n').filter(l => l.trim().startsWith('- '));
          if (lines.length > 0) {
            const todos: TodoItem[] = lines.map((line, i) => ({
              id: `todo-${Date.now()}-${i}`,
              text: line.replace(/^-\s*/, '').trim(),
              status: 'pending' as const,
            }));
            setTodos(currentChat.id, todos);
          }
        }
      }

      if (!responseContent) {
        const errorMsg: MessageType = {
          id: assistantMsgId,
          role: 'assistant',
          content: 'No response received. The model may have returned an empty response. Please try again.',
          timestamp: new Date(),
        };
        updateChat((prev) => {
          if (!prev) return prev;
          const updatedMessages = prev.messages.map((msg) =>
            msg.id === assistantMsgId ? errorMsg : msg
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

  const handleRetry = useCallback(() => {
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
  }, [updateChat]);

  const handleShare = useCallback(async () => {
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
  }, [currentChat]);

  const handleModelChange = useCallback((model: MistralModel) => {
    if (!currentChat) return;
    updateChat({ ...currentChat, model });
  }, [currentChat, updateChat]);

  const handlePromptCategory = useCallback((prompt: string) => {
    handleSend(prompt);
  }, []);

  const handleEditMessage = useCallback((messageId: string, content: string) => {
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
  }, [updateChat]);

  const hasMessages = currentChat && currentChat.messages.length > 0;

  return (
    <div className="flex-1 flex flex-row bg-[var(--background)] relative overflow-hidden">
      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
      {/* Header - only show when there are messages */}
      {hasMessages && (
        <header className="flex items-center justify-between px-3 h-12 bg-[var(--background)]/80 backdrop-blur-sm sticky top-0 z-40 animate-slide-down">
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
              onClick={() => setShowPromptTemplates(true)}
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
              title="Prompt Templates"
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={() => setShowSideBySide(true)}
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
              title="Compare Models"
            >
              <ArrowLeftRight size={16} />
            </button>
            <button
              onClick={() => setShowChatExport(true)}
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
              title="Export Chat"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => setShowUsageDashboard(true)}
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-90"
              title="API Usage"
            >
              <BarChart3 size={16} />
            </button>
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

      {/* Empty state header */}
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
                    showCanvas={canvasOpen}
                    onToggleCanvas={handleCanvasToggle}
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
                <p className="text-center text-xs text-[var(--muted-foreground)] mt-4 opacity-50">
                  AI can make mistakes. Please verify important information.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Input - when there are messages */}
      {hasMessages && (
        <div className="border-t border-[var(--background)] bg-[var(--background)]">
          <div className="max-w-3xl mx-auto">
            {currentChat?.todos && currentChat.todos.length > 0 && (
              <div className="px-4 pt-3">
                <TodoMessage
                  todos={currentChat.todos}
                  chatId={currentChat.id}
                  onToggle={(todoId) => toggleTodo(currentChat.id, todoId)}
                  onClear={() => clearTodos(currentChat.id)}
                />
              </div>
            )}
            <ChatInput
              onSend={handleSend}
              onStop={handleStop}
              isGenerating={isGenerating}
              disabled={!settings.apiKey}
              selectedModel={currentChat?.model || 'auto'}
              onSelectModel={handleModelChange}
              resolvedModel={resolvedModel}
              showCanvas={canvasOpen}
              onToggleCanvas={handleCanvasToggle}
            />
          </div>
        </div>
      )}
      </div>

      {/* Document Viewer Panel */}
      {documentAttachment && canvasOpen && (
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

      {/* Modals */}
      {showPromptTemplates && (
        <PromptTemplates
          onSelect={(prompt) => handleSend(prompt)}
          onClose={() => setShowPromptTemplates(false)}
        />
      )}
      {showChatExport && currentChat && (
        <ChatExport
          chat={currentChat}
          onClose={() => setShowChatExport(false)}
        />
      )}
      {showKeyboardShortcuts && (
        <KeyboardShortcuts onClose={() => setShowKeyboardShortcuts(false)} />
      )}
      {showSideBySide && (
        <SideBySide
          apiKey={settings.apiKey}
          systemPrompt={getSystemPrompt()}
          onClose={() => setShowSideBySide(false)}
        />
      )}
      {showUsageDashboard && (
        <UsageDashboard onClose={() => setShowUsageDashboard(false)} />
      )}
      {showPromptPresets && (
        <PromptPresets
          currentPrompt={settings.systemPrompt}
          onSelect={(prompt) => { updateSettings({ systemPrompt: prompt }); setShowPromptPresets(false); }}
          onClose={() => setShowPromptPresets(false)}
        />
      )}
    </div>
  );
}
