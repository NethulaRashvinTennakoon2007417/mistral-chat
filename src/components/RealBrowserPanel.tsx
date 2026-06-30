'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, ArrowLeft, ArrowRight, RotateCcw, ExternalLink,
  Globe, Loader2, BookOpen, MessageSquare,
  Sparkles, Search, CheckCircle2, WifiOff,
} from 'lucide-react';
import { BrowserPage } from '@/types';

const REMOTE_WS_URL = process.env.NEXT_PUBLIC_BROWSER_WS_URL || '';

interface RealBrowserPanelProps {
  onReadPage: () => void;
  onSummarizePage: () => void;
  onAskAboutPage: () => void;
  onClose: () => void;
  onPageLoad: (page: BrowserPage) => void;
}

function generateSessionId() {
  return 'browser-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

async function httpBrowserAction(sessionId: string, action: string, params?: Record<string, unknown>) {
  const res = await fetch('/api/browser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, action, ...params }),
  });
  return res.json();
}

export function RealBrowserPanel({
  onReadPage,
  onSummarizePage,
  onAskAboutPage,
  onClose,
  onPageLoad,
}: RealBrowserPanelProps) {
  const [inputValue, setInputValue] = useState('https://www.google.com');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [scale, setScale] = useState(1);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [actionPending, setActionPending] = useState(false);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const sessionIdRef = useRef(generateSessionId());
  const useWebSocket = !!REMOTE_WS_URL;

  useEffect(() => {
    sessionIdRef.current = generateSessionId();
  }, []);

  // WebSocket connection mode (Railway server)
  const wsConnect = useCallback(() => {
    if (connecting || connected || !REMOTE_WS_URL) return;
    setConnecting(true);

    const ws = new WebSocket(REMOTE_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
    };

    ws.onerror = () => {
      setConnected(false);
      setConnecting(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'screenshot' && imgRef.current) {
          imgRef.current.src = `data:image/jpeg;base64,${msg.data}`;
        } else if (msg.type === 'pageinfo') {
          setPageTitle(msg.title);
          setPageUrl(msg.url);
          setInputValue(msg.url);
        } else if (msg.type === 'extracted') {
          onPageLoad({
            url: msg.url,
            title: msg.title,
            headings: msg.headings || [],
            paragraphs: msg.paragraphs || [],
            links: msg.links || [],
            extractedAt: new Date(),
          });
        }
      } catch {}
    };
  }, [connected, connecting, onPageLoad]);

  useEffect(() => {
    if (useWebSocket) {
      wsConnect();
    }
    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Scale image to fit container
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        setScale(containerRef.current.clientWidth / 1280);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const wsSend = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Unified navigate: WebSocket or HTTP
  const handleNavigate = useCallback(async (url: string) => {
    if (useWebSocket) {
      wsSend({ type: 'navigate', url });
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(url);
        return next;
      });
      setHistoryIndex((prev) => prev + 1);
    } else {
      setLoading(true);
      setActionPending(true);
      try {
        const data = await httpBrowserAction(sessionIdRef.current, 'navigate', { url });
        if (data.error) return;
        if (data.screenshot) setScreenshot(data.screenshot);
        if (data.url) { setPageUrl(data.url); setInputValue(data.url); }
        if (data.title) setPageTitle(data.title);
        setConnected(true);
        onPageLoad({
          url: data.url || url,
          title: data.title || '',
          headings: [], paragraphs: [], links: [],
          extractedAt: new Date(),
        });
        setHistory((prev) => {
          const next = prev.slice(0, historyIndex + 1);
          next.push(url);
          return next;
        });
        setHistoryIndex((prev) => prev + 1);
      } catch (err) {
        console.error('Navigate failed:', err);
      } finally {
        setLoading(false);
        setActionPending(false);
      }
    }
  }, [useWebSocket, wsSend, historyIndex, onPageLoad]);

  // Unified action
  const handleAction = useCallback(async (action: string, params?: Record<string, unknown>) => {
    if (useWebSocket) {
      wsSend({ type: action, ...params });
    } else {
      setActionPending(true);
      try {
        const data = await httpBrowserAction(sessionIdRef.current, action, params);
        if (data.error) return;
        if (data.screenshot) setScreenshot(data.screenshot);
        if (data.url) { setPageUrl(data.url); setInputValue(data.url); }
        if (data.title) setPageTitle(data.title);
        if (data.headings || data.paragraphs) {
          onPageLoad({
            url: data.url || pageUrl,
            title: data.title || pageTitle,
            headings: data.headings || [],
            paragraphs: data.paragraphs || [],
            links: data.links || [],
            extractedAt: new Date(),
          });
        }
      } catch (err) {
        console.error(`${action} failed:`, err);
      } finally {
        setActionPending(false);
      }
    }
  }, [useWebSocket, wsSend, pageUrl, pageTitle, onPageLoad]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      let url = inputValue.trim();
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      setInputValue(url);
      handleNavigate(url);
    }
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevUrl = history[newIndex];
      setInputValue(prevUrl);
      handleNavigate(prevUrl);
    } else {
      handleAction('back');
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextUrl = history[newIndex];
      setInputValue(nextUrl);
      handleNavigate(nextUrl);
    } else {
      handleAction('forward');
    }
  };

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (actionPending) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / scale);
    const y = Math.round((e.clientY - rect.top) / scale);
    if (useWebSocket) {
      wsSend({ type: 'click', x, y, button: e.button === 2 ? 'right' : 'left' });
    } else {
      handleAction('click', { x, y, button: e.button === 2 ? 'right' : 'left' });
    }
  }, [scale, actionPending, useWebSocket, wsSend, handleAction]);

  const handleImageDoubleClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (actionPending) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / scale);
    const y = Math.round((e.clientY - rect.top) / scale);
    if (useWebSocket) {
      wsSend({ type: 'dblclick', x, y });
    } else {
      handleAction('dblclick', { x, y });
    }
  }, [scale, actionPending, useWebSocket, wsSend, handleAction]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLImageElement>) => {
    if (actionPending) return;
    e.preventDefault();
    if (useWebSocket) {
      wsSend({ type: 'wheel', deltaX: e.deltaX, deltaY: e.deltaY });
    } else {
      handleAction('wheel', { deltaX: e.deltaX, deltaY: e.deltaY });
    }
  }, [actionPending, useWebSocket, wsSend, handleAction]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLImageElement>) => {
    if (actionPending) return;
    const payload = {
      key: e.key,
      modifiers: { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey },
    };
    if (useWebSocket) {
      wsSend({ type: 'keydown', ...payload });
    } else {
      handleAction('keydown', payload);
    }
  }, [actionPending, useWebSocket, wsSend, handleAction]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!useWebSocket) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / scale);
    const y = Math.round((e.clientY - rect.top) / scale);
    wsSend({ type: 'mousemove', x, y });
  }, [useWebSocket, scale, wsSend]);

  const showLoading = useWebSocket ? connecting : (!connected && actionPending);

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
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Go back"
          disabled={!connected || actionPending}
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={handleGoForward}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Go forward"
          disabled={!connected || actionPending}
        >
          <ArrowRight size={14} />
        </button>
        <button
          onClick={() => handleAction('reload')}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
          title="Reload"
          disabled={!connected || actionPending}
        >
          <RotateCcw size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 bg-[var(--muted)] rounded-lg px-2.5 py-1 border border-[var(--border)] focus-within:border-[var(--primary)] transition-colors">
            <Globe size={12} className="text-[var(--muted-foreground)] flex-shrink-0" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Enter URL..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-[var(--foreground)] placeholder-[var(--muted-foreground)] min-w-0"
            />
            <button
              onClick={() => {
                let url = inputValue.trim();
                if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
                setInputValue(url);
                handleNavigate(url);
              }}
              className="flex items-center justify-center w-5 h-5 rounded hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex-shrink-0"
            >
              <Search size={11} />
            </button>
          </div>
        </div>

        <button
          onClick={() => window.open(pageUrl || inputValue, '_blank')}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
          title="Open in new tab"
        >
          <ExternalLink size={13} />
        </button>
      </div>

      {/* Page Actions Bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--border)] bg-[var(--background)] flex-shrink-0">
        <button
          onClick={() => handleAction('extract')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--muted)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] text-xs font-medium transition-all duration-200 active:scale-95"
        >
          <BookOpen size={12} />
          Read page
        </button>
        <button
          onClick={() => {
            handleAction('extract');
            setTimeout(onSummarizePage, 500);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--muted)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] text-xs font-medium transition-all duration-200 active:scale-95"
        >
          <Sparkles size={12} />
          Summarize
        </button>
        <button
          onClick={() => {
            handleAction('extract');
            setTimeout(onAskAboutPage, 500);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--muted)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] text-xs font-medium transition-all duration-200 active:scale-95"
        >
          <MessageSquare size={12} />
          Ask about this
        </button>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
          {connected ? (
            <>
              <CheckCircle2 size={11} className="text-green-500" />
              Live browser
            </>
          ) : showLoading ? (
            <>
              <Loader2 size={11} className="animate-spin" />
              {useWebSocket ? 'Connecting...' : 'Starting browser...'}
            </>
          ) : (
            <>
              <WifiOff size={11} className="text-red-500" />
              {useWebSocket ? 'Server offline' : 'No browser'}
            </>
          )}
        </div>
      </div>

      {/* Browser Content */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white">
        {showLoading && !screenshot && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)]">
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Loader2 size={24} className="text-blue-500 animate-spin" />
              </div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {useWebSocket ? 'Connecting to browser server...' : 'Starting headless browser...'}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] max-w-[320px]">
                {useWebSocket
                  ? 'Connecting to remote Playwright server...'
                  : 'First visit may take a few seconds while the browser starts up.'}
              </p>
            </div>
          </div>
        )}

        {!connected && !showLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)]">
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Globe size={24} className="text-amber-500" />
              </div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {useWebSocket ? 'Browser server not running' : 'Enter a URL to browse'}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] max-w-[320px]">
                {useWebSocket
                  ? 'Make sure the browser server is running and NEXT_PUBLIC_BROWSER_WS_URL is correct.'
                  : 'The browser runs on the server via Playwright. Supports JavaScript-rendered pages.'}
              </p>
              {useWebSocket && (
                <button
                  onClick={wsConnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--muted)] hover:bg-[var(--primary)]/10 text-xs font-medium text-[var(--foreground)] transition-all duration-200 active:scale-95"
                >
                  <RotateCcw size={12} />
                  Retry connection
                </button>
              )}
            </div>
          </div>
        )}

        {/* WebSocket mode: stream via img ref */}
        {useWebSocket && (
          <img
            ref={imgRef}
            alt="Browser viewport"
            className="w-full h-full object-contain cursor-crosshair"
            style={{ imageRendering: 'auto' }}
            onMouseMove={handleMouseMove}
            onMouseDown={(e) => {
              e.preventDefault();
              handleImageClick(e);
            }}
            onDoubleClick={handleImageDoubleClick}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}

        {/* HTTP mode: render base64 screenshot */}
        {!useWebSocket && screenshot && (
          <img
            src={`data:image/jpeg;base64,${screenshot}`}
            alt="Browser viewport"
            className="w-full h-full object-contain cursor-crosshair"
            style={{ imageRendering: 'auto' }}
            onClick={handleImageClick}
            onDoubleClick={handleImageDoubleClick}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}

        {actionPending && screenshot && (
          <div className="absolute top-2 right-2 z-20">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 text-white text-[10px]">
              <Loader2 size={10} className="animate-spin" />
              Loading...
            </div>
          </div>
        )}
      </div>

      {/* Page Info Footer */}
      {pageTitle && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--border)] bg-[var(--background)] flex-shrink-0">
          <p className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[200px]">
            {pageTitle}
          </p>
          <p className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[200px]">
            {pageUrl}
          </p>
        </div>
      )}
    </div>
  );
}
