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
            <div className="footer-links">
              <div className="footer-col">
                <h4>Sản phẩm</h4>
                <Link to="/">Trang chủ</Link>
                <a href="https://www.threads.net" target="_blank" rel="noreferrer">Threads</a>
              </div>
              <div className="footer-col">
                <h4>Tài khoản</h4>
                {user ? (
                  <button
                    type="button"
                    className="nav-link"
                    style={{ padding: '4px 0', color: 'inherit' }}
                    onClick={() => {
                      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
                        window.location.href = '/';
                      });
                    }}
                  >
                    Đăng xuất
                  </button>
                ) : (
                  <>
                    <a href="/api/auth/google/login">Đăng nhập Google</a>
                    <a href="/api/auth/github/login">Đăng nhập GitHub</a>
                  </>
                )}
              </div>
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
