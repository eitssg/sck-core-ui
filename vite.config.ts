import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    open: false,
    strictPort: true,
  },
  preview: {
    host: "::",
    port: 8080,
    open: false,
    strictPort: true,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
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
