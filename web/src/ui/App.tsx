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
          <nav className="site-nav" aria-label="Main">
            <div className="nav-lang" role="group" aria-label={t('nav.langLabel')}>
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
              className="nav-link nav-donate-btn"
              onClick={() => setIsDonateOpen(true)}
              title={t('nav.donateTitle')}
            >
              <Coffee size={15} weight="fill" color="var(--accent)" />
              <span>{t('nav.donate')}</span>
            </button>

            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={t('nav.themeTitle')}
              aria-label={theme === 'dark' ? t('theme.toggleLight') : t('theme.toggleDark')}
            >
              {theme === 'dark' ? (
                <Sun size={18} weight="bold" color="#FDB813" />
              ) : (
                <Moon size={18} weight="bold" color="var(--ink-2)" />
              )}
            </button>

            <a
              className="nav-link primary nav-github"
              href="https://github.com/QuackForge-Studio/ThreadScore"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub Repository"
            >
              <GithubLogo weight="fill" size={17} /> GitHub
            </a>
          </nav>
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
                <a href="mailto:quackforge.studio@gmail.com" className="footer-contact-link">
                  <EnvelopeSimple size={15} /> quackforge.studio@gmail.com
                </a>
              </div>

              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  className="footer-donate-btn"
                  onClick={() => setIsDonateOpen(true)}
                >
                  <Heart size={14} weight="fill" /> {t('footer.donate')}
                </button>
              </div>
            </div>
            <div className="footer-disclaimer">
              <h4>{t('footer.disclaimerTitle')}</h4>
              <p>{t('footer.disclaimer1')}</p>
              <p>{t('footer.disclaimer2')}</p>
              <p>{t('footer.disclaimer3')}</p>
              <p>
                <b>{t('footer.privacyTitle')}</b>{' '}
                {t('footer.privacyBody')}{' '}
                <a href="mailto:quackforge.studio@gmail.com" className="footer-credit-link">
                  quackforge.studio@gmail.com
                </a>.
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span>© {new Date().getFullYear()} ThreadScore</span>
              <Link to="/privacy" className="footer-credit-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} /> {t('footer.privacy')}
              </Link>
            </div>

            <div className="footer-credits">
              {t('footer.credits')}{' '}
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
