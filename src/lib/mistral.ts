import { Message, MistralModel, MistralMessage, MistralContentPart, Settings } from '@/types';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1';

export interface ChatCompletionRequest {
  model: MistralModel;
  messages: MistralMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
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

function buildMessageContent(msg: Message): string | MistralContentPart[] {
  const hasAttachments = msg.attachments && msg.attachments.length > 0;
  
  if (!hasAttachments) {
    return msg.content;
  }

  const parts: MistralContentPart[] = [];

  // Add image attachments as image_url parts
  const imageAttachments = msg.attachments!.filter(a => a.type.startsWith('image/') && a.url);
  for (const img of imageAttachments) {
    parts.push({
      type: 'image_url',
      image_url: { url: img.url! },
    });
  }

  // Add text file / PDF extracted content
  const textAttachments = msg.attachments!.filter(a => 
    (a.type.startsWith('text/') || a.name.endsWith('.json') || a.name.endsWith('.md') || a.name.endsWith('.csv') || a.type === 'application/pdf') && 
    (a.content || a.extractedText)
  );
  
  for (const file of textAttachments) {
    const fileContent = file.extractedText || file.content;
    parts.push({
      type: 'text',
      text: `\n\n[File: ${file.name}]\n${fileContent}`,
    });
  }

  // Add user message text
  if (msg.content) {
    parts.unshift({
      type: 'text',
      text: msg.content,
    });
  }

  return parts.length > 0 ? parts : msg.content;
}

export async function* streamChatCompletion(
  apiKey: string,
  messages: Message[],
  model: MistralModel,
  temperature: number = 0.7,
  maxTokens: number = 4096,
  systemPrompt?: string
): AsyncGenerator<string, void, unknown> {
  const apiMessages: MistralMessage[] = [];

  if (systemPrompt) {
    apiMessages.push({ role: 'system', content: systemPrompt });
  }

  messages.forEach((msg) => {
    apiMessages.push({
      role: msg.role,
      content: buildMessageContent(msg),
    });
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
      model: 'mistral-small-latest',
      messages: [
        {
          role: 'system',
          content: 'Generate a short, concise title (max 50 characters) for this conversation. Return only the title text with no formatting, no quotes, no markdown, no bold, no asterisks, no extra text.',
        },
        { role: 'user', content: firstMessage },
      ],
      temperature: 0.3,
      max_tokens: 50,
    }),
  });

  const data = await response.json();
  let title = data.choices[0]?.message?.content?.trim() || 'New Chat';
  // Strip any markdown formatting that might slip through
  title = title.replace(/\*\*/g, '').replace(/^["']|["']$/g, '').replace(/^#+\s*/, '').trim();
  return title || 'New Chat';
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
