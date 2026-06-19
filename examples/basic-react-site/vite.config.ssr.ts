import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { flatwaveContent } from '@kamansoft/vite-plugin-flatwave-react';

export default defineConfig({
  plugins: [
    react(),
    flatwaveContent({
      contentDir: path.resolve(__dirname, 'src/content'),
      locales: ['es', 'pt'],
      defaultLocale: 'es',
      strictMissingLocales: false,
      componentsDir: path.resolve(__dirname, 'src/components'),
      sitemap: {
        hostname: 'http://localhost:4173',
      },
      prerender: true,
      ssrEntry: 'src/entry-server.tsx',
    }),
  ],
  build: {
    outDir: 'dist-ssr',
    emptyOutDir: true,
    ssr: true,
    rollupOptions: {
      input: 'src/entry-server.tsx',
      output: {
        format: 'esm',
        entryFileNames: 'entry-server.js',
      },
    },
  },
  ssr: {
    // Externalize the virtual module - we'll provide our own implementation
    external: ['virtual:flatwave/content'],
    noExternal: ['react', 'react-dom', 'react-dom/server'],
  },
  resolve: {
    alias: {
      'virtual:flatwave/content': path.resolve(__dirname, 'src/virtual-content-ssr.ts'),
    },
  },
});
