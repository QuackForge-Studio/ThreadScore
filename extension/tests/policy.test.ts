import { describe, it, expect, vi } from 'vitest';

const storageLocal: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (k: string) => ({ [k]: storageLocal[k] })),
      set: vi.fn(async (v: Record<string, unknown>) => { Object.assign(storageLocal, v); }),
    },
  },
});

import {
  POLICY, emptyUsage, timeUntilAllowed, recordCompleted, scheduleRetry,
  setCooldown, isCooldownActive, jitterDelay,
} from '../src/lib/policy';

describe('policy', () => {
  it('allows when under quota', async () => {
    const usage = emptyUsage();
    expect(timeUntilAllowed(usage)).toBe(0);
  });

  it('blocks when hourly quota reached', async () => {
    const usage = emptyUsage();
    const now = Date.now();
    // giả lập đã xử lý maxPerHour URL trong giờ này (timestamps sắp tăng dần, mới nhất cuối)
    for (let i = 0; i < POLICY.maxPerHour; i++) {
      usage.timestamps.push(now - 60_000 * (POLICY.maxPerHour - 1 - i));
    }
    expect(timeUntilAllowed(usage, now)).toBeGreaterThan(0);
  });

  it('prunes old timestamps after 24h', async () => {
    const usage = emptyUsage();
    const now = Date.now();
    usage.timestamps = [now - 25 * 60 * 60 * 1000, now - 60_000];
    expect(timeUntilAllowed(usage, now)).toBe(0);
  });

  it('recordCompleted adds timestamp and resets attempts', async () => {
    const usage = emptyUsage();
    usage.attempt['https://x'] = 3;
    await recordCompleted(usage, 'https://x');
    expect(usage.timestamps).toHaveLength(1);
    expect(usage.attempt['https://x']).toBeUndefined();
  });

  it('scheduleRetry returns retry with backoff until maxAttempts', async () => {
    const usage = emptyUsage();
    const url = 'https://www.threads.net/@a/post/C1';
    const r1 = await scheduleRetry(usage, url, 'err');
    expect(r1.retry).toBe(true);
    expect(r1.delayMs).toBeGreaterThan(0);
    const r2 = await scheduleRetry(usage, url, 'err');
    expect(r2.retry).toBe(true);
    expect(r2.delayMs).toBeGreaterThan(r1.delayMs);
    const r3 = await scheduleRetry(usage, url, 'err');
    expect(r3.retry).toBe(false);
  });

  it('cooldown blocks until expiry', async () => {
    const usage = emptyUsage();
    await setCooldown(usage, 'test');
    expect(isCooldownActive(usage)).toBe(true);
    expect(timeUntilAllowed(usage)).toBeGreaterThan(0);
  });

  it('jitterDelay stays in range', () => {
    for (let i = 0; i < 50; i++) {
      const d = jitterDelay(100, 200);
      expect(d).toBeGreaterThanOrEqual(100);
      expect(d).toBeLessThanOrEqual(200);
    }
  });
});
