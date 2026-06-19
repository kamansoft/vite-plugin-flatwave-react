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
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  preview: {
    port: 4173,
  },
});
