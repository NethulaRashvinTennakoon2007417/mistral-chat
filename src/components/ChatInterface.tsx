'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useChat } from '@/context/ChatContext';
import { Message } from '@/components/Message';
import { ChatInput } from '@/components/ChatInput';
import { ModelSelector } from '@/components/ModelSelector';
import { streamChatCompletion, generateTitle } from '@/lib/mistral';
import { Message as MessageType, Attachment, MistralModel } from '@/types';
import { Menu, Share2, Check, AlertCircle, X } from 'lucide-react';

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
    addMessage,
    updateChat,
    setIsGenerating,
    createNewChat,
    toggleSettings,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingChatRef = useRef<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, scrollToBottom]);

  // Keyboard shortcut: Cmd/Ctrl+B to toggle sidebar
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

    let chat = currentChat;
    if (!chat) {
      chat = createNewChat();
    }

    // Prevent double-sending while streaming
    if (isGenerating && streamingChatRef.current === chat.id) return;

    const userMsgId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const assistantMsgId = Math.random().toString(36).substring(2) + Date.now().toString(36) + '-assistant';

    const userMsg: MessageType = {
      id: userMsgId,
      role: 'user',
      content,
      attachments,
      timestamp: new Date(),
    };

    const assistantMsg: MessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    // Add both messages to chat
    const messagesWithBoth = [...chat.messages, userMsg, assistantMsg];
    const updatedChat = { ...chat, messages: messagesWithBoth, updatedAt: new Date() };
    updateChat(updatedChat);

    // Generate title for first message
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
        chat.model,
        settings.temperature,
        settings.maxTokens,
        settings.systemPrompt || undefined
      )) {
        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) break;

        responseContent += chunk;

        // Use functional update to avoid stale closure
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
        // Add error message
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
    if (!currentChat || currentChat.messages.length < 2) return;

    // Find the last user message
    const lastMsg = currentChat.messages[currentChat.messages.length - 1];
    const secondLastMsg = currentChat.messages[currentChat.messages.length - 2];

    let lastUserMessage: MessageType | undefined;

    if (lastMsg.role === 'user') {
      lastUserMessage = lastMsg;
      // Remove the last user message
      updateChat({
        ...currentChat,
        messages: currentChat.messages.slice(0, -1),
      });
    } else if (secondLastMsg?.role === 'user') {
      lastUserMessage = secondLastMsg;
      // Remove last assistant + last user message
      updateChat({
        ...currentChat,
        messages: currentChat.messages.slice(0, -2),
      });
    }

    if (lastUserMessage) {
      // Small delay to let state update, then resend
      setTimeout(() => {
        handleSend(lastUserMessage!.content, lastUserMessage!.attachments);
      }, 50);
    }
  };

  const handleEditMessage = (messageId: string, content: string) => {
    if (!currentChat) return;

    // Find the message and the one after it (should be assistant response)
    const msgIndex = currentChat.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const updatedMessages = currentChat.messages.map((msg, i) =>
      i === msgIndex ? { ...msg, content } : msg
    );

    // If editing a user message, also remove the assistant response after it
    if (currentChat.messages[msgIndex]?.role === 'user' && msgIndex + 1 < currentChat.messages.length) {
      const newMessages = updatedMessages.slice(0, msgIndex + 1);
      updateChat({ ...currentChat, messages: newMessages });

      // Resend with edited content
      setTimeout(() => {
        handleSend(content, currentChat.messages[msgIndex].attachments);
      }, 50);
    } else {
      updateChat({ ...currentChat, messages: updatedMessages });
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
    <div className="flex-1 flex flex-col bg-[var(--background)] h-screen relative">
      {/* Header - only show when there are messages */}
      {hasMessages && (
        <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
              title="Toggle sidebar (Ctrl+B)"
            >
              <Menu size={18} />
            </button>
            <span className="text-sm font-medium text-[var(--foreground)] line-clamp-1">
              {currentChat?.title || 'New Chat'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ModelSelector selectedModel={currentChat?.model || 'mistral-small'} onSelect={handleModelChange} />
            <button
              onClick={handleShare}
              className="p-1.5 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
              title="Share chat"
            >
              {copiedShare ? <Check size={16} /> : <Share2 size={16} />}
            </button>
          </div>
        </header>
      )}

      {/* Empty state header - just sidebar toggle */}
      {!hasMessages && (
        <header className="flex items-center justify-between px-3 py-2 bg-[var(--background)] sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
              title="Toggle sidebar (Ctrl+B)"
            >
              <Menu size={18} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <ModelSelector selectedModel={currentChat?.model || 'mistral-small'} onSelect={handleModelChange} />
          </div>
        </header>
      )}

      {/* Status Banner */}
      {!settings.apiKey && showBanner && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/30 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <AlertCircle size={16} />
            <span>Set your API key in Settings to start chatting</span>
            <button
              onClick={toggleSettings}
              className="underline font-medium hover:no-underline"
            >
              Open Settings
            </button>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200">
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
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            /* Empty State - Claude.ai style */
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] animate-fade-in">
              {/* Greeting */}
              <div className="text-center mb-8">
                <p className="text-2xl font-semibold text-[var(--foreground)] mb-1">
                  {getGreeting()}
                </p>
              </div>

              {/* Centered Input - Claude.ai style */}
              <div className="w-full max-w-2xl">
                <div className="relative">
                  <ChatInput
                    onSend={handleSend}
                    onStop={handleStop}
                    isGenerating={isGenerating}
                    disabled={!settings.apiKey}
                    variant="centered"
                  />
                </div>

                {/* Prompt Categories */}
                <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                  {PROMPT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.label}
                      onClick={() => handlePromptCategory(cat.prompt)}
                      disabled={isGenerating || !settings.apiKey}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--muted)] hover:border-[var(--primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="border-t border-[var(--border)] bg-[var(--background)]">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={handleSend}
              onStop={handleStop}
              isGenerating={isGenerating}
              disabled={!settings.apiKey}
            />
          </div>
        </div>
      )}
    </div>
  );
}
