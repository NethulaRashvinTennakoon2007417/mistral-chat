'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Chat, Message, MistralModel, Settings } from '@/types';
import { getChats, saveChat, deleteChat, getSettings, saveSettings } from '@/lib/storage';
import { generateId } from '@/lib/utils';

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  settings: Settings;
  isGenerating: boolean;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  createNewChat: (model?: MistralModel) => Chat;
  setCurrentChat: (chat: Chat | null) => void;
  updateChat: (chat: Chat | ((prev: Chat | null) => Chat | null)) => void;
  removeChat: (id: string) => void;
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
  setIsGenerating: (value: boolean) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  toggleSidebar: () => void;
  toggleSettings: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChatState] = useState<Chat | null>(null);
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    defaultModel: 'mistral-small-latest',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const removeChat = useCallback((id: string) => {
    setChats((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      deleteChat(id);
      return updated;
    });
    if (currentChatRef.current?.id === id) {
      setCurrentChatState(null);
      currentChatRef.current = null;
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

  const toggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChat,
        settings,
        isGenerating,
        sidebarOpen,
        settingsOpen,
        createNewChat,
        setCurrentChat,
        updateChat,
        removeChat,
        addMessage,
        updateMessage,
        setIsGenerating,
        updateSettings,
        toggleSidebar,
        toggleSettings,
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
