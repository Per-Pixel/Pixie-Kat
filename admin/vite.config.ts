import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Custom Vite middleware proxy for bypassing Pinterest CORS & unshortening pin.it links
function pinterestCorsProxyPlugin(): Plugin {
  return {
    name: 'pinterest-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/api/pinterest-proxy', async (req, res) => {
        // CORS preflight handling
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        try {
          const reqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
          const targetUrl = reqUrl.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing target url parameter' }));
            return;
          }

          // Fetch from target URL using Node.js fetch (follows redirects, bypasses browser CORS)
          const targetRes = await fetch(targetUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });

          const contentType = targetRes.headers.get('content-type') || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);

          const arrayBuffer = await targetRes.arrayBuffer();
          res.statusCode = targetRes.status;
          res.end(Buffer.from(arrayBuffer));
        } catch (err: any) {
          console.error('[Pinterest Proxy Error]:', err?.message || err);
          res.statusCode = 502;
          res.end(JSON.stringify({ error: err?.message || 'Proxy request failed' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pinterestCorsProxyPlugin()],
  server: {
    host: true,
    port: 5174,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
