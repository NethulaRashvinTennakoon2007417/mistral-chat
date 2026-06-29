'use client';

import { ChatProvider, useChat } from '@/context/ChatContext';
import { Sidebar } from '@/components/Sidebar';
import { ChatInterface } from '@/components/ChatInterface';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ToolsPanel } from '@/components/ToolsPanel';
import { MessageSquare, Zap, Shield, Globe, ChevronRight, Sparkles, Heart, Users, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';

function AppContent() {
  const { currentChat, sidebarOpen, chats, createNewChat, setCurrentChat } = useChat();
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  useEffect(() => {
    const selectHandler = (e: CustomEvent) => setSelectedTool(e.detail as string);
    const clearHandler = () => setSelectedTool(null);
    window.addEventListener('select-tool', selectHandler as EventListener);
    window.addEventListener('clear-tool', clearHandler);
    return () => {
      window.removeEventListener('select-tool', selectHandler as EventListener);
      window.removeEventListener('clear-tool', clearHandler);
    };
  }, []);

  // Show tools panel if a tool is selected (takes priority over chat)
  if (selectedTool) {
    return (
      <div className="flex h-screen bg-[var(--background)]">
        <Sidebar />
        <div className={`flex-1 flex flex-col transition-all duration-300 ease-out ${sidebarOpen ? 'ml-[296px]' : 'ml-0'}`}>
          <ToolsPanel initialTool={selectedTool as any} onBack={() => setSelectedTool(null)} />
        </div>
        <SettingsPanel />
      </div>
    );
  }

  // Show chat interface if there's a current chat
  if (currentChat) {
    return (
      <div className="flex h-screen bg-[var(--background)]">
        <Sidebar />
        <div className={`flex-1 flex flex-col transition-all duration-300 ease-out ${sidebarOpen ? 'ml-[296px]' : 'ml-0'}`}>
          <ChatInterface />
        </div>
        <SettingsPanel />
      </div>
    );
  }

  // Show homepage
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SettingsPanel />

      {/* Main Content */}
      <div>
        {/* Floating Glass Nav */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <nav className="flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-full liquid-glass">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all duration-200"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm shadow-orange-500/20">
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-[var(--foreground)]">Mistral Chat</span>
            </button>
            <div className="w-px h-5 bg-[var(--border)] mx-1" />
            <a href="#about" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-3 py-1.5 rounded-full text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/10 transition-all duration-200 cursor-pointer">About</a>
            <a href="#models" onClick={(e) => { e.preventDefault(); document.getElementById('models')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-3 py-1.5 rounded-full text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/10 transition-all duration-200 cursor-pointer">Models</a>
            <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/10 transition-all duration-200">API Docs</a>
          </nav>
        </div>

        {/* Hero Section */}
        <main className="max-w-5xl mx-auto px-6 pt-28 pb-16">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-[var(--foreground)] mb-4 leading-tight hero-animate">
              Chat with <mark className="highlight">Mistral AI</mark>
            </h1>
            <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8 hero-animate" style={{ animationDelay: '80ms' }}>
              Free, fast, and private. Chat with multiple Mistral models right in your browser.
              Nothing is stored on servers.
            </p>
            <button
              onClick={() => {
                if (chats.length > 0) {
                  const lastChat = chats.reduce((latest, chat) =>
                    new Date(chat.updatedAt) > new Date(latest.updatedAt) ? chat : latest
                  );
                  setCurrentChat(lastChat);
                } else {
                  createNewChat();
                }
              }}
              className="btn btn-primary text-base px-8 py-3 rounded-xl shadow-lg shadow-orange-500/25 hero-animate active:scale-95 transition-all duration-200"
              style={{ animationDelay: '160ms' }}
            >
              <MessageSquare size={18} />
              Start chatting
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 stagger-children">
            <div className="card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4 ring-1 ring-blue-100 dark:ring-blue-800/30">
                <Zap size={24} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Lightning Fast</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Streaming responses in real-time. See answers as they&apos;re generated, word by word.
              </p>
            </div>
            <div className="card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-4 ring-1 ring-green-100 dark:ring-green-800/30">
                <Shield size={24} className="text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Private by Design</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Your chats stay in your browser. API key stored locally, never sent to our servers.
              </p>
            </div>
            <div className="card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-4 ring-1 ring-purple-100 dark:ring-purple-800/30">
                <Globe size={24} className="text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Multiple Models</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Choose from Mistral Tiny, Small, Medium, Large, Mixtral, Codestral and more.
              </p>
            </div>
          </div>

          {/* Models Section */}
          <div id="models" className="mb-16 scroll-mt-20">
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 text-center hero-animate">
              Available <mark className="highlight">Models</mark>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
              {[
                { name: 'Auto', desc: 'AI picks the best model for the task', badge: 'Smart' },
                { name: 'Mistral Small', desc: 'Fast, balanced performance', badge: 'Fast' },
                { name: 'Mistral Medium', desc: 'High quality responses', badge: 'Quality' },
                { name: 'Mistral Large', desc: 'Most capable model, supports vision', badge: 'Powerful' },
                { name: 'Mixtral 8x7B', desc: 'Open source, fast', badge: 'Open' },
                { name: 'Codestral', desc: 'Code generation specialist', badge: 'Code' },
              ].map((model) => (
                <div key={model.name} className="card p-4 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{model.name}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{model.desc}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] font-medium">
                    {model.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* About Section */}
          <div id="about" className="mb-16 scroll-mt-20">
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 text-center hero-animate">
              About <mark className="highlight">Mistral Chat</mark>
            </h2>
            <div className="max-w-3xl mx-auto">
              <div className="card p-8 hero-animate" style={{ animationDelay: '80ms' }}>
                <p className="text-[var(--muted-foreground)] leading-relaxed mb-6">
                  Mistral Chat is an open-source, privacy-first interface for conversing with{' '}
                  <a href="https://mistral.ai/" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">Mistral AI</a>
                  {' '}models. Built as a free alternative to proprietary chatbots, it puts you in full control of your data and API usage.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                      <Heart size={18} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">Open Source</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Free to use, fork, and contribute. No vendor lock-in.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                      <Lock size={18} className="text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">Your Data, Your Browser</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Chat history and API keys stay on your device via localStorage.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                      <Users size={18} className="text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">Community Driven</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Built for the community. Feature requests and PRs welcome.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6 text-center hero-animate">
              Frequently Asked <mark className="highlight">Questions</mark>
            </h2>
            <div className="space-y-3 stagger-children">
              {[
                { q: 'Is Mistral Chat free?', a: 'Yes. The interface is completely free. You only need a Mistral API key, which has a generous free tier.' },
                { q: 'Are my chats stored anywhere?', a: 'No. Everything stays in your browser using localStorage. Nothing is sent to our servers.' },
                { q: 'How do I get an API key?', a: 'Visit console.mistral.ai to create a free account and get your API key in seconds.' },
                { q: 'Which model should I use?', a: 'Start with Auto mode — it picks the best model for your task. Or manually choose: Small for quick chat, Codestral for code, Large for complex reasoning.' },
              ].map((faq, i) => (
                <details key={i} className="card group hover:shadow-md transition-all duration-300">
                  <summary className="p-4 cursor-pointer font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-all duration-200 list-none flex items-center justify-between">
                    {faq.q}
                    <ChevronRight size={16} className="text-[var(--muted-foreground)] transition-transform duration-300 ease-out group-open:rotate-90" />
                  </summary>
                  <div className="px-4 pb-4 text-sm text-[var(--muted-foreground)]">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center card p-12 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-100 dark:border-orange-800/30 hero-animate hover:shadow-lg transition-all duration-300">
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-3">
              Ready to start chatting?
            </h2>
            <p className="text-[var(--muted-foreground)] mb-6">
              Get your free API key from Mistral and start conversations in seconds.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a
                href="https://console.mistral.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary active:scale-95 transition-all duration-200"
              >
                Get API Key
                <ChevronRight size={16} />
              </a>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--border)] mt-16">
          <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-[var(--muted-foreground)]">
            <p>Mistral Chat &copy; 2026</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-[var(--foreground)] transition-all duration-200">Privacy</a>
              <a href="#" className="hover:text-[var(--foreground)] transition-all duration-200">Terms</a>
              <a href="https://mistral.ai/" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-all duration-200">Mistral AI</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
}
