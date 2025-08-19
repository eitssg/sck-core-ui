import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isSupabaseDisabled = (env.VITE_SUPBASE_DISABLED ?? 'true').toLowerCase() === 'true';

  return {
    server: {
      host: '::',
      port: 8080,
      proxy: {
        '/api': { target: 'http://localhost:8090', changeOrigin: true, secure: false },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        ...(isSupabaseDisabled
          ? {
              '@supabase/supabase-js': path.resolve(
                __dirname,
                'src/integrations/supabase/stub.ts'
              ),
            }
          : {}),
      },
    },
  };
});