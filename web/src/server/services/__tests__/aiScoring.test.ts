import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../db';
import { scoreCommentsWithAI } from '../aiScoring';

const mockCreate = vi.fn();
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } };
  },
}));

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    KV: {} as KVNamespace,
    ADMIN_SECRET_KEY: 'x',
    AI_BASE_URL: 'https://example.com/v1',
    AI_API_KEY: 'sk-test',
    AI_MODEL: 'test-model',
    ...overrides,
  };
}

describe('scoreCommentsWithAI', () => {
  beforeEach(() => { mockCreate.mockReset(); });

  it('parses valid JSON output in order', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            results: [
              { score: 85, label: 'BÙNG NỔ', reason: 'Giận dữ rõ ràng' },
              { score: 10, label: 'VUI VẺ', reason: 'Tích cực' },
            ],
          }),
        },
      }],
    });
    const results = await scoreCommentsWithAI(makeEnv(), [
      { id: 'c1', text: 'Tôi ghét điều này', context: 'Chủ đề: giá xăng' },
      { id: 'c2', text: 'Tuyệt vời quá', context: 'Chủ đề: giá xăng' },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ score: 85, label: 'BÙNG NỔ', model: 'test-model' });
    expect(results[1]).toMatchObject({ score: 10, label: 'VUI VẺ', model: 'test-model' });
  });

  it('falls back to lexicon after retries exhausted', async () => {
    mockCreate.mockRejectedValue(new Error('network down'));
    const results = await scoreCommentsWithAI(makeEnv(), [
      { id: 'c1', text: 'đồ ngu xuẩn', context: '' },
    ]);
    expect(mockCreate).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].model).toBe('lexicon-fallback');
  });

  it('falls back to lexicon when AI key is missing', async () => {
    const results = await scoreCommentsWithAI(makeEnv({ AI_API_KEY: undefined }), [
      { id: 'c1', text: 'rất vui vẻ', context: '' },
    ]);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(results[0].model).toBe('lexicon-fallback');
  });
});
