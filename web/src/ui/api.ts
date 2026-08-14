export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Lỗi ${res.status}`, res.status);
  return data as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return fetch(path).then(handle<T>);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle<T>);
}

export type SearchResult =
  | { kind: 'url'; state: 'scored' | 'pending' | 'unknown'; thread?: { id: string; url: string; scoring_status: string }; request?: { id: string } }
  | { kind: 'keyword'; threads: Array<{ id: string; url: string; title: string | null; author_username: string | null }> };

export const searchThreads = (q: string) => apiGet<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`);
export const getThread = (id: string) => apiGet<unknown>(`/api/threads/${id}`);
export const requestThread = (url: string) => apiPost<{ status: string }>('/api/requests', { url });
export const vote = (commentId: string, v: 'correct' | 'incorrect') => apiPost<{ ok: boolean; counts: { correct: number; incorrect: number } }>('/api/votes', { comment_id: commentId, vote: v });
export const postUserComment = (threadId: string, content: string, displayName?: string) => apiPost<{ ok: boolean }>('/api/comments', { thread_id: threadId, content, display_name: displayName });
