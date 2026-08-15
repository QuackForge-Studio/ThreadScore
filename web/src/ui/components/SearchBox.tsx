import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MagnifyingGlass, WarningCircle } from '@phosphor-icons/react';
import { searchThreads, requestThread, ApiError } from '../api';

export default function SearchBox() {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<{ kind: string; state?: string; thread?: { id: string }; threads?: { id: string; url: string; title: string | null; author_username: string | null }[]; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSearch() {
    setError(null); setResult(null);
    if (!q.trim()) return;
    try {
      const r = await searchThreads(q.trim());
      if (r.kind === 'url') {
        if (r.state === 'scored' && r.thread) { navigate(`/t/${r.thread.id}`); return; }
        if (r.state === 'pending') { setResult({ kind: 'url', state: 'pending', message: 'Bài viết này đang được xử lý. Quay lại sau nhé.' }); return; }
        setResult({ kind: 'url', state: 'unknown', message: 'Bài viết này chưa có trên ThreadScore.' });
      } else {
        setResult({ kind: 'keyword', threads: r.threads, message: `Tìm thấy ${r.threads.length} bài viết.` });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Lỗi tìm kiếm');
    }
  }

  async function onRequest() {
    try {
      await requestThread(q.trim());
      setResult({ kind: 'url', state: 'pending', message: 'Đã gửi request. Chủ sở hữu sẽ import bài này sớm.' });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Lỗi gửi request');
    }
  }

  return (
    <div className="searchbox">
      <div className="searchbox-row">
        <div className="searchbox-input-wrap">
          <MagnifyingGlass className="searchbox-icon" aria-hidden="true" />
          <input
            id="searchbox-input"
            className="searchbox-input"
            placeholder="Tìm bài viết hoặc dán link Threads..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={onSearch}>Tìm</button>
      </div>
      {result && <p className="searchbox-result" data-testid="search-result">{result.message}</p>}
      {result?.kind === 'keyword' && (result.threads?.length ?? 0) > 0 && (
        <ul className="search-results">
          {result.threads!.map(t => (
            <li key={t.id} className="search-results-item">
              <Link to={`/t/${t.id}`} className="search-results-link">
                {t.title ?? 'Bài viết Threads'}
              </Link>
              {t.author_username && <span className="search-results-author">@{t.author_username}</span>}
            </li>
          ))}
        </ul>
      )}
      {result?.kind === 'url' && result.state === 'unknown' && (
        <button className="btn btn-primary searchbox-request" onClick={onRequest}>Request bài viết</button>
      )}
      {error && (
        <p className="error-text" role="alert">
          <WarningCircle aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
