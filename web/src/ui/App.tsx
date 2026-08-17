import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { GoogleLogo, GithubLogo } from '@phosphor-icons/react';
import HomePage from './pages/HomePage';
import ThreadPage from './pages/ThreadPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const [user, setUser] = useState<{ provider: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/me');
        if (!r.ok) throw new Error('unauthenticated');
        const b = await r.json() as { user: { provider: string; name: string } | null };
        if (!cancelled) setUser(b.user);
      } catch {
        if (!cancelled) setUser(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="noise" aria-hidden="true" />
        <header className="site-header">
          <Link to="/" className="site-logo">
            <img src="/ThreadScore.png?v=2" alt="ThreadScore Logo" className="logo-img" />
            <span>ThreadScore</span>
          </Link>
          <nav className="site-nav">
            {user ? (
              <>
                <span className="nav-user">{user.name || user.provider}</span>
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => {
                    fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
                      window.location.href = '/';
                    });
                  }}
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <a className="nav-link nav-google" href="/api/auth/google/login">
                  <GoogleLogo weight="bold" size={18} /> Đăng nhập Google
                </a>
                <a className="nav-link primary nav-github" href="/api/auth/github/login">
                  <GithubLogo weight="fill" size={18} /> Đăng nhập GitHub
                </a>
              </>
            )}
          </nav>
        </header>
        <main className="site-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/t/:id" element={<ThreadPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <span className="site-logo">
                <img src="/ThreadScore.png?v=2" alt="ThreadScore Logo" className="logo-img" />
                <span>ThreadScore</span>
              </span>
              <p>Đo nhiệt độ cảm xúc của cộng đồng Threads bằng AI — từng bình luận, từng bài viết.</p>
            </div>
            <div className="footer-disclaimer">
              <h4>Tuyên bố miễn trừ trách nhiệm &amp; Pháp lý</h4>
              <p>
                <b>Độc lập &amp; Phi liên kết:</b> ThreadScore là dự án nghiên cứu và phân tích dữ liệu độc lập, không trực thuộc, không được tài trợ, ủy quyền hay xác nhận bởi Meta Platforms, Inc. hoặc Threads. Tên gọi "Threads", logo và các nhãn hiệu liên quan thuộc toàn quyền sở hữu của Meta Platforms, Inc.
              </p>
              <p>
                <b>Phạm vi dữ liệu:</b> Dữ liệu bài viết và bình luận được trích xuất từ các nguồn công khai phục vụ mục đích nghiên cứu xu hướng và phân tích dữ liệu mở; do cơ chế phân trang và thuật toán của bên thứ ba, dữ liệu có thể không bao quát 100% tất cả phản hồi thực tế.
              </p>
              <p>
                <b>Đánh giá của AI:</b> Điểm số cảm xúc và phân loại nhiệt độ được mô hình ngôn ngữ lớn (LLM) tự động tính toán chỉ mang tính chất tham khảo, thống kê xu hướng, không cấu thành kết luận khẳng định hay ý kiến chủ quan về bất kỳ cá nhân, tổ chức nào.
              </p>
              <p>
                <b>Quyền riêng tư &amp; Gỡ bỏ:</b> Chúng tôi tôn trọng quyền tác giả và quyền riêng tư. Chủ sở hữu nội dung có quyền yêu cầu ẩn hoặc gỡ bỏ thông tin bài viết liên quan bất cứ lúc nào qua kênh liên hệ của QuackForge Studio.
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} ThreadScore</span>
            <div className="footer-credits">
              Powered by{' '}
              <a href="https://quackforge.io.vn" target="_blank" rel="noreferrer" className="footer-credit-link">
                QuackForge Studio
              </a>{' '}
              &amp;{' '}
              <a href="https://modelmart.io.vn" target="_blank" rel="noreferrer" className="footer-credit-link">
                ModelMart
              </a>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
