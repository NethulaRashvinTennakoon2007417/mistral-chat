'use client';

import { useState } from 'react';
import { X, Search, Sparkles, Code, Pen, GraduationCap, Languages, Briefcase, Lightbulb } from 'lucide-react';

interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  category: string;
  icon: string;
}

const TEMPLATES: PromptTemplate[] = [
  // Writing
  { id: 'write-email', name: 'Professional Email', prompt: 'Help me write a professional email to [recipient] about [topic]. Use a polite and clear tone.', category: 'Writing', icon: '✉️' },
  { id: 'write-blog', name: 'Blog Post Outline', prompt: 'Create a detailed outline for a blog post about [topic]. Include an engaging introduction, 4-6 main sections with sub-points, and a conclusion with a call to action.', category: 'Writing', icon: '📝' },
  { id: 'write-story', name: 'Short Story', prompt: 'Write a short story (500-800 words) about [topic/theme]. Include vivid descriptions, dialogue, and a surprising twist ending.', category: 'Writing', icon: '📖' },
  { id: 'write-cover', name: 'Cover Letter', prompt: 'Write a cover letter for a [job title] position at [company]. Highlight my experience in [field] and explain why I am a great fit.', category: 'Writing', icon: '💼' },
  { id: 'write-resume', name: 'Resume Bullet Points', prompt: 'Create 5 strong resume bullet points for a [job title] role. Start each with an action verb and include quantifiable achievements where possible.', category: 'Writing', icon: '📋' },

  // Coding
  { id: 'code-review', name: 'Code Review', prompt: 'Review this code for bugs, performance issues, and best practices. Suggest improvements:\n\n```\n[paste code here]\n```', category: 'Coding', icon: '🔍' },
  { id: 'code-explain', name: 'Explain Code', prompt: 'Explain this code step by step in simple terms. What does it do, how does it work, and why is it written this way?\n\n```\n[paste code here]\n```', category: 'Coding', icon: '💡' },
  { id: 'code-debug', name: 'Debug Error', prompt: 'I am getting this error: [error message]\n\nHere is my code:\n```\n[paste code here]\n```\n\nWhat is causing this error and how do I fix it?', category: 'Coding', icon: '🐛' },
  { id: 'code-convert', name: 'Convert Code', prompt: 'Convert this [source language] code to [target language]. Keep the same logic and functionality:\n\n```\n[paste code here]\n```', category: 'Coding', icon: '🔄' },
  { id: 'code-api', name: 'Build REST API', prompt: 'Create a REST API endpoint for [functionality] using [framework]. Include proper error handling, input validation, and comments.', category: 'Coding', icon: '🌐' },

  // Learning
  { id: 'learn-concept', name: 'Explain Concept', prompt: 'Explain [concept] like I am a beginner. Use simple analogies, real-world examples, and avoid jargon. Then provide 3 practice questions.', category: 'Learning', icon: '🎓' },
  { id: 'learn-compare', name: 'Compare & Contrast', prompt: 'Compare and contrast [topic A] vs [topic B]. Create a detailed comparison table and provide your recommendation for [use case].', category: 'Learning', icon: '⚖️' },
  { id: 'learn-quiz', name: 'Generate Quiz', prompt: 'Create a 10-question quiz about [topic]. Include multiple choice, true/false, and short answer questions. Provide answers at the end.', category: 'Learning', icon: '❓' },
  { id: 'learn-summary', name: 'Summarize Text', prompt: 'Summarize the following text in 3-5 key bullet points. Keep it concise but preserve the most important information:\n\n[paste text here]', category: 'Learning', icon: '📊' },

  // Translation & Languages
  { id: 'translate-formal', name: 'Formal Translation', prompt: 'Translate the following text to [target language] using formal/professional tone. Preserve the original meaning and nuance:\n\n[paste text here]', category: 'Languages', icon: '🌍' },
  { id: 'translate-casual', name: 'Casual Translation', prompt: 'Translate the following to [target language] in a casual, conversational tone as a native speaker would say it:\n\n[paste text here]', category: 'Languages', icon: '💬' },

  // Business
  { id: 'biz-analysis', name: 'SWOT Analysis', prompt: 'Create a SWOT analysis for [business/product/idea]. Identify Strengths, Weaknesses, Opportunities, and Threats with 3-4 items each.', category: 'Business', icon: '📈' },
  { id: 'biz-pitch', name: 'Elevator Pitch', prompt: 'Write a 30-second elevator pitch for [product/company/idea]. Make it compelling, clear, and memorable.', category: 'Business', icon: '🎤' },
  { id: 'biz-strategy', name: 'Growth Strategy', prompt: 'Develop a growth strategy for [business] targeting [audience]. Include 3 short-term tactics and 3 long-term initiatives with expected outcomes.', category: 'Business', icon: '🚀' },

  // Creative
  { id: 'creative-name', name: 'Name Generator', prompt: 'Generate 10 creative names for [product/app/company]. Consider [industry] and [target audience]. For each name, explain why it works.', category: 'Creative', icon: '✨' },
  { id: 'creative-slogan', name: 'Slogan/Tagline', prompt: 'Create 5 catchy slogans/taglines for [product/brand]. Make them memorable, short, and reflective of [brand values].', category: 'Creative', icon: '💭' },
  { id: 'creative-brainstorm', name: 'Brainstorm Ideas', prompt: 'Brainstorm 10 creative ideas for [topic/project]. Think outside the box and provide a mix of practical and ambitious ideas.', category: 'Creative', icon: '🧠' },
];

const CATEGORIES = [
  { name: 'All', icon: Sparkles },
  { name: 'Writing', icon: Pen },
  { name: 'Coding', icon: Code },
  { name: 'Learning', icon: GraduationCap },
  { name: 'Languages', icon: Languages },
  { name: 'Business', icon: Briefcase },
  { name: 'Creative', icon: Lightbulb },
];

interface PromptTemplatesProps {
  onSelect: (prompt: string) => void;
  onClose: () => void;
}

export function PromptTemplates({ onSelect, onClose }: PromptTemplatesProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = TEMPLATES.filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.prompt.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Prompt Templates</h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-1.5 px-6 pt-4 overflow-x-auto">
          {CATEGORIES.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setActiveCategory(name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                activeCategory === name
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
              }`}
            >
              <Icon size={12} />
              {name}
            </button>
          ))}
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filtered.map((template) => (
              <button
                key={template.id}
                onClick={() => { onSelect(template.prompt); onClose(); }}
                className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--primary)] transition-all duration-200 text-left group active:scale-[0.98]"
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{template.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{template.name}</p>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{template.prompt.slice(0, 80)}...</p>
                </div>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-[var(--muted-foreground)] py-8">No templates found</p>
          )}
        </div>
      </div>
    </div>
  );
}
