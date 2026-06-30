'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, ArrowLeft, ArrowRight, RotateCcw, ExternalLink,
  Globe, Loader2, AlertCircle, BookOpen, MessageSquare,
  Sparkles, Search, CheckCircle2, Wifi, WifiOff,
} from 'lucide-react';
import { BrowserPage } from '@/types';

const BROWSER_WS_URL = typeof window !== 'undefined'
  ? `ws://${window.location.hostname}:3001`
  : '';

interface RealBrowserPanelProps {
  onReadPage: () => void;
  onSummarizePage: () => void;
  onAskAboutPage: () => void;
  onClose: () => void;
  onPageLoad: (page: BrowserPage) => void;
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
  const [scale, setScale] = useState(1);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const wsRef = useRef<WebSocket | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const connectingRef = useRef(false);

  const connect = useCallback(() => {
    if (connectingRef.current || connected) return;
    connectingRef.current = true;
    setConnecting(true);

    const ws = new WebSocket(BROWSER_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
      connectingRef.current = false;
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
      connectingRef.current = false;
    };

    ws.onerror = () => {
      setConnected(false);
      setConnecting(false);
      connectingRef.current = false;
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
  }, [connected, onPageLoad]);

  useEffect(() => {
    connect();
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

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const getCoords = useCallback((e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) / scale),
      y: Math.round((e.clientY - rect.top) / scale),
    };
  }, [scale]);

  const navigate = useCallback((url: string) => {
    send({ type: 'navigate', url });
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(url);
      return next;
    });
    setHistoryIndex((prev) => prev + 1);
  }, [send, historyIndex]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      let url = inputValue.trim();
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      setInputValue(url);
      navigate(url);
    }
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevUrl = history[newIndex];
      setInputValue(prevUrl);
      send({ type: 'navigate', url: prevUrl });
    } else {
      send({ type: 'back' });
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextUrl = history[newIndex];
      setInputValue(nextUrl);
      send({ type: 'navigate', url: nextUrl });
    } else {
      send({ type: 'forward' });
    }
  };

  const handleReload = () => {
    send({ type: 'reload' });
  };

  const handleExtract = () => {
    send({ type: 'extract' });
  };

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
          disabled={!connected}
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={handleGoForward}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Go forward"
          disabled={!connected}
        >
          <ArrowRight size={14} />
        </button>
        <button
          onClick={handleReload}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-all duration-200"
          title="Reload"
          disabled={!connected}
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
              disabled={!connected}
            />
            <button
              onClick={() => {
                let url = inputValue.trim();
                if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
                setInputValue(url);
                navigate(url);
              }}
              className="flex items-center justify-center w-5 h-5 rounded hover:bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors flex-shrink-0"
              disabled={!connected}
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
          onClick={handleExtract}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--muted)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] text-xs font-medium transition-all duration-200 active:scale-95"
        >
          <BookOpen size={12} />
          Read page
        </button>
        <button
          onClick={() => {
            handleExtract();
            setTimeout(onSummarizePage, 500);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--muted)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] text-xs font-medium transition-all duration-200 active:scale-95"
        >
          <Sparkles size={12} />
          Summarize
        </button>
        <button
          onClick={() => {
            handleExtract();
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
          ) : connecting ? (
            <>
              <Loader2 size={11} className="animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <WifiOff size={11} className="text-red-500" />
              Server offline
            </>
          )}
        </div>
      </div>

      {/* Browser Content */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-white">
        {!connected && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)]">
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Wifi size={24} className="text-amber-500" />
              </div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {connecting ? 'Connecting to browser server...' : 'Browser server not running'}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] max-w-[320px]">
                {connecting
                  ? 'Starting headless Chromium...'
                  : 'Start the browser server with: node server/browser-server.js'}
              </p>
              {!connecting && (
                <button
                  onClick={connect}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--muted)] hover:bg-[var(--primary)]/10 text-xs font-medium text-[var(--foreground)] transition-all duration-200 active:scale-95"
                >
                  <RotateCcw size={12} />
                  Retry connection
                </button>
              )}
            </div>
          </div>
        )}

        <img
          ref={imgRef}
          alt="Browser viewport"
          className="w-full h-full object-contain cursor-crosshair"
          style={{ imageRendering: 'auto' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.round((e.clientX - rect.left) / scale);
            const y = Math.round((e.clientY - rect.top) / scale);
            send({ type: 'mousemove', x, y });
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.round((e.clientX - rect.left) / scale);
            const y = Math.round((e.clientY - rect.top) / scale);
            send({ type: 'click', x, y, button: e.button === 2 ? 'right' : 'left' });
          }}
          onDoubleClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.round((e.clientX - rect.left) / scale);
            const y = Math.round((e.clientY - rect.top) / scale);
            send({ type: 'dblclick', x, y });
          }}
          onWheel={(e) => {
            e.preventDefault();
            send({ type: 'wheel', deltaX: e.deltaX, deltaY: e.deltaY });
          }}
          onKeyDown={(e) => {
            send({
              type: 'keydown',
              key: e.key,
              modifiers: { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey },
            });
          }}
          tabIndex={0}
          onContextMenu={(e) => e.preventDefault()}
        />
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
