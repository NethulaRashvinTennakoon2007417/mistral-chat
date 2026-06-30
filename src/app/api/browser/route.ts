import { NextRequest, NextResponse } from 'next/server';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface Session {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  lastAccess: number;
  url: string;
  title: string;
}

const SESSION_TTL = 30_000;
const sessions = new Map<string, Session>();

function cleanupExpired() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastAccess > SESSION_TTL) {
      session.browser.close().catch(() => {});
      sessions.delete(id);
    }
  }
}

async function getSession(sessionId: string): Promise<Session | undefined> {
  cleanupExpired();
  const session = sessions.get(sessionId);
  if (session) {
    session.lastAccess = Date.now();
    return session;
  }
  return undefined;
}

async function createSession(sessionId: string): Promise<Session> {
  cleanupExpired();
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  const session: Session = {
    browser,
    context,
    page,
    lastAccess: Date.now(),
    url: '',
    title: '',
  };
  sessions.set(sessionId, session);
  return session;
}

async function takeScreenshot(page: Page): Promise<string> {
  const buf = await page.screenshot({
    type: 'jpeg',
    quality: 80,
    clip: { x: 0, y: 0, width: 1280, height: 720 },
  });
  return buf.toString('base64');
}

async function extractPageContent(page: Page) {
  return page.evaluate(() => {
    const headings: string[] = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      const text = el.textContent?.trim();
      if (text) headings.push(text);
    });
    const paragraphs: string[] = [];
    document.querySelectorAll('p').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 20) paragraphs.push(text);
    });
    const links: { text: string; href: string }[] = [];
    document.querySelectorAll('a[href]').forEach((el) => {
      const text = el.textContent?.trim();
      const href = el.getAttribute('href');
      if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          links.push({ text: text.slice(0, 100), href: new URL(href, location.href).href });
        } catch {}
      }
    });
    return {
      title: document.title,
      url: location.href,
      headings: headings.slice(0, 30),
      paragraphs: paragraphs.slice(0, 50),
      links: links.slice(0, 40),
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action, url, x, y, button, text, key, modifiers, deltaX, deltaY, width, height } = body;

    if (!sessionId || !action) {
      return NextResponse.json({ error: 'Missing sessionId or action' }, { status: 400 });
    }

    let session = await getSession(sessionId);

    switch (action) {
      case 'init':
      case 'navigate': {
        if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });
        if (!session) session = await createSession(sessionId);
        await session.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        session.url = session.page.url();
        session.title = await session.page.title();
        const screenshot = await takeScreenshot(session.page);
        return NextResponse.json({
          screenshot,
          url: session.url,
          title: session.title,
        });
      }

      case 'click': {
        if (x === undefined || y === undefined) return NextResponse.json({ error: 'Missing x,y' }, { status: 400 });
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        await session.page.mouse.click(x, y, { button: (button as 'left' | 'right' | 'middle') || 'left' });
        await session.page.waitForTimeout(500).catch(() => {});
        session.url = session.page.url();
        session.title = await session.page.title();
        const screenshot = await takeScreenshot(session.page);
        return NextResponse.json({ screenshot, url: session.url, title: session.title });
      }

      case 'dblclick': {
        if (x === undefined || y === undefined) return NextResponse.json({ error: 'Missing x,y' }, { status: 400 });
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        await session.page.mouse.dblclick(x, y);
        await session.page.waitForTimeout(500).catch(() => {});
        session.url = session.page.url();
        session.title = await session.page.title();
        const screenshot = await takeScreenshot(session.page);
        return NextResponse.json({ screenshot, url: session.url, title: session.title });
      }

      case 'mousemove': {
        if (x === undefined || y === undefined) return NextResponse.json({ error: 'Missing x,y' }, { status: 400 });
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        await session.page.mouse.move(x, y);
        return NextResponse.json({ ok: true });
      }

      case 'mousedown': {
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        await session.page.mouse.down({ button: (button as 'left' | 'right' | 'middle') || 'left' });
        return NextResponse.json({ ok: true });
      }

      case 'mouseup': {
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        await session.page.mouse.up({ button: (button as 'left' | 'right' | 'middle') || 'left' });
        return NextResponse.json({ ok: true });
      }

      case 'wheel': {
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        await session.page.mouse.wheel(deltaX || 0, deltaY || 0);
        await session.page.waitForTimeout(200).catch(() => {});
        const screenshot = await takeScreenshot(session.page);
        return NextResponse.json({ screenshot, url: session.url, title: session.title });
      }

      case 'keydown': {
        if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        const modList: string[] = [];
        if (modifiers?.ctrl) modList.push('Control');
        if (modifiers?.shift) modList.push('Shift');
        if (modifiers?.alt) modList.push('Alt');
        if (modifiers?.meta) modList.push('Meta');
        for (const mod of modList) {
          await session.page.keyboard.down(mod);
        }
        await session.page.keyboard.press(key);
        for (const mod of modList.reverse()) {
          await session.page.keyboard.up(mod);
        }
        await session.page.waitForTimeout(300).catch(() => {});
        session.url = session.page.url();
        session.title = await session.page.title();
        const screenshot = await takeScreenshot(session.page);
        return NextResponse.json({ screenshot, url: session.url, title: session.title });
      }

      case 'type': {
        if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        await session.page.keyboard.type(text, { delay: 30 });
        return NextResponse.json({ ok: true });
      }

      case 'back': {
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        await session.page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        session.url = session.page.url();
        session.title = await session.page.title();
        const screenshot = await takeScreenshot(session.page);
        return NextResponse.json({ screenshot, url: session.url, title: session.title });
      }

      case 'forward': {
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        await session.page.goForward({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        session.url = session.page.url();
        session.title = await session.page.title();
        const screenshot = await takeScreenshot(session.page);
        return NextResponse.json({ screenshot, url: session.url, title: session.title });
      }

      case 'reload': {
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        await session.page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
        session.url = session.page.url();
        session.title = await session.page.title();
        const screenshot = await takeScreenshot(session.page);
        return NextResponse.json({ screenshot, url: session.url, title: session.title });
      }

      case 'screenshot': {
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        const screenshot = await takeScreenshot(session.page);
        return NextResponse.json({ screenshot, url: session.url, title: session.title });
      }

      case 'extract': {
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        const content = await extractPageContent(session.page);
        session.url = content.url;
        session.title = content.title;
        return NextResponse.json({ ...content });
      }

      case 'resize': {
        if (!session) return NextResponse.json({ error: 'No active session' }, { status: 400 });
        await session.page.setViewportSize({ width: width || 1280, height: height || 720 });
        const screenshot = await takeScreenshot(session.page);
        return NextResponse.json({ screenshot, url: session.url, title: session.title });
      }

      case 'close': {
        if (session) {
          await session.browser.close().catch(() => {});
          sessions.delete(sessionId);
        }
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  cleanupExpired();
  return NextResponse.json({ status: 'ok', sessions: sessions.size });
}
