# ThreadScore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng ThreadScore — web cộng đồng đo mức độ tức giận của comments trên Threads, với Chrome extension cho owner scrape + batch import, AI scoring linh hoạt (OpenAI/Gemini/Claude compatible), deploy Cloudflare Pages + D1 + KV.

**Architecture:** Repo đơn `ThreadScore/` với 2 phần độc lập: `web/` (React SPA + Cloudflare Pages Functions + D1 + KV) và `extension/` (Chrome MV3 scrape Threads). Pages Functions là backend duy nhất; extension chỉ gọi API với `X-Admin-Key`. AI scoring chạy server-side bất đồng bộ qua worker quét `scoring_status = pending_scoring`, KV lock chống chạy đôi.

**Tech Stack:** TypeScript, React 18 + Vite, react-router-dom v6, Cloudflare Pages Functions, D1 (SQLite), KV, `openai` npm SDK (OpenAI-compatible), Zod, Vitest + jsdom + Testing Library, Wrangler, @crxjs/vite-plugin (MV3), miniflare (integration test).

## Global Constraints

(Những ràng buộc này áp dụng cho MỌI task — copy nguyên văn từ spec `docs/superpowers/specs/2026-08-13-threadscore-design.md`)

- Ngôn ngữ: TypeScript toàn bộ (web + extension). Node ≥ 20.
- Điểm = **mức tức giận 0-100**: 0 = vui nhất, 100 = tức giận nhất.
- Phân loại theo khoảng điểm: `70-100 → "Bùng nổ"` (đỏ), `30-69 → "Trung lập"` (xám), `0-29 → "Vui vẻ"` (xanh). Tên nhãn hiển thị đúng 3 chuỗi này.
- AI output JSON bắt buộc có dạng `{ score: number (0-100), label: "BÙNG NỔ"|"TRUNG LẬP"|"VUI VẺ", reason: string }`, validate bằng Zod trước khi lưu.
- Provider AI qua env vars: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` (OpenAI-compatible). Không hardcode provider trong code.
- Fallback khi AI fail 5 lần retry: lexicon scorer cục bộ, lưu `model = 'lexicon-fallback'`.
- Batch AI: tối đa 25 comments/request. Worker tối đa 20 batch/lần chạy rồi dừng (trả lại cho lần chạy sau).
- Retry khi 429/fail: exponential backoff, tối đa 5 lần.
- Admin auth: header `X-Admin-Key` so khớp env `ADMIN_SECRET_KEY`. Sai/thiếu → HTTP 401, không lộ chi tiết.
- Rate limit ẩn danh (KV): vote tối đa 3 lần/giờ/IP, comment tối đa 1 lần/10 phút/IP. Vượt → HTTP 429 kèm thông báo thân thiện. User đã đăng nhập không bị rate limit này.
- Timestamp: UNIX epoch (số nguyên giây).
- Import idempotent theo URL: trùng URL → update thread + comments hiện có, không tạo bản sao. Thread mới có `scoring_status = 'pending_scoring'`.
- KV lock (`scoring-lock`) chống 2 scoring worker chạy đồng thời.
- Extension: chỉ hoạt động trên `*.threads.net`. Selector DOM tách riêng module `selectors.ts`. Giới hạn comments mặc định 500 (biến `MAX_COMMENTS`).
- Bảng D1 đúng tên cột trong spec: `requests`, `threads`, `comments`, `ai_scores`, `votes`, `user_comments`.
- Vote hiển thị độ tin cậy AI = vote đúng / tổng vote, chỉ khi tổng vote ≥ 3.
- Người dùng web KHÔNG fetch Threads trực tiếp — chỉ request URL; owner là người duy nhất import (qua extension hoặc upload JSON).
- YAGNI: không polling cập nhật comments, không notification, không gamification, không media (chỉ text), không admin UI xóa/sửa.
- Quy trình: TDD — viết test đỏ trước, chạy thấy fail, implement, test xanh, commit. Mỗi task kết thúc bằng commit riêng với message prefix theo task.

## File Structure

```
ThreadScore/
├── web/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── wrangler.toml
│   ├── migrations/
│   │   └── 0001_initial.sql
│   ├── functions/
│   │   ├── _middleware.ts
│   │   └── api/
│   │       ├── threads/index.ts
│   │       ├── threads/[id].ts
│   │       ├── requests.ts
│   │       ├── search.ts
│   │       ├── votes.ts
│   │       ├── comments.ts
│   │       ├── queue/pending.ts
│   │       ├── admin/import.ts
│   │       ├── admin/import-json.ts
│   │       ├── admin/worker.ts
│   │       └── auth/[provider]/callback.ts
│   ├── src/
│   │   ├── shared/
│   │   │   ├── types.ts
│   │   │   ├── constants.ts
│   │   │   ├── labels.ts
│   │   │   ├── threadUrl.ts
│   │   │   └── schemas.ts
│   │   ├── server/
│   │   │   ├── db.ts
│   │   │   ├── repo/threads.ts
│   │   │   ├── repo/comments.ts
│   │   │   ├── repo/requests.ts
│   │   │   ├── repo/scores.ts
│   │   │   ├── repo/votes.ts
│   │   │   ├── repo/userComments.ts
│   │   │   ├── services/lexiconScorer.ts
│   │   │   ├── services/aiScoring.ts
│   │   │   ├── services/importService.ts
│   │   │   ├── services/scoringWorker.ts
│   │   │   ├── services/rateLimit.ts
│   │   │   ├── services/adminKey.ts
│   │   │   └── services/session.ts
│   │   └── ui/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── api.ts
│   │       ├── pages/HomePage.tsx
│   │       ├── pages/ThreadPage.tsx
│   │       ├── pages/AdminPage.tsx
│   │       └── components/ThreadCard.tsx
│   │           components/CommentCard.tsx
│   │           components/ScoreBar.tsx
│   │           components/HeatGauge.tsx
│   │           components/SearchBox.tsx
│   │           components/VoteButtons.tsx
│   │           components/DiscussionBox.tsx
│   └── tests/ (miniflare integration tests)
├── extension/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── src/
│   │   ├── manifest.ts
│   │   ├── content/scraper.ts
│   │   ├── content/selectors.ts
│   │   ├── content/autoScroll.ts
│   │   ├── popup/main.tsx
│   │   ├── popup/App.tsx
│   │   ├── popup/manual.ts
│   │   ├── popup/batch.ts
│   │   ├── batch/runner.ts
│   │   ├── lib/api.ts
│   │   └── lib/storage.ts
│   └── tests/
└── README.md
```

---

### Task 1: Scaffold web project + shared core modules

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts`, `web/vitest.config.ts`, `web/wrangler.toml`, `web/index.html`, `web/.gitignore`
- Create: `web/src/shared/types.ts`, `web/src/shared/constants.ts`, `web/src/shared/labels.ts`, `web/src/shared/threadUrl.ts`, `web/src/shared/schemas.ts`
- Test: `web/src/shared/__tests__/threadUrl.test.ts`, `web/src/shared/__tests__/labels.test.ts`

**Interfaces:**
- Produces (mọi task sau dùng):
  - `types.ts`: `type Label = 'BÙNG NỔ' | 'TRUNG LẬP' | 'VUI VẺ'`; `type ScoringStatus = 'pending_scoring' | 'scoring' | 'scored'`; `type RequestStatus = 'pending' | 'fulfilled' | 'not_found' | 'error'`; interfaces `ThreadRecord`, `CommentRecord`, `AiScoreRecord`, `RequestRecord`, `VoteRecord`, `UserCommentRecord` (khớp cột bảng D1 trong spec, timestamp là `number` epoch giây).
  - `constants.ts`: `MAX_AI_BATCH = 25`, `MAX_WORKER_BATCHES = 20`, `MAX_RETRIES = 5`, `EXTENSION_MAX_COMMENTS = 500`, `SCORING_LOCK_KEY = 'scoring-lock'`, `VOTE_RATE_LIMIT = { windowSec: 3600, max: 3 }`, `COMMENT_RATE_LIMIT = { windowSec: 600, max: 1 }`.
  - `labels.ts`: `labelFromScore(score: number): Label`, `LABEL_COLORS: Record<Label, string>`, `LABEL_DISPLAY: Record<Label, string>`.
  - `threadUrl.ts`: `isThreadsUrl(input: string): boolean`, `normalizeThreadsUrl(input: string): string`, `extractThreadId(url: string): string | null`.
  - `schemas.ts`: Zod schemas `aiOutputSchema`, `aiBatchSchema`, `commentInputSchema`, `importPayloadSchema`, `requestSchema`, `voteSchema`, `userCommentSchema`.

- [ ] **Step 1: Tạo `web/package.json`**

```json
{
  "name": "threadscore-web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "cf-typegen": "wrangler types",
    "deploy": "wrangler pages deploy dist"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "openai": "^4.56.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240806.0",
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.1",
    "miniflare": "^3.20240718.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5",
    "wrangler": "^3.68.0"
  }
}
```

- [ ] **Step 2: Viết test đỏ cho `threadUrl.ts`**

`web/src/shared/__tests__/threadUrl.test.ts`:

```ts
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
```

- [ ] **Step 3: Chạy test, xác nhận fail**

Run: `cd web && npx vitest run src/shared/__tests__/threadUrl.test.ts`
Expected: FAIL — "Cannot find module '../threadUrl'"

- [ ] **Step 4: Implement `threadUrl.ts` + `labels.ts` + test labels**

```ts
// web/src/shared/threadUrl.ts
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
```

```ts
// web/src/shared/labels.ts
import type { Label } from './types';

export const LABEL_DISPLAY: Record<Label, string> = {
  'BÙNG NỔ': 'Bùng nổ',
  'TRUNG LẬP': 'Trung lập',
  'VUI VẺ': 'Vui vẻ',
};

export const LABEL_COLORS: Record<Label, string> = {
  'BÙNG NỔ': '#e5484d',
  'TRUNG LẬP': '#8d8d8d',
  'VUI VẺ': '#2f9e6e',
};

export function labelFromScore(score: number): Label {
  if (score >= 70) return 'BÙNG NỔ';
  if (score >= 30) return 'TRUNG LẬP';
  return 'VUI VẺ';
}
```

`web/src/shared/__tests__/labels.test.ts`:

```ts
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
```

- [ ] **Step 5: Implement `types.ts`, `constants.ts`, `schemas.ts`**

```ts
// web/src/shared/types.ts
export type Label = 'BÙNG NỔ' | 'TRUNG LẬP' | 'VUI VẺ';
export type ScoringStatus = 'pending_scoring' | 'scoring' | 'scored';
export type RequestStatus = 'pending' | 'fulfilled' | 'not_found' | 'error';

export interface ThreadRecord {
  id: string;
  url: string;
  title: string | null;
  content: string | null;
  author_username: string | null;
  author_name: string | null;
  posted_at: number | null;
  total_comments: number;
  scoring_status: ScoringStatus;
  avg_anger_score: number | null;
  score_breakdown: string | null;
  created_at: number;
}

export interface CommentRecord {
  id: string;
  thread_id: string;
  external_id: string | null;
  author_username: string | null;
  author_name: string | null;
  text: string;
  like_count: number;
  posted_at: number | null;
  created_at: number;
}

export interface AiScoreRecord {
  id: string;
  comment_id: string;
  score: number;
  label: Label;
  reason: string | null;
  model: string;
  created_at: number;
}

export interface RequestRecord {
  id: string;
  url: string;
  status: RequestStatus;
  requested_by: string | null;
  error_message: string | null;
  thread_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface VoteRecord {
  id: string;
  comment_id: string;
  user_id: string | null;
  vote: 'correct' | 'incorrect';
  created_at: number;
}

export interface UserCommentRecord {
  id: string;
  thread_id: string;
  user_id: string | null;
  display_name: string | null;
  content: string;
  created_at: number;
}

export interface ImportCommentInput {
  external_id?: string | null;
  author_username?: string | null;
  author_name?: string | null;
  text: string;
  like_count?: number;
  posted_at?: number | null;
}

export interface ImportPayload {
  url: string;
  title?: string | null;
  content?: string | null;
  author_username?: string | null;
  author_name?: string | null;
  posted_at?: number | null;
  comments: ImportCommentInput[];
}
```

```ts
// web/src/shared/constants.ts
export const MAX_AI_BATCH = 25;
export const MAX_WORKER_BATCHES = 20;
export const MAX_RETRIES = 5;
export const EXTENSION_MAX_COMMENTS = 500;
export const SCORING_LOCK_KEY = 'scoring-lock';
export const VOTE_RATE_LIMIT = { windowSec: 3600, max: 3 };
export const COMMENT_RATE_LIMIT = { windowSec: 600, max: 1 };
```

```ts
// web/src/shared/schemas.ts
import { z } from 'zod';

export const aiOutputSchema = z.object({
  score: z.number().min(0).max(100),
  label: z.enum(['BÙNG NỔ', 'TRUNG LẬP', 'VUI VẺ']),
  reason: z.string().max(500),
});

export const aiBatchSchema = z.array(aiOutputSchema).max(25);

export const commentInputSchema = z.object({
  external_id: z.string().max(100).nullable().optional(),
  author_username: z.string().max(200).nullable().optional(),
  author_name: z.string().max(200).nullable().optional(),
  text: z.string().min(1).max(10000),
  like_count: z.number().int().min(0).default(0),
  posted_at: z.number().int().nullable().optional(),
});

export const importPayloadSchema = z.object({
  url: z.string().min(1),
  title: z.string().max(2000).nullable().optional(),
  content: z.string().max(20000).nullable().optional(),
  author_username: z.string().max(200).nullable().optional(),
  author_name: z.string().max(200).nullable().optional(),
  posted_at: z.number().int().nullable().optional(),
  comments: z.array(commentInputSchema).max(1000),
});

export const requestSchema = z.object({ url: z.string().min(1).max(2000) });

export const voteSchema = z.object({
  comment_id: z.string().uuid(),
  vote: z.enum(['correct', 'incorrect']),
});

export const userCommentSchema = z.object({
  thread_id: z.string().uuid(),
  display_name: z.string().max(100).nullable().optional(),
  content: z.string().min(1).max(5000),
});
```

- [ ] **Step 6: Tạo `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `wrangler.toml`, `index.html`, `.gitignore`**

```json
// web/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src", "functions"]
}
```

```ts
// web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
});
```

```ts
// web/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
```

```toml
# web/wrangler.toml
name = "threadscore"
compatibility_date = "2024-08-01"
pages_build_output_dir = "./dist"

[[d1_databases]]
binding = "DB"
database_name = "threadscore-db"
database_id = "REPLACE_AFTER_wrangler_d1_create"

[[kv_namespaces]]
binding = "KV"
id = "REPLACE_AFTER_wrangler_kv_create"
```

`web/index.html`:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ThreadScore — Đo mức độ tức giận trên Threads</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/ui/main.tsx"></script>
  </body>
</html>
```

`web/.gitignore`:

```
node_modules/
dist/
.wrangler/
.dev.vars
*.local
```

- [ ] **Step 7: Chạy toàn bộ unit test, xác nhận PASS**

Run: `cd web && npm install && npx vitest run`
Expected: PASS — cả 2 file test (threadUrl, labels) xanh.

- [ ] **Step 8: Commit**

```bash
git add web/package.json web/tsconfig.json web/vite.config.ts web/vitest.config.ts web/wrangler.toml web/index.html web/.gitignore web/src/shared/
git commit -m "feat(web): scaffold project + shared core modules"
```

---

### Task 2: D1 migration + db helper + repos

**Files:**
- Create: `web/migrations/0001_initial.sql`, `web/src/server/db.ts`
- Create: `web/src/server/repo/threads.ts`, `web/src/server/repo/comments.ts`, `web/src/server/repo/requests.ts`, `web/src/server/repo/scores.ts`, `web/src/server/repo/votes.ts`, `web/src/server/repo/userComments.ts`
- Test: `web/tests/integration/repos.test.ts` (chạy với miniflare D1 in-memory)

**Interfaces:**
- Consumes: `types.ts` interfaces từ Task 1; `constants.ts`.
- Produces (API handlers + services dùng):
  - `db.ts`: `export function nowSec(): number` (Math.floor(Date.now()/1000)); `export function newId(): string` (crypto.randomUUID()); `export function getDB(env: Env): D1Database` (cast `env.DB`).
  - `repo/threads.ts`: `insertThread(db, t: ThreadRecord): Promise<void>`; `getThreadByUrl(db, url): Promise<ThreadRecord | null>`; `getThreadById(db, id): Promise<ThreadRecord | null>`; `updateThread(db, id, patch: Partial<ThreadRecord>): Promise<void>`; `listThreads(db, opts: { sort: 'newest' | 'hottest' | 'most_comments'; limit: number; offset: number }): Promise<ThreadRecord[]>`; `listPendingScoring(db, limit: number): Promise<ThreadRecord[]>`.
  - `repo/comments.ts`: `insertComments(db, comments: CommentRecord[]): Promise<void>` (batch loop 50/batch); `getCommentsByThread(db, threadId): Promise<CommentRecord[]>`; `deleteCommentsByThread(db, threadId): Promise<void>`; `countCommentsByThread(db, threadId): Promise<number>`.
  - `repo/requests.ts`: `insertRequest(db, r: RequestRecord): Promise<void>`; `getPendingRequestByUrl(db, url): Promise<RequestRecord | null>`; `listPendingRequests(db): Promise<RequestRecord[]>`; `updateRequestStatus(db, id, status: RequestStatus, opts?: { threadId?: string; errorMessage?: string }): Promise<void>`; `getRequestByUrl(db, url): Promise<RequestRecord | null>`.
  - `repo/scores.ts`: `insertScores(db, scores: AiScoreRecord[]): Promise<void>`; `getScoresForThread(db, threadId): Promise<AiScoreRecord[]>`; `hasScoresForComment(db, commentId): Promise<boolean>`.
  - `repo/votes.ts`: `insertVote(db, v: VoteRecord): Promise<void>`; `getVoteCounts(db, commentId): Promise<{ correct: number; incorrect: number }>`.
  - `repo/userComments.ts`: `insertUserComment(db, c: UserCommentRecord): Promise<void>`; `listUserCommentsByThread(db, threadId): Promise<UserCommentRecord[]>`.

- [ ] **Step 1: Viết migration `web/migrations/0001_initial.sql`**

```sql
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT,
  error_message TEXT,
  thread_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_url ON requests(url);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  content TEXT,
  author_username TEXT,
  author_name TEXT,
  posted_at INTEGER,
  total_comments INTEGER NOT NULL DEFAULT 0,
  scoring_status TEXT NOT NULL DEFAULT 'pending_scoring',
  avg_anger_score REAL,
  score_breakdown TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_threads_scoring ON threads(scoring_status);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  external_id TEXT,
  author_username TEXT,
  author_name TEXT,
  text TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  posted_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_thread ON comments(thread_id);

CREATE TABLE IF NOT EXISTS ai_scores (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  score REAL NOT NULL,
  label TEXT NOT NULL,
  reason TEXT,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scores_comment ON ai_scores(comment_id);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  user_id TEXT,
  vote TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_votes_comment ON votes(comment_id);

CREATE TABLE IF NOT EXISTS user_comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT,
  display_name TEXT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_comments_thread ON user_comments(thread_id);
```

- [ ] **Step 2: Viết test integration đỏ cho repos**

`web/tests/integration/repos.test.ts` (dùng `@cloudflare/vitest-pool-workers`; xem chi tiết pool workers config ở Step 4):

```ts
import { describe, it, expect } from 'vitest';
import { newId, nowSec } from '../../src/server/db';
import { insertThread, getThreadByUrl, listPendingScoring } from '../../src/server/repo/threads';
import { insertComments, getCommentsByThread, deleteCommentsByThread } from '../../src/server/repo/comments';
import { insertRequest, getPendingRequestByUrl, updateRequestStatus } from '../../src/server/repo/requests';
import type { ThreadRecord, CommentRecord, RequestRecord } from '../../src/shared/types';

const env = getMiniflareBindings() as unknown as { DB: D1Database };
const db = env.DB;

describe('threads repo', () => {
  it('inserts and finds by url; lists pending scoring', async () => {
    const t: ThreadRecord = { id: newId(), url: 'https://www.threads.net/@a/post/C1', title: 'T', content: 'C',
      author_username: 'a', author_name: 'A', posted_at: nowSec(), total_comments: 0,
      scoring_status: 'pending_scoring', avg_anger_score: null, score_breakdown: null, created_at: nowSec() };
    await insertThread(db, t);
    const found = await getThreadByUrl(db, t.url);
    expect(found?.id).toBe(t.id);
    const pending = await listPendingScoring(db, 10);
    expect(pending.map(p => p.id)).toContain(t.id);
  });
});

describe('comments repo', () => {
  it('inserts, lists, deletes comments per thread', async () => {
    const threadId = newId();
    const cs: CommentRecord[] = [
      { id: newId(), thread_id: threadId, external_id: 'e1', author_username: 'u1', author_name: null,
        text: 'comment 1', like_count: 0, posted_at: nowSec(), created_at: nowSec() },
      { id: newId(), thread_id: threadId, external_id: 'e2', author_username: 'u2', author_name: null,
        text: 'comment 2', like_count: 3, posted_at: nowSec(), created_at: nowSec() },
    ];
    await insertComments(db, cs);
    expect(await getCommentsByThread(db, threadId)).toHaveLength(2);
    await deleteCommentsByThread(db, threadId);
    expect(await getCommentsByThread(db, threadId)).toHaveLength(0);
  });
});

describe('requests repo', () => {
  it('finds pending by url and updates status', async () => {
    const url = 'https://www.threads.net/@b/post/C9';
    const r: RequestRecord = { id: newId(), url, status: 'pending', requested_by: 'anonymous',
      error_message: null, thread_id: null, created_at: nowSec(), updated_at: nowSec() };
    await insertRequest(db, r);
    const found = await getPendingRequestByUrl(db, url);
    expect(found?.id).toBe(r.id);
    await updateRequestStatus(db, r.id, 'fulfilled', { threadId: 'thread-1' });
    const after = await getPendingRequestByUrl(db, url);
    expect(after).toBeNull();
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận fail**

Run: `cd web && npx vitest run --config vitest.integration.config.ts`
Expected: FAIL — "Cannot find module '../../src/server/db'"

- [ ] **Step 4: Implement `db.ts` + toàn bộ repos + `vitest.integration.config.ts`**

```ts
// web/src/server/db.ts
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ADMIN_SECRET_KEY: string;
  AI_BASE_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function newId(): string {
  return crypto.randomUUID();
}

export function getDB(env: Env): D1Database {
  return env.DB;
}
```

```ts
// web/src/server/repo/threads.ts
import type { ThreadRecord } from '../../shared/types';

export async function insertThread(db: D1Database, t: ThreadRecord): Promise<void> {
  await db.prepare(
    `INSERT INTO threads (id, url, title, content, author_username, author_name, posted_at,
      total_comments, scoring_status, avg_anger_score, score_breakdown, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(t.id, t.url, t.title, t.content, t.author_username, t.author_name, t.posted_at,
    t.total_comments, t.scoring_status, t.avg_anger_score, t.score_breakdown, t.created_at).run();
}

export async function getThreadByUrl(db: D1Database, url: string): Promise<ThreadRecord | null> {
  const row = await db.prepare('SELECT * FROM threads WHERE url = ?').bind(url).first<ThreadRecord>();
  return row ?? null;
}

export async function getThreadById(db: D1Database, id: string): Promise<ThreadRecord | null> {
  const row = await db.prepare('SELECT * FROM threads WHERE id = ?').bind(id).first<ThreadRecord>();
  return row ?? null;
}

export async function updateThread(db: D1Database, id: string, patch: Partial<ThreadRecord>): Promise<void> {
  const keys = Object.keys(patch) as (keyof ThreadRecord)[];
  if (keys.length === 0) return;
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => patch[k]);
  await db.prepare(`UPDATE threads SET ${sets} WHERE id = ?`).bind(...values, id).run();
}

export async function listThreads(db: D1Database, opts: { sort: 'newest' | 'hottest' | 'most_comments'; limit: number; offset: number }): Promise<ThreadRecord[]> {
  const orderBy = opts.sort === 'hottest' ? 'avg_anger_score DESC' : opts.sort === 'most_comments' ? 'total_comments DESC' : 'created_at DESC';
  const { results } = await db.prepare(
    `SELECT * FROM threads ORDER BY CASE WHEN scoring_status = 'scored' THEN 0 ELSE 1 END, ${orderBy} LIMIT ? OFFSET ?`
  ).bind(opts.limit, opts.offset).all<ThreadRecord>();
  return results ?? [];
}

export async function listPendingScoring(db: D1Database, limit: number): Promise<ThreadRecord[]> {
  const { results } = await db.prepare(
    `SELECT * FROM threads WHERE scoring_status = 'pending_scoring' ORDER BY created_at ASC LIMIT ?`
  ).bind(limit).all<ThreadRecord>();
  return results ?? [];
}
```

```ts
// web/src/server/repo/comments.ts
import type { CommentRecord } from '../../shared/types';

export async function insertComments(db: D1Database, comments: CommentRecord[]): Promise<void> {
  const stmt = db.prepare(
    `INSERT INTO comments (id, thread_id, external_id, author_username, author_name, text, like_count, posted_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (let i = 0; i < comments.length; i += 50) {
    const batch = comments.slice(i, i + 50);
    const prepared = batch.map(c => stmt.bind(c.id, c.thread_id, c.external_id, c.author_username,
      c.author_name, c.text, c.like_count, c.posted_at, c.created_at));
    await db.batch(prepared);
  }
}

export async function getCommentsByThread(db: D1Database, threadId: string): Promise<CommentRecord[]> {
  const { results } = await db.prepare(
    'SELECT * FROM comments WHERE thread_id = ? ORDER BY created_at ASC'
  ).bind(threadId).all<CommentRecord>();
  return results ?? [];
}

export async function deleteCommentsByThread(db: D1Database, threadId: string): Promise<void> {
  await db.prepare('DELETE FROM comments WHERE thread_id = ?').bind(threadId).run();
}

export async function countCommentsByThread(db: D1Database, threadId: string): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) as n FROM comments WHERE thread_id = ?').bind(threadId).first<{ n: number }>();
  return row?.n ?? 0;
}
```

```ts
// web/src/server/repo/requests.ts
import type { RequestRecord, RequestStatus } from '../../shared/types';

export async function insertRequest(db: D1Database, r: RequestRecord): Promise<void> {
  await db.prepare(
    `INSERT INTO requests (id, url, status, requested_by, error_message, thread_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(r.id, r.url, r.status, r.requested_by, r.error_message, r.thread_id, r.created_at, r.updated_at).run();
}

export async function getPendingRequestByUrl(db: D1Database, url: string): Promise<RequestRecord | null> {
  const row = await db.prepare(
    "SELECT * FROM requests WHERE url = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
  ).bind(url).first<RequestRecord>();
  return row ?? null;
}

export async function listPendingRequests(db: D1Database): Promise<RequestRecord[]> {
  const { results } = await db.prepare(
    "SELECT * FROM requests WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100"
  ).all<RequestRecord>();
  return results ?? [];
}

export async function updateRequestStatus(db: D1Database, id: string, status: RequestStatus, opts?: { threadId?: string; errorMessage?: string }): Promise<void> {
  await db.prepare(
    `UPDATE requests SET status = ?, thread_id = COALESCE(?, thread_id), error_message = COALESCE(?, error_message), updated_at = ? WHERE id = ?`
  ).bind(status, opts?.threadId ?? null, opts?.errorMessage ?? null, Math.floor(Date.now() / 1000), id).run();
}

export async function getRequestByUrl(db: D1Database, url: string): Promise<RequestRecord | null> {
  const row = await db.prepare(
    'SELECT * FROM requests WHERE url = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(url).first<RequestRecord>();
  return row ?? null;
}
```

```ts
// web/src/server/repo/scores.ts
import type { AiScoreRecord } from '../../shared/types';

export async function insertScores(db: D1Database, scores: AiScoreRecord[]): Promise<void> {
  const stmt = db.prepare(
    `INSERT INTO ai_scores (id, comment_id, score, label, reason, model, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const prepared = scores.map(s => stmt.bind(s.id, s.comment_id, s.score, s.label, s.reason, s.model, s.created_at));
  await db.batch(prepared);
}

export async function getScoresForThread(db: D1Database, threadId: string): Promise<AiScoreRecord[]> {
  const { results } = await db.prepare(
    `SELECT s.* FROM ai_scores s JOIN comments c ON c.id = s.comment_id WHERE c.thread_id = ? ORDER BY s.score DESC`
  ).bind(threadId).all<AiScoreRecord>();
  return results ?? [];
}

export async function hasScoresForComment(db: D1Database, commentId: string): Promise<boolean> {
  const row = await db.prepare('SELECT COUNT(*) as n FROM ai_scores WHERE comment_id = ?').bind(commentId).first<{ n: number }>();
  return (row?.n ?? 0) > 0;
}
```

```ts
// web/src/server/repo/votes.ts
import type { VoteRecord } from '../../shared/types';

export async function insertVote(db: D1Database, v: VoteRecord): Promise<void> {
  await db.prepare(
    `INSERT INTO votes (id, comment_id, user_id, vote, created_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(v.id, v.comment_id, v.user_id, v.vote, v.created_at).run();
}

export async function getVoteCounts(db: D1Database, commentId: string): Promise<{ correct: number; incorrect: number }> {
  const rows = await db.prepare(
    'SELECT vote, COUNT(*) as n FROM votes WHERE comment_id = ? GROUP BY vote'
  ).bind(commentId).all<{ vote: string; n: number }>();
  const counts = { correct: 0, incorrect: 0 };
  for (const r of rows.results ?? []) {
    if (r.vote === 'correct') counts.correct = r.n;
    else if (r.vote === 'incorrect') counts.incorrect = r.n;
  }
  return counts;
}
```

```ts
// web/src/server/repo/userComments.ts
import type { UserCommentRecord } from '../../shared/types';

export async function insertUserComment(db: D1Database, c: UserCommentRecord): Promise<void> {
  await db.prepare(
    `INSERT INTO user_comments (id, thread_id, user_id, display_name, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(c.id, c.thread_id, c.user_id, c.display_name, c.content, c.created_at).run();
}

export async function listUserCommentsByThread(db: D1Database, threadId: string): Promise<UserCommentRecord[]> {
  const { results } = await db.prepare(
    'SELECT * FROM user_comments WHERE thread_id = ? ORDER BY created_at ASC'
  ).bind(threadId).all<UserCommentRecord>();
  return results ?? [];
}
```

`web/vitest.integration.config.ts`:

```ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        miniflare: {
          bindings: { ADMIN_SECRET_KEY: 'test-secret' },
          d1Databases: { DB: 'threadscore-test' },
          compatibilityDate: '2024-08-01',
        },
      },
    },
    include: ['tests/integration/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Apply migration vào D1 test + chạy integration test**

Lưu ý: với `@cloudflare/vitest-pool-workers`, dùng `applyD1Migrations` trong `vitest.integration.config.ts`:

```ts
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        miniflare: {
          bindings: { ADMIN_SECRET_KEY: 'test-secret' },
          d1Databases: { DB: 'threadscore-test' },
          compatibilityDate: '2024-08-01',
        },
        wrangler: { configPath: './wrangler.toml' },
      },
    },
    // Apply migrations before tests
    setupFiles: ['tests/integration/setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
  },
});
```

`web/tests/integration/setup.ts`:

```ts
import { applyD1Migrations, env } from 'cloudflare:test';

beforeAll(async () => {
  await applyD1Migrations(env.DB, env, 'migrations');
});
```

Run: `cd web && npm install && npx vitest run --config vitest.integration.config.ts`
Expected: PASS — cả 3 describe xanh.

- [ ] **Step 6: Commit**

```bash
git add web/migrations web/src/server/db.ts web/src/server/repo web/tests web/vitest.integration.config.ts
git commit -m "feat(web): D1 migration + db helper + data repos"
```

---

### Task 3: Services — lexicon scorer, AI scoring, rate limit, admin key

**Files:**
- Create: `web/src/server/services/lexiconScorer.ts`, `web/src/server/services/aiScoring.ts`, `web/src/server/services/rateLimit.ts`, `web/src/server/services/adminKey.ts`
- Test: `web/src/server/services/__tests__/lexiconScorer.test.ts`, `web/src/server/services/__tests__/aiScoring.test.ts` (mock `openai` client)

**Interfaces:**
- Consumes: `schemas.ts` (`aiOutputSchema`), `constants.ts` (`MAX_AI_BATCH`, `MAX_RETRIES`, `VOTE_RATE_LIMIT`, `COMMENT_RATE_LIMIT`), `labels.ts` (`labelFromScore`), `db.ts` (`Env`).
- Produces (importService, scoringWorker, API handlers dùng):
  - `lexiconScorer.ts`: `export function lexiconScore(text: string): { score: number; label: Label; reason: string }`.
  - `aiScoring.ts`: `export interface ScoreResult { score: number; label: Label; reason: string; model: string }`; `export async function scoreCommentsWithAI(env: Env, items: { id: string; text: string; context: string }[]): Promise<ScoreResult[]>` — trả kết quả theo thứ tự input, fallback lexicon khi fail 5 lần retry.
  - `rateLimit.ts`: `export async function checkRateLimit(env: Env, key: string, limit: { windowSec: number; max: number }): Promise<{ allowed: boolean; remaining: number }>`.
  - `adminKey.ts`: `export function isAdminAuthorized(request: Request, env: Env): boolean` — so khớp header `X-Admin-Key` với `env.ADMIN_SECRET_KEY`.

- [ ] **Step 1: Viết test đỏ cho lexicon scorer**

`web/src/server/services/__tests__/lexiconScorer.test.ts`:

```ts
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
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd web && npx vitest run src/server/services/__tests__/lexiconScorer.test.ts`
Expected: FAIL — "Cannot find module '../lexiconScorer'"

- [ ] **Step 3: Implement `lexiconScorer.ts`**

```ts
import { labelFromScore } from '../../shared/labels';
import type { Label } from '../../shared/types';

const ANGRY_VI = ['ghét', 'căm thù', 'cút', 'ngu', 'ngu xuẩn', 'điên', 'điên tiết', 'bực', 'tức', 'tức giận', 'chửi', 'vô học', 'rác rưởi', 'khốn', 'dốt', 'đồ ngu', 'bực mình', 'phát điên', 'khinh', 'bẩn', 'thối'];
const ANGRY_EN = ['hate', 'stupid', 'idiot', 'fuck', 'shit', 'angry', 'mad', 'furious', 'ridiculous', 'awful', 'terrible', 'disgusting', 'pathetic', 'moron', 'dumb', 'suck'];
const POS_VI = ['yêu', 'thích', 'tuyệt', 'tuyệt vời', 'vui', 'hạnh phúc', 'cảm ơn', 'cười', 'dễ thương', 'xinh', 'đẹp', 'giỏi', 'xuất sắc', 'hài', 'buồn cười', 'mê', 'phê'];
const POS_EN = ['love', 'like', 'great', 'awesome', 'amazing', 'happy', 'thank', 'thanks', 'nice', 'beautiful', 'excellent', 'funny', 'cool', 'best', 'wonderful', 'enjoy'];

function countHits(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const w of words) {
    // match as whole word when word has >= 3 chars and is ascii, else substring
    const re = /^[a-z0-9 ]+$/.test(w)
      ? new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`, 'i')
      : new RegExp(w, 'i');
    if (re.test(lower)) hits++;
  }
  return hits;
}

export function lexiconScore(text: string): { score: number; label: Label; reason: string } {
  const trimmed = text.trim();
  if (!trimmed) return { score: 50, label: 'TRUNG LẬP', reason: 'Không có nội dung để đánh giá' };

  const angry = countHits(trimmed, [...ANGRY_VI, ...ANGRY_EN]);
  const pos = countHits(trimmed, [...POS_VI, ...POS_EN]);

  let score: number;
  if (angry === 0 && pos === 0) score = 50;
  else score = Math.round(50 + Math.min(50, angry * 18) - Math.min(50, pos * 18));
  score = Math.max(0, Math.min(100, score));

  const label = labelFromScore(score);
  const reason = angry > 0 && pos > 0
    ? `Phát hiện ${angry} từ tức giận và ${pos} từ tích cực`
    : angry > 0
      ? `Phát hiện ${angry} từ ngữ tức giận`
      : pos > 0
        ? `Phát hiện ${pos} từ ngữ tích cực`
        : 'Không phát hiện từ ngữ cảm xúc mạnh';
  return { score, label, reason };
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd web && npx vitest run src/server/services/__tests__/lexiconScorer.test.ts`
Expected: PASS

- [ ] **Step 5: Viết test đỏ cho aiScoring (mock openai)**

`web/src/server/services/__tests__/aiScoring.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../db';
import { scoreCommentsWithAI } from '../aiScoring';

const mockCreate = vi.fn();
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } };
  },
}));

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    KV: {} as KVNamespace,
    ADMIN_SECRET_KEY: 'x',
    AI_BASE_URL: 'https://example.com/v1',
    AI_API_KEY: 'sk-test',
    AI_MODEL: 'test-model',
    ...overrides,
  };
}

describe('scoreCommentsWithAI', () => {
  beforeEach(() => mockCreate.mockReset());

  it('parses valid JSON output in order', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            results: [
              { score: 85, label: 'BÙNG NỔ', reason: 'Giận dữ rõ ràng' },
              { score: 10, label: 'VUI VẺ', reason: 'Tích cực' },
            ],
          }),
        },
      }],
    });
    const results = await scoreCommentsWithAI(makeEnv(), [
      { id: 'c1', text: 'Tôi ghét điều này', context: 'Chủ đề: giá xăng' },
      { id: 'c2', text: 'Tuyệt vời quá', context: 'Chủ đề: giá xăng' },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ score: 85, label: 'BÙNG NỔ', model: 'test-model' });
    expect(results[1]).toMatchObject({ score: 10, label: 'VUI VẺ', model: 'test-model' });
  });

  it('falls back to lexicon after retries exhausted', async () => {
    mockCreate.mockRejectedValue(new Error('network down'));
    const results = await scoreCommentsWithAI(makeEnv(), [
      { id: 'c1', text: 'đồ ngu xuẩn', context: '' },
    ]);
    expect(mockCreate).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].model).toBe('lexicon-fallback');
  });

  it('falls back to lexicon when AI key is missing', async () => {
    const results = await scoreCommentsWithAI(makeEnv({ AI_API_KEY: undefined }), [
      { id: 'c1', text: 'rất vui vẻ', context: '' },
    ]);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(results[0].model).toBe('lexicon-fallback');
  });
});
```

- [ ] **Step 6: Chạy test, xác nhận fail**

Run: `cd web && npx vitest run src/server/services/__tests__/aiScoring.test.ts`
Expected: FAIL — "Cannot find module '../aiScoring'"

- [ ] **Step 7: Implement `aiScoring.ts` + `rateLimit.ts` + `adminKey.ts`**

```ts
// web/src/server/services/aiScoring.ts
import OpenAI from 'openai';
import { MAX_AI_BATCH, MAX_RETRIES } from '../../shared/constants';
import { aiBatchSchema } from '../../shared/schemas';
import type { Label } from '../../shared/types';
import type { Env } from '../db';
import { lexiconScore } from './lexiconScorer';

export interface ScoreResult {
  score: number;
  label: Label;
  reason: string;
  model: string;
}

const SYSTEM_PROMPT = `Bạn là hệ thống phân tích cảm xúc cho comments trên mạng xã hội.
Nhiệm vụ: đánh giá MỨC ĐỘ TỨC GIẬN của mỗi comment, thang 0-100 (0 = vui vẻ nhất, 100 = tức giận nhất).
Phân loại: 70-100 => "BÙNG NỔ", 30-69 => "TRUNG LẬP", 0-29 => "VUI VẺ".
Trả về JSON object duy nhất với key "results" là mảng theo ĐÚNG thứ tự input:
{ "results": [ { "score": number, "label": "BÙNG NỔ"|"TRUNG LẬP"|"VUI VẺ", "reason": "1 câu giải thích ngắn" } ] }`;

function parseAiOutput(content: string, count: number): { score: number; label: Label; reason: string }[] {
  const parsed = JSON.parse(content);
  const batch = aiBatchSchema.parse(parsed.results);
  if (batch.length !== count) throw new Error(`AI trả về ${batch.length} kết quả, cần ${count}`);
  return batch;
}

async function callAIWithRetry(client: OpenAI, model: string, items: { text: string; context: string }[]): Promise<{ score: number; label: Label; reason: string }[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resp = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(items.map((it, i) => ({ index: i, comment: it.text, context: it.context }))) },
        ],
        temperature: 0,
      });
      const content = resp.choices[0]?.message?.content;
      if (!content) throw new Error('AI trả về rỗng');
      return parseAiOutput(content, items.length);
    } catch (e) {
      lastError = e;
      const delay = Math.min(60000, 1000 * 2 ** attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI failed');
}

export async function scoreCommentsWithAI(env: Env, items: { id: string; text: string; context: string }[]): Promise<ScoreResult[]> {
  const model = env.AI_MODEL ?? 'gemini-2.5-flash';
  const results: (ScoreResult | null)[] = new Array(items.length).fill(null);

  const doLexiconFallback = () => {
    items.forEach((it, i) => {
      if (results[i]) return;
      const lx = lexiconScore(it.text);
      results[i] = { ...lx, model: 'lexicon-fallback' };
    });
  };

  if (!env.AI_API_KEY) {
    doLexiconFallback();
    return results as ScoreResult[];
  }

  const client = new OpenAI({
    apiKey: env.AI_API_KEY,
    baseURL: env.AI_BASE_URL || undefined,
  });

  for (let start = 0; start < items.length; start += MAX_AI_BATCH) {
    const slice = items.slice(start, start + MAX_AI_BATCH);
    try {
      const scored = await callAIWithRetry(client, model, slice.map(s => ({ text: s.text, context: s.context })));
      scored.forEach((s, j) => { results[start + j] = { ...s, model }; });
    } catch {
      slice.forEach((_, j) => {
        const lx = lexiconScore(slice[j].text);
        results[start + j] = { ...lx, model: 'lexicon-fallback' };
      });
    }
  }

  return results as ScoreResult[];
}
```

```ts
// web/src/server/services/rateLimit.ts
import type { Env } from '../db';

export async function checkRateLimit(
  env: Env,
  key: string,
  limit: { windowSec: number; max: number },
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % limit.windowSec);
  const kvKey = `rl:${key}:${windowStart}`;
  const current = Number((await env.KV.get(kvKey)) ?? '0');
  const next = current + 1;
  await env.KV.put(kvKey, String(next), { expirationTtl: limit.windowSec * 2 });
  return { allowed: next <= limit.max, remaining: Math.max(0, limit.max - next) };
}
```

```ts
// web/src/server/services/adminKey.ts
import type { Env } from '../db';

export function isAdminAuthorized(request: Request, env: Env): boolean {
  const key = request.headers.get('X-Admin-Key');
  return !!key && key === env.ADMIN_SECRET_KEY;
}
```

- [ ] **Step 8: Chạy toàn bộ test services, xác nhận PASS**

Run: `cd web && npx vitest run src/server/services/__tests__/`
Expected: PASS — lexicon (4 tests) + aiScoring (3 tests).

- [ ] **Step 9: Commit**

```bash
git add web/src/server/services/
git commit -m "feat(web): lexicon scorer, AI scoring with retry + fallback, rate limit, admin key"
```

---

### Task 4: importService + scoringWorker

**Files:**
- Create: `web/src/server/services/importService.ts`, `web/src/server/services/scoringWorker.ts`
- Test: `web/tests/integration/importWorker.test.ts` (miniflare)

**Interfaces:**
- Consumes: repos từ Task 2, `scoreCommentsWithAI` + `ScoreResult` từ Task 3, `importPayloadSchema` từ Task 1, `constants.ts` (`MAX_WORKER_BATCHES`, `SCORING_LOCK_KEY`).
- Produces (API handlers dùng):
  - `importService.ts`: `export async function importThreadPayload(env: Env, rawPayload: unknown): Promise<{ threadId: string; isUpdate: boolean; commentCount: number }>` — parse bằng `importPayloadSchema`, idempotent theo URL: nếu thread tồn tại → delete comments cũ, insert mới, update thread; nếu chưa → tạo thread `pending_scoring`. Cập nhật request pending có URL khớp (đã dedup nên tối đa 1) → `fulfilled` + `thread_id`.
  - `scoringWorker.ts`: `export async function runScoringWorker(env: Env): Promise<{ processedThreads: number; scoredComments: number }>` — lấy KV lock `scoring-lock` (TTL 10 phút, không lấy được thì trả về 0/0 ngay), quét `pending_scoring` limit 5 thread, mỗi thread: chuyển `scoring` → lấy comments chưa score → `scoreCommentsWithAI` theo batch 25 (tối đa `MAX_WORKER_BATCHES` batch/thread) → insert scores → nếu hết comments chưa score: tính `avg_anger_score` + `score_breakdown` (JSON `{bang_no, trung_lap, vui_ve}`) → `scored`. Nếu còn dư: giữ `scoring` (lần chạy sau tiếp tục). Cuối cùng release lock.

- [ ] **Step 1: Viết test integration đỏ cho import + worker**

`web/tests/integration/importWorker.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { importThreadPayload } from '../../src/server/services/importService';
import type { ImportPayload } from '../../src/shared/types';
import { runScoringWorker } from '../../src/server/services/scoringWorker';
import { getThreadByUrl } from '../../src/server/repo/threads';
import { getCommentsByThread } from '../../src/server/repo/comments';
import { getScoresForThread } from '../../src/server/repo/scores';
import { getRequestByUrl } from '../../src/server/repo/requests';

const URL = 'https://www.threads.net/@test/post/IMPORT1';

function payload(comments: { external_id: string; text: string }[]): ImportPayload {
  return {
    url: URL,
    title: 'Chủ đề test',
    content: 'Nội dung',
    author_username: 'test',
    author_name: 'Test',
    posted_at: 1700000000,
    comments,
  };
}

describe('importThreadPayload', () => {
  it('creates thread as pending_scoring with comments', async () => {
    const r = await importThreadPayload(env as never, payload([
      { external_id: 'e1', text: 'đồ ngu' },
      { external_id: 'e2', text: 'rất vui' },
    ]));
    expect(r.isUpdate).toBe(false);
    expect(r.commentCount).toBe(2);
    const t = await getThreadByUrl(env.DB, URL);
    expect(t?.scoring_status).toBe('pending_scoring');
    expect(await getCommentsByThread(env.DB, t!.id)).toHaveLength(2);
  });

  it('re-import same URL replaces comments without duplicating thread', async () => {
    await importThreadPayload(env as never, payload([
      { external_id: 'e1', text: 'đồ ngu' },
      { external_id: 'e2', text: 'rất vui' },
    ]));
    const r2 = await importThreadPayload(env as never, payload([
      { external_id: 'e3', text: 'comment mới duy nhất' },
    ]));
    expect(r2.isUpdate).toBe(true);
    expect(r2.commentCount).toBe(1);
    const t = await getThreadByUrl(env.DB, URL);
    const all = await getCommentsByThread(env.DB, t!.id);
    expect(all).toHaveLength(1);
    expect(all[0].external_id).toBe('e3');
  });

  it('fulfills matching pending request', async () => {
    await importThreadPayload(env as never, payload([{ external_id: 'e9', text: 'x' }]));
    const req = await getRequestByUrl(env.DB, URL);
    expect(req?.status).toBe('fulfilled');
    expect(req?.thread_id).toBeTruthy();
  });
});

describe('runScoringWorker', () => {
  it('scores all comments (lexicon fallback without AI key) and marks scored', async () => {
    const { threadId } = await importThreadPayload(env as never, payload([
      { external_id: 'e1', text: 'đồ ngu xuẩn cút đi' },
      { external_id: 'e2', text: 'tuyệt vời quá' },
    ]));
    const out = await runScoringWorker(env as never);
    expect(out.scoredComments).toBe(2);
    const t = await getThreadByUrl(env.DB, URL);
    expect(t?.scoring_status).toBe('scored');
    expect(t?.avg_anger_score).toBeTypeOf('number');
    expect(JSON.parse(t!.score_breakdown!)).toHaveProperty('bang_no');
    const scores = await getScoresForThread(env.DB, threadId);
    expect(scores).toHaveLength(2);
    expect(scores[0].model).toBe('lexicon-fallback');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd web && npx vitest run --config vitest.integration.config.ts`
Expected: FAIL — "Cannot find module '../../src/server/services/importService'"

- [ ] **Step 3: Implement `importService.ts`**

```ts
// web/src/server/services/importService.ts
import { nowSec, newId } from '../db';
import type { Env } from '../db';
import { importPayloadSchema } from '../../shared/schemas';
import type { ImportPayload } from '../../shared/types';
import { normalizeThreadsUrl } from '../../shared/threadUrl';
import { insertThread, getThreadByUrl, updateThread } from '../repo/threads';
import { insertComments, deleteCommentsByThread } from '../repo/comments';
import { getPendingRequestByUrl, updateRequestStatus } from '../repo/requests';

export interface ImportResult {
  threadId: string;
  isUpdate: boolean;
  commentCount: number;
}

export async function importThreadPayload(env: Env, rawPayload: unknown): Promise<ImportResult> {
  const payload = importPayloadSchema.parse(rawPayload);
  const url = normalizeThreadsUrl(payload.url);
  const now = nowSec();

  const existing = await getThreadByUrl(env.DB, url);
  const threadId = existing?.id ?? newId();

  if (existing) {
    await deleteCommentsByThread(env.DB, existing.id);
    await updateThread(env.DB, existing.id, {
      title: payload.title ?? existing.title,
      content: payload.content ?? existing.content,
      author_username: payload.author_username ?? existing.author_username,
      author_name: payload.author_name ?? existing.author_name,
      posted_at: payload.posted_at ?? existing.posted_at,
      total_comments: payload.comments.length,
      scoring_status: 'pending_scoring',
      avg_anger_score: null,
      score_breakdown: null,
    });
  } else {
    await insertThread(env.DB, {
      id: threadId,
      url,
      title: payload.title ?? null,
      content: payload.content ?? null,
      author_username: payload.author_username ?? null,
      author_name: payload.author_name ?? null,
      posted_at: payload.posted_at ?? null,
      total_comments: payload.comments.length,
      scoring_status: 'pending_scoring',
      avg_anger_score: null,
      score_breakdown: null,
      created_at: now,
    });
  }

  if (payload.comments.length > 0) {
    await insertComments(env.DB, payload.comments.map(c => ({
      id: newId(),
      thread_id: threadId,
      external_id: c.external_id ?? null,
      author_username: c.author_username ?? null,
      author_name: c.author_name ?? null,
      text: c.text,
      like_count: c.like_count ?? 0,
      posted_at: c.posted_at ?? null,
      created_at: now,
    })));
  }

  const pending = await getPendingRequestByUrl(env.DB, url);
  if (pending) {
    await updateRequestStatus(env.DB, pending.id, 'fulfilled', { threadId });
  }

  return { threadId, isUpdate: !!existing, commentCount: payload.comments.length };
}
```

- [ ] **Step 4: Implement `scoringWorker.ts`**

```ts
// web/src/server/services/scoringWorker.ts
import { MAX_AI_BATCH, MAX_WORKER_BATCHES, SCORING_LOCK_KEY } from '../../shared/constants';
import { labelFromScore } from '../../shared/labels';
import { nowSec, newId } from '../db';
import type { Env } from '../db';
import { listPendingScoring, updateThread } from '../repo/threads';
import { getCommentsByThread } from '../repo/comments';
import { hasScoresForComment, insertScores } from '../repo/scores';
import { scoreCommentsWithAI } from './aiScoring';

export interface ScoringWorkerResult {
  processedThreads: number;
  scoredComments: number;
}

export async function runScoringWorker(env: Env): Promise<ScoringWorkerResult> {
  // KV lock: conditional write — chỉ lấy được lock khi key chưa tồn tại.
  const acquired = await env.KV.put(SCORING_LOCK_KEY, String(nowSec()), { onlyIf: 'no_exists', expirationTtl: 600 });
  if (acquired === null) return { processedThreads: 0, scoredComments: 0 };

  try {
    const threads = await listPendingScoring(env.DB, 5);
    let scoredComments = 0;

    for (const thread of threads) {
      await updateThread(env.DB, thread.id, { scoring_status: 'scoring' });

      const allComments = await getCommentsByThread(env.DB, thread.id);
      const pendingComments: typeof allComments = [];
      for (const c of allComments) {
        if (!(await hasScoresForComment(env.DB, c.id))) pendingComments.push(c);
      }

      const context = `${thread.title ?? ''}\n${thread.content ?? ''}`.trim();
      let batchCount = 0;
      for (let start = 0; start < pendingComments.length && batchCount < MAX_WORKER_BATCHES; start += MAX_AI_BATCH, batchCount++) {
        const slice = pendingComments.slice(start, start + MAX_AI_BATCH);
        const results = await scoreCommentsWithAI(env, slice.map(c => ({ id: c.id, text: c.text, context })));
        await insertScores(env.DB, results.map((r, j) => ({
          id: newId(),
          comment_id: slice[j].id,
          score: r.score,
          label: r.label,
          reason: r.reason,
          model: r.model,
          created_at: nowSec(),
        })));
        scoredComments += slice.length;
      }

      const allDone = pendingComments.length <= batchCount * MAX_AI_BATCH;
      if (allDone) {
        const { results } = await env.DB.prepare(
          'SELECT score, label FROM ai_scores WHERE comment_id IN (SELECT id FROM comments WHERE thread_id = ?)'
        ).bind(thread.id).all<{ score: number; label: string }>();
        const rows = results ?? [];
        const avg = rows.length > 0 ? rows.reduce((s, r) => s + r.score, 0) / rows.length : null;
        const breakdown = { bang_no: 0, trung_lap: 0, vui_ve: 0 };
        for (const r of rows) {
          const lbl = labelFromScore(r.score);
          if (lbl === 'BÙNG NỔ') breakdown.bang_no++;
          else if (lbl === 'TRUNG LẬP') breakdown.trung_lap++;
          else breakdown.vui_ve++;
        }
        await updateThread(env.DB, thread.id, {
          scoring_status: 'scored',
          avg_anger_score: avg,
          score_breakdown: JSON.stringify(breakdown),
        });
      }
      // else: giữ 'scoring', lần chạy sau xử lý tiếp
    }

    return { processedThreads: threads.length, scoredComments };
  } finally {
    await env.KV.delete(SCORING_LOCK_KEY);
  }
}
```

- [ ] **Step 5: Chạy integration test, xác nhận PASS**

Run: `cd web && npx vitest run --config vitest.integration.config.ts`
Expected: PASS — import (3 tests) + worker (1 test).

- [ ] **Step 6: Commit**

```bash
git add web/src/server/services/importService.ts web/src/server/services/scoringWorker.ts web/tests/integration/importWorker.test.ts
git commit -m "feat(web): import service (idempotent) + scoring worker with KV lock"
```

---

### Task 5: API endpoints — public (threads, search, requests, votes, comments)

**Files:**
- Create: `web/functions/_middleware.ts`, `web/functions/api/threads/index.ts`, `web/functions/api/threads/[id].ts`, `web/functions/api/search.ts`, `web/functions/api/requests.ts`, `web/functions/api/votes.ts`, `web/functions/api/comments.ts`
- Test: `web/tests/integration/api.test.ts` (miniflare + actual Pages Functions via `SELF` fetch)

**Interfaces:**
- Consumes: repos (Task 2), `checkRateLimit` (Task 3), `runScoringWorker` + `importThreadPayload` (Task 4), schemas + `normalizeThreadsUrl` + `isThreadsUrl` (Task 1).
- Produces (frontend gọi):
  - `GET /api/threads?sort=newest|hottest|most_comments&limit=20&offset=0` → `{ threads: ThreadRecord[] }` (chỉ scored + thread đang xử lý nằm cuối — thực hiện bằng union 2 query: scored theo sort + pending theo created_at).
  - `GET /api/threads/:id` → `{ thread, comments: (CommentRecord & { score: AiScoreRecord | null })[], breakdown, user_comments: UserCommentRecord[], vote_counts }`.
  - `GET /api/search?q=` → nếu q là Threads URL: `{ kind: 'url', state: 'scored'|'pending'|'unknown', thread?, request? }`; ngược lại `{ kind: 'keyword', threads: ThreadRecord[] }`.
  - `POST /api/requests` body `{ url }` → `{ status: 'created'|'already_requested'|'already_exists', request? }`.
  - `POST /api/votes` body `{ comment_id, vote }` → `{ ok: true, counts }` hoặc 429.
  - `POST /api/comments` body `{ thread_id, display_name?, content }` → `{ ok: true }` hoặc 429.
  - Rate limit key: IP (`CF-Connecting-IP` header), vote 3/giờ, comment 1/10 phút. Khi có session user → bỏ qua rate limit (xem Task 7; ở task này luôn ẩn danh).

- [ ] **Step 1: Viết test integration đỏ cho API**

`web/tests/integration/api.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { importThreadPayload } from '../../src/server/services/importService';
import { runScoringWorker } from '../../src/server/services/scoringWorker';

const URL = 'https://www.threads.net/@api/post/APITEST';

describe('GET /api/threads', () => {
  it('returns scored threads list', async () => {
    await importThreadPayload(env as never, {
      url: URL, title: 'Chủ đề API', content: 'Nội dung', comments: [
        { external_id: 'e1', text: 'đồ ngu xuẩn' },
      ],
    });
    await runScoringWorker(env as never);

    const res = await SELF.fetch('https://example.com/api/threads?sort=newest&limit=20&offset=0');
    expect(res.status).toBe(200);
    const body = await res.json() as { threads: { url: string }[] };
    expect(body.threads.some(t => t.url === URL)).toBe(true);
  });
});

describe('POST /api/requests', () => {
  it('creates a request for valid new URL', async () => {
    const newUrl = 'https://www.threads.net/@api/post/APITEST2';
    const res = await SELF.fetch('https://example.com/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('created');
  });

  it('returns already_exists for imported URL', async () => {
    const res = await SELF.fetch('https://example.com/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: URL }),
    });
    const body = await res.json() as { status: string };
    expect(body.status).toBe('already_exists');
  });

  it('rejects invalid URL with 400', async () => {
    const res = await SELF.fetch('https://example.com/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://twitter.com/x/1' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/votes rate limit', () => {
  it('allows up to 3 votes per hour per IP then 429', async () => {
    const thread = await importThreadPayload(env as never, {
      url: 'https://www.threads.net/@api/post/APIVOTE', title: 'V', content: '', comments: [{ external_id: 'v1', text: 'bình thường' }],
    });
    await runScoringWorker(env as never);
    const { results } = await env.DB.prepare('SELECT id FROM comments WHERE thread_id = ?').bind(thread.threadId).all<{ id: string }>();
    const commentId = results[0].id;

    for (let i = 0; i < 3; i++) {
      const res = await SELF.fetch('https://example.com/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId, vote: 'correct' }),
      });
      expect(res.status).toBe(200);
    }
    const blocked = await SELF.fetch('https://example.com/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: commentId, vote: 'correct' }),
    });
    expect(blocked.status).toBe(429);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd web && npx vitest run --config vitest.integration.config.ts`
Expected: FAIL — SELF.fetch trả 404 (functions chưa tồn tại)

- [ ] **Step 3: Implement handlers**

```ts
// web/functions/_middleware.ts
// CORS + security headers cho toàn bộ API (extension gọi từ origin khác)
export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  const res = new Response(response.body, response);
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: res.headers });
  }
  return res;
};
```

```ts
// web/functions/api/threads/index.ts
import type { Env } from '../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const sort = (url.searchParams.get('sort') ?? 'newest') as 'newest' | 'hottest' | 'most_comments';
  const limit = Math.min(100, Number(url.searchParams.get('limit') ?? 20));
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0));

  const { listThreads } = await import('../../../src/server/repo/threads');
  const threads = await listThreads(context.env.DB, { sort, limit, offset });

  return Response.json({ threads });
};
```

```ts
// web/functions/api/threads/[id].ts
import type { Env } from '../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const { getThreadById } = await import('../../../src/server/repo/threads');
  const { getCommentsByThread } = await import('../../../src/server/repo/comments');
  const { getScoresForThread } = await import('../../../src/server/repo/scores');
  const { getVoteCounts } = await import('../../../src/server/repo/votes');
  const { listUserCommentsByThread } = await import('../../../src/server/repo/userComments');

  const thread = await getThreadById(context.env.DB, id);
  if (!thread) return Response.json({ error: 'Không tìm thấy bài viết' }, { status: 404 });

  const [comments, scores, userComments] = await Promise.all([
    getCommentsByThread(context.env.DB, id),
    getScoresForThread(context.env.DB, id),
    listUserCommentsByThread(context.env.DB, id),
  ]);

  const scoreMap = new Map(scores.map(s => [s.comment_id, s]));
  const commentsWithScores = comments.map(c => ({ ...c, score: scoreMap.get(c.id) ?? null }));

  const voteCounts: Record<string, { correct: number; incorrect: number }> = {};
  for (const c of comments) voteCounts[c.id] = await getVoteCounts(context.env.DB, c.id);

  const breakdown = thread.score_breakdown ? JSON.parse(thread.score_breakdown) : null;

  return Response.json({ thread, comments: commentsWithScores, breakdown, user_comments: userComments, vote_counts: voteCounts });
};
```

```ts
// web/functions/api/search.ts
import type { Env } from '../../src/server/db';
import { isThreadsUrl, normalizeThreadsUrl } from '../../src/shared/threadUrl';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const q = (new URL(context.request.url).searchParams.get('q') ?? '').trim();
  if (!q) return Response.json({ kind: 'keyword', threads: [] });

  if (isThreadsUrl(q)) {
    const url = normalizeThreadsUrl(q);
    const { getThreadByUrl } = await import('../../src/server/repo/threads');
    const { getRequestByUrl } = await import('../../src/server/repo/requests');

    const thread = await getThreadByUrl(context.env.DB, url);
    if (thread) {
      const state = thread.scoring_status === 'scored' ? 'scored' : 'pending';
      return Response.json({ kind: 'url', state, thread });
    }
    const request = await getRequestByUrl(context.env.DB, url);
    if (request && request.status === 'pending') {
      return Response.json({ kind: 'url', state: 'pending', request });
    }
    return Response.json({ kind: 'url', state: 'unknown' });
  }

  const { results } = await context.env.DB.prepare(
    `SELECT DISTINCT t.* FROM threads t
     WHERE t.scoring_status = 'scored'
       AND (t.title LIKE ? OR t.content LIKE ?
            OR EXISTS (SELECT 1 FROM comments c WHERE c.thread_id = t.id AND c.text LIKE ?))
     ORDER BY t.created_at DESC LIMIT 50`
  ).bind(`%${q}%`, `%${q}%`, `%${q}%`).all();

  return Response.json({ kind: 'keyword', threads: results ?? [] });
};
```

```ts
// web/functions/api/requests.ts
import type { Env } from '../../src/server/db';
import { requestSchema } from '../../src/shared/schemas';
import { isThreadsUrl, normalizeThreadsUrl } from '../../src/shared/threadUrl';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success || !isThreadsUrl(parsed.data.url)) {
    return Response.json({ error: 'URL Threads không hợp lệ' }, { status: 400 });
  }
  const url = normalizeThreadsUrl(parsed.data.url);

  const { getThreadByUrl } = await import('../../src/server/repo/threads');
  const { getPendingRequestByUrl, insertRequest } = await import('../../src/server/repo/requests');
  const { newId, nowSec } = await import('../../src/server/db');

  const thread = await getThreadByUrl(context.env.DB, url);
  if (thread) return Response.json({ status: 'already_exists', thread_id: thread.id });

  const existing = await getPendingRequestByUrl(context.env.DB, url);
  if (existing) return Response.json({ status: 'already_requested', request: existing });

  const request = {
    id: newId(), url, status: 'pending' as const, requested_by: 'anonymous',
    error_message: null, thread_id: null, created_at: nowSec(), updated_at: nowSec(),
  };
  await insertRequest(context.env.DB, request);
  return Response.json({ status: 'created', request });
};
```

```ts
// web/functions/api/votes.ts
import type { Env } from '../../src/server/db';
import { voteSchema } from '../../src/shared/schemas';
import { VOTE_RATE_LIMIT } from '../../src/shared/constants';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const ip = context.request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { checkRateLimit } = await import('../../src/server/services/rateLimit');
  const rl = await checkRateLimit(context.env, `vote:${ip}`, VOTE_RATE_LIMIT);
  if (!rl.allowed) {
    return Response.json({ error: 'Bạn đã vote quá số lần cho phép (3 lần/giờ). Vui lòng thử lại sau.' }, { status: 429 });
  }

  const body = await context.request.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });

  const { insertVote, getVoteCounts } = await import('../../src/server/repo/votes');
  const { newId, nowSec } = await import('../../src/server/db');

  await insertVote(context.env.DB, {
    id: newId(), comment_id: parsed.data.comment_id, user_id: null,
    vote: parsed.data.vote, created_at: nowSec(),
  });
  const counts = await getVoteCounts(context.env.DB, parsed.data.comment_id);
  return Response.json({ ok: true, counts });
};
```

```ts
// web/functions/api/comments.ts
import type { Env } from '../../src/server/db';
import { userCommentSchema } from '../../src/shared/schemas';
import { COMMENT_RATE_LIMIT } from '../../src/shared/constants';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const ip = context.request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { checkRateLimit } = await import('../../src/server/services/rateLimit');
  const rl = await checkRateLimit(context.env, `comment:${ip}`, COMMENT_RATE_LIMIT);
  if (!rl.allowed) {
    return Response.json({ error: 'Bạn comment quá nhanh. Vui lòng đợi 10 phút giữa các comment.' }, { status: 429 });
  }

  const body = await context.request.json().catch(() => null);
  const parsed = userCommentSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });

  const { insertUserComment } = await import('../../src/server/repo/userComments');
  const { newId, nowSec } = await import('../../src/server/db');

  await insertUserComment(context.env.DB, {
    id: newId(), thread_id: parsed.data.thread_id, user_id: null,
    display_name: parsed.data.display_name ?? null, content: parsed.data.content, created_at: nowSec(),
  });
  return Response.json({ ok: true });
};
```

- [ ] **Step 4: Chạy integration test, xác nhận PASS**

Run: `cd web && npx vitest run --config vitest.integration.config.ts`
Expected: PASS — tất cả describe (threads list, requests 3 cases, vote rate limit).

- [ ] **Step 5: Commit**

```bash
git add web/functions/_middleware.ts web/functions/api/threads web/functions/api/search.ts web/functions/api/requests.ts web/functions/api/votes.ts web/functions/api/comments.ts web/tests/integration/api.test.ts
git commit -m "feat(web): public API endpoints (threads, search, requests, votes, comments)"
```

---

### Task 6: API endpoints — admin (import, import-json, queue, worker)

**Files:**
- Create: `web/functions/api/admin/import.ts`, `web/functions/api/admin/import-json.ts`, `web/functions/api/queue/pending.ts`, `web/functions/api/admin/worker.ts`
- Test: `web/tests/integration/adminApi.test.ts`

**Interfaces:**
- Consumes: `isAdminAuthorized` (Task 3), `importThreadPayload` + `runScoringWorker` (Task 4), `listPendingRequests` (Task 2).
- Produces (extension + admin page gọi):
  - `POST /api/admin/import` body = ImportPayload JSON → `{ threadId, isUpdate, commentCount }`; thiếu/sai `X-Admin-Key` → 401 `{ error: 'Unauthorized' }`.
  - `POST /api/admin/import-json` — nhận cùng schema ImportPayload (JSON file upload); đơn giản hóa: nhận JSON body giống import, không dùng multipart.
  - `GET /api/queue/pending` → `{ requests: RequestRecord[] }` (chỉ status pending, limit 100).
  - `POST /api/admin/worker` → trigger `runScoringWorker` thủ công → `{ processedThreads, scoredComments }`.
  - Worker cũng được trigger tự động cuối `POST /api/admin/import` (await, best effort — lỗi worker không làm fail import).

- [ ] **Step 1: Viết test integration đỏ**

`web/tests/integration/adminApi.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

const ADMIN_HEADERS = { 'X-Admin-Key': 'test-secret', 'Content-Type': 'application/json' };
const IMPORT_URL = 'https://www.threads.net/@admin/post/ADMIN1';

describe('admin import', () => {
  it('rejects without admin key', async () => {
    const res = await SELF.fetch('https://example.com/api/admin/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: IMPORT_URL, comments: [] }),
    });
    expect(res.status).toBe(401);
  });

  it('imports payload with admin key', async () => {
    const res = await SELF.fetch('https://example.com/api/admin/import', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        url: IMPORT_URL, title: 'Admin test', content: 'Nội dung',
        comments: [{ external_id: 'a1', text: 'đồ ngu' }, { external_id: 'a2', text: 'vui quá' }],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { threadId: string; commentCount: number };
    expect(body.commentCount).toBe(2);
    expect(body.threadId).toBeTruthy();
  });
});

describe('queue pending', () => {
  it('requires admin key and lists pending requests', async () => {
    await SELF.fetch('https://example.com/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.threads.net/@admin/post/Q1' }),
    });
    const noKey = await SELF.fetch('https://example.com/api/queue/pending');
    expect(noKey.status).toBe(401);
    const ok = await SELF.fetch('https://example.com/api/queue/pending', { headers: ADMIN_HEADERS });
    expect(ok.status).toBe(200);
    const body = await ok.json() as { requests: { url: string }[] };
    expect(body.requests.some(r => r.url === 'https://www.threads.net/@admin/post/Q1')).toBe(true);
  });
});

describe('admin worker', () => {
  it('runs scoring worker manually', async () => {
    const res = await SELF.fetch('https://example.com/api/admin/worker', { method: 'POST', headers: ADMIN_HEADERS });
    expect(res.status).toBe(200);
    const body = await res.json() as { processedThreads: number; scoredComments: number };
    expect(body.processedThreads).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd web && npx vitest run --config vitest.integration.config.ts`
Expected: FAIL — 404 (endpoints chưa tồn tại)

- [ ] **Step 3: Implement handlers**

```ts
// web/functions/api/admin/import.ts
import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await context.request.json().catch(() => null);
  if (!body) return Response.json({ error: 'Invalid JSON' }, { status: 400 });

  const { importThreadPayload } = await import('../../../src/server/services/importService');
  try {
    const result = await importThreadPayload(context.env, body);
    // best-effort scoring kick
    const { runScoringWorker } = await import('../../../src/server/services/scoringWorker');
    await runScoringWorker(context.env).catch(() => null);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Import failed' }, { status: 400 });
  }
};
```

```ts
// web/functions/api/admin/import-json.ts
import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await context.request.json().catch(() => null);
  if (!body) return Response.json({ error: 'Invalid JSON' }, { status: 400 });

  const { importThreadPayload } = await import('../../../src/server/services/importService');
  try {
    const result = await importThreadPayload(context.env, body);
    const { runScoringWorker } = await import('../../../src/server/services/scoringWorker');
    await runScoringWorker(context.env).catch(() => null);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Import failed' }, { status: 400 });
  }
};
```

```ts
// web/functions/api/queue/pending.ts
import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { listPendingRequests } = await import('../../../src/server/repo/requests');
  const requests = await listPendingRequests(context.env.DB);
  return Response.json({ requests });
};
```

```ts
// web/functions/api/admin/worker.ts
import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { runScoringWorker } = await import('../../../src/server/services/scoringWorker');
  const result = await runScoringWorker(context.env);
  return Response.json(result);
};
```

- [ ] **Step 4: Chạy integration test, xác nhận PASS**

Run: `cd web && npx vitest run --config vitest.integration.config.ts`
Expected: PASS — admin import (2), queue (1), worker (1).

- [ ] **Step 5: Commit**

```bash
git add web/functions/api/admin web/functions/api/queue web/tests/integration/adminApi.test.ts
git commit -m "feat(web): admin API endpoints (import, import-json, queue, worker)"
```

---

### Task 7: Auth (Google/GitHub OAuth) + session + áp dụng cho rate limit

**Files:**
- Create: `web/src/server/services/session.ts`, `web/functions/api/auth/[provider]/callback.ts`, `web/functions/api/auth/[provider]/login.ts`, `web/functions/api/auth/logout.ts`, `web/functions/api/auth/me.ts`
- Modify: `web/functions/api/votes.ts` (skip rate limit khi có session), `web/functions/api/comments.ts` (skip rate limit khi có session)
- Test: `web/tests/integration/auth.test.ts`

**Interfaces:**
- Consumes: KV (`checkRateLimit` Task 3).
- Produces (frontend gọi):
  - `session.ts`: `export async function createSession(env: Env, provider: 'google'|'github', externalId: string, name: string): Promise<string>` (trả session token, lưu KV `session:<token>` TTL 30 ngày, giá trị JSON `{ provider, external_id, name }`); `export async function getSession(env: Env, request: Request): Promise<{ provider: string; external_id: string; name: string } | null>` (đọc cookie `ts_session`); `export async function destroySession(env: Env, token: string): Promise<void>`.
  - `GET /api/auth/google/login` → redirect `https://accounts.google.com/o/oauth2/v2/auth?...` (env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect về `/api/auth/google/callback`).
  - `GET /api/auth/github/login` → redirect `https://github.com/login/oauth/authorize?...`.
  - `GET /api/auth/google/callback` → đổi code lấy token + userinfo → tạo session → set cookie `ts_session` (HttpOnly, SameSite=Lax, Path=/, Max-Age 30 ngày) → redirect `/`.
  - `GET /api/auth/github/callback` → tương tự với `https://api.github.com/user`.
  - `POST /api/auth/logout` → xóa cookie + xóa session KV.
  - `GET /api/auth/me` → `{ user: { provider, name } | null }`.
  - Votes/comments: khi `getSession()` trả user → không áp rate limit, lưu `user_id = <provider>:<external_id>`.

- [ ] **Step 1: Viết test integration đỏ cho session util + me/logout**

`web/tests/integration/auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { createSession, getSession, destroySession } from '../../src/server/services/session';

describe('session service', () => {
  it('creates, reads, destroys session', async () => {
    const token = await createSession(env as never, 'github', 'u-123', 'Test User');
    expect(token).toBeTruthy();
    const req = new Request('https://example.com/', { headers: { Cookie: `ts_session=${token}` } });
    const s = await getSession(env as never, req);
    expect(s?.external_id).toBe('u-123');
    await destroySession(env as never, token);
    const s2 = await getSession(env as never, req);
    expect(s2).toBeNull();
  });
});

describe('GET /api/auth/me', () => {
  it('returns null without session', async () => {
    const res = await SELF.fetch('https://example.com/api/auth/me');
    const body = await res.json() as { user: unknown };
    expect(body.user).toBeNull();
  });
});

describe('POST /api/auth/logout', () => {
  it('clears cookie', async () => {
    const res = await SELF.fetch('https://example.com/api/auth/logout', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toContain('ts_session=;');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd web && npx vitest run --config vitest.integration.config.ts`
Expected: FAIL — "Cannot find module '../../src/server/services/session'"

- [ ] **Step 3: Implement `session.ts` + auth handlers**

```ts
// web/src/server/services/session.ts
import type { Env } from '../db';

export interface SessionUser {
  provider: 'google' | 'github';
  external_id: string;
  name: string;
}

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 ngày
const COOKIE_NAME = 'ts_session';

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function createSession(env: Env, provider: SessionUser['provider'], externalId: string, name: string): Promise<string> {
  const token = randomToken();
  await env.KV.put(`session:${token}`, JSON.stringify({ provider, external_id: externalId, name }), { expirationTtl: SESSION_TTL });
  return token;
}

export async function getSession(env: Env, request: Request): Promise<SessionUser | null> {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const m = cookie.match(/(?:^|;\s*)ts_session=([^;]+)/);
  if (!m) return null;
  const raw = await env.KV.get(`session:${m[1]}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function destroySession(env: Env, token: string): Promise<void> {
  await env.KV.delete(`session:${token}`);
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_TTL;
```

```ts
// web/functions/api/auth/google/login.ts
import type { Env } from '../../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = (context.env as Record<string, string>).GOOGLE_CLIENT_ID;
  if (!clientId) return Response.json({ error: 'Chưa cấu hình GOOGLE_CLIENT_ID' }, { status: 500 });
  const redirectUri = new URL('/api/auth/google/callback', context.request.url).toString();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
};
```

```ts
// web/functions/api/auth/github/login.ts
import type { Env } from '../../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = (context.env as Record<string, string>).GITHUB_CLIENT_ID;
  if (!clientId) return Response.json({ error: 'Chưa cấu hình GITHUB_CLIENT_ID' }, { status: 500 });
  const redirectUri = new URL('/api/auth/github/callback', context.request.url).toString();
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: 'read:user' });
  return Response.redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
};
```

```ts
// web/functions/api/auth/google/callback.ts
import type { Env } from '../../../../src/server/db';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '../../../../src/server/services/session';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error || !code) return Response.redirect('/', 302);

  const envRecord = context.env as unknown as Record<string, string>;
  const clientId = envRecord.GOOGLE_CLIENT_ID;
  const clientSecret = envRecord.GOOGLE_CLIENT_SECRET;
  const redirectUri = new URL('/api/auth/google/callback', context.request.url).toString();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) return Response.redirect('/', 302);

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = await userRes.json() as { id?: string; name?: string };
  if (!user.id) return Response.redirect('/', 302);

  const token = await createSession(context.env, 'google', user.id, user.name ?? 'Google User');
  const res = Response.redirect('/', 302);
  res.headers.append('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`);
  return res;
};
```

```ts
// web/functions/api/auth/github/callback.ts
import type { Env } from '../../../../src/server/db';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '../../../../src/server/services/session';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  if (!code) return Response.redirect('/', 302);

  const envRecord = context.env as unknown as Record<string, string>;
  const redirectUri = new URL('/api/auth/github/callback', context.request.url).toString();

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: envRecord.GITHUB_CLIENT_ID, client_secret: envRecord.GITHUB_CLIENT_SECRET, code, redirect_uri: redirectUri }),
  });
  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) return Response.redirect('/', 302);

  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'threadscore' },
  });
  const user = await userRes.json() as { id?: number; name?: string; login?: string };
  if (!user.id) return Response.redirect('/', 302);

  const token = await createSession(context.env, 'github', String(user.id), user.name ?? user.login ?? 'GitHub User');
  const res = Response.redirect('/', 302);
  res.headers.append('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`);
  return res;
};
```

```ts
// web/functions/api/auth/logout.ts
import type { Env } from '../../../../src/server/db';
import { SESSION_COOKIE } from '../../../../src/server/services/session';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const cookie = context.request.headers.get('Cookie') ?? '';
  const m = cookie.match(/(?:^|;\s*)ts_session=([^;]+)/);
  if (m) {
    const { destroySession } = await import('../../../../src/server/services/session');
    await destroySession(context.env, m[1]);
  }
  const res = Response.json({ ok: true });
  res.headers.append('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  return res;
};
```

```ts
// web/functions/api/auth/me.ts
import type { Env } from '../../../../src/server/db';
import { getSession } from '../../../../src/server/services/session';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getSession(context.env, context.request);
  return Response.json({ user: user ? { provider: user.provider, name: user.name } : null });
};
```

- [ ] **Step 4: Sửa votes.ts + comments.ts để skip rate limit khi có session**

Trong `web/functions/api/votes.ts`, chèn trước đoạn `checkRateLimit`:

```ts
const { getSession } = await import('../../src/server/services/session');
const sessionUser = await getSession(context.env, context.request);
if (!sessionUser) {
  const rl = await checkRateLimit(context.env, `vote:${ip}`, VOTE_RATE_LIMIT);
  if (!rl.allowed) {
    return Response.json({ error: 'Bạn đã vote quá số lần cho phép (3 lần/giờ). Vui lòng thử lại sau.' }, { status: 429 });
  }
}
```

và đổi `user_id: null` thành `user_id: sessionUser ? `${sessionUser.provider}:${sessionUser.external_id}` : null`.

Làm tương tự cho `web/functions/api/comments.ts` với `COMMENT_RATE_LIMIT`.

- [ ] **Step 5: Chạy integration test, xác nhận PASS**

Run: `cd web && npx vitest run --config vitest.integration.config.ts`
Expected: PASS — session (1), me (1), logout (1) + toàn bộ test cũ vẫn xanh.

- [ ] **Step 6: Commit**

```bash
git add web/src/server/services/session.ts web/functions/api/auth web/functions/api/votes.ts web/functions/api/comments.ts web/tests/integration/auth.test.ts
git commit -m "feat(web): Google/GitHub OAuth + session + rate limit exemption for logged-in users"
```

---

### Task 8: Frontend UI — api client, HomePage, ThreadPage, SearchBox, AdminPage

**Files:**
- Create: `web/src/ui/main.tsx`, `web/src/ui/App.tsx`, `web/src/ui/api.ts`
- Create: `web/src/ui/pages/HomePage.tsx`, `web/src/ui/pages/ThreadPage.tsx`, `web/src/ui/pages/AdminPage.tsx`
- Create: `web/src/ui/components/ThreadCard.tsx`, `web/src/ui/components/CommentCard.tsx`, `web/src/ui/components/ScoreBar.tsx`, `web/src/ui/components/HeatGauge.tsx`, `web/src/ui/components/SearchBox.tsx`, `web/src/ui/components/VoteButtons.tsx`, `web/src/ui/components/DiscussionBox.tsx`
- Test: `web/src/ui/__tests__/SearchBox.test.tsx`, `web/src/ui/__tests__/ThreadPage.test.tsx` (Testing Library + jsdom)

**Interfaces:**
- Consumes: API endpoints Task 5-6 (fetch qua `api.ts`), `LABEL_DISPLAY`, `LABEL_COLORS` (Task 1).
- Produces (không task sau dùng — đây là lớp UI cuối):
  - `api.ts`: `export async function apiGet<T>(path: string): Promise<T>`; `export async function apiPost<T>(path: string, body: unknown): Promise<T>` (nếu HTTP status >= 400 → throw Error với message từ `{ error }`); helpers: `searchThreads(q)`, `getThread(id)`, `requestThread(url)`, `vote(commentId, vote)`, `postUserComment(threadId, content, displayName?)`.
  - Routes: `/` (HomePage), `/t/:id` (ThreadPage), `/admin` (AdminPage).

- [ ] **Step 1: Viết test đỏ cho SearchBox**

`web/src/ui/__tests__/SearchBox.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchBox from '../components/SearchBox';

vi.mock('../api', () => ({
  searchThreads: vi.fn(async (q: string) => {
    if (q.includes('threads.net')) {
      return { kind: 'url', state: 'unknown' } as const;
    }
    return { kind: 'keyword', threads: [] } as const;
  }),
  requestThread: vi.fn(async () => ({ status: 'created' })),
}));

describe('SearchBox', () => {
  it('shows request button for unknown threads URL', async () => {
    render(<MemoryRouter><SearchBox /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/Tìm bài viết hoặc dán link Threads/i), {
      target: { value: 'https://www.threads.net/@x/post/C1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tìm/i }));
    await waitFor(() => expect(screen.getByText(/Bài viết này chưa có trên ThreadScore/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /Request bài viết/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd web && npx vitest run src/ui/__tests__/SearchBox.test.tsx`
Expected: FAIL — "Cannot find module '../components/SearchBox'"

- [ ] **Step 3: Implement `api.ts` + `main.tsx` + `App.tsx`**

```ts
// web/src/ui/api.ts
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
  | { kind: 'keyword'; threads: Array<{ id: string; url: string; title: string | null }> };

export const searchThreads = (q: string) => apiGet<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`);
export const getThread = (id: string) => apiGet<unknown>(`/api/threads/${id}`);
export const requestThread = (url: string) => apiPost<{ status: string }>('/api/requests', { url });
export const vote = (commentId: string, v: 'correct' | 'incorrect') => apiPost<{ ok: boolean; counts: { correct: number; incorrect: number } }>('/api/votes', { comment_id: commentId, vote: v });
export const postUserComment = (threadId: string, content: string, displayName?: string) => apiPost<{ ok: boolean }>('/api/comments', { thread_id: threadId, content, display_name: displayName });
```

```tsx
// web/src/ui/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```tsx
// web/src/ui/App.tsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ThreadPage from './pages/ThreadPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <header style={{ padding: '1rem', borderBottom: '1px solid #ddd', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: '1.2rem', textDecoration: 'none', color: '#111' }}>
          ThreadScore
        </Link>
      </header>
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '1rem' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/t/:id" element={<ThreadPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Implement `SearchBox.tsx`**

```tsx
// web/src/ui/components/SearchBox.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchThreads, requestThread, ApiError } from '../api';

export default function SearchBox() {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<{ kind: string; state?: string; thread?: { id: string }; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSearch() {
    setError(null); setResult(null);
    if (!q.trim()) return;
    try {
      const r = await searchThreads(q.trim());
      if (r.kind === 'url') {
        if (r.state === 'scored' && r.thread) { navigate(`/t/${r.thread.id}`); return; }
        if (r.state === 'pending') { setResult({ kind: 'url', state: 'pending', message: 'Bài viết này đang được xử lý. Hãy quay lại sau nhé!' }); return; }
        setResult({ kind: 'url', state: 'unknown', message: 'Bài viết này chưa có trên ThreadScore.' });
      } else {
        setResult({ kind: 'keyword', message: `Tìm thấy ${r.threads.length} bài viết.` });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Lỗi tìm kiếm');
    }
  }

  async function onRequest() {
    try {
      await requestThread(q.trim());
      setResult({ kind: 'url', state: 'pending', message: 'Đã gửi request! Chủ sở hữu sẽ import bài viết này sớm.' });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Lỗi gửi request');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          placeholder="Tìm bài viết hoặc dán link Threads..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button onClick={onSearch}>Tìm</button>
      </div>
      {result && <p data-testid="search-result">{result.message}</p>}
      {result?.kind === 'url' && result.state === 'unknown' && (
        <button onClick={onRequest}>Request bài viết</button>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4b: Viết test đỏ cho ThreadPage**

`web/src/ui/__tests__/ThreadPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ThreadPage from '../pages/ThreadPage';

vi.mock('../api', () => ({
  apiGet: vi.fn(async (path: string) => {
    if (path.startsWith('/api/threads/t1')) {
      return {
        thread: {
          id: 't1', url: 'https://www.threads.net/@x/post/C1', title: 'Chủ đề test',
          content: 'Nội dung', author_username: 'x', author_name: 'X', posted_at: 1700000000,
          total_comments: 1, scoring_status: 'scored', avg_anger_score: 85,
          score_breakdown: JSON.stringify({ bang_no: 1, trung_lap: 0, vui_ve: 0 }), created_at: 1700000000,
        },
        comments: [{
          id: 'c1', thread_id: 't1', external_id: 'e1', author_username: 'u', author_name: null,
          text: 'Tôi ghét điều này', like_count: 5, posted_at: 1700000000, created_at: 1700000000,
          score: { id: 's1', comment_id: 'c1', score: 85, label: 'BÙNG NỔ', reason: 'Giận dữ', model: 'lexicon-fallback', created_at: 1700000000 },
        }],
        breakdown: { bang_no: 1, trung_lap: 0, vui_ve: 0 },
        user_comments: [],
        vote_counts: { c1: { correct: 0, incorrect: 0 } },
      };
    }
    throw new Error('unexpected path');
  }),
  apiPost: vi.fn(),
  vote: vi.fn(),
  postUserComment: vi.fn(),
}));

describe('ThreadPage', () => {
  it('renders thread title, average score and comment with score', async () => {
    render(
      <MemoryRouter initialEntries={['/t/t1']}>
        <Routes>
          <Route path="/t/:id" element={<ThreadPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Chủ đề test')).toBeTruthy());
    expect(screen.getByText('85.0/100')).toBeTruthy();
    expect(screen.getByText('Tôi ghét điều này')).toBeTruthy();
    expect(screen.getByText(/Bùng nổ/)).toBeTruthy();
  });
});
```

- [ ] **Step 4c: Chạy test, xác nhận fail**

Run: `cd web && npx vitest run src/ui/__tests__/ThreadPage.test.tsx`
Expected: FAIL — "Cannot find module '../pages/ThreadPage'"

- [ ] **Step 5: Implement các component hiển thị + pages**

```tsx
// web/src/ui/components/ScoreBar.tsx
import { LABEL_COLORS } from '../../shared/labels';
import type { Label } from '../../shared/types';

export default function ScoreBar({ score, label }: { score: number; label: Label }) {
  const color = LABEL_COLORS[label];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ width: 120, height: 8, background: '#eee', borderRadius: 4 }}>
        <div style={{ width: `${score}%`, height: 8, background: color, borderRadius: 4 }} />
      </div>
      <strong>{score}</strong>
    </div>
  );
}
```

```tsx
// web/src/ui/components/HeatGauge.tsx
export default function HeatGauge({ breakdown }: { breakdown: { bang_no: number; trung_lap: number; vui_ve: number } }) {
  const total = breakdown.bang_no + breakdown.trung_lap + breakdown.vui_ve || 1;
  const segs = [
    { n: breakdown.bang_no, color: '#e5484d', label: 'Bùng nổ' },
    { n: breakdown.trung_lap, color: '#8d8d8d', label: 'Trung lập' },
    { n: breakdown.vui_ve, color: '#2f9e6e', label: 'Vui vẻ' },
  ];
  return (
    <div style={{ display: 'flex', height: 10, width: '100%', borderRadius: 5, overflow: 'hidden' }} title={segs.map(s => `${s.label}: ${s.n}`).join(' | ')}>
      {segs.map((s, i) => (
        <div key={i} style={{ width: `${(s.n / total) * 100}%`, background: s.color }} />
      ))}
    </div>
  );
}
```

```tsx
// web/src/ui/components/ThreadCard.tsx
import { Link } from 'react-router-dom';
import HeatGauge from './HeatGauge';
import type { ThreadRecord } from '../../shared/types';

export default function ThreadCard({ thread }: { thread: ThreadRecord }) {
  const breakdown = thread.score_breakdown ? JSON.parse(thread.score_breakdown) : null;
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
      <Link to={`/t/${thread.id}`} style={{ fontWeight: 600, fontSize: '1.05rem', color: '#111' }}>
        {thread.title ?? 'Bài viết Threads'}
      </Link>
      <p style={{ color: '#666', fontSize: '0.85rem', margin: '0.25rem 0' }}>
        @{thread.author_username ?? 'unknown'} · {thread.total_comments} comments
        {thread.scoring_status !== 'scored' && <span> · <em>Đang chấm điểm...</em></span>}
      </p>
      {breakdown && <HeatGauge breakdown={breakdown} />}
      {thread.avg_anger_score != null && (
        <p style={{ margin: '0.5rem 0 0' }}>
          Điểm tức giận trung bình: <strong>{thread.avg_anger_score.toFixed(1)}/100</strong>
        </p>
      )}
    </div>
  );
}
```

```tsx
// web/src/ui/components/VoteButtons.tsx
import { useState } from 'react';
import { vote } from '../api';

export default function VoteButtons({ commentId, initial }: { commentId: string; initial: { correct: number; incorrect: number } }) {
  const [counts, setCounts] = useState(initial);
  const [voted, setVoted] = useState<null | 'correct' | 'incorrect'>(null);
  const [error, setError] = useState<string | null>(null);

  async function doVote(v: 'correct' | 'incorrect') {
    if (voted) return;
    try {
      const r = await vote(commentId, v);
      setCounts(r.counts);
      setVoted(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể vote');
    }
  }

  const total = counts.correct + counts.incorrect;
  const trust = total >= 3 ? Math.round((counts.correct / total) * 100) : null;

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
      <button onClick={() => doVote('correct')} disabled={!!voted}>AI đúng ({counts.correct})</button>
      <button onClick={() => doVote('incorrect')} disabled={!!voted}>AI sai ({counts.incorrect})</button>
      {trust !== null && <span title="Độ tin cậy của AI">Tin cậy {trust}%</span>}
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
}
```

```tsx
// web/src/ui/components/CommentCard.tsx
import ScoreBar from './ScoreBar';
import VoteButtons from './VoteButtons';
import { LABEL_DISPLAY } from '../../shared/labels';
import type { CommentRecord, AiScoreRecord } from '../../shared/types';

type Props = {
  comment: CommentRecord & { score: AiScoreRecord | null };
  voteCounts: { correct: number; incorrect: number };
};

export default function CommentCard({ comment, voteCounts }: Props) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: '0.75rem', marginBottom: '0.5rem' }}>
      <p style={{ margin: 0 }}>{comment.text}</p>
      <p style={{ color: '#888', fontSize: '0.8rem', margin: '0.25rem 0' }}>
        @{comment.author_username ?? 'unknown'}
        {comment.like_count > 0 && <> · ♥ {comment.like_count}</>}
      </p>
      {comment.score ? (
        <>
          <ScoreBar score={comment.score.score} label={comment.score.label} />
          <p style={{ fontSize: '0.85rem', margin: '0.25rem 0' }}>
            <strong>{LABEL_DISPLAY[comment.score.label]}</strong>
            {comment.score.reason && <> — {comment.score.reason}</>}
          </p>
          <VoteButtons commentId={comment.id} initial={voteCounts} />
        </>
      ) : (
        <em style={{ fontSize: '0.85rem', color: '#999' }}>Đang chờ chấm điểm...</em>
      )}
    </div>
  );
}
```

```tsx
// web/src/ui/components/DiscussionBox.tsx
import { useState } from 'react';
import { postUserComment } from '../api';

export default function DiscussionBox({ threadId, userComments, onPosted }: {
  threadId: string;
  userComments: Array<{ id: string; display_name: string | null; content: string; created_at: number }>;
  onPosted: () => void;
}) {
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await postUserComment(threadId, content, name || undefined);
      setContent('');
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể gửi comment');
    }
  }

  return (
    <section style={{ marginTop: '1.5rem' }}>
      <h3>Thảo luận</h3>
      {userComments.map(c => (
        <div key={c.id} style={{ borderBottom: '1px solid #f0f0f0', padding: '0.5rem 0' }}>
          <strong>{c.display_name ?? 'Ẩn danh'}</strong>
          <p style={{ margin: 0 }}>{c.content}</p>
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        <input placeholder="Tên hiển thị (tùy chọn)" value={name} onChange={e => setName(e.target.value)} />
        <textarea placeholder="Bình luận của bạn..." value={content} onChange={e => setContent(e.target.value)} rows={3} />
        <button onClick={submit} disabled={!content.trim()}>Gửi</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    </section>
  );
}
```

```tsx
// web/src/ui/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { apiGet } from '../api';
import SearchBox from '../components/SearchBox';
import ThreadCard from '../components/ThreadCard';
import type { ThreadRecord } from '../../shared/types';

export default function HomePage() {
  const [threads, setThreads] = useState<ThreadRecord[]>([]);
  const [sort, setSort] = useState<'newest' | 'hottest' | 'most_comments'>('newest');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ threads: ThreadRecord[] }>(`/api/threads?sort=${sort}&limit=50&offset=0`)
      .then(r => setThreads(r.threads))
      .catch(e => setError(e.message));
  }, [sort]);

  return (
    <div>
      <SearchBox />
      <div style={{ margin: '1rem 0', display: 'flex', gap: '0.5rem' }}>
        {(['newest', 'hottest', 'most_comments'] as const).map(s => (
          <button key={s} onClick={() => setSort(s)} style={{ fontWeight: sort === s ? 700 : 400 }}>
            {s === 'newest' ? 'Mới nhất' : s === 'hottest' ? 'Nóng nhất' : 'Nhiều comment'}
          </button>
        ))}
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {threads.map(t => <ThreadCard key={t.id} thread={t} />)}
      {threads.length === 0 && !error && <p>Chưa có bài viết nào. Hãy request bài viết đầu tiên!</p>}
    </div>
  );
}
```

```tsx
// web/src/ui/pages/ThreadPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet } from '../api';
import CommentCard from '../components/CommentCard';
import DiscussionBox from '../components/DiscussionBox';
import HeatGauge from '../components/HeatGauge';
import type { ThreadRecord, CommentRecord, AiScoreRecord, UserCommentRecord } from '../../shared/types';

type ThreadDetail = {
  thread: ThreadRecord;
  comments: (CommentRecord & { score: AiScoreRecord | null })[];
  breakdown: { bang_no: number; trung_lap: number; vui_ve: number } | null;
  user_comments: UserCommentRecord[];
  vote_counts: Record<string, { correct: number; incorrect: number }>;
};

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ThreadDetail | null>(null);
  const [filter, setFilter] = useState<'all' | 'BÙNG NỔ' | 'TRUNG LẬP' | 'VUI VẺ'>('all');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setData(await apiGet<ThreadDetail>(`/api/threads/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải bài viết');
    }
  }

  useEffect(() => { load(); }, [id]);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!data) return <p>Đang tải...</p>;

  const visible = data.comments.filter(c =>
    filter === 'all' || (c.score?.label === filter),
  );

  return (
    <div>
      <h1>{data.thread.title ?? 'Bài viết Threads'}</h1>
      <p style={{ color: '#666' }}>
        @{data.thread.author_username ?? 'unknown'} · <a href={data.thread.url} target="_blank" rel="noreferrer">Xem trên Threads</a>
      </p>
      {data.thread.content && <p>{data.thread.content}</p>}
      {data.breakdown && <HeatGauge breakdown={data.breakdown} />}
      {data.thread.avg_anger_score != null && (
        <p>Điểm tức giận trung bình: <strong>{data.thread.avg_anger_score.toFixed(1)}/100</strong></p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        {(['all', 'BÙNG NỔ', 'TRUNG LẬP', 'VUI VẺ'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Tất cả' : f === 'BÙNG NỔ' ? 'Bùng nổ' : f === 'TRUNG LẬP' ? 'Trung lập' : 'Vui vẻ'}
          </button>
        ))}
      </div>

      {visible.map(c => (
        <CommentCard key={c.id} comment={c} voteCounts={data.vote_counts[c.id] ?? { correct: 0, incorrect: 0 }} />
      ))}

      <DiscussionBox threadId={data.thread.id} userComments={data.user_comments} onPosted={load} />
    </div>
  );
}
```

```tsx
// web/src/ui/pages/AdminPage.tsx
import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [key, setKey] = useState(() => localStorage.getItem('ts_admin_key') ?? '');
  const [pending, setPending] = useState<Array<{ id: string; url: string; status: string; created_at: number }>>([]);
  const [workerResult, setWorkerResult] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadQueue() {
    setError(null);
    try {
      const r = await fetch('/api/queue/pending', { headers: { 'X-Admin-Key': key } });
      if (!r.ok) throw new Error(`Lỗi ${r.status}`);
      setPending((await r.json() as { requests: never }).requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải queue');
    }
  }

  async function runWorker() {
    setError(null);
    try {
      const r = await fetch('/api/admin/worker', { method: 'POST', headers: { 'X-Admin-Key': key } });
      if (!r.ok) throw new Error(`Lỗi ${r.status}`);
      const b = await r.json() as { processedThreads: number; scoredComments: number };
      setWorkerResult(`Đã xử lý ${b.processedThreads} bài, chấm ${b.scoredComments} comments`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi chạy worker');
    }
  }

  async function uploadJson() {
    setError(null);
    try {
      const r = await fetch('/api/admin/import-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
        body: JSON.stringify(JSON.parse(jsonText)),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})) as { error?: string }).error ?? `Lỗi ${r.status}`);
      setJsonText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi import JSON');
    }
  }

  useEffect(() => { localStorage.setItem('ts_admin_key', key); }, [key]);

  return (
    <div>
      <h2>Admin</h2>
      <input
        type="password"
        placeholder="Admin secret key"
        value={key}
        onChange={e => setKey(e.target.value)}
        style={{ width: '100%', marginBottom: '0.5rem' }}
      />
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={loadQueue}>Tải queue</button>
        <button onClick={runWorker}>Chạy scoring worker</button>
      </div>
      {workerResult && <p>{workerResult}</p>}
      {pending.map(r => <p key={r.id} style={{ fontSize: '0.85rem' }}>{r.url}</p>)}
      <h3>Upload JSON thủ công</h3>
      <textarea rows={6} style={{ width: '100%' }} placeholder='{"url": "...", "comments": [...]}' value={jsonText} onChange={e => setJsonText(e.target.value)} />
      <button onClick={uploadJson}>Import</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Cấu hình jsdom cho UI tests — cập nhật `vitest.config.ts`**

```ts
// web/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['tests/integration/**'],
  },
});
```

`web/vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Thêm vào `web/package.json` devDependencies: `"@testing-library/jest-dom": "^6.4.8"` (đã có), `"@vitejs/plugin-react"` (đã có).

- [ ] **Step 7: Chạy UI test, xác nhận PASS**

Run: `cd web && npx vitest run src/ui/__tests__/`
Expected: PASS — SearchBox + ThreadPage test xanh.

- [ ] **Step 8: Build SPA, xác nhận build thành công**

Run: `cd web && npm run build`
Expected: Build OK, output trong `web/dist`.

- [ ] **Step 9: Commit**

```bash
git add web/src/ui web/vitest.config.ts web/vitest.setup.ts web/package.json
git commit -m "feat(web): React UI (home, thread detail, search/request, admin) + build config"
```

---

### Task 9: Chrome Extension — scaffold + storage + api client

**Files:**
- Create: `extension/package.json`, `extension/tsconfig.json`, `extension/vite.config.ts`, `extension/vitest.config.ts`, `extension/src/manifest.ts`
- Create: `extension/src/lib/storage.ts`, `extension/src/lib/api.ts`
- Test: `extension/tests/storage.test.ts` (mock chrome.storage), `extension/tests/api.test.ts` (mock fetch)

**Interfaces:**
- Consumes: không (task đầu tiên của extension).
- Produces (scraper, popup, batch dùng):
  - `storage.ts`: `export interface ExtensionConfig { webUrl: string; adminKey: string }`; `export async function getConfig(): Promise<ExtensionConfig>`; `export async function setConfig(cfg: ExtensionConfig): Promise<void>` (chrome.storage.local key `threadscore_config`).
  - `api.ts`: `export interface PendingRequest { id: string; url: string; status: string; created_at: number }`; `export async function fetchQueue(config: ExtensionConfig): Promise<PendingRequest[]>` (GET `{webUrl}/api/queue/pending` với header `X-Admin-Key`); `export async function pushImport(config: ExtensionConfig, payload: unknown): Promise<{ threadId: string; isUpdate: boolean; commentCount: number }>` (POST `{webUrl}/api/admin/import`); `export async function reportBatchError(config: ExtensionConfig, requestId: string, message: string): Promise<void>` (POST `{webUrl}/api/admin/request-error` với body `{ id, error_message }` — endpoint này nếu chưa tồn tại thì thêm ở Task 10).

- [ ] **Step 1: Tạo `extension/package.json`**

```json
{
  "name": "threadscore-extension",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.23",
    "@types/chrome": "^0.0.268",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5",
    "jsdom": "^24.1.1"
  }
}
```

- [ ] **Step 2: Viết test đỏ cho storage**

`extension/tests/storage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
      set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(mockStorage, obj); }),
    },
  },
});

import { getConfig, setConfig } from '../src/lib/storage';

describe('storage', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  });

  it('returns default config when empty', async () => {
    const cfg = await getConfig();
    expect(cfg.webUrl).toBe('');
    expect(cfg.adminKey).toBe('');
  });

  it('persists and reads config', async () => {
    await setConfig({ webUrl: 'https://ts.example.com', adminKey: 'k123' });
    const cfg = await getConfig();
    expect(cfg).toEqual({ webUrl: 'https://ts.example.com', adminKey: 'k123' });
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận fail**

Run: `cd extension && npm install && npx vitest run tests/storage.test.ts`
Expected: FAIL — "Cannot find module '../src/lib/storage'"

- [ ] **Step 4: Implement `storage.ts` + `api.ts` + `manifest.ts` + `tsconfig.json`**

```json
// extension/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "types": ["chrome"]
  },
  "include": ["src", "tests"]
}
```

```ts
// extension/src/lib/storage.ts
export interface ExtensionConfig {
  webUrl: string;
  adminKey: string;
}

const CONFIG_KEY = 'threadscore_config';
const DEFAULTS: ExtensionConfig = { webUrl: '', adminKey: '' };

export async function getConfig(): Promise<ExtensionConfig> {
  const result = await chrome.storage.local.get(CONFIG_KEY);
  return { ...DEFAULTS, ...(result[CONFIG_KEY] as Partial<ExtensionConfig> | undefined) };
}

export async function setConfig(cfg: ExtensionConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: cfg });
}
```

```ts
// extension/src/lib/api.ts
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
```

```ts
// extension/src/manifest.ts
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'ThreadScore Importer',
  version: '0.1.0',
  description: 'Import bài viết + comments từ Threads vào ThreadScore',
  permissions: ['storage', 'activeTab', 'scripting'],
  host_permissions: ['https://*.threads.net/*'],
  action: { default_popup: 'index.html', default_title: 'ThreadScore Importer' },
  content_scripts: [
    {
      matches: ['https://*.threads.net/*'],
      js: ['src/content/scraper.ts'],
      run_at: 'document_idle',
    },
  ],
});
```

```ts
// extension/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: { outDir: 'dist' },
});
```

```ts
// extension/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Viết test api client + chạy toàn bộ test extension**

`extension/tests/api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { fetchQueue, pushImport } from '../src/lib/api';
import type { ExtensionConfig } from '../src/lib/storage';

const cfg: ExtensionConfig = { webUrl: 'https://ts.example.com', adminKey: 'k123' };

describe('api client', () => {
  beforeEach(() => fetchMock.mockReset());

  it('fetchQueue sends admin key and returns requests', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ requests: [{ id: 'r1', url: 'https://www.threads.net/@a/post/C1', status: 'pending', created_at: 1 }] }), { status: 200 }));
    const queue = await fetchQueue(cfg);
    expect(queue).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('https://ts.example.com/api/queue/pending', {
      headers: { 'X-Admin-Key': 'k123', 'Content-Type': 'application/json' },
    });
  });

  it('pushImport throws on non-200', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
    await expect(pushImport(cfg, { url: 'x', comments: [] })).rejects.toThrow('Unauthorized');
  });
});
```

Run: `cd extension && npx vitest run tests/`
Expected: PASS — storage + api tests xanh.

- [ ] **Step 6: Commit**

```bash
git add extension/package.json extension/tsconfig.json extension/vite.config.ts extension/vitest.config.ts extension/src/manifest.ts extension/src/lib/ extension/tests/storage.test.ts extension/tests/api.test.ts
git commit -m "feat(extension): scaffold MV3 + storage + api client"
```

---

### Task 10: Chrome Extension — scraper (selectors, autoScroll, scraper)

**Files:**
- Create: `extension/src/content/selectors.ts`, `extension/src/content/autoScroll.ts`, `extension/src/content/scraper.ts`
- Test: `extension/tests/scraper.test.ts` (jsdom mock DOM Threads)

**Interfaces:**
- Consumes: `EXTENSION_MAX_COMMENTS` — lưu ý: hằng số này nằm trong `web/src/shared/constants.ts`. Để tránh cross-package import, tạo bản sao `extension/src/content/constants.ts` với `export const MAX_COMMENTS = 500;` (spec yêu cầu biến tên `MAX_COMMENTS` trong extension).
- Produces (popup + batch dùng):
  - `scraper.ts`: `export interface ScrapedThread { url: string; title: string | null; content: string | null; author_username: string | null; author_name: string | null; posted_at: number | null; comments: { external_id: string | null; author_username: string | null; author_name: string | null; text: string; like_count: number; posted_at: number | null }[] }`; `export async function scrapeCurrentThread(doc: Document, opts?: { maxComments?: number }): Promise<ScrapedThread>`.
  - `autoScroll.ts`: `export async function autoScrollUntilStable(doc: Document, opts?: { maxComments?: number; maxScrolls?: number }): Promise<void>` — cuộn tới khi số comment không tăng sau 3 lần cuộn liên tiếp hoặc đạt max.

- [ ] **Step 1: Viết test đỏ cho scraper với DOM giả**

`extension/tests/scraper.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Stub chrome.runtime trước khi import scraper (listener đăng ký ở module load)
vi.stubGlobal('chrome', {
  runtime: { onMessage: { addListener: vi.fn() } },
});

import { scrapeCurrentThread } from '../src/content/scraper';

function makeDom(): Document {
  const html = `
  <html><body>
    <article data-testid="post-thread">
      <div class="thread-title">Giá xăng tăng phi mã</div>
      <div class="thread-content">Mọi người nghĩ sao?</div>
      <a class="thread-author" href="/@nguoila">@nguoila</a>
      <time class="thread-time">2026-08-01</time>
    </article>
    <div data-testid="reply-thread">
      <div class="reply-item">
        <span class="reply-author">@a</span>
        <span class="reply-text">Tôi ghét điều này</span>
        <span class="reply-likes">12</span>
      </div>
      <div class="reply-item">
        <span class="reply-author">@b</span>
        <span class="reply-text">Tuyệt vời</span>
        <span class="reply-likes">3</span>
      </div>
    </div>
  </body></html>`;
  return new JSDOM(html).window.document;
}

describe('scrapeCurrentThread', () => {
  it('extracts title, author and comments', async () => {
    const doc = makeDom();
    const result = await scrapeCurrentThread(doc);
    expect(result.title).toBe('Giá xăng tăng phi mã');
    expect(result.author_username).toBe('nguoila');
    expect(result.comments).toHaveLength(2);
    expect(result.comments[0].text).toBe('Tôi ghét điều này');
    expect(result.comments[0].like_count).toBe(12);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd extension && npx vitest run tests/scraper.test.ts`
Expected: FAIL — "Cannot find module '../src/content/scraper'"

- [ ] **Step 3: Implement `selectors.ts` + `autoScroll.ts` + `scraper.ts`**

```ts
// extension/src/content/selectors.ts
// Tách riêng để dễ cập nhật khi Threads đổi layout
export const SELECTORS = {
  thread: 'article[data-testid="post-thread"], article',
  title: '.thread-title, h1, [data-testid="post-thread"] h1',
  content: '.thread-content, [data-testid="post-thread"] div',
  authorLink: '.thread-author, a[href^="/@"]',
  time: '.thread-time, time',
  replies: '[data-testid="reply-thread"], [data-testid="post-replies"]',
  replyItem: '.reply-item, [data-testid="reply-thread"] div[role="listitem"], div[data-pressable-container]',
  replyAuthor: '.reply-author, a[href^="/@"], span[dir="auto"]',
  replyText: '.reply-text, span[dir="auto"], div[dir="auto"]',
  replyLikes: '.reply-likes, [data-testid="like-count"], span:has(svg[aria-label*="like"])',
} as const;
```

```ts
// extension/src/content/constants.ts
export const MAX_COMMENTS = 500;
```

```ts
// extension/src/content/autoScroll.ts
export async function autoScrollUntilStable(doc: Document, opts?: { maxComments?: number; maxScrolls?: number }): Promise<void> {
  const maxScrolls = opts?.maxScrolls ?? 60;
  let stableCount = 0;
  let lastCount = -1;

  for (let i = 0; i < maxScrolls; i++) {
    const w = doc.defaultView;
    if (w) {
      const body = doc.body;
      if (typeof w.scrollTo === 'function') w.scrollTo(0, body.scrollHeight);
      else (w as unknown as { scrollY: number }).scrollY = body.scrollHeight;
    }
    await new Promise(r => setTimeout(r, 300));

    const count = countReplies(doc);
    if (count === lastCount) {
      stableCount++;
      if (stableCount >= 3) return;
    } else {
      stableCount = 0;
    }
    lastCount = count;
    if (opts?.maxComments && count >= opts.maxComments) return;
  }
}

function countReplies(doc: Document): number {
  return doc.querySelectorAll('[data-testid="reply-thread"] .reply-item, [data-testid="reply-thread"] div[role="listitem"]').length;
}
```

```ts
// extension/src/content/scraper.ts
import { SELECTORS } from './selectors';
import { MAX_COMMENTS } from './constants';
import { autoScrollUntilStable } from './autoScroll';

export interface ScrapedComment {
  external_id: string | null;
  author_username: string | null;
  author_name: string | null;
  text: string;
  like_count: number;
  posted_at: number | null;
}

export interface ScrapedThread {
  url: string;
  title: string | null;
  content: string | null;
  author_username: string | null;
  author_name: string | null;
  posted_at: number | null;
  comments: ScrapedComment[];
}

function parseLikes(el: Element | null): number {
  const raw = el?.textContent?.trim() ?? '';
  const n = Number(raw.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parseTime(el: Element | null): number | null {
  const dt = el?.getAttribute('datetime');
  if (dt) {
    const t = Date.parse(dt);
    return Number.isFinite(t) ? Math.floor(t / 1000) : null;
  }
  // Fallback: parse text content như '2026-08-01' hoặc ISO date
  const text = el?.textContent?.trim();
  if (text) {
    const t = Date.parse(text);
    return Number.isFinite(t) ? Math.floor(t / 1000) : null;
  }
  return null;
}

function cleanUsername(hrefOrText: string | null): string | null {
  if (!hrefOrText) return null;
  const m = hrefOrText.match(/\/@([^/?]+)/) ?? hrefOrText.match(/@([\w.]+)/);
  return m ? m[1] : null;
}

export async function scrapeCurrentThread(doc: Document, opts?: { maxComments?: number }): Promise<ScrapedThread> {
  await autoScrollUntilStable(doc, { maxComments: opts?.maxComments ?? MAX_COMMENTS });

  const titleEl = doc.querySelector(SELECTORS.title);
  const contentEl = doc.querySelector(SELECTORS.content);
  const authorEl = doc.querySelector(SELECTORS.authorLink);
  const timeEl = doc.querySelector(SELECTORS.time);

  const replyItems = Array.from(doc.querySelectorAll(SELECTORS.replyItem)).slice(0, opts?.maxComments ?? MAX_COMMENTS);

  const comments: ScrapedComment[] = replyItems.map(item => {
    const authorEl = item.querySelector(SELECTORS.replyAuthor);
    const textEl = item.querySelector(SELECTORS.replyText);
    const likesEl = item.querySelector(SELECTORS.replyLikes);
    const text = textEl?.textContent?.trim() ?? '';
    const authorHref = authorEl?.getAttribute('href');
    return {
      external_id: null,
      author_username: cleanUsername(authorHref ?? authorEl?.textContent),
      author_name: null,
      text,
      like_count: parseLikes(likesEl),
      posted_at: null,
    };
  }).filter(c => c.text.length > 0);

  return {
    url: doc.location?.href ?? doc.defaultView?.location.href ?? '',
    title: titleEl?.textContent?.trim() ?? null,
    content: contentEl?.textContent?.trim() ?? null,
    author_username: cleanUsername(authorEl?.getAttribute('href') ?? authorEl?.textContent),
    author_name: null,
    posted_at: parseTime(timeEl),
    comments,
  };
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd extension && npx vitest run tests/scraper.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extension/src/content/
git commit -m "feat(extension): DOM scraper with selectors + auto scroll"
```

---

### Task 11: Chrome Extension — popup (manual + batch) + batch runner

**Files:**
- Create: `extension/src/popup/main.tsx`, `extension/src/popup/App.tsx`, `extension/src/popup/manual.ts`, `extension/src/popup/batch.ts`, `extension/src/batch/runner.ts`, `extension/index.html`
- Test: `extension/tests/batchRunner.test.ts` (mock chrome.tabs + fetch)

**Interfaces:**
- Consumes: `getConfig/setConfig` (Task 9), `fetchQueue/pushImport/reportBatchError` (Task 9), `scrapeCurrentThread` (Task 10).
- Produces (không task sau — UI cuối của extension):
  - `manual.ts`: `export async function scrapeActiveTab(): Promise<ScrapedThread>` — lấy active tab, inject script vào tab, gọi `scrapeCurrentThread(document)`, trả kết quả.
  - `batch.ts`: `export async function runBatch(config: ExtensionConfig, onProgress: (msg: string) => void): Promise<{ done: number; failed: number }>` — dùng `batch/runner.ts`.
  - `runner.ts`: `export async function processOneUrl(config: ExtensionConfig, url: string): Promise<{ ok: true; commentCount: number } | { ok: false; error: string }>` — mở tab mới (chrome.tabs.create active:false), đợi complete, executeScript để scrape, đóng tab, push import. Đợi tối đa 30s/tab, timeout → đóng tab + trả lỗi.

- [ ] **Step 1: Viết test đỏ cho batch runner**

`extension/tests/batchRunner.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const createdTabs: number[] = [];
const SCRAPED = {
  url: 'https://www.threads.net/@x/post/C1',
  title: 'T', content: null, author_username: 'x', author_name: null, posted_at: null,
  comments: [{ external_id: null, author_username: 'u', author_name: null, text: 'đồ ngu', like_count: 0, posted_at: null }],
};
vi.stubGlobal('chrome', {
  tabs: {
    create: vi.fn(async () => { const id = createdTabs.length + 100; createdTabs.push(id); return { id }; }),
    remove: vi.fn(async (id: number) => { createdTabs.splice(createdTabs.indexOf(id), 1); }),
    get: vi.fn(async () => ({ status: 'complete' })),
    sendMessage: vi.fn(async (_tabId: number, _msg: unknown, cb: (resp: unknown) => void) => cb(SCRAPED)),
  },
  scripting: { executeScript: vi.fn(async () => [{ result: true }]) },
  runtime: { lastError: undefined },
});

vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
  if (url.includes('/api/admin/import')) return new Response(JSON.stringify({ threadId: 't1', isUpdate: false, commentCount: 1 }), { status: 200 });
  return new Response('{}', { status: 404 });
}));

import { processOneUrl } from '../src/batch/runner';

describe('processOneUrl', () => {
  beforeEach(() => { createdTabs.length = 0; });

  it('opens tab, scrapes via message, pushes import, closes tab', async () => {
    const cfg = { webUrl: 'https://ts.example.com', adminKey: 'k' };
    const result = await processOneUrl(cfg, 'https://www.threads.net/@x/post/C1');
    expect(result).toEqual({ ok: true, commentCount: 1 });
    expect(chrome.tabs.create).toHaveBeenCalled();
    expect(chrome.tabs.sendMessage).toHaveBeenCalled();
    expect(chrome.tabs.remove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd extension && npx vitest run tests/batchRunner.test.ts`
Expected: FAIL — "Cannot find module '../src/batch/runner'"

- [ ] **Step 3: Implement `runner.ts` + `manual.ts` + `batch.ts`**

```ts
// extension/src/batch/runner.ts
import type { ExtensionConfig } from '../lib/storage';
import { pushImport } from '../lib/api';

type Result = { ok: true; commentCount: number } | { ok: false; error: string };

export async function processOneUrl(config: ExtensionConfig, url: string): Promise<Result> {
  let tabId: number | null = null;
  try {
    const tab = await chrome.tabs.create({ url, active: false });
    tabId = tab.id ?? null;
    if (tabId == null) return { ok: false, error: 'Không tạo được tab' };

    // Đợi trang load, tối đa 30 giây
    const deadline = Date.now() + 30_000;
    let status = 'loading';
    while (status !== 'complete' && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 500));
      try {
        status = (await chrome.tabs.get(tabId)).status ?? 'loading';
      } catch { break; }
    }

    const [injected] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => true, // đảm bảo content script được inject (crxjs đã đăng ký qua manifest)
    });
    void injected;

    // Gọi scrape qua message passing tới content script (MV3 không cho import() trong executeScript)
    const payload = await sendScrapeMessage(tabId);
    if (!payload || !payload.comments) return { ok: false, error: 'Scrape thất bại' };

    const pushed = await pushImport(config, payload);
    return { ok: true, commentCount: pushed.commentCount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lỗi không xác định' };
  } finally {
    if (tabId != null) await chrome.tabs.remove(tabId).catch(() => null);
  }
}

// Gửi message TS_SCRAPE tới tab, timeout 60s
async function sendScrapeMessage(tabId: number): Promise<ScrapedThread | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Scrape timeout sau 60s')), 60_000);
    chrome.tabs.sendMessage(tabId, { type: 'TS_SCRAPE' }, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      resolve(response ?? null);
    });
  });
}
```

```ts
// extension/src/popup/manual.ts
import type { ScrapedThread } from '../content/scraper';

export async function scrapeActiveTab(): Promise<ScrapedThread> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('Không tìm thấy tab đang mở');

  const payload = await new Promise<ScrapedThread | null>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Scrape timeout sau 60s')), 60_000);
    chrome.tabs.sendMessage(tab.id!, { type: 'TS_SCRAPE' }, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      resolve(response ?? null);
    });
  });

  if (!payload || !payload.comments) throw new Error('Scrape thất bại — hãy mở một bài Threads');
  return payload;
}
```

Đồng thời, `scraper.ts` (Task 10) phải đăng ký message listener để phục vụ cả popup lẫn batch:

```ts
// Thêm vào cuối extension/src/content/scraper.ts
// Guard: content script có thể được inject trước khi chrome.runtime sẵn sàng
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
    if (message.type === 'TS_SCRAPE') {
      scrapeCurrentThread(document)
        .then(result => sendResponse(result))
        .catch(e => sendResponse({ error: e instanceof Error ? e.message : 'Scrape lỗi' }));
      return true; // giữ channel mở cho async
    }
    return false;
  });
}
```

```ts
// extension/src/popup/batch.ts
import type { ExtensionConfig } from '../lib/storage';
import { fetchQueue, reportBatchError } from '../lib/api';
import { processOneUrl } from '../batch/runner';

export async function runBatch(config: ExtensionConfig, onProgress: (msg: string) => void): Promise<{ done: number; failed: number }> {
  const queue = await fetchQueue(config);
  onProgress(`Tải queue: ${queue.length} request đang chờ`);

  let done = 0;
  let failed = 0;
  for (let i = 0; i < queue.length; i++) {
    const req = queue[i];
    onProgress(`[${i + 1}/${queue.length}] Đang xử lý ${req.url}`);
    const result = await processOneUrl(config, req.url);
    if (result.ok) {
      done++;
      onProgress(`[${i + 1}/${queue.length}] OK — ${result.commentCount} comments`);
    } else {
      failed++;
      onProgress(`[${i + 1}/${queue.length}] LỖI — ${result.error}`);
      await reportBatchError(config, req.id, result.error).catch(() => null);
    }
  }
  onProgress(`Hoàn tất: ${done} thành công, ${failed} thất bại`);
  return { done, failed };
}
```

- [ ] **Step 4: Implement popup UI**

```tsx
// extension/src/popup/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

```tsx
// extension/src/popup/App.tsx
import { useEffect, useState } from 'react';
import { getConfig, setConfig, type ExtensionConfig } from '../lib/storage';
import { scrapeActiveTab } from './manual';
import { runBatch } from './batch';
import { pushImport } from '../lib/api';
import type { ScrapedThread } from '../content/scraper';

export default function App() {
  const [config, setConfigState] = useState<ExtensionConfig>({ webUrl: '', adminKey: '' });
  const [tab, setTab] = useState<'manual' | 'batch'>('manual');
  const [scraped, setScraped] = useState<ScrapedThread | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getConfig().then(setConfigState); }, []);

  function log(msg: string) { setLog(prev => [...prev, msg]); }

  async function saveConfig() {
    await setConfig(config);
    log('Đã lưu cấu hình');
  }

  async function doScrape() {
    setBusy(true); setError(null);
    try {
      const s = await scrapeActiveTab();
      setScraped(s);
      log(`Scrape OK: ${s.comments.length} comments`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi scrape');
    } finally {
      setBusy(false);
    }
  }

  async function doPush() {
    if (!scraped) return;
    setBusy(true); setError(null);
    try {
      const r = await pushImport(config, scraped);
      log(`Đã đẩy lên web: ${r.commentCount} comments`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi đẩy dữ liệu');
    } finally {
      setBusy(false);
    }
  }

  async function doDownload() {
    if (!scraped) return;
    const blob = new Blob([JSON.stringify(scraped, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'threadscore-import.json';
    a.click();
  }

  async function doBatch() {
    setBusy(true); setError(null);
    try {
      const r = await runBatch(config, log);
      log(`Batch xong: ${r.done} OK, ${r.failed} fail`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi batch');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ width: 380, padding: 12, fontFamily: 'system-ui' }}>
      <h3 style={{ margin: '0 0 8px' }}>ThreadScore Importer</h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input placeholder="Web URL" value={config.webUrl} onChange={e => setConfigState({ ...config, webUrl: e.target.value })} style={{ flex: 1 }} />
        <input placeholder="Admin key" type="password" value={config.adminKey} onChange={e => setConfigState({ ...config, adminKey: e.target.value })} style={{ flex: 1 }} />
        <button onClick={saveConfig}>Lưu</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => setTab('manual')} disabled={busy}>Import bài đang xem</button>
        <button onClick={() => setTab('batch')} disabled={busy}>Batch từ Queue</button>
      </div>

      {tab === 'manual' && (
        <div>
          <button onClick={doScrape} disabled={busy}>Lấy bài + comments hiện tại</button>
          {scraped && (
            <div style={{ marginTop: 8 }}>
              <p>{scraped.title ?? '(không có tiêu đề)'} — {scraped.comments.length} comments</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={doPush} disabled={busy}>Đẩy lên web</button>
                <button onClick={doDownload}>Tải JSON</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'batch' && (
        <div>
          <button onClick={doBatch} disabled={busy}>Chạy batch</button>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {log.length > 0 && (
        <pre style={{ maxHeight: 180, overflow: 'auto', background: '#f5f5f5', padding: 8, fontSize: 11 }}>
          {log.join('\n')}
        </pre>
      )}
    </div>
  );
}
```

`extension/index.html`:

```html
<!doctype html>
<html lang="vi">
  <head><meta charset="UTF-8" /><title>ThreadScore Importer</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/popup/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Chạy test batch runner, xác nhận PASS**

Run: `cd extension && npx vitest run tests/batchRunner.test.ts`
Expected: PASS.

- [ ] **Step 6: Build extension, xác nhận build OK**

Run: `cd extension && npm run build`
Expected: Build OK — `extension/dist/manifest.json` tồn tại với manifest_version 3.

- [ ] **Step 7: Commit**

```bash
git add extension/src/popup extension/src/batch extension/index.html extension/tests/batchRunner.test.ts
git commit -m "feat(extension): popup (manual + batch) + batch runner"
```

---

### Task 12: Web — endpoint request-error + cron trigger + README + deploy config

**Files:**
- Create: `web/functions/api/admin/request-error.ts`, `web/functions/api/cron/scoring.ts`
- Create: `README.md` (root)
- Test: `web/tests/integration/requestError.test.ts`

**Interfaces:**
- Consumes: `isAdminAuthorized` (Task 3), `runScoringWorker` (Task 4), `updateRequestStatus` (Task 2).
- Produces (extension Task 11 dùng, deploy docs):
  - `POST /api/admin/request-error` body `{ id, error_message }` (admin key) → cập nhật request `status = 'error'` + `error_message` → `{ ok: true }`.
  - `GET /api/cron/scoring` (được Cloudflare Cron Trigger gọi với `Authorization: Bearer <CRON_SECRET>` env; sai secret → 401) → chạy `runScoringWorker` → `{ processedThreads, scoredComments }`.

- [ ] **Step 1: Viết test integration đỏ**

`web/tests/integration/requestError.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SELF, env } from 'cloudflare:test';

describe('POST /api/admin/request-error', () => {
  it('requires admin key and marks request as error', async () => {
    await SELF.fetch('https://example.com/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.threads.net/@err/post/E1' }),
    });
    const noKey = await SELF.fetch('https://example.com/api/admin/request-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'x', error_message: 'boom' }),
    });
    expect(noKey.status).toBe(401);

    const { results } = await env.DB.prepare("SELECT id FROM requests WHERE url = ? AND status = 'pending'")
      .bind('https://www.threads.net/@err/post/E1').all<{ id: string }>();
    const reqId = results[0].id;

    const ok = await SELF.fetch('https://example.com/api/admin/request-error', {
      method: 'POST',
      headers: { 'X-Admin-Key': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reqId, error_message: 'Bài viết không tồn tại' }),
    });
    expect(ok.status).toBe(200);

    const row = await env.DB.prepare('SELECT status, error_message FROM requests WHERE id = ?')
      .bind(reqId).first<{ status: string; error_message: string }>();
    expect(row?.status).toBe('error');
    expect(row?.error_message).toBe('Bài viết không tồn tại');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `cd web && npx vitest run --config vitest.integration.config.ts`
Expected: FAIL — 404.

- [ ] **Step 3: Implement handlers**

```ts
// web/functions/api/admin/request-error.ts
import type { Env } from '../../../src/server/db';
import { isAdminAuthorized } from '../../../src/server/services/adminKey';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!isAdminAuthorized(context.request, context.env)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await context.request.json().catch(() => null) as { id?: string; error_message?: string } | null;
  if (!body?.id || !body.error_message) {
    return Response.json({ error: 'Thiếu id hoặc error_message' }, { status: 400 });
  }
  const { updateRequestStatus } = await import('../../../src/server/repo/requests');
  await updateRequestStatus(context.env.DB, body.id, 'error', { errorMessage: body.error_message });
  return Response.json({ ok: true });
};
```

```ts
// web/functions/api/cron/scoring.ts
import type { Env } from '../../../src/server/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = context.request.headers.get('Authorization');
  const secret = (context.env as unknown as Record<string, string>).CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { runScoringWorker } = await import('../../../src/server/services/scoringWorker');
  const result = await runScoringWorker(context.env);
  return Response.json(result);
};
```

- [ ] **Step 4: Chạy integration test, xác nhận PASS**

Run: `cd web && npx vitest run --config vitest.integration.config.ts`
Expected: PASS — toàn bộ test xanh (requestError + tất cả test cũ).

- [ ] **Step 5: Viết README root**

`README.md`:

```markdown
# ThreadScore

Web cộng đồng đo mức độ tức giận của comments trên Threads.

## Cấu trúc

- `web/` — React SPA + Cloudflare Pages Functions + D1 + KV
- `extension/` — Chrome MV3 extension cho owner scrape + batch import

## Deploy web (Cloudflare)

1. `cd web && npm install`
2. Tạo database: `npx wrangler d1 create threadscore-db` → ghi `database_id` vào `wrangler.toml`
3. Tạo KV: `npx wrangler kv namespace create KV` → ghi `id` vào `wrangler.toml`
4. Apply migration: `npx wrangler d1 execute threadscore-db --file=migrations/0001_initial.sql`
5. Deploy: `npx wrangler pages deploy dist` (build trước bằng `npm run build`)
6. Cấu hình env vars trên Cloudflare Dashboard:
   - `ADMIN_SECRET_KEY` — secret key cho extension
   - `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` — provider AI (tùy chọn; thiếu thì dùng lexicon fallback)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (tùy chọn cho OAuth)
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (tùy chọn cho OAuth)
   - `CRON_SECRET` (tùy chọn, cho cron scoring)
7. Cron scoring: tạo Cron Trigger trên dashboard trỏ tới `/api/cron/scoring` mỗi 5 phút với header `Authorization: Bearer <CRON_SECRET>` (tùy chọn; worker cũng chạy sau mỗi import)

## Cài extension

1. `cd extension && npm install && npm run build`
2. Chrome → `chrome://extensions` → Developer mode → Load unpacked → chọn `extension/dist`
3. Mở popup, nhập Web URL + Admin key, lưu

## Test

- Web unit: `cd web && npm test`
- Web integration: `cd web && npm run test:integration`
- Extension: `cd extension && npm test`
```

- [ ] **Step 6: Commit**

```bash
git add web/functions/api/admin/request-error.ts web/functions/api/cron web/tests/integration/requestError.test.ts README.md
git commit -m "feat: request-error endpoint + cron scoring trigger + README deploy docs"
```

---

### Task 13: Verification tổng thể

**Files:** không tạo file mới (chỉ chạy lệnh).

- [ ] **Step 1: Chạy toàn bộ test web**

Run: `cd web && npm test && npm run test:integration`
Expected: PASS — unit + integration toàn bộ xanh.

- [ ] **Step 2: Chạy toàn bộ test extension**

Run: `cd extension && npm test`
Expected: PASS.

- [ ] **Step 3: Build cả hai**

Run: `cd web && npm run build` sau đó `cd ../extension && npm run build`
Expected: cả hai build OK.

- [ ] **Step 4: Typecheck (nếu tsconfig strict)**

Run: `cd web && npx tsc --noEmit` và `cd ../extension && npx tsc --noEmit`
Expected: không lỗi type.

- [ ] **Step 5: Manual smoke test (nếu có tài khoản Threads)**

- Deploy web lên Cloudflare Pages, cấu hình env vars.
- Mở một bài Threads bất kỳ, dùng extension "Import bài đang xem" → xác nhận bài hiện trên web với điểm số.
- Dán URL mới vào search trên web → Request → mở extension → Batch → xác nhận bài mới được import + score.
- Vote 4 lần liên tiếp không đăng nhập → lần 4 nhận 429.
- Comment 2 lần liên tiếp → lần 2 nhận 429.

- [ ] **Step 6: Commit nếu có thay đổi phát sinh từ verification**

```bash
git add -A && git commit -m "chore: verification fixes"
```
(Nếu không có thay đổi thì bỏ qua.)
