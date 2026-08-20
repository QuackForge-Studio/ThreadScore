import { ShieldCheck, ArrowLeft, EnvelopeSimple, Lock, Eye, Database, Trash, Scales, ShieldWarning } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Reveal } from '../components/motion';
import { useI18n } from '../i18n';

const PRIVACY = {
  vi: {
    back: 'Trở về trang chủ',
    eyebrow: 'Pháp Lý & Bảo Mật',
    title: 'Chính Sách Bảo Mật & Pháp Lý',
    updated: 'Cập nhật lần cuối: Tháng 8, 2026',
    s1t: '1. Dữ liệu chúng tôi thu thập',
    s1p: 'ThreadScore là nền tảng nghiên cứu và phân tích dữ liệu cảm xúc mở. Chúng tôi chỉ tiếp cận và xử lý các thông tin đã được đăng tải hoàn toàn CÔNG KHAI trên mạng xã hội Threads (threads.net / threads.com):',
    s1l1b: 'Nội dung công khai:',
    s1l1: 'Tiêu đề, nội dung bài viết gốc, danh sách bình luận công khai, tên tài khoản (@username) và số lượt thích.',
    s1l2b: 'Không thu thập dữ liệu riêng tư:',
    s1l2: 'Chúng tôi KHÔNG BAO GIỜ thu thập tin nhắn riêng tư (DM), bài viết trong chế độ riêng tư, mật khẩu, cookie đăng nhập hay thông tin thanh toán cá nhân.',
    s2t: '2. Mục đích xử lý dữ liệu & AI',
    s2p: 'Dữ liệu trích xuất từ Threads được xử lý thông qua mô hình ngôn ngữ lớn (AI LLM) nhằm các mục đích sau:',
    s2l1: 'Đo lường chỉ số nóng/lạnh và phân loại sắc thái cảm xúc (Bùng nổ · Trung lập · Vui vẻ).',
    s2l2: 'Tổng hợp thống kê xu hướng thảo luận cộng đồng.',
    s2l3: 'Chúng tôi TUYỆT ĐỐI KHÔNG bán dữ liệu cho bên thứ ba hoặc dùng cho mục đích quảng cáo theo dõi hành vi cá nhân.',
    s3t: '3. Tiện ích mở rộng (Chrome Extension)',
    s3p: 'Chrome Extension của ThreadScore hoạt động trực tiếp trên trình duyệt của bạn với nguyên tắc bảo mật cao nhất:',
    s3l1: 'Chỉ hoạt động khi bạn chủ động mở tab Threads và bấm nút "Quét bài viết".',
    s3l2: 'Không theo dõi lịch sử duyệt web ở bất kỳ trang web nào khác ngoài Threads.',
    s3l3: 'Không can thiệp vào tài khoản hay gửi bất kỳ hành động like/follow/comment nào thay mặt bạn.',
    s4t: '4. Quyền của Chủ sở hữu nội dung & Yêu cầu gỡ bỏ',
    s4p: 'Chúng tôi hoàn toàn tôn trọng quyền tác giả và quyền riêng tư của mọi cá nhân. Nếu bạn là tác giả bài viết hoặc chủ tài khoản có bình luận được hiển thị trên ThreadScore và muốn yêu cầu ẩn hoặc gỡ bỏ vĩnh viễn dữ liệu:',
    s4contact: 'Vui lòng gửi email đến: ',
    s4commit: 'Chúng tôi cam kết sẽ kiểm tra và gỡ bỏ dữ liệu liên quan trong vòng 24-48 giờ làm việc.',
    s5t: '5. Tuân thủ Pháp luật & Phối hợp với Cơ quan Chức năng / Chính quyền',
    s5p: 'ThreadScore luôn tôn trọng và tuân thủ nghiêm túc các quy định của pháp luật hiện hành, các quy chuẩn về an ninh mạng và an toàn thông tin:',
    s5l1b: 'Hợp tác với cơ quan nhà nước có thẩm quyền:',
    s5l1: 'Chúng tôi sẵn sàng tiếp nhận, phối hợp và chấp hành đầy đủ mọi quyết định, yêu cầu hợp pháp từ các cơ quan quản lý nhà nước, cơ quan bảo vệ pháp luật và các đơn vị hành pháp có thẩm quyền.',
    s5l2b: 'Xử lý vi phạm khẩn cấp:',
    s5l2: 'Khi nhận được văn bản, thông báo hoặc yêu cầu chính thức từ cơ quan chức năng liên quan đến nội dung vi phạm pháp luật (xâm hại an ninh quốc gia, kích động bạo lực, xúc phạm danh dự nhân phẩm, xuyên tạc sai sự thật hoặc vi phạm bản quyền), hệ thống sẽ lập tức phong tỏa, ẩn dữ liệu hoặc gỡ bỏ hoàn toàn bài viết liên quan.',
    s5l3b: 'Cung cấp dữ liệu theo trình tự luật định:',
    s5l3: 'ThreadScore chỉ cung cấp dữ liệu kỹ thuật hoặc nhật ký hệ thống trong phạm vi sẵn có khi có yêu cầu hợp pháp bằng văn bản đúng trình tự thủ tục tố tụng từ cơ quan điều tra hoặc cơ quan tài phán có thẩm quyền.',
    s6t: '6. Tuyên bố miễn trừ trách nhiệm nội dung bên thứ ba',
    s6p: 'ThreadScore vận hành như một công cụ máy móc thống kê và tổng hợp dữ liệu mở độc lập:',
    s6l1: 'Toàn bộ nội dung, câu chữ, phát ngôn trong bài viết và bình luận thuộc toàn quyền và trách nhiệm pháp lý cá nhân của người dùng trên nền tảng Threads gốc.',
    s6l2: 'ThreadScore không biên tập, không định hướng, không đại diện cho bất kỳ quan điểm chính trị, xã hội, tôn giáo hay lập trường của bất kỳ cá nhân hay tổ chức nào.',
    s6l3: 'Điểm số và phân tích cảm xúc do AI tạo ra mang tính chất tham khảo kỹ thuật - thống kê, không cấu thành kết luận khẳng định mang tính pháp lý hay ý kiến chủ quan của ban phát triển.',
    s7t: '7. Liên hệ với chúng tôi',
    s7p: 'Nếu bạn có bất kỳ câu hỏi, thắc mắc, phản hồi hoặc yêu cầu pháp lý nào liên quan đến ThreadScore, vui lòng liên hệ:',
    studio: 'Studio:',
    website: 'Website:',
    email: 'Email:',
  },
  en: {
    back: 'Back to home',
    eyebrow: 'Legal & Privacy',
    title: 'Privacy Policy & Legal Terms',
    updated: 'Last updated: August 2026',
    s1t: '1. Information We Collect',
    s1p: 'ThreadScore is an open sentiment research platform. We only access and process information that is publicly posted on Threads (threads.net / threads.com):',
    s1l1b: 'Public Content:',
    s1l1: 'Post title, text content, public comments, author username (@username), and public like counts.',
    s1l2b: 'No Private Data Collection:',
    s1l2: 'We NEVER collect direct messages (DMs), private posts, passwords, authentication session cookies, or personal banking credentials.',
    s2t: '2. Purpose of Processing & AI Scoring',
    s2p: 'Data extracted from Threads is processed via Large Language Models (LLMs) for the following purposes:',
    s2l1: 'Measuring heat indexes and categorizing emotional tone (Angry · Neutral · Positive).',
    s2l2: 'Aggregating community discussion trends.',
    s2l3: 'We DO NOT sell personal data to third parties or use it for behavioral ad targeting.',
    s3t: '3. Chrome Extension Privacy',
    s3p: 'The ThreadScore Chrome Extension runs locally in your browser adhering to strict privacy guidelines:',
    s3l1: 'Only activates when you explicitly open a Threads tab and click "Scrape Thread".',
    s3l2: 'Does not track or record your browsing history on any other website.',
    s3l3: 'Does not perform any actions (likes/follows/posts) on behalf of your Threads account.',
    s4t: '4. Content Owner Rights & Takedown Requests',
    s4p: 'We fully respect intellectual property and privacy rights. If you are a creator or user whose post or comment is indexed on ThreadScore and wish to request removal or masking:',
    s4contact: 'Please contact us via email: ',
    s4commit: 'We commit to reviewing and removing the requested data within 24-48 business hours.',
    s5t: '5. Legal Compliance & Government / Authority Cooperation',
    s5p: 'ThreadScore strictly adheres to applicable legal frameworks, cybersecurity, and data protection regulations:',
    s5l1b: 'Cooperation with Authorities:',
    s5l1: 'We cooperate fully with legitimate legal requests, court orders, and official directives issued by authorized government and law enforcement bodies.',
    s5l2b: 'Emergency Takedowns:',
    s5l2: 'Upon receipt of a valid notice or order from competent authorities regarding unlawful content (e.g. inciting violence, defamation, national security threats, or severe misinformation), we will promptly unindex, mask, or permanently remove the target data.',
    s5l3b: 'Data Disclosure Limits:',
    s5l3: 'We only disclose technical server logs or public metadata as strictly required by due legal process under applicable statutory requirements.',
    s6t: '6. Third-Party Content Disclaimer & Limitation of Liability',
    s6p: 'ThreadScore operates purely as an automated analytical and observational tool:',
    s6l1: 'All statements, opinions, and comments indexed originate from third-party Threads users who bear sole legal responsibility for their own posts.',
    s6l2: 'ThreadScore does not author, edit, endorse, or represent any political, social, religious, or personal views expressed on the source platform.',
    s6l3: 'Sentiment and drama scores are computed algorithmically by AI models for exploratory statistical reference only and do not constitute formal legal determinations.',
    s7t: '7. Contact Information',
    s7p: 'For legal notices, compliance queries, or takedown requests, please reach out to:',
    studio: 'Studio:',
    website: 'Website:',
    email: 'Email:',
  },
} as const;

export default function PrivacyPage() {
  const { lang } = useI18n();
  const m = PRIVACY[lang];

  return (
    <div className="page privacy-page">
      <div className="container">
        <Reveal>
          <Link to="/" className="thread-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-4)' }}>
            <ArrowLeft size={16} /> {m.back}
          </Link>

          <div className="privacy-header">
            <span className="section-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} weight="fill" color="var(--accent)" />
              {m.eyebrow}
            </span>
            <h1 className="section-title">{m.title}</h1>
            <p>{m.updated} · ThreadScore (QuackForge Studio)</p>
          </div>
        </Reveal>

        <div className="privacy-content">
          <Reveal delay={0.05}>
            <section className="privacy-card">
              <h2><Eye size={20} color="var(--accent)" /> {m.s1t}</h2>
              <p>{m.s1p}</p>
              <ul>
                <li><b>{m.s1l1b}</b> {m.s1l1}</li>
                <li><b>{m.s1l2b}</b> {m.s1l2}</li>
              </ul>
            </section>
          </Reveal>

          <Reveal delay={0.1}>
            <section className="privacy-card">
              <h2><Database size={20} color="var(--accent)" /> {m.s2t}</h2>
              <p>{m.s2p}</p>
              <ul>
                <li>{m.s2l1}</li>
                <li>{m.s2l2}</li>
                <li>{m.s2l3}</li>
              </ul>
            </section>
          </Reveal>

          <Reveal delay={0.15}>
            <section className="privacy-card">
              <h2><Lock size={20} color="var(--accent)" /> {m.s3t}</h2>
              <p>{m.s3p}</p>
              <ul>
                <li>{m.s3l1}</li>
                <li>{m.s3l2}</li>
                <li>{m.s3l3}</li>
              </ul>
            </section>
          </Reveal>

          <Reveal delay={0.2}>
            <section className="privacy-card">
              <h2><Trash size={20} color="var(--accent)" /> {m.s4t}</h2>
              <p>{m.s4p}</p>
              <p style={{ marginTop: '10px' }}>
                {m.s4contact}
                <a href="mailto:quackforge.studio@gmail.com" style={{ color: 'var(--accent-strong)', fontWeight: '700', textDecoration: 'underline' }}>
                  quackforge.studio@gmail.com
                </a>
              </p>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', marginTop: '4px' }}>{m.s4commit}</p>
            </section>
          </Reveal>

          <Reveal delay={0.25}>
            <section className="privacy-card">
              <h2><Scales size={20} color="var(--accent)" /> {m.s5t}</h2>
              <p>{m.s5p}</p>
              <ul>
                <li><b>{m.s5l1b}</b> {m.s5l1}</li>
                <li><b>{m.s5l2b}</b> {m.s5l2}</li>
                <li><b>{m.s5l3b}</b> {m.s5l3}</li>
              </ul>
            </section>
          </Reveal>

          <Reveal delay={0.3}>
            <section className="privacy-card">
              <h2><ShieldWarning size={20} color="var(--accent)" /> {m.s6t}</h2>
              <p>{m.s6p}</p>
              <ul>
                <li>{m.s6l1}</li>
                <li>{m.s6l2}</li>
                <li>{m.s6l3}</li>
              </ul>
            </section>
          </Reveal>

          <Reveal delay={0.35}>
            <section className="privacy-card">
              <h2><EnvelopeSimple size={20} color="var(--accent)" /> {m.s7t}</h2>
              <p>{m.s7p}</p>
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <p><b>{m.studio}</b> QuackForge Studio</p>
                <p><b>{m.website}</b> <a href="https://quackforge.io.vn" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-strong)' }}>https://quackforge.io.vn</a></p>
                <p><b>{m.email}</b> <a href="mailto:quackforge.studio@gmail.com" style={{ color: 'var(--accent-strong)' }}>quackforge.studio@gmail.com</a></p>
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
