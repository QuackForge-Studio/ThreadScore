import { useEffect, useState } from 'react';
import { WarningCircle, Fire, Eye, NewspaperClipping } from '@phosphor-icons/react';
import { apiGet } from '../api';
import SearchBox from '../components/SearchBox';
import ThreadCard from '../components/ThreadCard';
import OverallHeat from '../components/OverallHeat';
import AccordionSlices from '../components/AccordionSlices';
import { Reveal, CountUp } from '../components/motion';
import type { ThreadRecord, OverallStats } from '../../shared/types';

const SLICES = [
  {
    title: 'Bài nào đang bùng nổ',
    desc: 'Xếp hạng nóng theo điểm tức giận trung bình, cập nhật theo từng đợt chấm điểm.',
    chip: 'bảng nhiệt',
    img: 'https://picsum.photos/seed/threadscore-fire/1200/900',
  },
  {
    title: 'Điều gì đang gây tranh cãi',
    desc: 'Tìm ra những bình luận đang đốt nóng cuộc thảo luận nhất trong bài viết.',
    chip: 'chấn động',
    img: 'https://picsum.photos/seed/threadscore-spark/1200/900',
  },
  {
    title: 'Đâu là không gian bình yên',
    desc: 'Không phải chỗ nào cũng nóng — phát hiện cả những bài viết đang nhận sự đồng cảm.',
    chip: 'góc dịu mát',
    img: 'https://picsum.photos/seed/threadscore-breeze/1200/900',
  },
];

export default function HomePage() {
  const [threads, setThreads] = useState<ThreadRecord[]>([]);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [sort, setSort] = useState<'newest' | 'hottest' | 'most_comments'>('hottest');
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

  useEffect(() => {
    let cancelled = false;
    apiGet<OverallStats>('/api/stats')
      .then(s => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) setStats(null); });
    return () => { cancelled = true; };
  }, []);

  const scoredCount = threads.filter(t => t.scoring_status === 'scored').length;

  return (
    <div className="page">
      {/* INTEREST — Thermometer + Search + Explore */}
      <section className="section-tight" id="explore">
        <div className="container">
          {stats && <Reveal><OverallHeat stats={stats} /></Reveal>}
          <SearchBox />

          <div className="sort-tabs">
            {(['hottest', 'newest', 'most_comments'] as const).map(s => (
              <button key={s} className={`sort-tab${sort === s ? ' active' : ''}`} onClick={() => setSort(s)}>
                {s === 'hottest' ? 'Nóng nhất' : s === 'newest' ? 'Mới nhất' : 'Nhiều bình luận'}
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
              {threads.map((t, i) => <Reveal key={t.id} delay={(i % 3) * 0.08}><ThreadCard thread={t} /></Reveal>)}
              {threads.length === 0 && !error && (
                <div className="empty-state">
                  <p className="empty-title">Chưa có bài viết nào</p>
                  <p className="empty-subtitle">Dán link Threads vào ô tìm kiếm để yêu cầu bài đầu tiên</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="section" id="how">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="section-eyebrow">Cách hoạt động</span>
              <h2 className="section-title">Từ liên kết đến nhiệt kế trong ba bước</h2>
            </div>
          </Reveal>
          <div className="how-grid">
            {[
              { n: '01', t: 'Dán link hoặc gửi yêu cầu', d: 'Dán liên kết Threads vào ô tìm kiếm. Xem ngay kết quả nếu bài đã phân tích hoặc gửi yêu cầu bài viết mới vào hàng chờ.' },
              { n: '02', t: 'AI đọc & chấm điểm cảm xúc', d: 'Hệ thống tự động xử lý và AI phân tích từng bình luận, chấm điểm từ 0-100 (Bùng nổ, Trung lập, Vui vẻ) kèm lý do giải thích.' },
              { n: '03', t: 'Xem bảng nhiệt & tương tác', d: 'Theo dõi điểm số trung bình, biểu đồ cảm xúc cộng đồng, xem bình luận tiêu biểu và vote đánh giá độ chính xác của AI.' },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.12}>
                <div className="how-step">
                  <span className="step-num">Bước {s.n}</span>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases — accordion slices */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="section-eyebrow">Dành cho ai</span>
              <h2 className="section-title">Khám phá góc nhìn dư luận</h2>
            </div>
          </Reveal>
          <Reveal>
            <AccordionSlices slices={SLICES} />
          </Reveal>
        </div>
      </section>

      {/* Bento stats */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="section-eyebrow">Con số nóng</span>
              <h2 className="section-title">ThreadScore đang đốt lò</h2>
            </div>
          </Reveal>
          <div className="bento">
            <Reveal className="bento-1">
              <div className="bento-card bento-plain" style={{ background: 'linear-gradient(135deg, #FDE7E2, #FFF3EE)' }}>
                <span className="big-num" style={{ color: 'var(--anger-ink)' }}>
                  {stats ? <CountUp to={stats.threads} /> : '--'}
                </span>
                <h3>Bài viết đã chấm điểm</h3>
                <p>Mỗi bài là một ngọn lửa được đo bằng AI.</p>
              </div>
            </Reveal>
            <Reveal className="bento-2" delay={0.08}>
              <div className="bento-card">
                <div className="bento-img" style={{ backgroundImage: 'url(https://picsum.photos/seed/threadscore-chat/1600/900)', filter: 'grayscale(0.35) contrast(1.05)' }} />
                <div className="bento-overlay" />
                <div className="bento-body">
                  <span className="bento-kicker">Bùng nổ nhất</span>
                  {stats?.top_threads[0] ? (
                    <>
                      <h3>{stats.top_threads[0].title ?? 'Bài viết Threads'}</h3>
                      <p className="mono">{stats.top_threads[0].avg_anger_score?.toFixed(0)}/100 điểm tức giận</p>
                    </>
                  ) : (
                    <h3>Chờ bài viết đầu tiên</h3>
                  )}
                </div>
              </div>
            </Reveal>
            <Reveal className="bento-3" delay={0.04}>
              <div className="bento-card">
                <div className="bento-img" style={{ backgroundImage: 'url(https://picsum.photos/seed/threadscore-scroll/1200/900)' }} />
                <div className="bento-overlay" />
                <div className="bento-body">
                  <span className="bento-kicker">Bình luận đã phân tích</span>
                  <h3 className="mono">{stats ? <CountUp to={stats.comments} /> : '--'}</h3>
                  <p>và con số này vẫn đang tăng</p>
                </div>
              </div>
            </Reveal>
            <Reveal className="bento-4" delay={0.08}>
              <div className="bento-card bento-plain" style={{ background: 'linear-gradient(135deg, #E3F0F5, #F4FAFC)' }}>
                <span className="big-num" style={{ color: 'var(--calm-ink)' }}>
                  {stats ? <CountUp to={stats.breakdown.vui_ve} /> : '--'}
                </span>
                <h3>Bình luận vui vẻ</h3>
                <p>Không phải lúc nào cũng nóng — vẫn có chốn bình yên.</p>
              </div>
            </Reveal>
            <Reveal className="bento-5" delay={0.12}>
              <div className="bento-card">
                <div className="bento-img" style={{ backgroundImage: 'url(https://picsum.photos/seed/threadscore-eye/1200/900)', filter: 'grayscale(0.4)' }} />
                <div className="bento-overlay" />
                <div className="bento-body">
                  <span className="bento-kicker">Theo dõi</span>
                  <h3>Nhiệt độ cập nhật liên tục</h3>
                  <p>Mỗi đợt chấm điểm làm mới bức tranh cảm xúc.</p>
                </div>
              </div>
            </Reveal>
            <Reveal className="bento-6" delay={0.16}>
              <div className="bento-card bento-plain">
                <Eye size={30} weight="duotone" color="var(--ember)" />
                <h3>Nhìn thấu tranh cãi</h3>
                <p>Phát hiện sớm những cuộc tranh cãi đang leo thang.</p>
              </div>
            </Reveal>
            <Reveal className="bento-7" delay={0.2}>
              <div className="bento-card bento-plain">
                <NewspaperClipping size={30} weight="duotone" color="var(--calm)" />
                <h3>Trích dẫn tiêu biểu</h3>
                <p>Đọc những bình luận đại diện cho từng sắc thái.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ACTION — CTA */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="cta-banner">
              <h2>Đo ngay bài viết đang làm bạn tò mò</h2>
              <p>Dán link, chờ AI chấm điểm, rồi xem cộng đồng thực sự nghĩ gì.</p>
              <a className="btn btn-primary" href="#top">
                <Fire weight="fill" aria-hidden="true" /> Dán link bài viết
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
