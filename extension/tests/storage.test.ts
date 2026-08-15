import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
      set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(mockStorage, obj); }),
    },
  },
});

import { getConfig, setConfig } from '../src/lib/storage';

describe('storage', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  });

  it('returns default config when empty', async () => {
    const cfg = await getConfig();
    expect(cfg.webUrl).toBe('https://threadscore.quackforge.io.vn');
    expect(cfg.adminKey).toBe('');
  });

  it('persists and reads config', async () => {
    await setConfig({ webUrl: 'https://ts.example.com', adminKey: 'k123' });
    const cfg = await getConfig();
    expect(cfg).toEqual({ webUrl: 'https://ts.example.com', adminKey: 'k123', autoEnabled: false });
  });
});
