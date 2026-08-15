// Chính sách chống ban: quota, cooldown, retry backoff, jitter delay.
// Toàn bộ trạng thái lưu trong chrome.storage.local, dùng chung giữa popup và background.

export const POLICY = {
  // Giới hạn mềm: số URL tối đa xử lý trong 1 giờ và 1 ngày (trượt 24h)
  maxPerHour: 15,
  maxPerDay: 80,
  // Nghỉ ngẫu nhiên giữa 2 URL (ms) — jitter để không đều đặn máy móc
  minDelayMs: 25_000,
  maxDelayMs: 75_000,
  // Cooldown khi nghi bị chặn (login-wall / rate-limit) — dừng hẳn trong khoảng này
  cooldownMs: 3 * 60 * 60 * 1000,
  // Retry: số lần thử lại tối đa cho 1 URL trước khi bỏ (đã tính lần đầu)
  maxAttempts: 3,
  retryBaseMs: 10 * 60 * 1000,
  retryMaxMs: 2 * 60 * 60 * 1000,
} as const;

export interface UsageState {
  timestamps: number[]; // epoch ms của các URL đã xử lý xong (thành công hoặc thất bại vĩnh viễn)
  cooldownUntil: number; // epoch ms; 0 = không cooldown
  attempt: Record<string, number>; // url -> số lần đã thử
  lastError: Record<string, string>; // url -> lỗi gần nhất để retry lấy message
  version: number; // tăng mỗi lần ghi để UI biết cần refresh
}

const KEY = 'ts_usage';

export function emptyUsage(): UsageState {
  return { timestamps: [], cooldownUntil: 0, attempt: {}, lastError: {}, version: 0 };
}

export async function getUsage(): Promise<UsageState> {
  const res = await chrome.storage.local.get(KEY);
  const raw = res[KEY] as Partial<UsageState> | undefined;
  if (!raw || !Array.isArray(raw.timestamps)) return emptyUsage();
  return {
    timestamps: raw.timestamps.filter((t): t is number => typeof t === 'number'),
    cooldownUntil: typeof raw.cooldownUntil === 'number' ? raw.cooldownUntil : 0,
    attempt: raw.attempt && typeof raw.attempt === 'object' ? raw.attempt as Record<string, number> : {},
    lastError: raw.lastError && typeof raw.lastError === 'object' ? raw.lastError as Record<string, string> : {},
    version: typeof raw.version === 'number' ? raw.version : 0,
  };
}

export async function setUsage(usage: UsageState): Promise<void> {
  usage.version = (usage.version ?? 0) + 1;
  await chrome.storage.local.set({ [KEY]: usage });
}

function prune(usage: UsageState, now: number): void {
  const cutoff = now - 24 * 60 * 60 * 1000;
  usage.timestamps = usage.timestamps.filter(t => t > cutoff);
}

// Trả về 0 nếu được phép xử lý, ngược lại trả về số ms phải đợi
export function timeUntilAllowed(usage: UsageState, now = Date.now()): number {
  prune(usage, now);
  const hourCutoff = now - 60 * 60 * 1000;
  const hourCount = usage.timestamps.filter(t => t > hourCutoff).length;
  if (hourCount >= POLICY.maxPerHour) {
    // timestamps đã prune (tăng dần); tìm timestamp thứ maxPerHour tính từ cuối
    const nthFromEnd = usage.timestamps[usage.timestamps.length - POLICY.maxPerHour];
    return Math.max(1, hourCutoff - nthFromEnd + 1);
  }
  if (usage.timestamps.length >= POLICY.maxPerDay) return usage.timestamps[0] + 24 * 60 * 60 * 1000 - now + 1;
  if (usage.cooldownUntil > now) return usage.cooldownUntil - now;
  return 0;
}

export function isCooldownActive(usage: UsageState, now = Date.now()): boolean {
  return usage.cooldownUntil > now;
}

// Ghi nhận 1 URL đã xử lý xong (dù thành công hay thất bại vĩnh viễn)
export async function recordCompleted(usage: UsageState, url: string): Promise<UsageState> {
  const now = Date.now();
  prune(usage, now);
  usage.timestamps.push(now);
  delete usage.attempt[url];
  delete usage.lastError[url];
  return setUsage(usage);
}

// Retry: trả về true nếu còn được thử lại. Tăng attempt và lưu.
export async function scheduleRetry(usage: UsageState, url: string, error: string): Promise<{ retry: boolean; delayMs: number }> {
  const attempt = (usage.attempt[url] ?? 0) + 1;
  usage.attempt[url] = attempt;
  usage.lastError[url] = error;
  await setUsage(usage);
  if (attempt >= POLICY.maxAttempts) return { retry: false, delayMs: 0 };
  const delayMs = Math.min(POLICY.retryBaseMs * 2 ** (attempt - 1), POLICY.retryMaxMs);
  return { retry: true, delayMs };
}

export function getAttempt(usage: UsageState, url: string): number {
  return usage.attempt[url] ?? 0;
}

export function getLastError(usage: UsageState, url: string): string | undefined {
  return usage.lastError[url];
}

export async function setCooldown(usage: UsageState, reason: string): Promise<UsageState> {
  usage.cooldownUntil = Date.now() + POLICY.cooldownMs;
  await setUsage(usage);
  // Để dấu vết lý do cooldown ở một key riêng, dễ nhìn trong UI
  await chrome.storage.local.set({ ts_cooldown_reason: reason });
  return usage;
}

export async function getCooldownReason(): Promise<string | null> {
  const res = await chrome.storage.local.get('ts_cooldown_reason');
  return typeof res.ts_cooldown_reason === 'string' ? res.ts_cooldown_reason : null;
}

// Delay ngẫu nhiên trong khoảng [min, max] — tránh pattern đều đặn
export function jitterDelay(minMs = POLICY.minDelayMs, maxMs = POLICY.maxDelayMs): number {
  return minMs + Math.floor(Math.random() * (maxMs - minMs));
}

export async function sleep(ms: number): Promise<void> {
  await new Promise(r => setTimeout(r, ms));
}
