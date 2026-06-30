'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

export interface BrowserPageInfo {
  title: string;
  url: string;
}

interface BrowserViewerProps {
  serverUrl: string;
  onNavigate?: (url: string) => void;
  onPageInfo?: (info: BrowserPageInfo) => void;
  onExtracted?: (data: { title: string; url: string; headings: string[]; paragraphs: string[]; links: { text: string; href: string }[] }) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function BrowserViewer({ serverUrl, onNavigate, onPageInfo, onExtracted, onConnected, onDisconnected }: BrowserViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);
  const [scale, setScale] = useState(1);

  // Connect to WebSocket server
  useEffect(() => {
    const ws = new WebSocket(serverUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      onConnected?.();
    };

    ws.onclose = () => {
      setConnected(false);
      onDisconnected?.();
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'screenshot' && imgRef.current) {
          imgRef.current.src = `data:image/jpeg;base64,${msg.data}`;
        } else if (msg.type === 'pageinfo') {
          onPageInfo?.({ title: msg.title, url: msg.url });
        } else if (msg.type === 'extracted') {
          onExtracted?.({
            title: msg.title,
            url: msg.url,
            headings: msg.headings,
            paragraphs: msg.paragraphs,
            links: msg.links,
          });
        }
      } catch {}
    };

    return () => {
      ws.close();
    };
  }, [serverUrl, onPageInfo, onExtracted, onConnected, onDisconnected]);

  // Calculate scale based on container size
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setScale(containerWidth / 1280);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const sendEvent = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) / scale),
      y: Math.round((e.clientY - rect.top) / scale),
    };
  }, [scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    sendEvent({ type: 'mousemove', x, y });
  }, [getCanvasCoords, sendEvent]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const button = e.button === 2 ? 'right' : 'left';
    sendEvent({ type: 'mousedown', x, y, button });
  }, [getCanvasCoords, sendEvent]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    const button = e.button === 2 ? 'right' : 'left';
    sendEvent({ type: 'mouseup', x, y, button });
  }, [getCanvasCoords, sendEvent]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    const button = e.button === 2 ? 'right' : 'left';
    sendEvent({ type: 'click', x, y, button });
  }, [getCanvasCoords, sendEvent]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e);
    sendEvent({ type: 'dblclick', x, y });
  }, [getCanvasCoords, sendEvent]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    sendEvent({ type: 'wheel', deltaX: e.deltaX, deltaY: e.deltaY });
  }, [sendEvent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();
    sendEvent({
      type: 'keydown',
      key: e.key,
      modifiers: {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
      },
    });
  }, [sendEvent]);

  const navigate = useCallback((url: string) => {
    sendEvent({ type: 'navigate', url });
    onNavigate?.(url);
  }, [sendEvent, onNavigate]);

  const goBack = useCallback(() => sendEvent({ type: 'back' }), [sendEvent]);
  const goForward = useCallback(() => sendEvent({ type: 'forward' }), [sendEvent]);
  const reload = useCallback(() => sendEvent({ type: 'reload' }), [sendEvent]);
  const extractPage = useCallback(() => sendEvent({ type: 'extract' }), [sendEvent]);

  return {
    connected,
    scale,
    containerRef,
    imgRef,
    canvasRef,
    navigate,
    goBack,
    goForward,
    reload,
    extractPage,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onClick: handleClick,
      onDoubleClick: handleDoubleClick,
      onWheel: handleWheel,
      onKeyDown: handleKeyDown,
    },
  };
}

export type BrowserViewerReturn = ReturnType<typeof BrowserViewer>;
