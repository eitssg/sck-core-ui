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
    host: "::",
    port: 8080,
    open: false,
    strictPort: true,
    proxy: {
      // Proxy API calls to backend to avoid CORS in development
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: "::",
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
