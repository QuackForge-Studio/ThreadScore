// Lỗi phân loại để quyết định retry hay bỏ hẳn.
// - LoginWall / RateLimited: dấu hiệu bị chặn -> dừng cả batch + cooldown
// - Transient: lỗi mạng/load tạm thời -> retry theo backoff
// - Permanent: bài không tồn tại, không có comment... -> bỏ luôn, báo lỗi

export type ScrapeErrorKind = 'login-wall' | 'rate-limited' | 'transient' | 'permanent';

export class ScrapeError extends Error {
  readonly kind: ScrapeErrorKind;
  constructor(kind: ScrapeErrorKind, message: string) {
    super(message);
    this.name = 'ScrapeError';
    this.kind = kind;
  }
}

// Detect từ URL đích sau khi tab redirect (có thể sang login/checkpoint)
export function detectBlockFromUrl(url: string): ScrapeErrorKind | null {
  const u = new URL(url);
  const host = u.hostname.toLowerCase();
  const path = u.pathname.toLowerCase();
  // Threads đẩy về trang login hoặc checkpoint khi nghi bot
  if (host === 'www.threads.net' && (path.startsWith('/login') || path.startsWith('/accounts/login') || path.startsWith('/checkpoint'))) {
    return 'login-wall';
  }
  // Instagram/Threads rate-limit thường redirect sang trang này
  if (host === 'www.instagram.com' && path.startsWith('/accounts/login')) return 'login-wall';
  if (path.includes('rate-limit') || path.includes('spam')) return 'rate-limited';
  return null;
}

// Detect từ nội dung trang (text pattern của Threads khi bị chặn)
const BLOCK_TEXT = [
  'our systems have detected unusual activity',
  'unusual traffic from your computer network',
  'please confirm you are a human',
  'rate limited',
  'too many requests',
  'try again later',
  'bạn đã bị chặn',
  'có hoạt động bất thường',
];

export function detectBlockFromText(text: string): ScrapeErrorKind | null {
  const lower = text.toLowerCase();
  if (BLOCK_TEXT.some(p => lower.includes(p))) return 'rate-limited';
  // Trang chỉ còn login form mà không có nội dung bài
  if (lower.includes('log in to continue') || lower.includes('log in') && lower.includes('threads')) return 'login-wall';
  return null;
}

// Kiểm tra tab có phải là trang bài Threads thật không (sau redirect có thể là home/explore)
export function looksLikeThreadPage(url: string, htmlText: string): boolean {
  const u = new URL(url);
  const path = u.pathname;
  if (!path.startsWith('/@')) return false;
  const segment = path.split('/').filter(Boolean);
  // /@user/post/<code> — đôi khi /@user/reply/<code>
  return segment.length >= 2 && (segment[1] === 'post' || segment[1] === 'reply');
}
