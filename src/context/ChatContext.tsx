'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  updateChat: (chat: Chat) => void;
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
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    defaultModel: 'mistral-small',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setChats(getChats());
    setSettings(getSettings());
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
    setCurrentChat(newChat);
    return newChat;
  }, [settings.defaultModel]);

  const updateChat = useCallback((chat: Chat) => {
    const updatedChat = { ...chat, updatedAt: new Date() };
    setChats((prev) => {
      const updated = prev.map((c) => (c.id === chat.id ? updatedChat : c));
      saveChat(updatedChat);
      return updated;
    });
    if (currentChat?.id === chat.id) {
      setCurrentChat(updatedChat);
    }
  }, [currentChat]);

  const removeChat = useCallback((id: string) => {
    setChats((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      deleteChat(id);
      return updated;
    });
    if (currentChat?.id === id) {
      setCurrentChat(null);
    }
  }, [currentChat]);

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

      if (currentChat?.id === chatId) {
        setCurrentChat(updatedChat);
      }

      return prev.map((c) => (c.id === chatId ? updatedChat : c));
    });
  }, [currentChat]);

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

      if (currentChat?.id === chatId) {
        setCurrentChat(updatedChat);
      }

      return prev.map((c) => (c.id === chatId ? updatedChat : c));
    });
  }, [currentChat]);

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
