import { MistralModel, ResolvedModel, Attachment, MessageIntent, ChatTopic, Message } from '@/types';

// ── Intent keyword banks ──────────────────────────────────────────────

const CODE_KEYWORDS = new Set([
  'code', 'function', 'class', 'variable', 'debug', 'error', 'bug',
  'compile', 'syntax', 'algorithm', 'api', 'database', 'sql', 'query',
  'html', 'css', 'javascript', 'typescript', 'python', 'java', 'react',
  'component', 'loop', 'array', 'string', 'boolean', 'integer', 'import',
  'export', 'module', 'package', 'npm', 'git', 'docker', 'deploy',
  'refactor', 'optimize', 'test', 'unit test', 'regex', 'json', 'xml',
  'parse', 'async', 'await', 'promise', 'callback', 'endpoint', 'server',
  'frontend', 'backend', 'fullstack', 'devops', 'ci/cd', 'lint', 'build',
  'script', 'program', 'debugging', 'exception', 'stack trace', 'console',
  'schema', 'migration', 'orm', 'index', 'cursor',
  'typescript', 'rust', 'golang', 'ruby', 'php', 'swift', 'kotlin',
  'bash', 'shell', 'powershell', 'terminal', 'command line',
]);

const CODE_STRONG_PATTERNS = [
  /```[\s\S]*?```/,
  /\b(python|javascript|typescript|java|html|css|react|node|sql|bash|shell|rust|golang|ruby|php|swift|kotlin)\b/i,
  /\b(write|create|build|implement|fix|debug|refactor)\b.*\b(script|code|function|class|program|app|component|api|endpoint|module|service|handler|middleware|hook|util|helper)\b/i,
  /\b(script|code|function|class|program|app|component)\b.*\b(for|that|which|to|in)\b/i,
  /\b(debug|fix|resolve)\b.*\b(error|bug|issue|exception|crash|failing|broken)/i,
  /\b(git|github|gitlab|bitbucket)\b.*\b(push|pull|merge|commit|branch|clone|fork|repo)/i,
  /\b(npm|yarn|pnpm|pip|cargo|gem|composer)\b.*\b(install|run|build|start|test)/i,
  /\b(docker|kubernetes|k8s|container|pod|deployment|service)\b/i,
  /\b(ci\/cd|pipeline|workflow|action|runner)\b/i,
  /\b(rest|graphql|grpc|websocket|socket|http|https)\b.*\b(api|endpoint|server|client)/i,
];

const ANALYSIS_KEYWORDS = new Set([
  'analyze', 'analysis', 'compare', 'contrast', 'evaluate', 'explain why',
  'how does', 'what is the difference', 'pros and cons', 'trade-off',
  'architecture', 'design pattern', 'system design', 'scalability',
  'research', 'thesis', 'argument', 'essay', 'report', 'strategy',
  'plan', 'roadmap', 'proposal', 'whitepaper', 'literature review',
  'summarize', 'summary', 'deep dive', 'in-depth', 'comprehensive',
  'detailed', 'elaborate', 'break down', 'step by step',
  'implications', 'consequences', 'ramifications', 'impact',
  'hypothesis', 'methodology', 'findings', 'conclusion',
]);

const CREATIVE_KEYWORDS = new Set([
  'write', 'story', 'poem', 'creative', 'imagine', 'fiction',
  'narrative', 'character', 'dialogue', 'scene', 'chapter',
  'blog post', 'article', 'essay', 'copy', 'headline', 'tagline',
  'marketing', 'pitch', 'slogan', 'brand', 'voice',
  'brainstorm', 'ideate', 'concept', 'theme', 'mood',
]);

const GREETING_PATTERNS = /^(hi|hello|hey|yo|hiya|howdy|sup|greetings|good\s+(morning|afternoon|evening|day)|thanks|thank\s+you|ok|okay|yes|no|sure|cool|nice|great|awesome|perfect|sounds good|got it|understood|noted|will do|appreciate|cheers|bye|goodbye|see you|talk later|catch you later)[\s!.?]*$/i;

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
];

// ── Intent classification ─────────────────────────────────────────────

export function classifyIntent(text: string): MessageIntent {
  const trimmed = text.trim();

  // Very short messages are quick chat
  if (trimmed.length < 15 && !/```/.test(trimmed)) {
    // But check greetings first
    if (GREETING_PATTERNS.test(trimmed)) return 'greeting';
    return 'quick_chat';
  }

  // Check model change request
  for (const pattern of MODEL_CHANGE_PATTERNS) {
    if (pattern.test(trimmed)) return 'model_change';
  }

  // Check code intent (strong patterns first)
  for (const pattern of CODE_STRONG_PATTERNS) {
    if (pattern.test(trimmed)) return 'code';
  }
  const lower = trimmed.toLowerCase();
  const codeHits = [...CODE_KEYWORDS].filter(kw => lower.includes(kw)).length;
  if (codeHits >= 2) return 'code';

  // Check analysis intent
  const analysisHits = [...ANALYSIS_KEYWORDS].filter(kw => lower.includes(kw)).length;
  if (/\b(compare|contrast|analyze|evaluate|explain the difference|pros and cons|implications)\b/i.test(trimmed)) return 'analysis';
  if (analysisHits >= 2) return 'analysis';
  if (trimmed.length > 400 && analysisHits >= 1) return 'analysis';

  // Check creative intent
  const creativeHits = [...CREATIVE_KEYWORDS].filter(kw => lower.includes(kw)).length;
  if (/\b(write|create|draft|compose)\b.*\b(blog|article|story|poem|essay|post|copy|content)\b/i.test(trimmed)) return 'creative';
  if (creativeHits >= 2) return 'creative';

  // Greeting
  if (GREETING_PATTERNS.test(trimmed)) return 'greeting';

  // Short follow-ups are quick chat
  if (trimmed.length < 80) return 'quick_chat';

  return 'unknown';
}

// ── Chat topic inference ──────────────────────────────────────────────

export function inferTopicFromMessages(messages: Message[]): ChatTopic {
  const recentMessages = messages.slice(-6);
  let codeScore = 0;
  let analysisScore = 0;
  let creativeScore = 0;

  for (const msg of recentMessages) {
    if (msg.intent === 'code') codeScore += 2;
    else if (msg.intent === 'analysis') analysisScore += 2;
    else if (msg.intent === 'creative') creativeScore += 2;

    if (msg.model === 'codestral-latest') codeScore += 1;
    else if (msg.model === 'mistral-large-latest') analysisScore += 1;
  }

  const max = Math.max(codeScore, analysisScore, creativeScore);
  if (max === 0) return 'general';
  if (codeScore === max) return 'coding';
  if (analysisScore === max) return 'analysis';
  return 'creative';
}

// ── Model routing ─────────────────────────────────────────────────────

function intentToModel(intent: MessageIntent, topic: ChatTopic): ResolvedModel {
  switch (intent) {
    case 'code':
      return 'codestral-latest';
    case 'analysis':
      return 'mistral-large-latest';
    case 'creative':
      return 'mistral-medium-latest';
    case 'greeting':
    case 'quick_chat':
      return 'mistral-small-latest';
    case 'model_change':
      return 'mistral-large-latest';
    case 'unknown':
    default: {
      // Use topic context for unknowns
      if (topic === 'coding') return 'codestral-latest';
      if (topic === 'analysis') return 'mistral-large-latest';
      if (topic === 'creative') return 'mistral-medium-latest';
      return 'mistral-small-latest';
    }
  }
}

// ── Main routing function ─────────────────────────────────────────────

export interface RoutingResult {
  model: ResolvedModel;
  intent: MessageIntent;
}

export function detectModel(
  message: string,
  attachments?: Attachment[],
  currentModel?: MistralModel,
  chatTopic?: ChatTopic,
  recentMessages?: Message[],
): RoutingResult {
  // If user has manually selected a specific model (not auto), respect it
  if (currentModel && currentModel !== 'auto') {
    return { model: currentModel, intent: 'unknown' };
  }

  // Image attachments → vision model
  if (attachments?.some(a => a.type.startsWith('image/'))) {
    return { model: 'pixtral-large-latest', intent: 'unknown' };
  }

  // PDF attachments → small model
  if (attachments?.some(a => a.type === 'application/pdf')) {
    return { model: 'mistral-small-latest', intent: 'quick_chat' };
  }

  // Infer topic from recent messages if not provided
  const topic = chatTopic || (recentMessages ? inferTopicFromMessages(recentMessages) : 'general');

  // Classify intent
  const intent = classifyIntent(message);

  // Handle model change requests with hints
  if (intent === 'model_change') {
    const lower = message.toLowerCase();
    if (/large|big|smart|better|upgrade|stronger|capable/.test(lower)) {
      return { model: 'mistral-large-latest', intent };
    }
    if (/small|tiny|light|fast|downgrade|lighter/.test(lower)) {
      return { model: 'mistral-small-latest', intent };
    }
    if (/code|debug|script|program/.test(lower)) {
      return { model: 'codestral-latest', intent };
    }
    if (/image|photo|picture|vision|see|look/.test(lower)) {
      return { model: 'pixtral-large-latest', intent };
    }
    return { model: 'mistral-large-latest', intent };
  }

  // Route based on intent + topic context
  const model = intentToModel(intent, topic);

  return { model, intent };
}
