import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
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
      <header className="site-header">
        <Link to="/" className="site-logo">
          ThreadScore
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
              <a className="nav-link" href="/api/auth/google/login">
                Đăng nhập Google
              </a>
              <a className="nav-link" href="/api/auth/github/login">
                Đăng nhập GitHub
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
    </BrowserRouter>
  );
}
