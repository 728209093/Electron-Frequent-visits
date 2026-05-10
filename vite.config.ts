import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import { builtinModules } from 'module'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(args) {
          args.startup()
        },
        vite: {
          build: {
            outDir: 'dist/main',
            emptyOutDir: true,
            minify: false,
            sourcemap: true,
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: '[name].js',
              },
              external: [
                'electron',
                ...builtinModules,
                ...builtinModules.map(m => `node:${m}`),
                /^puppeteer/,
                /^puppeteer-core/,
                /^playwright/,
                'bufferutil',
                'utf-8-validate',
                'sql.js',
                'bullmq',
                'ioredis',
              ],
            },
          },
          resolve: {
            alias: {
              '@': path.resolve(__dirname, './src'),
              '@main': path.resolve(__dirname, './src/main'),
              '@shared': path.resolve(__dirname, './src/shared'),
            },
          },
        },
      },
      {
        entry: 'src/main/preload.ts',
        onstart(args) {
          // 不需要重新启动
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist/main',
            emptyOutDir: false,
            minify: false,
            sourcemap: true,
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: '[name].js',
              },
              external: [
                'electron',
                ...builtinModules,
                ...builtinModules.map(m => `node:${m}`),
              ],
            },
          },
          resolve: {
            alias: {
              '@': path.resolve(__dirname, './src'),
              '@main': path.resolve(__dirname, './src/main'),
              '@shared': path.resolve(__dirname, './src/shared'),
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  publicDir: 'public',
  base: './',
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
})
