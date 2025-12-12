import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    lib: {
      entry: resolve(__dirname, 'electron/main.ts'),
      formats: ['es'],
      fileName: 'main',
    },
    rollupOptions: {
      external: ['electron'],
    },
    emptyOutDir: true,
  },
})