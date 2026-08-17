import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Đảm bảo React chạy bản development trong test (máy có NODE_ENV=production toàn cục)
process.env.NODE_ENV = 'test';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['tests/integration/**'],
    testTimeout: 40000,
  },
});
