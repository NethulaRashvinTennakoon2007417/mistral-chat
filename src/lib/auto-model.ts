import { MistralModel, ResolvedModel, Attachment } from '@/types';

const CODE_KEYWORDS = [
  'code', 'function', 'class', 'variable', 'debug', 'error', 'bug',
  'compile', 'syntax', 'algorithm', 'api', 'database', 'sql', 'query',
  'html', 'css', 'javascript', 'typescript', 'python', 'java', 'react',
  'component', 'loop', 'array', 'string', 'boolean', 'integer', 'import',
  'export', 'module', 'package', 'npm', 'git', 'docker', 'deploy',
  'refactor', 'optimize', 'test', 'unit test', 'regex', 'json', 'xml',
  'parse', 'async', 'await', 'promise', 'callback', 'endpoint', 'server',
  'frontend', 'backend', 'fullstack', 'devops', 'ci/cd', 'lint', 'build',
];

const COMPLEX_KEYWORDS = [
  'analyze', 'analysis', 'compare', 'contrast', 'evaluate', 'explain why',
  'how does', 'what is the difference', 'pros and cons', 'trade-off',
  'architecture', 'design pattern', 'system design', 'scalability',
  'research', 'thesis', 'argument', 'essay', 'report', 'strategy',
  'plan', 'roadmap', 'proposal', 'whitepaper', 'literature review',
];

function hasImageAttachments(attachments?: Attachment[]): boolean {
  return !!attachments?.some(a => a.type.startsWith('image/'));
}

function hasPdfAttachments(attachments?: Attachment[]): boolean {
  return !!attachments?.some(a => a.type === 'application/pdf');
}

function hasCodeBlocks(text: string): boolean {
  return /```[\s\S]*?```/.test(text) || /`[^`]+`/.test(text);
}

function isCodeTask(text: string): boolean {
  const lower = text.toLowerCase();
  const matchCount = CODE_KEYWORDS.filter(kw => lower.includes(kw)).length;
  return matchCount >= 2 || /```[\s\S]*?```/.test(text);
}

function isComplexTask(text: string): boolean {
  const lower = text.toLowerCase();
  const matchCount = COMPLEX_KEYWORDS.filter(kw => lower.includes(kw)).length;
  const isLong = text.length > 300;
  return matchCount >= 2 || isLong;
}

function isSimpleGreeting(text: string): boolean {
  const cleaned = text.trim().toLowerCase();
  const greetings = [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
    'howdy', 'sup', 'yo', 'hiya', 'greetings',
  ];
  return greetings.some(g => cleaned === g || cleaned.startsWith(g + ' ')) && cleaned.length < 50;
}

export function detectModel(
  message: string,
  attachments?: Attachment[],
  currentModel?: MistralModel
): ResolvedModel {
  // If user has manually selected a specific model (not auto), respect it
  if (currentModel && currentModel !== 'auto') {
    return currentModel;
  }

  // Image attachments → vision model
  if (hasImageAttachments(attachments)) {
    return 'pixtral-large-latest';
  }

  // PDF attachments → large model (better at long text extraction)
  if (hasPdfAttachments(attachments)) {
    return 'mistral-large-latest';
  }

  // Code task → codestral
  if (isCodeTask(message)) {
    return 'codestral-latest';
  }

  // Complex task → large model
  if (isComplexTask(message)) {
    return 'mistral-large-latest';
  }

  // Simple greeting → small model (fastest)
  if (isSimpleGreeting(message)) {
    return 'mistral-small-latest';
  }

  // Default → small model (fast, balanced)
  return 'mistral-small-latest';
}
