export interface TodoItem {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  todos?: TodoItem[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string;
  extractedText?: string;
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
  | 'auto'
  | 'mistral-small-latest'
  | 'mistral-medium-latest'
  | 'mistral-large-latest'
  | 'open-mixtral-8x7b'
  | 'open-mixtral-8x22b'
  | 'open-mistral-nemo'
  | 'codestral-latest'
  | 'pixtral-large-latest';

export const MISTRAL_MODELS: Record<MistralModel, { name: string; description: string; contextWindow: number; supportsVision?: boolean }> = {
  'auto': { name: 'Auto', description: 'AI picks the best model for the task', contextWindow: 128000 },
  'mistral-small-latest': { name: 'Mistral Small', description: 'Fast, balanced performance', contextWindow: 128000 },
  'mistral-medium-latest': { name: 'Mistral Medium', description: 'High quality responses', contextWindow: 128000 },
  'mistral-large-latest': { name: 'Mistral Large', description: 'Most capable model', contextWindow: 128000, supportsVision: true },
  'open-mixtral-8x7b': { name: 'Mixtral 8x7B', description: 'Open source, fast', contextWindow: 32000 },
  'open-mixtral-8x22b': { name: 'Mixtral 8x22B', description: 'Open source, high quality', contextWindow: 65000 },
  'open-mistral-nemo': { name: 'Mistral NeMo', description: 'Open source, lightweight', contextWindow: 128000 },
  'codestral-latest': { name: 'Codestral', description: 'Code generation specialist', contextWindow: 32000 },
  'pixtral-large-latest': { name: 'Pixtral Large', description: 'Vision + reasoning', contextWindow: 128000, supportsVision: true },
};

export type ResolvedModel = Exclude<MistralModel, 'auto'>;

export interface Settings {
  apiKey: string;
  defaultModel: MistralModel;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  memories: string[];
}

// Mistral API types
export interface MistralContentText {
  type: 'text';
  text: string;
}

export interface MistralContentImage {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export type MistralContentPart = MistralContentText | MistralContentImage;

export interface MistralMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | MistralContentPart[];
}
