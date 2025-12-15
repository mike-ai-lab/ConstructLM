import { defineConfig } from 'vite';
import { builtinModules } from 'module';

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    lib: {
      entry: {
        main: 'electron/main.ts',
        preload: 'electron/preload.ts'
      },
      formats: ['cjs']
    },
    rollupOptions: {
      external: ['electron', ...builtinModules, ...builtinModules.map(m => `node:${m}`)]
    },
    emptyOutDir: true,
    minify: false
  }
});
