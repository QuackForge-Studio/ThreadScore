import { describe, it, expect } from 'vitest';
import { isThreadsUrl, normalizeThreadsUrl, extractThreadId } from '../threadUrl';

describe('isThreadsUrl', () => {
  it('accepts threads.net post URLs', () => {
    expect(isThreadsUrl('https://www.threads.net/@ducanh/post/C123abc')).toBe(true);
    expect(isThreadsUrl('https://threads.net/@x/post/C123abc/?x=1')).toBe(true);
  });
  it('rejects non-threads URLs', () => {
    expect(isThreadsUrl('https://twitter.com/x/status/1')).toBe(false);
    expect(isThreadsUrl('hello world')).toBe(false);
  });
});

describe('normalizeThreadsUrl', () => {
  it('strips query and fragment', () => {
    expect(normalizeThreadsUrl('https://www.threads.net/@a/post/C1?igsh=abc#frag'))
      .toBe('https://www.threads.net/@a/post/C1');
  });
  it('throws on invalid input', () => {
    expect(() => normalizeThreadsUrl('not a url')).toThrow();
  });
});

describe('extractThreadId', () => {
  it('returns the post id', () => {
    expect(extractThreadId('https://www.threads.net/@a/post/C123abc')).toBe('C123abc');
  });
  it('returns null for profile URL', () => {
    expect(extractThreadId('https://www.threads.net/@a')).toBeNull();
  });
});
