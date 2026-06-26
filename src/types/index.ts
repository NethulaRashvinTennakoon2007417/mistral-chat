export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  model: MistralModel;
}

export type MistralModel = 
  | 'mistral-tiny'
  | 'mistral-small'
  | 'mistral-medium'
  | 'mistral-large'
  | 'open-mixtral-8x7b'
  | 'open-mixtral-8x22b'
  | 'open-mistral-7b'
  | 'open-mistral-nemo'
  | 'codestral'
  | 'codestral-2405';

export const MISTRAL_MODELS: Record<MistralModel, { name: string; description: string; contextWindow: number }> = {
  'mistral-tiny': { name: 'Mistral Tiny', description: 'Fastest, most cost-effective', contextWindow: 32000 },
  'mistral-small': { name: 'Mistral Small', description: 'Balanced performance', contextWindow: 32000 },
  'mistral-medium': { name: 'Mistral Medium', description: 'High quality responses', contextWindow: 32000 },
  'mistral-large': { name: 'Mistral Large', description: 'Most capable model', contextWindow: 128000 },
  'open-mixtral-8x7b': { name: 'Mixtral 8x7B', description: 'Open source, fast', contextWindow: 32000 },
  'open-mixtral-8x22b': { name: 'Mixtral 8x22B', description: 'Open source, high quality', contextWindow: 65000 },
  'open-mistral-7b': { name: 'Mistral 7B', description: 'Open source, lightweight', contextWindow: 32000 },
  'open-mistral-nemo': { name: 'Mistral Nemo', description: 'Open source, balanced', contextWindow: 128000 },
  'codestral': { name: 'Codestral', description: 'Code generation specialist', contextWindow: 32000 },
  'codestral-2405': { name: 'Codestral 2405', description: 'Latest code model', contextWindow: 32000 },
};

export interface Settings {
  apiKey: string;
  defaultModel: MistralModel;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}
