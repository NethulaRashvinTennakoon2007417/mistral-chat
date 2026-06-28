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
  'script', 'program', 'debugging', 'exception', 'stack trace', 'console',
  'database', 'schema', 'migration', 'orm', 'query', 'index', 'cursor',
  'write a', 'write me', 'create a', 'build a', 'implement', 'fix this',
  'fix my', 'help me write', 'help me debug', 'help me fix',
];

const COMPLEX_KEYWORDS = [
  'analyze', 'analysis', 'compare', 'contrast', 'evaluate', 'explain why',
  'how does', 'what is the difference', 'pros and cons', 'trade-off',
  'architecture', 'design pattern', 'system design', 'scalability',
  'research', 'thesis', 'argument', 'essay', 'report', 'strategy',
  'plan', 'roadmap', 'proposal', 'whitepaper', 'literature review',
  'summarize', 'summary', 'deep dive', 'in-depth', 'comprehensive',
  'detailed', 'elaborate', 'break down', 'step by step',
];

const MODEL_CHANGE_PATTERNS = [
  /change\s+(the\s+)?model/i,
  /switch\s+(to\s+)?(a\s+)?(different|other|another)\s+model/i,
  /use\s+(a\s+)?(different|other|another|better|faster|smarter|bigger|larger|smaller|lighter)\s+model/i,
  /try\s+(a\s+)?(different|other|another)\s+model/i,
  /pick\s+(a\s+)?(different|other|another|better|faster|smarter|bigger|larger|smaller|lighter)\s+model/i,
  /use\s+(mistral\s+)?(large|big|smart)/i,
  /use\s+(mistral\s+)?(small|tiny|light|fast)/i,
  /upgrade\s+(the\s+)?model/i,
  /downgrade\s+(the\s+)?model/i,
  /better\s+model/i,
  /smarter\s+model/i,
  /faster\s+model/i,
  /change\s+from\s+\w+\s+to/i,
  /switch\s+from\s+\w+\s+to/i,
];

function hasImageAttachments(attachments?: Attachment[]): boolean {
  return !!attachments?.some(a => a.type.startsWith('image/'));
}

function hasPdfAttachments(attachments?: Attachment[]): boolean {
  return !!attachments?.some(a => a.type === 'application/pdf');
}

function isModelChangeRequest(text: string): { requested: boolean; hint?: 'bigger' | 'smaller' | 'code' | 'vision' } {
  const lower = text.toLowerCase().trim();

  for (const pattern of MODEL_CHANGE_PATTERNS) {
    if (pattern.test(text)) {
      if (/large|big|smart|better|upgrade|stronger|capable/.test(lower)) {
        return { requested: true, hint: 'bigger' };
      }
      if (/small|tiny|light|fast|faster|downgrade|lighter/.test(lower)) {
        return { requested: true, hint: 'smaller' };
      }
      if (/code|debug|script|program/.test(lower)) {
        return { requested: true, hint: 'code' };
      }
      if (/image|photo|picture|vision|see|look/.test(lower)) {
        return { requested: true, hint: 'vision' };
      }
      return { requested: true };
    }
  }

  return { requested: false };
}

function isCodeTask(text: string): boolean {
  const lower = text.toLowerCase();
  const matchCount = CODE_KEYWORDS.filter(kw => lower.includes(kw)).length;
  // Single strong code signals
  if (/```[\s\S]*?```/.test(text)) return true;
  if (/\b(python|javascript|typescript|java|html|css|react|node|sql|bash|shell)\b/.test(lower)) return true;
  if (/\b(write|create|build|implement|fix|debug)\b.*\b(script|code|function|class|program|app|component|api|endpoint)\b/.test(lower)) return true;
  if (/\b(script|code|function|class|program)\b.*\b(for|that|which|to)\b/.test(lower)) return true;
  return matchCount >= 2;
}

function isComplexTask(text: string): boolean {
  const lower = text.toLowerCase();
  const matchCount = COMPLEX_KEYWORDS.filter(kw => lower.includes(kw)).length;
  const isLong = text.length > 200;
  // Single strong complex signals
  if (/\b(compare|contrast|analyze|evaluate|explain the difference|pros and cons)\b/.test(lower)) return true;
  if (/\b(summarize|summary|deep dive|comprehensive|detailed|elaborate)\b/.test(lower)) return true;
  return matchCount >= 2 || isLong;
}

function isSimpleGreeting(text: string): boolean {
  const cleaned = text.trim().toLowerCase();
  const greetings = [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
    'howdy', 'sup', 'yo', 'hiya', 'greetings', 'thanks', 'thank you', 'ok', 'okay',
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

  // PDF attachments → small model (text is pre-extracted, no need for large model)
  if (hasPdfAttachments(attachments)) {
    return 'mistral-small-latest';
  }

  // Check if user is asking to change the model
  const modelChange = isModelChangeRequest(message);
  if (modelChange.requested) {
    switch (modelChange.hint) {
      case 'bigger':
        return 'mistral-large-latest';
      case 'smaller':
        return 'mistral-small-latest';
      case 'code':
        return 'codestral-latest';
      case 'vision':
        return 'pixtral-large-latest';
      default:
        // Generic "change model" request → upgrade to large
        return 'mistral-large-latest';
    }
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
