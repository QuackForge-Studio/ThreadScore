import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { fetchQueue, pushImport } from '../src/lib/api';
import type { ExtensionConfig } from '../src/lib/storage';

const cfg: ExtensionConfig = { webUrl: 'https://ts.example.com', adminKey: 'k123' };

describe('api client', () => {
  beforeEach(() => fetchMock.mockReset());

  it('fetchQueue sends admin key and returns requests', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ requests: [{ id: 'r1', url: 'https://www.threads.net/@a/post/C1', status: 'pending', created_at: 1 }] }), { status: 200 }));
    const queue = await fetchQueue(cfg);
    expect(queue).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('https://ts.example.com/api/queue/pending', {
      headers: { 'X-Admin-Key': 'k123', 'Content-Type': 'application/json' },
    });
  });

  it('pushImport throws on non-200', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
    await expect(pushImport(cfg, { url: 'x', comments: [] })).rejects.toThrow('Unauthorized');
  });
});
