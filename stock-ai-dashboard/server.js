import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeSymbol } from './lib/analyzer.js';
import { fetchNews } from './lib/news.js';
import { fetchPriceHistory } from './lib/stockData.js';
import { fetchSocialAnalysis } from './lib/social.js';
import { jsonResponse, normalizeTicker } from './lib/utils.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return jsonResponse(res, 204, {});
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/api/health') {
      return jsonResponse(res, 200, { ok: true, service: 'stock-ai-dashboard', now: new Date().toISOString() });
    }

    if (url.pathname === '/api/analyze') {
      const symbol = normalizeTicker(url.searchParams.get('symbol'));
      const market = url.searchParams.get('market') || 'AMEX';
      const days = Number(url.searchParams.get('days') || 90);
      const newsDays = Number(url.searchParams.get('newsDays') || 7);
      const analysis = await analyzeSymbol({ symbol, market, days, newsDays });
      return jsonResponse(res, 200, analysis);
    }

    if (url.pathname === '/api/news') {
      const symbol = normalizeTicker(url.searchParams.get('symbol'));
      const days = Number(url.searchParams.get('days') || 7);
      const news = await fetchNews(symbol, days);
      return jsonResponse(res, 200, news);
    }

    if (url.pathname === '/api/social') {
      const symbol = normalizeTicker(url.searchParams.get('symbol'));
      const days = Number(url.searchParams.get('days') || 7);
      const social = await fetchSocialAnalysis(symbol, days);
      return jsonResponse(res, 200, social);
    }

    if (url.pathname === '/api/history') {
      const symbol = normalizeTicker(url.searchParams.get('symbol'));
      const days = Number(url.searchParams.get('days') || 90);
      const history = await fetchPriceHistory(symbol, days);
      return jsonResponse(res, 200, history);
    }

    return serveStatic(url.pathname, res);
  } catch (error) {
    return jsonResponse(res, 500, {
      error: 'Internal server error',
      message: error?.message || String(error)
    });
  }
});

async function serveStatic(pathname, res) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safePath = normalize(decodeURIComponent(requested)).replace(/^([.][.][\/\\])+/, '');
  const filePath = join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const body = await readFile(filePath);
  const mime = MIME_TYPES[extname(filePath)] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': mime,
    'Cache-Control': 'no-cache'
  });
  res.end(body);
}

server.listen(PORT, () => {
  console.log(`Stock AI Dashboard running at http://localhost:${PORT}`);
});
