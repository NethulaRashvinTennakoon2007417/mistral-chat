import { Message, MistralModel, Settings } from '@/types';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1';

export interface ChatCompletionRequest {
  model: MistralModel;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: { role?: string; content?: string };
    finish_reason: string | null;
  }[];
}

export async function* streamChatCompletion(
  apiKey: string,
  messages: Message[],
  model: MistralModel,
  temperature: number = 0.7,
  maxTokens: number = 4096,
  systemPrompt?: string
): AsyncGenerator<string, void, unknown> {
  const apiMessages: { role: string; content: string }[] = [];

  if (systemPrompt) {
    apiMessages.push({ role: 'system', content: systemPrompt });
  }

  messages.forEach((msg) => {
    apiMessages.push({ role: msg.role, content: msg.content });
  });

  const response = await fetch(`${MISTRAL_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: apiMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const chunk: StreamChunk = JSON.parse(data);
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // Skip invalid JSON
      }
    }
  }
}

export async function generateTitle(
  apiKey: string,
  firstMessage: string,
  model: MistralModel
): Promise<string> {
  const response = await fetch(`${MISTRAL_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-tiny',
      messages: [
        {
          role: 'system',
          content: 'Generate a short, concise title (max 50 characters) for this conversation. Return only the title, no quotes or extra text.',
        },
        { role: 'user', content: firstMessage },
      ],
      temperature: 0.3,
      max_tokens: 50,
    }),
  });

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || 'New Chat';
}

export async function getAvailableModels(apiKey: string): Promise<string[]> {
  const response = await fetch(`${MISTRAL_API_URL}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  const data = await response.json();
  return data.data?.map((m: { id: string }) => m.id) || [];
}
