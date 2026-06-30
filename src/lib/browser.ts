import { BrowserPage } from '@/types';

const PROXY_BUILDERS = [
  // Own API route — no CORS issues
  (url: string) => `/api/fetch-page?url=${encodeURIComponent(url)}`,
  // External CORS proxies as fallback
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

function extractFromHtml(html: string, url: string): BrowserPage {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const title = doc.querySelector('title')?.textContent?.trim() || new URL(url).hostname;

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

  const links: { text: string; href: string }[] = [];
  doc.querySelectorAll('a[href]').forEach((el) => {
    const text = el.textContent?.trim();
    const href = el.getAttribute('href');
    if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try {
        const resolved = new URL(href, url).href;
        links.push({ text: text.slice(0, 100), href: resolved });
      } catch {
        // skip invalid URLs
      }
    }
  });

  return {
    url,
    title,
    headings: headings.slice(0, 30),
    paragraphs: paragraphs.slice(0, 50),
    links: links.slice(0, 40),
    extractedAt: new Date(),
  };
}

export function extractFromIframe(iframe: HTMLIFrameElement, url: string): BrowserPage | null {
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return null;

    const title = doc.title || new URL(url).hostname;

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

    const links: { text: string; href: string }[] = [];
    doc.querySelectorAll('a[href]').forEach((el) => {
      const text = el.textContent?.trim();
      const href = el.getAttribute('href');
      if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const resolved = new URL(href, url).href;
          links.push({ text: text.slice(0, 100), href: resolved });
        } catch {
          // skip invalid URLs
        }
      }
    });

    return {
      url,
      title,
      headings: headings.slice(0, 30),
      paragraphs: paragraphs.slice(0, 50),
      links: links.slice(0, 40),
      extractedAt: new Date(),
    };
  } catch {
    return null;
  }
}

async function tryFetchViaProxy(url: string): Promise<string> {
  let lastError: Error | null = null;

  for (const buildProxy of PROXY_BUILDERS) {
    try {
      const proxyUrl = buildProxy(url);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        lastError = new Error(`Proxy returned ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      const html = await response.text();

      if (html.length < 100) {
        lastError = new Error('Empty response from proxy');
        continue;
      }

      return html;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  throw lastError || new Error('All CORS proxies failed');
}

export async function fetchAndExtract(url: string): Promise<BrowserPage> {
  const html = await tryFetchViaProxy(url);
  return extractFromHtml(html, url);
}

export function formatPageForPrompt(page: BrowserPage): string {
  const parts: string[] = [];
  parts.push(`[BROWSER PAGE: ${page.title}]`);
  parts.push(`URL: ${page.url}`);

  if (page.headings.length > 0) {
    parts.push(`\nHeadings:\n${page.headings.map(h => `- ${h}`).join('\n')}`);
  }

  if (page.paragraphs.length > 0) {
    parts.push(`\nContent:\n${page.paragraphs.slice(0, 20).map(p => `- ${p}`).join('\n')}`);
  }

  if (page.links.length > 0) {
    parts.push(`\nKey links:\n${page.links.slice(0, 15).map(l => `- [${l.text}](${l.href})`).join('\n')}`);
  }

  return parts.join('\n');
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+/.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}
