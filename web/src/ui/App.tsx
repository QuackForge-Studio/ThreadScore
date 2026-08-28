import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { GithubLogo, Sun, Moon, EnvelopeSimple, Coffee, Heart, ShieldCheck } from '@phosphor-icons/react';
import HomePage from './pages/HomePage';
import ThreadPage from './pages/ThreadPage';
import AdminPage from './pages/AdminPage';
import PrivacyPage from './pages/PrivacyPage';
import DonateModal from './components/DonateModal';
import { ThemeProvider, useTheme } from './theme';
import { I18nProvider, useI18n } from './i18n';

function AppContent() {
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();

  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="noise" aria-hidden="true" />
        <header className="site-header">
          <Link to="/" className="site-logo">
            <img src="/ThreadScore.png?v=2" alt="ThreadScore Logo" className="logo-img" />
            <span>ThreadScore</span>
          </Link>
        </header>

        <main className="site-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/t/:id" element={<ThreadPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Routes>
        </main>

        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <span className="site-logo">
                <img src="/ThreadScore.png?v=2" alt="ThreadScore Logo" className="logo-img" />
                <span>ThreadScore</span>
              </span>
              <p>{t('footer.brandDesc')}</p>

              <div className="footer-contact-row">
                <a href="mailto:support@quackforge.xyz" className="footer-contact-link">
                  <EnvelopeSimple size={15} /> support@quackforge.xyz
                </a>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="footer-donate-btn"
                  onClick={() => setIsDonateOpen(true)}
                >
                  <Heart size={14} weight="fill" /> {t('footer.donate')}
                </button>

                <a
                  className="footer-github-btn"
                  href="https://github.com/QuackForge-Studio/ThreadScore"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="GitHub Repository"
                >
                  <GithubLogo weight="fill" size={15} /> GitHub
                </a>
              </div>
            </div>
            <div className="footer-disclaimer">
              <h4>{t('footer.disclaimerTitle')}</h4>
              <p>{t('footer.disclaimerSummary')}</p>
              <div className="footer-legal-links-row">
                <a
                  href="https://quackcraft.quackforge.xyz/dieu-khoan-dich-vu.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-legal-action-link"
                >
                  Điều khoản dịch vụ
                </a>
                <span className="footer-legal-sep">·</span>
                <a
                  href="https://quackcraft.quackforge.xyz/chinh-sach-bao-mat.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-legal-action-link"
                >
                  Chính sách bảo mật
                </a>
                <span className="footer-legal-sep">·</span>
                <a
                  href="https://quackcraft.quackforge.xyz/chinh-sach-thanh-toan.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-legal-action-link"
                >
                  Chính sách thanh toán & Hoàn tiền
                </a>
              </div>

              <div className="footer-business-info" style={{ marginTop: '8px', fontSize: '11.5px', lineHeight: '1.6', color: 'rgba(255, 253, 248, 0.4)' }}>
                <p style={{ margin: '0 0 2px' }}>
                  <strong style={{ color: 'rgba(255, 253, 248, 0.7)' }}>CHỦ SỞ HỮU WEBSITE: HỘ KINH DOANH QUACKFORGE</strong> · MST: <strong style={{ color: 'rgba(255, 253, 248, 0.7)' }}>083204010221</strong> (UBND Xã An Định cấp ngày 04/08/2026)
                </p>
                <p style={{ margin: '0 0 2px' }}>
                  Đại diện: <strong style={{ color: 'rgba(255, 253, 248, 0.7)' }}>Lương Duy Khang</strong> · Địa chỉ: <strong>số 135, Ấp Phú Lộc Thượng, Xã An Định, Tỉnh Vĩnh Long</strong>
                </p>
                <p style={{ margin: 0 }}>
                  Điện thoại liên hệ: <a href="tel:0943505127" style={{ color: 'inherit', textDecoration: 'underline' }}>0943505127</a> · Email: <a href="mailto:support@quackforge.xyz" style={{ color: 'inherit', textDecoration: 'underline' }}>support@quackforge.xyz</a>
                </p>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div>
              <span>© {new Date().getFullYear()} ThreadScore</span>
            </div>

            <div className="footer-actions-row">
              <div className="footer-lang" role="group" aria-label={t('nav.langLabel')}>
                <button
                  type="button"
                  className={`lang-btn ${lang === 'vi' ? 'active' : ''}`}
                  onClick={() => setLang('vi')}
                >
                  VI
                </button>
                <button
                  type="button"
                  className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                  onClick={() => setLang('en')}
                >
                  EN
                </button>
              </div>

              <button
                type="button"
                className="theme-toggle-btn footer-theme-toggle"
                onClick={toggleTheme}
                title={t('nav.themeTitle')}
                aria-label={theme === 'dark' ? t('theme.toggleLight') : t('theme.toggleDark')}
              >
                {theme === 'dark' ? (
                  <Sun size={16} weight="bold" color="#FDB813" />
                ) : (
                  <Moon size={16} weight="bold" color="rgba(255, 253, 248, 0.8)" />
                )}
              </button>

              <div className="footer-credits">
                {t('footer.credits')}{' '}
                <a href="https://quackforge.xyz" target="_blank" rel="noreferrer" className="footer-credit-link">
                  QuackForge Studio
                </a>{' '}
                &amp;{' '}
                <a href="https://modelmart.io.vn" target="_blank" rel="noreferrer" className="footer-credit-link">
                  ModelMart
                </a>
              </div>
            </div>
          </div>
        </footer>

        <DonateModal isOpen={isDonateOpen} onClose={() => setIsDonateOpen(false)} />
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </ThemeProvider>
  );
}
