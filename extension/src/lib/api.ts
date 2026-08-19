import type { ExtensionConfig } from './storage';

export interface PendingRequest {
  id: string;
  url: string;
  status: string;
  created_at: number;
}

function headers(config: ExtensionConfig): Record<string, string> {
  return { 'X-Admin-Key': config.adminKey, 'Content-Type': 'application/json' };
}

export async function fetchQueue(config: ExtensionConfig): Promise<PendingRequest[]> {
  const res = await fetch(`${config.webUrl.replace(/\/$/, '')}/api/queue/pending`, { headers: headers(config) });
  if (!res.ok) throw new Error(`Lỗi tải queue: HTTP ${res.status}`);
  const body = await res.json() as { requests: PendingRequest[] };
  return body.requests;
}

export async function pushImport(config: ExtensionConfig, payload: unknown): Promise<{ threadId: string; isUpdate: boolean; commentCount: number }> {
  const res = await fetch(`${config.webUrl.replace(/\/$/, '')}/api/admin/import`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Lỗi import: HTTP ${res.status}`);
  }
  return res.json() as Promise<{ threadId: string; isUpdate: boolean; commentCount: number }>;
}

export async function reportBatchError(config: ExtensionConfig, requestId: string, message: string): Promise<void> {
  await fetch(`${config.webUrl.replace(/\/$/, '')}/api/admin/request-error`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({ id: requestId, error_message: message }),
  });
}

// Lấy 1 URL bài viết pending ngẫu nhiên (chưa được cào) từ web server.
// Trả null nếu queue rỗng hoặc toàn bộ đã cào xong.
export async function fetchRandomRequest(config: ExtensionConfig): Promise<string | null> {
  const res = await fetch(`${config.webUrl.replace(/\/$/, '')}/api/queue/random`, { headers: headers(config) });
  if (!res.ok) throw new Error(`Lỗi tải bài random: HTTP ${res.status}`);
  const body = await res.json() as { url: string | null };
  return body.url ?? null;
}
