import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
// Note: lovable-tagger disabled to rule it out as a cause

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  appType: 'spa',
  // Use relative base for build to support nested routes; dev stays at root '/'
  base: command === 'build' ? './' : '/',
  server: {
    host: "127.0.0.1",
    port: 8080,
    open: false,
    strictPort: true,
    proxy: {
      // Proxy API calls to backend to avoid CORS in development
      '/api': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '', // ensure Set-Cookie domain matches dev origin
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('[vite-proxy:/api] error:', err?.message || err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            // Helpful trace without dumping bodies
            console.log('[vite-proxy:/api] ->', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[vite-proxy:/api] <-', proxyRes.statusCode, req.url);
          });
        },
      },
      '/auth': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '', // ensure Set-Cookie domain matches dev origin
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('[vite-proxy:/auth] error:', err?.message || err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('[vite-proxy:/auth] ->', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[vite-proxy:/auth] <-', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  preview: {
    host: "127.0.0.1",
  port: 8081,
    open: false,
    strictPort: true,
  },
  plugins: [
    react(),
    // Dev-only: ensure /authorized always serves the dev index.html (SPA fallback)
    {
      name: 'authorized-spa-fallback',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          try {
            const url = (req.url || '').split('?')[0];
            if (url === '/authorized') {
              const indexPath = path.resolve(__dirname, 'index.html');
              const html = fs.readFileSync(indexPath, 'utf-8');
              const transformed = await server.transformIndexHtml(url, html);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html');
              res.end(transformed);
              return;
            }
          } catch {
            // fall through to next handler
          }
          next();
        });
      },
    },
    // Dev-only: mock GitHub OAuth authorize endpoint
    {
      name: 'mock-github-oauth',
      apply: 'serve',
      configureServer(server) {
    server.middlewares.use((req, res, next) => {
          const url = new URL((req.url || ''), 'http://127.0.0.1');
          if (url.pathname === '/mock_github_oauth') {
            const state = url.searchParams.get('state') || '';
            const hasOauthCookie = (req.headers['cookie'] || '').includes('github_oauth_params=');
            if (!hasOauthCookie) {
              // Missing flow cookie: bounce to login with an isf (invalid state/flow) marker
              res.statusCode = 302;
              res.setHeader('Location', '/error?error=isf&redirect=/login');
              res.end();
              return;
            }
            // Build callback on same host:port to keep cookies same-origin via proxy
            const host = req.headers['host'] || '127.0.0.1:8080';
            const redirectUri = `http://${host}/auth/github/callback`;
            const mockEmail = process.env.MOCK_GITHUB_EMAIL || 'mockuser@example.com';
            const cb = new URL(redirectUri);
            cb.searchParams.set('code', `mock-${state || 'code'}`);
            cb.searchParams.set('state', state);
            cb.searchParams.set('mock_email', mockEmail);
            res.statusCode = 302;
            res.setHeader('Location', cb.toString());
            res.end();
            return;
          }
          next();
        });
      },
    },
    // Preview: also provide mock endpoint for local preview server
    {
      name: 'mock-github-oauth-preview',
      apply: 'build',
      configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
          const url = new URL((req.url || ''), 'http://127.0.0.1');
          if (url.pathname === '/mock_github_oauth') {
            const state = url.searchParams.get('state') || '';
            const host = req.headers['host'] || '127.0.0.1:8081';
            const redirectUri = `http://${host}/auth/github/callback`;
            const mockEmail = process.env.MOCK_GITHUB_EMAIL || 'mockuser@example.com';
            const cb = new URL(redirectUri);
            cb.searchParams.set('code', `mock-${state || 'code'}`);
            cb.searchParams.set('state', state);
            cb.searchParams.set('mock_email', mockEmail);
            res.statusCode = 302;
            res.setHeader('Location', cb.toString());
            res.end();
            return;
          }
          next();
        });
      },
    },
    // componentTagger(), // disabled
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'utility-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
          'query-vendor': ['@tanstack/react-query'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'theme-vendor': ['next-themes'],
          'js-cookie': ['js-cookie'],
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase warning threshold to 1MB
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@reduxjs/toolkit',
      'react-redux',
      '@tanstack/react-query',
      'next-themes',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
    ]
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
    __BUILD_MODE__: JSON.stringify(mode),
  }
}));
