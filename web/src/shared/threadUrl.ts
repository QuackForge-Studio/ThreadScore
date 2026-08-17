// Regular expression matching threads.net and threads.com domains
const THREADS_HOST_RE = /^(?:[a-zA-Z0-9-]+\.)?threads\.(?:net|com)$/i;

export function isThreadsUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  try {
    const trimmed = input.trim();
    // Add protocol if missing
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    if (!THREADS_HOST_RE.test(u.hostname)) return false;

    // Matches: /@user/post/CODE, /post/CODE, /t/CODE
    return (
      /^\/@[^/?#]+\/post\/[^/?#]+/i.test(u.pathname) ||
      /^\/post\/[^/?#]+/i.test(u.pathname) ||
      /^\/t\/[^/?#]+/i.test(u.pathname)
    );
  } catch {
    return false;
  }
}

export function normalizeThreadsUrl(input: string): string {
  if (!isThreadsUrl(input)) throw new Error('URL Threads không hợp lệ');
  const trimmed = input.trim();
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const u = new URL(withProto);

  // Normalize path without trailing slashes or duplicate slashes
  const cleanPath = u.pathname.replace(/\/+$/, '');
  // Normalize host uniformly to https://www.threads.net
  return `https://www.threads.net${cleanPath}`;
}

export function extractThreadId(url: string): string | null {
  if (!isThreadsUrl(url)) return null;
  try {
    const trimmed = url.trim();
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const path = new URL(withProto).pathname;
    const m = path.match(/\/(?:post|t)\/([^/?#]+)/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
