import { describe, it, expect } from 'vitest';
import { lexiconScore } from '../lexiconScorer';

describe('lexiconScore', () => {
  it('scores angry Vietnamese text high', () => {
    const r = lexiconScore('Tôi ghét cái này, đồ ngu xuẩn, cút đi!');
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.label).toBe('BÙNG NỔ');
  });
  it('scores positive text low', () => {
    const r = lexiconScore('Tuyệt vời, rất vui và hạnh phúc, cảm ơn nhiều');
    expect(r.score).toBeLessThanOrEqual(29);
    expect(r.label).toBe('VUI VẺ');
  });
  it('scores neutral text mid', () => {
    const r = lexiconScore('Hôm nay trời mưa, tôi đi làm lúc 8 giờ sáng.');
    expect(r.score).toBeGreaterThanOrEqual(30);
    expect(r.score).toBeLessThan(70);
    expect(r.label).toBe('TRUNG LẬP');
  });
  it('handles empty text', () => {
    const r = lexiconScore('');
    expect(r.label).toBe('TRUNG LẬP');
    expect(r.score).toBe(50);
  });
});
