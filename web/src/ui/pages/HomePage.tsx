import { useEffect, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { apiGet } from '../api';
import SearchBox from '../components/SearchBox';
import ThreadCard from '../components/ThreadCard';
import type { ThreadRecord } from '../../shared/types';

export default function HomePage() {
  const [threads, setThreads] = useState<ThreadRecord[]>([]);
  const [sort, setSort] = useState<'newest' | 'hottest' | 'most_comments'>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGet<{ threads: ThreadRecord[] }>(`/api/threads?sort=${sort}&limit=50&offset=0`)
      .then(r => { if (!cancelled) setThreads(r.threads); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sort]);

  return (
    <div className="page">
      <section className="hero">
        <span className="hero-eyebrow">Chấm điểm tức giận bằng AI</span>
        <h1 className="hero-title">
          Bài nào đang <span className="accent">bùng nổ</span>?
        </h1>
        <p className="hero-subtitle">
          Dán link Threads vào để xem từng bình luận được chấm điểm tức giận từ 0 đến 100.
        </p>
        <div className="spectrum" aria-label="Quang phổ điểm">
          <span className="spectrum-item">
            <span className="spectrum-dot anger" />
            Bùng nổ <span className="spectrum-range">70-100</span>
          </span>
          <span className="spectrum-item">
            <span className="spectrum-dot neutral" />
            Trung lập <span className="spectrum-range">30-69</span>
          </span>
          <span className="spectrum-item">
            <span className="spectrum-dot calm" />
            Vui vẻ <span className="spectrum-range">0-29</span>
          </span>
        </div>
      </section>

      <SearchBox />

      <div className="sort-tabs">
        {(['newest', 'hottest', 'most_comments'] as const).map(s => (
          <button key={s} className={`sort-tab${sort === s ? ' active' : ''}`} onClick={() => setSort(s)}>
            {s === 'newest' ? 'Mới nhất' : s === 'hottest' ? 'Nóng nhất' : 'Nhiều bình luận'}
          </button>
        ))}
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <WarningCircle aria-hidden="true" /> {error}
        </div>
      )}
      {loading ? (
        <div className="skeleton-list">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      ) : (
        <>
          {threads.map(t => <ThreadCard key={t.id} thread={t} />)}
          {threads.length === 0 && !error && (
            <div className="empty-state">
              <p className="empty-title">Chưa có bài viết nào</p>
              <p className="empty-subtitle">Dán link Threads vào ô tìm kiếm để request bài đầu tiên</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
