# ThreadScore UI/UX Design Spec

Ngày: 2026-08-13
Trạng thái: Dùng cho Task 8 (Frontend UI) — file này OVERRIDE phần styling trong plan; logic, routes, API calls giữ nguyên theo plan.

## Design Read

**Reading this as:** product UI kiểu cộng đồng (feed + thread detail) cho người dùng web Việt Nam, vibe "social but calm" giống Threads gốc nhưng sạch hơn, leaning toward native CSS + hệ thống token đơn giản, không cần design system nặng.

**Dials:** VARIANCE 4 / MOTION 2 / DENSITY 5. Motion gần như tĩnh (chỉ hover/active transitions), không animation phô trương vì đây là app đọc nội dung.

## 1. Design Tokens

```css
:root {
  /* Nền & chữ */
  --bg: #ffffff;
  --bg-soft: #fafafa;
  --surface: #ffffff;
  --border: #e5e5e5;
  --border-soft: #f0f0f0;
  --text: #171717;          /* off-black, không phải #000 */
  --text-muted: #737373;
  --text-faint: #a3a3a3;

  /* Semantic 3 nhãn — KHỚP labels.ts, đây là màu dữ liệu không phải accent */
  --anger: #e5484d;         /* BÙNG NỔ */
  --neutral: #8d8d8d;       /* TRUNG LẬP */
  --calm: #2f9e6e;          /* VUI VẺ */

  /* Accent duy nhất cho toàn site: off-black (giống Threads/Meta vibe) */
  --accent: #171717;
  --accent-hover: #333333;
  --accent-text: #ffffff;

  /* Hình dạng: một thang radius duy nhất */
  --radius-card: 12px;
  --radius-input: 8px;
  --radius-pill: 999px;     /* chỉ cho badge nhãn cảm xúc */

  /* Spacing chuẩn */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px;

  /* Font */
  --font-sans: 'Geist', -apple-system, 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, 'SF Mono', Consolas, monospace;
}
```

**Font rule:** Geist cho chữ thường, Geist Mono cho số điểm (score). Self-host qua file .woff2 trong `web/public/fonts/`, không dùng Google Fonts CDN. Nếu không tải được file font, fallback system-ui là chấp nhận được — KHÔNG dùng Inter.

**Dark mode:** không làm ở v1 (YAGNI). Light-only, nền trắng.

**Shape lock:** card 12px, input/button 8px, badge nhãn cảm xúc pill. Không có radius lẫn lộn khác.

## 2. Layout chung

- Container: `max-width: 720px; margin: 0 auto; padding: 0 16px;` — cột đơn hẹp kiểu feed, không phải landing 1400px.
- Header: cao 56px, sticky top, nền trắng + `border-bottom: 1px solid var(--border-soft)`. Trái: logo chữ "ThreadScore" (bold, 18px, màu --text). Phải: 1 link "Đăng nhập" (khi chưa login) hiển thị text-muted, hover text.
- Page title (Home/Admin): 24px bold, margin-bottom 16px.
- Section spacing: `--space-6` giữa các block chính.

## 3. Components

### 3.1 SearchBox (trang chủ, trên cùng)
- Input cao 40px, border 1px --border, radius --radius-input, focus ring 2px màu --accent (outline offset 2px).
- Placeholder: "Tìm bài viết hoặc dán link Threads..."
- Nút "Tìm" bên phải: nền --accent, chữ trắng, radius --radius-input, padding 8px 16px, active scale 0.98.
- Kết quả tìm kiếm hiện ngay dưới dạng 1 dòng text-muted.
- Nút "Request bài viết" (khi bài chưa có): nền --accent, chữ trắng.
- Lỗi: text --anger, cỡ 14px.

### 3.2 ThreadCard (trang chủ)
- Card: nền --surface, border 1px --border-soft, radius 12px, padding 16px, margin-bottom 12px, hover `border-color: var(--border)`.
- Tiêu đề: 16px semibold --text, hover underline. Link tới /t/:id.
- Meta row dưới tiêu đề: 13px --text-muted, format: `@username - 128 bình luận - 2 giờ trước` (thời gian tương đối).
- HeatGauge: thanh 3 màu cao 8px, radius 4px, full width, title tooltip "Bùng nổ: 45 | Trung lập: 30 | Vui vẻ: 25". Màu theo đúng LABEL_COLORS.
- Điểm trung bình: font-mono 14px, hiển thị "Điểm tức giận TB: **73.5**/100", số bold. Badge trạng thái "Đang chấm điểm..." là pill 12px nền --bg-soft, text --text-faint, border --border-soft.

### 3.3 ThreadPage (trang chi tiết)
Thứ tự khối từ trên xuống:
1. **Tiêu đề** (h1, 22px bold) + meta row (tác giả, link "Xem trên Threads" màu --text-muted underline, thời gian).
2. **Nội dung chủ đề gốc**: 15px, line-height 1.6, max-width 65ch, màu --text.
3. **Bảng tổng kết** (chỉ khi đã scored): 1 card chứa: HeatGauge + 3 con số nhỏ (font-mono): "Bùng nổ 45", "Trung lập 30", "Vui vẻ 25" + điểm TB lớn 28px font-mono bold.
4. **Bộ lọc**: 4 nút dạng tabs text (không viền): "Tất cả | Bùng nổ | Trung lập | Vui vẻ". Nút active: chữ --text + border-bottom 2px --accent. Inactive: --text-muted.
5. **Danh sách comments**: mỗi comment là CommentCard.

### 3.4 CommentCard
- Card: border 1px --border-soft, radius 12px, padding 14px, margin-bottom 10px.
- Border-left 3px màu theo nhãn (--anger/--neutral/--calm) — đây là tín hiệu scan nhanh.
- Text comment: 14px --text, line-height 1.5.
- Meta: 12px --text-faint, format `@username - 12 thích`.
- ScoreBar: cao 6px, nền --bg-soft (radius 3px), fill màu nhãn. Số điểm font-mono 14px bold cạnh bên.
- Nhãn: pill nền màu nhãn 12% opacity, chữ màu nhãn đậm, 12px semibold, padding 2px 10px.
- Lý do AI: 13px --text-muted, prefix "Vì sao: ".
- VoteButtons: 2 nút nhỏ (13px) "AI chấm đúng (3)" / "AI chấm sai (1)" — nút ghost: nền trong suốt, border 1px --border, radius 8px; sau khi vote: nút đã chọn có nền --bg-soft + border --accent. "Tin cậy 75%" hiện 12px --text-muted khi tổng vote ≥ 3.
- Comment chưa có score: text-faint italic "Đang chờ chấm điểm...", không có ScoreBar.

### 3.5 DiscussionBox (khu thảo luận)
- Tiêu đề "Thảo luận" 16px bold, margin-top 32px, border-top 1px --border-soft padding-top 16px.
- Comment người dùng: tên bold 13px + nội dung 14px, border-bottom --border-soft, padding 8px 0.
- Form: label trên input (không placeholder-as-label): "Tên hiển thị (không bắt buộc)" + "Bình luận của bạn". Textarea rows=3. Nút "Gửi bình luận" nền --accent chữ trắng, disabled: nền --bg-soft chữ --text-faint.
- Error dưới form: 13px --anger.

### 3.6 AdminPage
- Input secret key: type=password, label "Admin secret key", placeholder "Nhập secret key".
- Nút: "Tải queue" (ghost), "Chạy scoring worker" (ghost), "Import" (primary --accent).
- Danh sách request pending: hàng 13px font-mono, màu --text-muted.
- Textarea upload JSON: font-mono 12px, border --border.

### 3.7 VoteButtons a11y
- Đảm bảo contrast: chữ --text trên nút ghost trắng = 15:1. Nút primary --accent (#171717) chữ trắng = 16:1. Badge nhãn: chữ đậm màu nhãn trên nền 12% opacity — kiểm tra ≥ 4.5:1 (đỏ #e5484d trên nền ~#fdeaea ≈ 4.6:1 đạt).

## 4. States (bắt buộc)

- **Loading Home:** 3 skeleton card (nền --bg-soft, radius 12px, cao ~120px, subtle pulse qua opacity 0.6-1, `prefers-reduced-motion` thì tĩnh).
- **Loading ThreadPage:** skeleton giống layout thật (title bar + 4 comment bars).
- **Empty Home:** khối giữa trang: icon nhỏ + "Chưa có bài viết nào" (16px semibold) + "Dán link Threads vào ô tìm kiếm để request bài đầu tiên" (14px --text-muted).
- **Error:** banner inline đầu trang, nền #fdeaea (12% anger), chữ --anger, radius 8px, padding 12px.
- **Rate limit 429:** giữ nguyên message từ API, hiển thị trong error banner, KHÔNG hiện alert().

## 5. Copy chuẩn (tiếng Việt, không em-dash, không "…" trang trí)

- Logo: "ThreadScore"
- Sort tabs: "Mới nhất" / "Nóng nhất" / "Nhiều bình luận"
- Filter tabs: "Tất cả" / "Bùng nổ" / "Trung lập" / "Vui vẻ"
- Vote: "AI chấm đúng" / "AI chấm sai"; "Tin cậy 75%"
- Điểm TB: "Điểm tức giận trung bình"
- Pending: "Đang chấm điểm..."
- Request: "Request bài viết"; đã gửi: "Đã gửi request. Chủ sở hữu sẽ import bài này sớm."
- Đã tồn tại: "Bài viết này đã có trên ThreadScore."
- Đang xử lý: "Bài viết này đang được xử lý. Quay lại sau nhé."
- Thảo luận: "Gửi bình luận"
- Admin: "Tải queue" / "Chạy scoring worker" / "Import JSON"

Quy tắc copy: không em-dash (—), không dấu chấm lửng trang trí, không từ "Elevate/Seamless/Unleash", viết như người Việt nói chuyện bình thường.

## 6. Kỹ thuật (constraints cho implementer)

- CSS: 1 file `web/src/ui/styles.css` import trong main.tsx. Không CSS framework, không Tailwind (project nhỏ, token CSS là đủ).
- Không dùng inline styles trừ khi cần giá trị động (width ScoreBar, HeatGauge segments — dùng style prop cho width %).
- Icons: cài `@phosphor-icons/react` (family duy nhất). Chỉ dùng 2-3 icon: MagnifyingGlass (search), CaretDown (sort, nếu cần), WarningCircle (error). Không hand-roll SVG.
- Time tương đối: hàm nhỏ `formatRelativeTime(unixSeconds)` trong `web/src/ui/format.ts` — "vừa xong", "5 phút trước", "2 giờ trước", "3 ngày trước", sau 30 ngày hiện "dd/mm/yyyy".
- Animation: chỉ transition 150ms ease trên hover/active + skeleton pulse. Tôn trọng `prefers-reduced-motion`.
- Không emoji, không em-dash ở bất kỳ chuỗi UI nào.
- Test UI (SearchBox, ThreadPage) trong plan vẫn phải pass — chỉ thay đổi class/style, KHÔNG đổi text tìm kiếm trong test (placeholder, button text "Tìm", "Request bài viết", "85.0/100" format giữ nguyên).

## 7. Acceptance checklist (nhanh)

- [ ] Không có em-dash trong bất kỳ chuỗi hiển thị nào
- [ ] 3 màu nhãn đúng #e5484d / #8d8d8d / #2f9e6e
- [ ] Một accent duy nhất (#171717) cho mọi nút primary/link active
- [ ] Radius nhất quán: card 12 / input-button 8 / badge pill
- [ ] Skeleton loading + empty state + error banner đều có
- [ ] Contrast nút và badge đạt WCAG AA
- [ ] Font không phải Inter; score dùng font-mono
- [ ] Test plan (SearchBox + ThreadPage) vẫn xanh
- [ ] `npm run build` thành công
