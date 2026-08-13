import { describe, it, expect } from 'vitest';
import { labelFromScore } from '../labels';

describe('labelFromScore', () => {
  it('maps score ranges per spec', () => {
    expect(labelFromScore(100)).toBe('BÙNG NỔ');
    expect(labelFromScore(70)).toBe('BÙNG NỔ');
    expect(labelFromScore(69)).toBe('TRUNG LẬP');
    expect(labelFromScore(30)).toBe('TRUNG LẬP');
    expect(labelFromScore(29)).toBe('VUI VẺ');
    expect(labelFromScore(0)).toBe('VUI VẺ');
  });
});
