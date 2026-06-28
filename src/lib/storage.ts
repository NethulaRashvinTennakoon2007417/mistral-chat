import { Chat, Settings, MistralModel } from '@/types';

const CHATS_KEY = 'mistral-chats';
const SETTINGS_KEY = 'mistral-settings';

const VALID_MODELS: Set<string> = new Set([
  'auto',
  'mistral-small-latest',
  'mistral-medium-latest',
  'mistral-large-latest',
  'open-mixtral-8x7b',
  'open-mixtral-8x22b',
  'open-mistral-nemo',
  'codestral-latest',
  'pixtral-large-latest',
]);

function sanitizeModel(model: string): MistralModel {
  if (VALID_MODELS.has(model)) return model as MistralModel;
  // Map old model IDs to new ones
  const migration: Record<string, MistralModel> = {
    'mistral-tiny': 'mistral-small-latest',
    'mistral-small': 'mistral-small-latest',
    'mistral-medium': 'mistral-medium-latest',
    'mistral-large': 'mistral-large-latest',
    'open-mistral-7b': 'open-mistral-nemo',
    'codestral': 'codestral-latest',
    'codestral-2405': 'codestral-latest',
  };
  return migration[model] || 'mistral-small-latest';
}

export function getChats(): Chat[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(CHATS_KEY);
    if (!data) return [];
    const chats = JSON.parse(data);
    return chats.map((chat: Chat) => ({
      ...chat,
      model: sanitizeModel(chat.model),
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
  // Strip heavy base64 data from PDF attachments before persisting
  const sanitized = chats.map(chat => ({
    ...chat,
    messages: chat.messages.map(msg => ({
      ...msg,
      attachments: msg.attachments?.map(att => {
        if (att.type === 'application/pdf' && att.url?.startsWith('data:')) {
          return { ...att, url: undefined };
        }
        return att;
      }),
    })),
  }));
  localStorage.setItem(CHATS_KEY, JSON.stringify(sanitized));
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
  const defaults: Settings = {
    apiKey: '',
    defaultModel: 'auto',
    temperature: 0.7,
    maxTokens: 4096,
    memories: [],
    systemPrompt: '',
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return defaults;
    const parsed = JSON.parse(data);
    return {
      ...defaults,
      ...parsed,
      memories: Array.isArray(parsed.memories) ? parsed.memories : [],
      defaultModel: sanitizeModel(parsed.defaultModel),
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
