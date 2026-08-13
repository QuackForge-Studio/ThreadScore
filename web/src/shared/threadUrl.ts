const THREADS_HOST_RE = /^(www\.)?threads\.net$/i;

export function isThreadsUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return THREADS_HOST_RE.test(u.hostname) && /^\/@[^/]+\/post\/[^/]+/i.test(u.pathname);
  } catch {
    return false;
  }
}

export function normalizeThreadsUrl(input: string): string {
  if (!isThreadsUrl(input)) throw new Error('URL Threads không hợp lệ');
  const u = new URL(input);
  return `${u.origin}${u.pathname}`;
}

export function extractThreadId(url: string): string | null {
  if (!isThreadsUrl(url)) return null;
  const m = new URL(url).pathname.match(/\/post\/([^/]+)/i);
  return m ? m[1] : null;
}
