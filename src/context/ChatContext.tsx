'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Chat, Message, MistralModel, Settings, Attachment } from '@/types';
import { getChats, saveChat, deleteChat, getSettings, saveSettings } from '@/lib/storage';
import { generateId } from '@/lib/utils';

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  settings: Settings;
  isGenerating: boolean;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  settingsOpen: boolean;
  documentAttachment: Attachment | null;
  canvasOpen: boolean;
  toggleCanvas: () => void;
  createNewChat: (model?: MistralModel) => Chat;
  setCurrentChat: (chat: Chat | null) => void;
  updateChat: (chat: Chat | ((prev: Chat | null) => Chat | null)) => void;
  removeChat: (id: string, replaceWith?: Chat | null) => void;
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
  setIsGenerating: (value: boolean) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  toggleSettings: () => void;
  openDocument: (attachment: Attachment) => void;
  closeDocument: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChatState] = useState<Chat | null>(null);
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    defaultModel: 'auto',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: `You are Mistral Chat, a friendly and capable AI assistant running inside a web application called Mistral Chat. You are powered by Mistral AI's language models.

About Mistral Chat:
- It is a free, open-source AI chatbot web app that runs entirely in the browser
- No data is stored on servers — all chats stay in the user's browser (localStorage)
- It supports multiple Mistral AI models: Mistral Small, Medium, Large, Codestral (code specialist), Pixtral (vision), and Mixtral
- It has an "Auto" mode that automatically picks the best model for each task (e.g., Codestral for code, Large for complex analysis, Pixtral for images)
- Users can attach images, PDFs, and text files to messages
- Features include: chat history, document viewer, voice input, dark/light/cream themes, markdown rendering, code syntax highlighting
- The app is built with Next.js and deployed on Vercel

Your capabilities depend on the model being used:
- Mistral Small: Fast, good for general chat and simple questions
- Mistral Large: Most capable, best for complex analysis, reasoning, and long documents
- Codestral: Specialist for code generation, debugging, and programming tasks
- Pixtral Large: Can analyze and understand images

Be helpful, concise, and friendly. When users attach files, reference and use the file content in your responses. If asked about your identity, explain that you are an AI assistant running in Mistral Chat, powered by Mistral AI models.

IMPORTANT - Avoiding Hallucination:
- When you are unsure about something, say "I'm not sure" rather than guessing
- Never fabricate citations, statistics, book titles, journal references, or URLs
- Never invent fake sources or pretend to cite real publications
- If a question is outside your knowledge or training data, acknowledge the limitation instead of making up an answer
- If you provide factual claims, be transparent about your confidence level
- When discussing recent events or very new information, note that your knowledge may be outdated`,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [documentAttachment, setDocumentAttachment] = useState<Attachment | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);

  // Use refs for values needed in callbacks to avoid stale closures
  const currentChatRef = useRef<Chat | null>(null);

  useEffect(() => {
    setChats(getChats());
    setSettings(getSettings());
  }, []);

  // Keep ref in sync
  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  const setCurrentChat = useCallback((chat: Chat | null) => {
    setCurrentChatState(chat);
    currentChatRef.current = chat;
  }, []);

  const createNewChat = useCallback((model?: MistralModel): Chat => {
    const newChat: Chat = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: model || settings.defaultModel,
    };
    setChats((prev) => {
      const updated = [newChat, ...prev];
      saveChat(newChat);
      return updated;
    });
    setCurrentChatState(newChat);
    currentChatRef.current = newChat;
    return newChat;
  }, [settings.defaultModel]);

  const updateChat = useCallback((chatOrUpdate: Chat | ((prev: Chat | null) => Chat | null)) => {
    if (typeof chatOrUpdate === 'function') {
      // Functional update
      setCurrentChatState((prev) => {
        const updated = chatOrUpdate(prev);
        if (updated) {
          saveChat(updated);
          // Update chats list
          setChats((prevChats) => {
            const index = prevChats.findIndex((c) => c.id === updated.id);
            if (index >= 0) {
              const newChats = [...prevChats];
              newChats[index] = updated;
              return newChats;
            }
            return prevChats;
          });
        }
        currentChatRef.current = updated;
        return updated;
      });
    } else {
      // Direct value update
      const updatedChat = { ...chatOrUpdate, updatedAt: new Date() };
      setChats((prev) => {
        const index = prev.findIndex((c) => c.id === updatedChat.id);
        const newChats = index >= 0
          ? prev.map((c) => (c.id === updatedChat.id ? updatedChat : c))
          : [updatedChat, ...prev];
        saveChat(updatedChat);
        return newChats;
      });
      setCurrentChatState((prev) => {
        if (prev?.id === updatedChat.id) {
          currentChatRef.current = updatedChat;
          return updatedChat;
        }
        currentChatRef.current = prev;
        return prev;
      });
    }
  }, []);

  const removeChat = useCallback((id: string, replaceWith?: Chat | null) => {
    setChats((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      deleteChat(id);
      return updated;
    });
    if (currentChatRef.current?.id === id) {
      if (replaceWith) {
        setCurrentChatState(replaceWith);
        currentChatRef.current = replaceWith;
      } else {
        setCurrentChatState(null);
        currentChatRef.current = null;
      }
    }
  }, []);

  const addMessage = useCallback((chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };

    setChats((prev) => {
      const chat = prev.find((c) => c.id === chatId);
      if (!chat) return prev;

      const updatedChat = {
        ...chat,
        messages: [...chat.messages, newMessage],
        updatedAt: new Date(),
      };

      saveChat(updatedChat);

      if (currentChatRef.current?.id === chatId) {
        setCurrentChatState(updatedChat);
        currentChatRef.current = updatedChat;
      }

      return prev.map((c) => (c.id === chatId ? updatedChat : c));
    });
  }, []);

  const updateMessage = useCallback((chatId: string, messageId: string, content: string) => {
    setChats((prev) => {
      const chat = prev.find((c) => c.id === chatId);
      if (!chat) return prev;

      const updatedChat = {
        ...chat,
        messages: chat.messages.map((msg) =>
          msg.id === messageId ? { ...msg, content } : msg
        ),
        updatedAt: new Date(),
      };

      saveChat(updatedChat);

      if (currentChatRef.current?.id === chatId) {
        setCurrentChatState(updatedChat);
        currentChatRef.current = updatedChat;
      }

      return prev.map((c) => (c.id === chatId ? updatedChat : c));
    });
  }, []);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev);
  }, []);

  const openDocument = useCallback((attachment: Attachment) => {
    setDocumentAttachment(attachment);
    setCanvasOpen(true);
  }, []);

  const closeDocument = useCallback(() => {
    setDocumentAttachment(null);
    setCanvasOpen(false);
  }, []);

  const toggleCanvas = useCallback(() => {
    setCanvasOpen((prev) => !prev);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChat,
        settings,
        isGenerating,
        sidebarOpen,
        sidebarCollapsed,
        settingsOpen,
        documentAttachment,
        canvasOpen,
        createNewChat,
        setCurrentChat,
        updateChat,
        removeChat,
        addMessage,
        updateMessage,
        setIsGenerating,
        updateSettings,
        toggleSidebar,
        toggleSidebarCollapse,
        toggleSettings,
        openDocument,
        closeDocument,
        toggleCanvas,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
