import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        legacy: 'legacy.html',
        history: 'games/history/index.html',
        structure: 'games/structure/index.html',
        sensor: 'games/sensor/index.html',
      },
      output: {
        // Split at Three's existing core/renderer boundary; keep it out of the history entry.
        manualChunks(id) {
          if (id.endsWith('/three.core.js')) return 'three-core';
          if (id.endsWith('/three.module.js')) return 'three-renderer';
        },
        chunkFileNames(chunk) {
          const chapter = chunk.facadeModuleId?.replaceAll('\\', '/').match(/chapters\/([^/]+)\/controller/);
          return `assets/${chapter ? `chapter-${chapter[1]}` : chunk.name}-[hash].js`;
        },
      },
    },
  },
});
