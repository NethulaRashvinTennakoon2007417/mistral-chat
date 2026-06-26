import { Chat, Settings } from '@/types';

const CHATS_KEY = 'mistral-chats';
const SETTINGS_KEY = 'mistral-settings';

export function getChats(): Chat[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(CHATS_KEY);
    if (!data) return [];
    const chats = JSON.parse(data);
    return chats.map((chat: Chat) => ({
      ...chat,
      createdAt: new Date(chat.createdAt),
      updatedAt: new Date(chat.updatedAt),
      messages: chat.messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }));
  } catch {
    return [];
  }
}

export function saveChats(chats: Chat[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function getChat(id: string): Chat | null {
  const chats = getChats();
  return chats.find((c) => c.id === id) || null;
}

export function saveChat(chat: Chat): void {
  const chats = getChats();
  const index = chats.findIndex((c) => c.id === chat.id);
  if (index >= 0) {
    chats[index] = chat;
  } else {
    chats.unshift(chat);
  }
  saveChats(chats);
}

export function deleteChat(id: string): void {
  const chats = getChats();
  saveChats(chats.filter((c) => c.id !== id));
}

export function getSettings(): Settings {
  if (typeof window === 'undefined') {
    return {
      apiKey: '',
      defaultModel: 'mistral-small',
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: '',
    };
  }
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) {
      return {
        apiKey: '',
        defaultModel: 'mistral-small',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: '',
      };
    }
    return JSON.parse(data);
  } catch {
    return {
      apiKey: '',
      defaultModel: 'mistral-small',
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: '',
    };
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
