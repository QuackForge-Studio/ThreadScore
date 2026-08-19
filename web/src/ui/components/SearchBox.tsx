import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MagnifyingGlass, WarningCircle } from '@phosphor-icons/react';
import { searchThreads, requestThread, ApiError } from '../api';
import { useI18n } from '../i18n';

export default function SearchBox() {
  const { t, tf } = useI18n();
  const [q, setQ] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [result, setResult] = useState<{ kind: string; state?: string; thread?: { id: string }; threads?: { id: string; url: string; title: string | null; content?: string | null; author_username: string | null }[]; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSearch() {
    setError(null); setResult(null);
    if (!q.trim()) return;
    try {
      const r = await searchThreads(q.trim());
      if (r.kind === 'url') {
        if (r.state === 'scored' && r.thread) { navigate(`/t/${r.thread.id}`); return; }
        if (r.state === 'pending') { setResult({ kind: 'url', state: 'pending', message: t('sb.pending') }); return; }
        setResult({ kind: 'url', state: 'unknown', message: t('sb.unknown') });
      } else {
        setResult({ kind: 'keyword', threads: r.threads, message: tf('sb.found', { n: r.threads.length }) });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('sb.error'));
    }
  }

  async function onRequest() {
    try {
      await requestThread(q.trim());
      setResult({ kind: 'url', state: 'pending', message: t('sb.requestSent') });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('sb.requestError'));
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSearch();
  }

  return (
    <form className={`searchbox${isFocused ? ' is-focused' : ''}`} onSubmit={handleSubmit} role="search">
      <div className="searchbox-row">
        <div className="searchbox-input-wrap">
          <MagnifyingGlass size={18} weight="bold" className="searchbox-icon" aria-hidden="true" />
          <input
            id="searchbox-input"
            className="searchbox-input"
            type="text"
            inputMode="search"
            placeholder={t('sb.placeholder')}
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            aria-label={t('sb.placeholder')}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        <button type="submit" className="btn btn-primary">{t('sb.search')}</button>
      </div>
      {result && <p className="searchbox-result" data-testid="search-result">{result.message}</p>}
      {result?.kind === 'keyword' && (result.threads?.length ?? 0) > 0 && (
        <ul className="search-results">
          {result.threads!.map(tItem => {
            const displayTitle = (tItem.title && tItem.title !== 'Thread' && tItem.title.trim().length > 0)
              ? tItem.title
              : (tItem.content && tItem.content.trim().length > 0)
              ? (tItem.content.length > 80 ? tItem.content.slice(0, 80) + '...' : tItem.content)
              : (tItem.author_username ? `@${tItem.author_username}` : t('sb.fallback'));

            return (
              <li key={tItem.id} className="search-results-item">
                <Link to={`/t/${tItem.id}`} className="search-results-link">
                  {displayTitle}
                </Link>
                {tItem.author_username && <span className="search-results-author">@{tItem.author_username}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {result?.kind === 'url' && result.state === 'unknown' && (
        <button type="button" className="btn btn-primary searchbox-request" onClick={onRequest}>{t('sb.requestBtn')}</button>
      )}
      {error && (
        <p className="error-text" role="alert">
          <WarningCircle aria-hidden="true" /> {error}
        </p>
      )}
    </form>
  );
}
