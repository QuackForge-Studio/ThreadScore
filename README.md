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
- Web integration: `cd web && npm run test:integration` (Windows path có space cần copy sang path không space hoặc nâng `@cloudflare/vitest-pool-workers` >= 0.18.7)
- Extension: `cd extension && npm test`
