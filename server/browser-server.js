const { WebSocketServer } = require('ws');
const { chromium } = require('playwright');
const http = require('http');

const PORT = process.env.PORT || 3001;
const SCREENSHOT_INTERVAL = 100;
const MAX_QUALITY = 80;
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });

server.listen(PORT, () => {
  console.log(`[Browser Server] Listening on port ${PORT}`);
});

wss.on('connection', async (ws) => {
  console.log('[Browser Server] Client connected');

  let browser = null;
  let page = null;
  let screenshotTimer = null;
  let currentPageUrl = '';

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    page = await context.newPage();

    page.on('console', (msg) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'console', level: msg.type(), text: msg.text() }));
      }
    });

    const startScreenshots = () => {
      if (screenshotTimer) clearInterval(screenshotTimer);
      screenshotTimer = setInterval(async () => {
        if (!page || ws.readyState !== 1) return;
        try {
          const screenshot = await page.screenshot({
            type: 'jpeg',
            quality: MAX_QUALITY,
            clip: { x: 0, y: 0, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
          });
          ws.send(JSON.stringify({ type: 'screenshot', data: screenshot.toString('base64') }));
        } catch (err) {
          // Page might be navigating
        }
      }, SCREENSHOT_INTERVAL);
    };

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (!page) return;

      try {
        switch (msg.type) {
          case 'navigate': {
            currentPageUrl = msg.url;
            await page.goto(msg.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            const title = await page.title();
            const url = page.url();
            ws.send(JSON.stringify({ type: 'pageinfo', title, url }));
            break;
          }

          case 'click': {
            await page.mouse.click(msg.x, msg.y, { button: msg.button || 'left' });
            break;
          }

          case 'dblclick': {
            await page.mouse.dblclick(msg.x, msg.y);
            break;
          }

          case 'mousedown': {
            await page.mouse.down({ button: msg.button || 'left' });
            break;
          }

          case 'mouseup': {
            await page.mouse.up({ button: msg.button || 'left' });
            break;
          }

          case 'mousemove': {
            await page.mouse.move(msg.x, msg.y);
            break;
          }

          case 'wheel': {
            await page.mouse.wheel(msg.deltaX || 0, msg.deltaY || 0);
            break;
          }

          case 'keydown': {
            const opts = {};
            if (msg.modifiers?.ctrl) opts.modifiers = ['Control'];
            if (msg.modifiers?.shift) opts.modifiers = [...(opts.modifiers || []), 'Shift'];
            if (msg.modifiers?.alt) opts.modifiers = [...(opts.modifiers || []), 'Alt'];
            if (msg.modifiers?.meta) opts.modifiers = [...(opts.modifiers || []), 'Meta'];
            await page.keyboard.press(msg.key, opts);
            break;
          }

          case 'type': {
            await page.keyboard.type(msg.text, { delay: 30 });
            break;
          }

          case 'back': {
            await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
            const title = await page.title();
            ws.send(JSON.stringify({ type: 'pageinfo', title, url: page.url() }));
            break;
          }

          case 'forward': {
            await page.goForward({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
            const title = await page.title();
            ws.send(JSON.stringify({ type: 'pageinfo', title, url: page.url() }));
            break;
          }

          case 'reload': {
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
            const title = await page.title();
            ws.send(JSON.stringify({ type: 'pageinfo', title, url: page.url() }));
            break;
          }

          case 'extract': {
            const content = await page.evaluate(() => {
              const headings = [];
              document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
                const text = el.textContent?.trim();
                if (text) headings.push(text);
              });
              const paragraphs = [];
              document.querySelectorAll('p').forEach((el) => {
                const text = el.textContent?.trim();
                if (text && text.length > 20) paragraphs.push(text);
              });
              const links = [];
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
            ws.send(JSON.stringify({ type: 'extracted', ...content }));
            break;
          }

          case 'resize': {
            if (page) {
              await page.setViewportSize({ width: msg.width || VIEWPORT_WIDTH, height: msg.height || VIEWPORT_HEIGHT });
            }
            break;
          }
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    ws.on('close', async () => {
      console.log('[Browser Server] Client disconnected');
      if (screenshotTimer) clearInterval(screenshotTimer);
      if (browser) await browser.close().catch(() => {});
    });

    ws.on('error', async (err) => {
      console.error('[Browser Server] WebSocket error:', err.message);
      if (screenshotTimer) clearInterval(screenshotTimer);
      if (browser) await browser.close().catch(() => {});
    });

    ws.send(JSON.stringify({ type: 'ready' }));

    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    ws.send(JSON.stringify({ type: 'pageinfo', title, url: page.url() }));

    startScreenshots();

  } catch (err) {
    console.error('[Browser Server] Fatal error:', err.message);
    ws.send(JSON.stringify({ type: 'error', message: err.message }));
    if (browser) await browser.close().catch(() => {});
    ws.close();
  }
});
