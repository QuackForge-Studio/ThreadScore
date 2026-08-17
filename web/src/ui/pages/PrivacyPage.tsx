import { ShieldCheck, ArrowLeft, EnvelopeSimple, Lock, Eye, Database, Trash } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Reveal } from '../components/motion';
import { useI18n } from '../i18n';

export default function PrivacyPage() {
  const { lang } = useI18n();

  return (
    <div className="page privacy-page">
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-6) var(--space-4)' }}>
        <Reveal>
          <Link to="/" className="thread-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-4)' }}>
            <ArrowLeft size={16} /> {lang === 'vi' ? 'Trở về trang chủ' : 'Back to home'}
          </Link>
          
          <div className="privacy-header" style={{ marginBottom: 'var(--space-6)' }}>
            <span className="section-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} weight="fill" color="var(--accent)" />
              {lang === 'vi' ? 'Pháp Lý & Bảo Mật' : 'Legal & Privacy'}
            </span>
            <h1 className="section-title" style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', marginTop: '8px' }}>
              {lang === 'vi' ? 'Chính Sách Bảo Mật' : 'Privacy Policy'}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px' }}>
              {lang === 'vi' ? 'Cập nhật lần cuối: Tháng 8, 2026' : 'Last updated: August 2026'} · ThreadScore (QuackForge Studio)
            </p>
          </div>
        </Reveal>

        <div className="privacy-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: '1.7', color: 'var(--ink-2)' }}>
          <Reveal delay={0.05}>
            <section className="privacy-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ink)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={20} color="var(--accent)" />
                {lang === 'vi' ? '1. Dữ liệu chúng tôi thu thập' : '1. Information We Collect'}
              </h2>
              <p>
                {lang === 'vi'
                  ? 'ThreadScore là nền tảng nghiên cứu và phân tích dữ liệu cảm xúc mở. Chúng tôi chỉ tiếp cận và xử lý các thông tin đã được đăng tải hoàn toàn CÔNG KHAI trên mạng xã hội Threads (threads.net / threads.com):'
                  : 'ThreadScore is an open sentiment research platform. We only access and process information that is publicly posted on Threads (threads.net / threads.com):'}
              </p>
              <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>
                  <b>{lang === 'vi' ? 'Nội dung công khai:' : 'Public Content:'}</b>{' '}
                  {lang === 'vi'
                    ? 'Tiêu đề, nội dung bài viết gốc, danh sách bình luận công khai, tên tài khoản (@username) và số lượt thích.'
                    : 'Post title, text content, public comments, author username (@username), and public like counts.'}
                </li>
                <li>
                  <b>{lang === 'vi' ? 'Không thu thập dữ liệu riêng tư:' : 'No Private Data Collection:'}</b>{' '}
                  {lang === 'vi'
                    ? 'Chúng tôi KHÔNG BAO GIỜ thu thập tin nhắn riêng tư (DM), bài viết trong chế độ riêng tư, mật khẩu, cookie đăng nhập hay thông tin thanh toán cá nhân.'
                    : 'We NEVER collect direct messages (DMs), private posts, passwords, authentication session cookies, or personal banking credentials.'}
                </li>
              </ul>
            </section>
          </Reveal>

          <Reveal delay={0.1}>
            <section className="privacy-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ink)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={20} color="var(--accent)" />
                {lang === 'vi' ? '2. Mục đích xử lý dữ liệu & AI' : '2. Purpose of Processing & AI Scoring'}
              </h2>
              <p>
                {lang === 'vi'
                  ? 'Dữ liệu trích xuất từ Threads được xử lý thông qua mô hình ngôn ngữ lớn (AI LLM) nhằm các mục đích sau:'
                  : 'Data extracted from Threads is processed via Large Language Models (LLMs) for the following purposes:'}
              </p>
              <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>{lang === 'vi' ? 'Đo lường chỉ số nóng/lạnh và phân loại sắc thái cảm xúc (Bùng nổ · Trung lập · Vui vẻ).' : 'Measuring heat indexes and categorizing emotional tone (Angry · Neutral · Positive).'}</li>
                <li>{lang === 'vi' ? 'Tổng hợp thống kê xu hướng thảo luận cộng đồng.' : 'Aggregating community discussion trends.'}</li>
                <li>{lang === 'vi' ? 'Chúng tôi TUYỆT ĐỐI KHÔNG bán dữ liệu cho bên thứ ba hoặc dùng cho mục đích quảng cáo theo dõi hành vi cá nhân.' : 'We DO NOT sell personal data to third parties or use it for behavioral ad targeting.'}</li>
              </ul>
            </section>
          </Reveal>

          <Reveal delay={0.15}>
            <section className="privacy-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ink)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} color="var(--accent)" />
                {lang === 'vi' ? '3. Tiện ích mở rộng (Chrome Extension)' : '3. Chrome Extension Privacy'}
              </h2>
              <p>
                {lang === 'vi'
                  ? 'Chrome Extension của ThreadScore hoạt động trực tiếp trên trình duyệt của bạn với nguyên tắc bảo mật cao nhất:'
                  : 'The ThreadScore Chrome Extension runs locally in your browser adhering to strict privacy guidelines:'}
              </p>
              <ul style={{ paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>{lang === 'vi' ? 'Chỉ hoạt động khi bạn chủ động mở tab Threads và bấm nút "Quét bài viết".' : 'Only activates when you explicitly open a Threads tab and click "Scrape Thread".'}</li>
                <li>{lang === 'vi' ? 'Không theo dõi lịch sử duyệt web ở bất kỳ trang web nào khác ngoài Threads.' : 'Does not track or record your browsing history on any other website.'}</li>
                <li>{lang === 'vi' ? 'Không can thiệp vào tài khoản hay gửi bất kỳ hành động like/follow/comment nào thay mặt bạn.' : 'Does not perform any actions (likes/follows/posts) on behalf of your Threads account.'}</li>
              </ul>
            </section>
          </Reveal>

          <Reveal delay={0.2}>
            <section className="privacy-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ink)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash size={20} color="var(--accent)" />
                {lang === 'vi' ? '4. Quyền của Chủ sở hữu nội dung & Yêu cầu gỡ bỏ' : '4. Content Owner Rights & Takedown Requests'}
              </h2>
              <p>
                {lang === 'vi'
                  ? 'Chúng tôi hoàn toàn tôn trọng quyền tác giả và quyền riêng tư của mọi cá nhân. Nếu bạn là tác giả bài viết hoặc chủ tài khoản có bình luận được hiển thị trên ThreadScore và muốn yêu cầu ẩn hoặc gỡ bỏ vĩnh viễn dữ liệu:'
                  : 'We fully respect intellectual property and privacy rights. If you are a creator or user whose post or comment is indexed on ThreadScore and wish to request removal or masking:'}
              </p>
              <p style={{ marginTop: '10px' }}>
                👉 {lang === 'vi' ? 'Vui lòng gửi email đến: ' : 'Please contact us via email: '}
                <a href="mailto:quackforge.studio@gmail.com" style={{ color: 'var(--accent-strong)', fontWeight: '700', textDecoration: 'underline' }}>
                  quackforge.studio@gmail.com
                </a>
              </p>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', marginTop: '4px' }}>
                {lang === 'vi'
                  ? 'Chúng tôi cam kết sẽ kiểm tra và gỡ bỏ dữ liệu liên quan trong vòng 24–48 giờ làm việc.'
                  : 'We commit to reviewing and removing the requested data within 24–48 business hours.'}
              </p>
            </section>
          </Reveal>

          <Reveal delay={0.25}>
            <section className="privacy-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--ink)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <EnvelopeSimple size={20} color="var(--accent)" />
                {lang === 'vi' ? '5. Liên hệ với chúng tôi' : '5. Contact Information'}
              </h2>
              <p>
                {lang === 'vi'
                  ? 'Nếu bạn có bất kỳ câu hỏi, thắc mắc hoặc phản hồi nào về Chính sách bảo mật của ThreadScore, vui lòng liên hệ:'
                  : 'If you have any questions or concerns regarding our Privacy Policy, please reach out to:'}
              </p>
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <p><b>Studio:</b> QuackForge Studio</p>
                <p><b>Website:</b> <a href="https://quackforge.io.vn" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-strong)' }}>https://quackforge.io.vn</a></p>
                <p><b>Email:</b> <a href="mailto:quackforge.studio@gmail.com" style={{ color: 'var(--accent-strong)' }}>quackforge.studio@gmail.com</a></p>
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
