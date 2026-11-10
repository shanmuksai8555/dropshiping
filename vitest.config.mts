import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': root,
      // `server-only` throws outside a React Server environment; it is a no-op for unit tests.
      'server-only': path.join(root, 'tests/server-only-stub.ts'),
    },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
