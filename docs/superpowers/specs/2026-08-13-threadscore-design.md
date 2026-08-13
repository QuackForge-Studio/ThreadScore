# ThreadScore — Web cộng đồng đo mức độ tức giận trên Threads

Ngày: 2026-08-13
Trạng thái: Đã duyệt thiết kế từng phần

## 1. Tổng quan

ThreadScore là web cộng đồng phân tích mức độ tức giận của comments trên các bài viết Threads. Mỗi bài viết là một "chủ đề", comments gốc từ Threads được AI chấm điểm tức giận (0-100) và phân loại. Người dùng web có thể tìm kiếm, xem bảng xếp hạng, vote độ chính xác của AI, comment thảo luận, và request bài viết mới.

**Chủ sở hữu (owner) là người duy nhất fetch bài viết** — qua Chrome extension tự phát triển. Người dùng web không fetch trực tiếp; họ chỉ request URL, owner chạy batch job qua extension.

## 2. Kiến trúc tổng thể

```
┌─────────────────┐         ┌──────────────────────────────┐
│  Chrome Extension│         │      Cloudflare Pages        │
│  (owner dùng)    │────────▶│  React SPA + Pages Functions │
│  - scrape Threads │  POST   │  - API routes               │
│  - batch từ queue │         │  - AI scoring (server-side)  │
└─────────────────┘         └────────┬──────────┬──────────┘
        │ (fallback tải JSON)         │          │
        ▼                             ▼          ▼
    JSON file                    D1 (SQLite)   KV (rate limit,
                                 bài/comments/  session, cache)
                                 votes/scores
```

- **Repo đơn**: thư mục gốc `ThreadScore/` chứa `web/` (frontend + Pages Functions) và `extension/` (Chrome extension). Hai phần độc lập, deploy riêng.
- **Pages Functions** là backend: mọi request qua cùng domain, không CORS phức tạp, không server riêng.
- **D1** lưu dữ liệu chính. **KV** cho rate limit, session cache.
- **Deploy**: Cloudflare Pages (frontend + Pages Functions), D1 free tier, KV free tier.

## 3. Luồng dữ liệu chính

### 3.1 Request bài viết (người dùng web)

1. Người dùng paste URL Threads vào ô search.
2. Web gọi `POST /api/requests`:
   - Validate URL (regex `threads.net/...`).
   - Check bảng `threads`: đã import + scored → trả "đã tồn tại, xem kết quả".
   - Check bảng `requests`: URL đã có request pending → gộp (không tạo mới), trả "đã có người request".
   - Hợp lệ + chưa tồn tại → lưu request `status = pending`.

### 3.2 Batch job (owner qua extension)

1. Owner mở extension → nhấn "Tải queue" → `GET /api/queue/pending` (secret key).
2. Hiển thị danh sách request đang chờ.
3. Owner nhấn "Chạy batch": extension tự mở từng URL trong tab nền, đợi load, scrape, đóng tab, đẩy lên web, chuyển URL tiếp theo. Không cần mở từng cái thủ công.
4. Mỗi import thành công → request chuyển `fulfilled`, thread + comments vào D1, thread `scoring_status = pending_scoring`.

### 3.3 Import thủ công (chế độ phụ)

Khi owner đang xem một bài Threads bất kỳ, nhấn nút extension "Import bài đang xem" → scrape bài đang mở → POST `/api/admin/import` (secret key) hoặc tải JSON về máy rồi upload tay lên trang Admin.

### 3.4 AI scoring (server-side, bất đồng bộ)

1. Worker quét threads có `scoring_status = pending_scoring` → chuyển `scoring` → chấm từng comment → lưu `ai_scores` → tính `avg_anger_score`, `score_breakdown` → chuyển `scored`.
2. Worker trigger bằng: (a) Cloudflare Cron Trigger gọi Pages Function định kỳ (mỗi 5 phút), (b) chạy ngay sau mỗi import xong (gọi trực tiếp trong handler import). Dùng KV lock đơn giản để tránh 2 worker chạy đồng thời.

## 4. AI Scoring — provider linh hoạt

- **Một interface thống nhất**: dùng OpenAI-compatible SDK (`openai` npm), đổi `baseURL` + `apiKey` + `model` qua env vars:
  - OpenAI: baseURL mặc định, model `gpt-4o-mini`.
  - Gemini: `https://generativelanguage.googleapis.com/v1beta/openai/`, model `gemini-2.5-flash`.
  - Claude: `https://api.anthropic.com/v1/`, model `claude-3-5-haiku`.
- **Env vars Cloudflare Pages**: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`. Đổi provider không cần sửa code.
- **Fallback không cần key**: lexicon-based scoring cục bộ (từ điển từ nóng giận tiếng Việt + tiếng Anh). Kém chính xác hơn nhưng hệ thống vẫn chạy.
- **Prompt**: input = text comment + context chủ đề bài viết. Output JSON nghiêm ngặt qua `response_format: json_object`, validate bằng Zod trước khi lưu:
  ```json
  { "score": 0-100, "label": "BÙNG NỔ" | "TRUNG LẬP" | "VUI VẺ", "reason": "<1 câu giải thích>" }
  ```
- **Score = mức tức giận**: 0 = vui nhất, 100 = tức giận nhất.

### Bảng phân loại

| Khoảng | Nhãn | Màu |
|--------|------|-----|
| 70–100 | Bùng nổ | Đỏ |
| 30–69  | Trung lập | Xám |
| 0–29   | Vui vẻ | Xanh |

Tên nhãn hiển thị trên web là "Bùng nổ" / "Trung lập" / "Vui vẻ".

### Batching & retry

- Gọi AI theo batch tối đa 25 comments/request (JSON array).
- Retry exponential backoff khi gặp 429; delay giữa các batch để tôn trọng rate limit provider.
- Worker xử lý tuần tự tối đa 20 batch/lần chạy rồi trả lại cho lần chạy sau (tránh vượt execution time của Pages Functions); các thread lớn sẽ hoàn thành qua nhiều lần chạy.
- Mỗi score lưu kèm `model` đã dùng và `created_at` để debug/so sánh provider.

## 5. Web UI

### 5.1 Trang chủ
- Danh sách tất cả bài viết (scored + đang xử lý), sắp xếp: mới nhất / nóng nhất (avg_anger_score cao nhất) / nhiều comment nhất. Bài chưa scored hiển thị ở cuối danh sách.
- Card bài viết: tiêu đề chủ đề, tác giả gốc, thời gian, nhiệt kế cộng đồng (biểu đồ tròn 3 màu tỷ lệ 3 nhãn), điểm tức giận trung bình.
- Badge "Đang chấm điểm..." cho thread chưa scored.

### 5.2 Trang chi tiết bài viết
- Nội dung chủ đề gốc + link về Threads.
- Bảng xếp hạng comments: top Bùng nổ, top Vui vẻ. Mỗi comment: text, avatar, score với thanh màu, nhãn, lý do AI (1 câu).
- Bộ lọc: theo nhãn, theo khoảng điểm, sắp xếp theo score/likes/mới nhất.
- Vote từng comment: "AI chấm đúng" / "AI chấm sai" → hiển thị độ tin cậy AI cạnh điểm. Độ tin cậy = (số vote "đúng") / (tổng số vote), chỉ hiển thị khi có >= 3 vote.

### 5.3 Search & Request
- Một ô tìm kiếm: nhập URL Threads hoặc từ khóa.
  - URL Threads → check `threads` + `requests`:
    - Đã scored → redirect trang chi tiết.
    - Đang pending/scoring → hiện "Đang xử lý".
    - Chưa có → nút "Request bài viết này" → gọi `POST /api/requests`.
  - Từ khóa → tìm theo chủ đề và nội dung comment.

### 5.4 Vote & Comment trên site
- **Không đăng nhập**: vote tối đa 3 lần/giờ/IP, comment tối đa 1/10 phút/IP (KV rate limit).
- **Có đăng nhập** (OAuth Google/GitHub qua Pages Functions): rate limit nới rộng hơn nhiều.
- Comment người dùng hiển thị ở khu thảo luận riêng, không trộn với comments gốc Threads.

### 5.5 Trang Admin (chỉ owner, secret key)
- Dashboard: requests pending, thread đang chờ score, số liệu cơ bản.
- Upload JSON thủ công (fallback khi không dùng extension).

## 6. Chrome Extension

- Chỉ chạy trên domain `*.threads.net` (manifest permissions hạn chế).
- **Popup 2 tab**:

**Tab "Import bài đang xem"** (thủ công):
- Nút "Lấy bài + comments hiện tại": inject script đọc DOM bài đang mở (chủ đề, nội dung, tác giả) và cuộn tự động để load hết comments (lazy-load).
- Preview: số comments thu được.
- Nút "Đẩy lên web" → `POST /api/admin/import` (secret key).
- Nút "Tải JSON" → lưu file (fallback offline).

**Tab "Batch từ Queue"**:
- "Tải queue" → `GET /api/queue/pending` (secret key) → danh sách request đang chờ.
- "Chạy batch": tự mở từng URL trong tab nền, scrape, đẩy lên, đóng tab, chuyển tiếp. Tiến trình hiển thị "3/12 đã xử lý".
- Lỗi (không tìm thấy bài...) → báo server để request chuyển `status = error` (kèm `error_message`).
- Config popup: web URL + secret key, lưu trong `chrome.storage.local`.

**Kỹ thuật scrape**:
- Content script đọc DOM đã render (không dùng API internal của Threads).
- Selector DOM tách riêng trong module `selectors.js` để dễ cập nhật khi Threads đổi layout.
- Giới hạn comments mặc định 500 (cấu hình được).

## 7. API Endpoints

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/threads` | public | Danh sách bài viết (filter, sort, pagination) |
| GET | `/api/threads/:id` | public | Chi tiết bài + comments + scores |
| POST | `/api/requests` | public (rate limited) | Request URL mới (validate + dedup) |
| GET | `/api/search?q=` | public | Tìm URL hoặc từ khóa |
| POST | `/api/votes` | public (rate limited) | Vote correct/incorrect |
| POST | `/api/comments` | public (rate limited) | Comment thảo luận |
| GET | `/api/queue/pending` | secret key | Danh sách request pending (cho extension) |
| POST | `/api/admin/import` | secret key | Import bài + comments (idempotent theo URL) |
| POST | `/api/admin/import-json` | secret key | Upload JSON thủ công |
| POST | `/api/auth/*` | OAuth | Google/GitHub login |

**Secret key**: biến môi trường `ADMIN_SECRET_KEY`, gửi qua header `X-Admin-Key`. Extension lưu key này trong `chrome.storage.local` — chỉ owner có.

## 8. Data Model (D1 SQLite)

```sql
requests (
  id TEXT PRIMARY KEY,           -- UUID
  url TEXT NOT NULL,             -- URL threads.net gốc
  status TEXT NOT NULL,          -- pending | fulfilled | not_found | error
  requested_by TEXT,             -- user id hoặc 'anonymous'
  error_message TEXT,
  thread_id TEXT,                -- FK threads.id khi đã import
  created_at INTEGER,
  updated_at INTEGER
)

threads (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,      -- dedup import
  title TEXT,
  content TEXT,
  author_username TEXT,
  author_name TEXT,
  posted_at INTEGER,
  total_comments INTEGER,
  scoring_status TEXT NOT NULL,  -- pending_scoring | scoring | scored
  avg_anger_score REAL,
  score_breakdown TEXT,          -- JSON {bang_no, trung_lap, vui_ve}
  created_at INTEGER
)

comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,       -- FK threads.id
  external_id TEXT,              -- id comment trên Threads
  author_username TEXT,
  author_name TEXT,
  text TEXT NOT NULL,
  like_count INTEGER,
  posted_at INTEGER,
  created_at INTEGER
)

ai_scores (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,      -- FK comments.id
  score REAL NOT NULL,           -- 0-100 mức tức giận
  label TEXT NOT NULL,           -- BÙNG NỔ | TRUNG LẬP | VUI VẺ
  reason TEXT,
  model TEXT,                    -- provider/model đã chấm
  created_at INTEGER
)

votes (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  user_id TEXT,                  -- null nếu ẩn danh
  vote TEXT NOT NULL,            -- correct | incorrect
  created_at INTEGER
)

user_comments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT,                  -- null nếu ẩn danh
  display_name TEXT,
  content TEXT NOT NULL,
  created_at INTEGER
)
```

**Ghi chú:**
- `scoring_status` đóng vai trò queue cho AI scoring (không cần bảng queue riêng).
- Timestamp dùng UNIX epoch (integer).
- Index: `threads.url` UNIQUE (dedup), `comments.thread_id`, `requests.url` (dedup pending).

## 9. Error Handling

- **Import trùng URL**: update thread + comments hiện có, không tạo bản sao.
- **Scrape lỗi / bài không tồn tại**: request → `not_found` hoặc `error` kèm `error_message`; extension hiển thị và báo về server.
- **AI provider fail / 429**: retry exponential backoff (tối đa 5 lần); sau 5 lần thất bại → dùng fallback lexicon scoring, ghi chú `model = 'lexicon-fallback'`.
- **Rate limit ẩn danh**: trả HTTP 429 kèm thông báo thân thiện.
- **Admin key sai/thiếu**: trả 401, không lộ chi tiết.

## 10. Testing

- **Unit**: Zod validation cho AI output; URL validator; lexicon scorer; các util xử lý JSON.
- **Integration (Pages Functions)**: import idempotent; request dedup; vote rate limit; search trả đúng trạng thái (scored/pending/không tồn tại).
- **Extension**: dùng Vitest + jsdom mock DOM Threads để test scraper (chủ đề, comments, lazy-load giới hạn); test batch runner với mock tab.
- **Manual**: quy trình end-to-end request → batch → scoring → hiển thị trên một bài Threads thật.

## 11. Phạm vi ngoài (YAGNI — không làm ở phiên bản đầu)

- Không có hệ thống theo dõi bài viết định kỳ (polling cập nhật comments mới).
- Không có notification/email.
- Không có bảng xếp hạng người dùng/gamification.
- Không có admin UI quản lý xóa/sửa bài trực tiếp (chỉ qua D1 console hoặc sau này).
- Không hỗ trợ media (ảnh/video trong comments) — chỉ text.

## 12. Quyết định công nghệ

- Frontend: React + Vite SPA.
- Backend: Cloudflare Pages Functions.
- DB: Cloudflare D1 (SQLite). KV cho rate limit + lock.
- AI: OpenAI-compatible SDK, provider qua env vars.
- Extension: Manifest V3, vanilla JS hoặc React (tùy độ phức tạp), build bằng Vite.
- Auth: OAuth Google/GitHub (tùy chọn cho user, không bắt buộc).
- Quy trình phát triển: subagent-driven development, model deepseek-flash max effort cho subagent triển khai.
