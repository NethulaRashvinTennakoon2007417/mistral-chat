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
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, scrollToBottom]);

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    if (!settings.apiKey) {
      alert('Please set your API key in settings first.');
      return;
    }

    let chat = currentChat;
    if (!chat) {
      chat = createNewChat();
    }

    const userMsg: MessageType = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      role: 'user',
      content,
      attachments,
      timestamp: new Date(),
    };

    const assistantMsgId = Math.random().toString(36).substring(2) + Date.now().toString(36) + '-assistant';
    const assistantMsg: MessageType = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    const messagesWithBoth = [...chat.messages, userMsg, assistantMsg];
    updateChat({ ...chat, messages: messagesWithBoth, updatedAt: new Date() });

    if (chat.messages.length === 0) {
      try {
        const title = await generateTitle(settings.apiKey, content, chat.model);
        updateChat({ ...chat, title, messages: messagesWithBoth, updatedAt: new Date() });
      } catch (error) {
        console.error('Failed to generate title:', error);
      }
    }

    setIsGenerating(true);
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
        responseContent += chunk;
        const updatedMessages = messagesWithBoth.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, content: responseContent } : msg
        );
        updateChat({ ...chat, messages: updatedMessages, updatedAt: new Date() });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Generation aborted');
      } else {
        console.error('Generation failed:', error);
        addMessage(chat.id, {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`,
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  const handleRetry = () => {
    if (!currentChat || currentChat.messages.length < 2) return;
    const messages = currentChat.messages.slice(0, -1);
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === 'user') {
      updateChat({ ...currentChat, messages: messages.slice(0, -1) });
      handleSend(lastUserMessage.content, lastUserMessage.attachments);
    }
  };

  const handleEditMessage = (messageId: string, content: string) => {
    if (!currentChat) return;
    const updatedMessages = currentChat.messages.map((msg) =>
      msg.id === messageId ? { ...msg, content } : msg
    );
    updateChat({ ...currentChat, messages: updatedMessages });
  };

  const handleShare = async () => {
    if (!currentChat) return;
    const shareData = {
      title: currentChat.title,
      messages: currentChat.messages.map((m) => ({ role: m.role, content: m.content })),
    };
    await navigator.clipboard.writeText(JSON.stringify(shareData, null, 2));
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleModelChange = (model: MistralModel) => {
    if (!currentChat) return;
    updateChat({ ...currentChat, model });
  };

  const hasMessages = currentChat && currentChat.messages.length > 0;

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] h-screen relative">
      {/* Header - only show when there are messages */}
      {hasMessages && (
        <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
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

      {/* No sidebar header when sidebar is hidden */}
      {!hasMessages && (
        <header className="flex items-center justify-between px-3 py-2 bg-[var(--background)] sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
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
              onClick={() => {
                const { toggleSettings } = useChat();
                toggleSettings();
              }}
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
                  onRetry={message.role === 'assistant' ? handleRetry : undefined}
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
                      onClick={() => handleSend(cat.prompt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--muted)] hover:border-[var(--primary)] transition-all"
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
