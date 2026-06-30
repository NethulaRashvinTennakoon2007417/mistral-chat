'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, ArrowLeft, ArrowRight, RotateCcw, ExternalLink,
  Globe, Loader2, AlertCircle, BookOpen, MessageSquare,
  Sparkles, Search, CheckCircle2,
} from 'lucide-react';
import { BrowserPage } from '@/types';
import { normalizeUrl, fetchAndExtract, extractFromIframe } from '@/lib/browser';

interface BrowserPanelProps {
  url: string;
  page: BrowserPage | null;
  loading: boolean;
  error: string | null;
  onUrlChange: (url: string) => void;
  onNavigate: (url: string) => void;
  onPageLoad: (page: BrowserPage) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
  onReadPage: () => void;
  onSummarizePage: () => void;
  onAskAboutPage: () => void;
  onClose: () => void;
}

export function BrowserPanel({
  url,
  page,
  loading,
  error,
  onUrlChange,
  onNavigate,
  onPageLoad,
  onLoading,
  onError,
  onReadPage,
  onSummarizePage,
  onAskAboutPage,
  onClose,
}: BrowserPanelProps) {
  const [inputValue, setInputValue] = useState(url === 'https://' ? '' : url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [iframeError, setIframeError] = useState(false);


  const doNavigate = useCallback((targetUrl: string) => {
    const normalized = normalizeUrl(targetUrl);
    setInputValue(normalized);
    onUrlChange(normalized);
    onNavigate(normalized);
    setIframeError(false);
    onLoading(true);
    onError(null);

    // Add to history
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(normalized);
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex, onNavigate, onUrlChange, onLoading, onError]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      doNavigate(inputValue);
    }
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevUrl = history[newIndex];
      setInputValue(prevUrl);
      onUrlChange(prevUrl);
      onNavigate(prevUrl);
      setIframeError(false);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextUrl = history[newIndex];
      setInputValue(nextUrl);
      onUrlChange(nextUrl);
      onNavigate(nextUrl);
      setIframeError(false);
    }
  };

  const handleReload = () => {
    if (iframeRef.current && !iframeError) {
      setIframeError(false);
      onLoading(true);
      iframeRef.current.src = iframeRef.current.src;
    } else if (url && url !== 'https://') {
      doNavigate(url);
    }
  };

  const handleIframeLoad = useCallback(async () => {
    setIframeError(false);
    const currentUrl = iframeRef.current?.src || url;

    // Try same-origin DOM access first
    const iframe = iframeRef.current;
    if (iframe) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          // Detect if iframe shows a browser error page (refused to connect, etc.)
          const bodyText = doc.body?.textContent || '';
          const isBlocked = /refused to connect|failed to load|not found|access denied|blocked/i.test(bodyText)
            && bodyText.length < 500;

          if (isBlocked) {
            // Iframe is blocked — show screenshot, still fetch text via proxy
            onLoading(false);
            setIframeError(true);
            try {
              const extracted = await fetchAndExtract(currentUrl);
              onPageLoad(extracted);
            } catch {
              // Proxy also failed, that's ok — screenshot is the primary view
            }
            return;
          }

          const title = doc.title || new URL(currentUrl).hostname;
          const headings: string[] = [];
          doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
            const text = el.textContent?.trim();
            if (text) headings.push(text);
          });
          const paragraphs: string[] = [];
          doc.querySelectorAll('p').forEach((el) => {
            const text = el.textContent?.trim();
            if (text && text.length > 20) paragraphs.push(text);
          });
          if (paragraphs.length > 0) {
            const links: { text: string; href: string }[] = [];
            doc.querySelectorAll('a[href]').forEach((el) => {
              const text = el.textContent?.trim();
              const href = el.getAttribute('href');
              if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                try {
                  links.push({ text: text.slice(0, 100), href: new URL(href, currentUrl).href });
                } catch { /* skip */ }
              }
            });
            onLoading(false);
            onPageLoad({
              url: currentUrl,
              title,
              headings: headings.slice(0, 30),
              paragraphs: paragraphs.slice(0, 50),
              links: links.slice(0, 40),
              extractedAt: new Date(),
            });
            return;
          }
        }
      } catch {
        // Cross-origin — show screenshot fallback, fetch text via proxy
        onLoading(false);
        setIframeError(true);
        try {
          const extracted = await fetchAndExtract(currentUrl);
          onPageLoad(extracted);
        } catch {
          // Proxy also failed
        }
        return;
      }
    }

    // Fallback: fetch via API route / CORS proxy
    try {
      const extracted = await fetchAndExtract(currentUrl);
      onLoading(false);
      onPageLoad(extracted);
    } catch {
      onLoading(false);
      setIframeError(true);
      onError('This page could not be loaded. It may block external access. Try opening it in a new tab.');
    }
  }, [url, onPageLoad, onLoading, onError]);

  const handleIframeError = () => {
    onLoading(false);
    setIframeError(true);
    // Try fetching via CORS proxy as fallback
    fetchAndExtract(url)
      .then((extracted) => {
        setIframeError(false);
        onPageLoad(extracted);
      })
      .catch(() => {
        onError('This page could not be loaded. It may block external access. Try opening it in a new tab.');
      });
  };

  // Polling fallback: if iframe loads but onLoad doesn't fire, detect content via polling
  useEffect(() => {
    if (!loading || !url || url === 'https://') return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const iframe = iframeRef.current;
      if (iframe) {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) {
            // Check for blocked iframe error page
            const bodyText = doc.body?.textContent || '';
            if (/refused to connect|failed to load|not found|access denied|blocked/i.test(bodyText) && bodyText.length < 500) {
              clearInterval(interval);
              handleIframeLoad();
              return;
            }
            if (doc.querySelectorAll('p').length > 0) {
              clearInterval(interval);
              handleIframeLoad();
              return;
            }
          }
        } catch {
          // Cross-origin — show screenshot fallback
          clearInterval(interval);
          setIframeError(true);
          onLoading(false);
          fetchAndExtract(url).then((extracted) => {
            onPageLoad(extracted);
          }).catch(() => {});
          return;
        }
      }
      if (attempts >= 10) {
        clearInterval(interval);
        // After 5 seconds, try API route directly
        fetchAndExtract(url).then((extracted) => {
          onLoading(false);
          onPageLoad(extracted);
        }).catch(() => {
          onLoading(false);
          onError('This page could not be loaded.');
        });
      }
    }, 500);
    return () => clearInterval(interval);
  }, [loading, url, handleIframeLoad, onLoading, onPageLoad, onError]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return (
    <div className="flex flex-col h-full bg-[var(--background)] border-l border-[var(--border)] animate-slide-in-right">
      {/* URL Bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--border)] bg-[var(--background)] flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 flex-shrink-0"
          title="Close browser"
        >
          <X size={15} />
        </button>

        <div className="w-px h-4 bg-[var(--border)] mx-0.5" />

        <button
          onClick={handleGoBack}
          disabled={!canGoBack}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Go back"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={handleGoForward}
          disabled={!canGoForward}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Go forward"
        >
          <ArrowRight size={14} />
        </button>
        <button
          onClick={handleReload}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
          title="Reload"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 bg-[var(--muted)] rounded-lg px-2.5 py-1 border border-[var(--border)] focus-within:border-[var(--primary)] transition-colors">
            <Globe size={12} className="text-[var(--muted-foreground)] flex-shrink-0" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                onUrlChange(e.target.value);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Enter URL or search..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-[var(--foreground)] placeholder-[var(--muted-foreground)] min-w-0"
            />
            <button
              onClick={() => doNavigate(inputValue)}
              className="flex items-center justify-center w-5 h-5 rounded hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex-shrink-0"
            >
              <Search size={11} />
            </button>
          </div>
        </div>

        {page && (
          <button
            onClick={() => window.open(page.url, '_blank')}
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
            title="Open in new tab"
          >
            <ExternalLink size={13} />
          </button>
        )}
      </div>

      {/* Page Actions Bar */}
      {page && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--border)] bg-[var(--background)] flex-shrink-0">
          <button
            onClick={onReadPage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--muted)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] text-xs font-medium transition-all duration-200 active:scale-95"
          >
            <BookOpen size={12} />
            Read page
          </button>
          <button
            onClick={onSummarizePage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--muted)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] text-xs font-medium transition-all duration-200 active:scale-95"
          >
            <Sparkles size={12} />
            Summarize
          </button>
          <button
            onClick={onAskAboutPage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--muted)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] text-xs font-medium transition-all duration-200 active:scale-95"
          >
            <MessageSquare size={12} />
            Ask about this
          </button>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
            <CheckCircle2 size={11} className="text-green-500" />
            Page text ready
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-white">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
              <p className="text-sm text-[var(--muted-foreground)]">Loading page...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)]">
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <p className="text-sm font-medium text-[var(--foreground)]">Failed to load page</p>
              <p className="text-xs text-[var(--muted-foreground)] max-w-[280px]">{error}</p>
              <button
                onClick={() => doNavigate(url)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--muted)] hover:bg-[var(--primary)]/10 text-xs font-medium text-[var(--foreground)] transition-all duration-200 active:scale-95"
              >
                <RotateCcw size={12} />
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Iframe error fallback — show screenshot */}
        {iframeError && !loading && !error && url && (
          <div className="absolute inset-0 z-10 flex flex-col bg-[var(--background)]">
            <div className="flex-1 overflow-auto flex items-start justify-center p-4">
              <img
                src={`https://image.thum.io/get/width/1200/crop/900/${url}`}
                alt={`Screenshot of ${url}`}
                className="max-w-full rounded-lg shadow-lg border border-[var(--border)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const msg = document.createElement('div');
                    msg.className = 'flex flex-col items-center gap-3 text-center px-8 py-12';
                    msg.innerHTML = `
                      <div class="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      </div>
                      <p class="text-sm font-medium">Screenshot unavailable</p>
                      <p class="text-xs text-[var(--muted-foreground)] max-w-[280px]">This page blocks external access. Open it in a new tab to view.</p>
                    `;
                    parent.appendChild(msg);
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 px-3 py-2 border-t border-[var(--border)] bg-[var(--background)]">
              <p className="text-[10px] text-[var(--muted-foreground)]">Preview (screenshot)</p>
              <div className="w-px h-3 bg-[var(--border)]" />
              <button
                onClick={() => window.open(url, '_blank')}
                className="flex items-center gap-1 text-[10px] text-[var(--primary)] hover:underline"
              >
                <ExternalLink size={10} />
                Open full site
              </button>
            </div>
          </div>
        )}

        {/* The iframe */}
        {!error && url && /^https?:\/\//.test(url) && url !== 'https://' && url !== 'http://' && (
          <iframe
            ref={iframeRef}
            src={url}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-popups allow-forms"
            title="Browser preview"
          />
        )}

        {/* Empty state */}
        {!error && (!url || url === 'https://') && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]">
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--muted)] flex items-center justify-center">
                <Globe size={24} className="text-[var(--muted-foreground)] opacity-50" />
              </div>
              <p className="text-sm font-medium text-[var(--foreground)]">Enter a URL to browse</p>
              <p className="text-xs text-[var(--muted-foreground)] max-w-[280px]">
                Type a URL in the address bar above, or paste a link and press Enter.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Page Info Footer */}
      {page && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--border)] bg-[var(--background)] flex-shrink-0">
          <p className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[200px]">
            {page.title}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
            <span>{page.headings.length} headings</span>
            <span>{page.paragraphs.length} paragraphs</span>
            <span>{page.links.length} links</span>
          </div>
        </div>
      )}
    </div>
  );
}
