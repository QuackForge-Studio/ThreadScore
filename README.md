# 🦆 ThreadScore

Nền tảng đo lường & phân tích mức độ cảm xúc, tranh luận và "nhiệt độ" thảo luận trong các bài viết Threads của cộng đồng.

---

## 🌟 Tính năng chính

- **Chấm điểm cảm xúc đa tầng**: Kết hợp từ điển phân tích từ ngữ tiếng Việt (Lexicon) và LLM (Gemini) để đánh giá chỉ số toxic, hài hước, đồng thuận và mức độ phẫn nộ.
- **Tiện ích mở rộng Chrome (MV3 Extension)**:
  - Tự động cào bình luận và các nhánh trả lời con (sub-replies) trực tiếp từ Meta Threads.
  - Tích hợp **GraphQL Interceptor** và **JSON Hydration scanner** giúp thu thập dữ liệu với độ chính xác cao và đầy đủ số lượt like, thời gian, tác giả.
  - Hỗ trợ chế độ cào thủ công (Interactive Test Scrape & Highlight) và quét tự động hàng đợi (Background Batch Queue).
- **Kiến trúc Serverless Edge**: Chạy hoàn toàn trên Cloudflare Pages Functions, Cloudflare D1 (SQL) và Cloudflare KV, tối ưu chi phí và tốc độ phản hồi cực nhanh.

---

## 📂 Cấu trúc Repository

```text
ThreadScore/
├── web/               # Ứng dụng Web (React + Vite) & Cloudflare Pages Functions API
│   ├── functions/     # Edge API endpoints (Cloudflare Pages Functions)
│   ├── migrations/    # D1 SQL Database schema
│   ├── src/           # Giao diện UI và Server services (chấm điểm, session, OAuth)
│   └── cron-worker/   # Cloudflare Worker Cron trigger hỗ trợ chấm điểm nền
├── extension/         # Chrome MV3 Extension (Sidepanel + Content Scripts + Interceptor)
└── docs/              # Tài liệu thiết kế & đặc tả hệ thống
```

---

## 🚀 Hướng dẫn triển khai Web (Cloudflare Pages)

### 1. Yêu cầu môi trường
- Node.js >= 18
- Tài khoản Cloudflare

### 2. Cài đặt & Cấu hình cơ sở dữ liệu
```bash
cd web
npm install

# Tạo Cloudflare D1 database
npx wrangler d1 create threadscore-db
# Copy database_id vào web/wrangler.toml

# Tạo Cloudflare KV namespace
npx wrangler kv namespace create KV
# Copy kv id vào web/wrangler.toml

# Chạy migration tạo bảng dữ liệu
npx wrangler d1 execute threadscore-db --file=migrations/0001_initial.sql
```

### 3. Biến môi trường (.dev.vars)
Tạo file `.dev.vars` (tham khảo `web/.dev.vars.example`):
- `ADMIN_SECRET_KEY`: Khóa bí mật dùng để xác thực request gửi dữ liệu từ Extension.
- `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`: Cấu hình LLM chấm điểm (tùy chọn; nếu không điền sẽ tự động dùng Lexicon Tiếng Việt).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth Google (tùy chọn).
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: OAuth GitHub (tùy chọn).
- `CRON_SECRET`: Khóa bảo vệ endpoint `/api/cron/scoring` (tùy chọn).

### 4. Chạy cục bộ & Triển khai
```bash
# Chạy Frontend Dev
npm run dev

# Build production
npm run build

# Deploy lên Cloudflare Pages
npx wrangler pages deploy dist
```

---

## 🧩 Cài đặt Chrome Extension

1. Build tiện ích:
   ```bash
   cd extension
   npm install
   npm run build
   ```
2. Mở trình duyệt Chrome: truy cập `chrome://extensions`.
3. Bật **Developer mode** (Chế độ dành cho nhà phát triển).
4. Chọn **Load unpacked** (Tải tiện ích đã giải nén) và trỏ tới thư mục `extension/dist`.
5. Mở Sidepanel của tiện ích, vào Cài đặt và nhập:
   - **Web URL**: URL trang web ThreadScore của bạn (ví dụ: `https://threadscore.quackforge.io.vn` hoặc `http://localhost:5173`).
   - **Admin Key**: Khóa trùng khớp với `ADMIN_SECRET_KEY` trên server.

---

## 🧪 Kiểm thử (Tests)

```bash
# Chạy Unit Tests cho Web
cd web && npm test

# Chạy Unit Tests cho Extension
cd extension && npm test
```

---

## 📄 Giấy phép (License)

Dự án được phân phối dưới giấy phép **MIT License**. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

