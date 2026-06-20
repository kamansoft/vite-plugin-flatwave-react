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
      ssg: {
        enabled: true,
        hooks: {
          // 12.2 — transformMarkdown: append a built-with note to every page body
          transformMarkdown: async (markdown, _context) => {
            return markdown + '\n\n---\n\n*This page was built with **Flatwave SSG 1.0.0**.*';
          },
          // 12.3 — transformHtml: inject a lightweight analytics beacon before </body>
          transformHtml: async (html, context) => {
            const beacon = `<script>/* flatwave-analytics */console.info('[flatwave] page rendered:', '${context.route.path}', 'locale:', '${context.route.locale}');</script>`;
            return html.replace('</body>', beacon + '\n</body>');
          },
        },
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
