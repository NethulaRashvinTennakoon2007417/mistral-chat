import { BrowserPage } from '@/types';

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

function buildProxyUrl(url: string): string {
  return `${CORS_PROXIES[0]}${encodeURIComponent(url)}`;
}

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

export async function fetchAndExtract(url: string): Promise<BrowserPage> {
  const proxyUrl = buildProxyUrl(url);
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();
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
