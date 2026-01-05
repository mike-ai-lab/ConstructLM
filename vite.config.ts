import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          // Don't proxy HuggingFace requests
          '/huggingface': {
            target: 'https://huggingface.co',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/huggingface/, '')
          }
        },
        fs: {
          // Allow serving files from node_modules
          allow: ['..', '.'],
        }
      },
      plugins: [react()],
      build: {
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            manualChunks: undefined,
            inlineDynamicImports: true,
            entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
            chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
            assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
          }
        },
        copyPublicDir: true,
        assetsInlineLimit: 0
      },
      define: {
        '__DEFINES__': {},
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
