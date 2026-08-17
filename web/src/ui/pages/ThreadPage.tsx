import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  WarningCircle,
  ArrowLeft,
  ArrowSquareOut,
  MagnifyingGlass,
  X,
  PencilSimple,
  FloppyDisk,
  CheckCircle,
  Key,
} from '@phosphor-icons/react';
import { apiGet } from '../api';
import CommentCard from '../components/CommentCard';
import DiscussionBox from '../components/DiscussionBox';
import HeatGauge from '../components/HeatGauge';
import { Reveal } from '../components/motion';
import { formatRelativeTime } from '../format';
import { useI18n } from '../i18n';
import type { ThreadRecord, CommentRecord, AiScoreRecord, UserCommentRecord } from '../../shared/types';

type ThreadDetail = {
  thread: ThreadRecord;
  comments: (CommentRecord & { score: AiScoreRecord | null })[];
  breakdown: { bang_no: number; trung_lap: number; vui_ve: number } | null;
  user_comments: UserCommentRecord[];
  vote_counts: Record<string, { correct: number; incorrect: number }>;
};

const PAGE_SIZE = 15;

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [data, setData] = useState<ThreadDetail | null>(null);
  const [filter, setFilter] = useState<'all' | 'BÙNG NỔ' | 'TRUNG LẬP' | 'VUI VẺ'>('all');
  const [commentSearch, setCommentSearch] = useState('');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin Edit Detail State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editAuthorName, setEditAuthorName] = useState('');
  const [editAdminKey, setEditAdminKey] = useState(() => localStorage.getItem('ts_admin_key') ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const observerRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      setData(await apiGet<ThreadDetail>(`/api/threads/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('tp.loadError'));
    }
  }

  function openEditModal() {
    if (!data) return;
    setEditTitle(data.thread.title ?? '');
    setEditContent(data.thread.content ?? '');
    setEditUsername(data.thread.author_username ?? '');
    setEditAuthorName(data.thread.author_name ?? '');
    setEditAdminKey(localStorage.getItem('ts_admin_key') ?? '');
    setEditError(null);
    setEditSuccess(null);
    setIsEditing(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    if (!editAdminKey.trim()) {
      setEditError('Vui lòng nhập Admin Secret Key để xác thực quyền quản trị.');
      return;
    }

    setIsSaving(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const res = await fetch('/api/admin/thread-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': editAdminKey.trim(),
        },
        body: JSON.stringify({
          id: data.thread.id,
          title: editTitle,
          content: editContent,
          author_username: editUsername,
          author_name: editAuthorName,
        }),
      });

      const result = (await res.json().catch(() => ({}))) as { ok?: boolean; thread?: ThreadRecord; error?: string };
      if (!res.ok || !result.ok) {
        throw new Error(result.error ?? 'Lưu thay đổi thất bại.');
      }

      localStorage.setItem('ts_admin_key', editAdminKey.trim());
      if (result.thread) {
        setData(prev => prev ? { ...prev, thread: result.thread! } : null);
      }
      setEditSuccess('Đã cập nhật chi tiết bài viết thành công!');
      setTimeout(() => {
        setIsEditing(false);
        setEditSuccess(null);
      }, 900);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.');
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setLoading(true);
    setError(null);
    apiGet<ThreadDetail>(`/api/threads/${id}`)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : t('tp.loadError')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, t]);

  // Reset displayCount khi đổi filter hoặc search để cuộn lại từ đầu
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [filter, commentSearch]);

  const searchLower = commentSearch.trim().toLowerCase();
  const visible = data?.comments ? data.comments.filter(c => {
    const matchFilter = filter === 'all' || c.score?.label === filter;
    const matchSearch = !searchLower || (
      c.text.toLowerCase().includes(searchLower) ||
      (c.author_username && c.author_username.toLowerCase().includes(searchLower)) ||
      (c.score?.reason && c.score.reason.toLowerCase().includes(searchLower))
    );
    return matchFilter && matchSearch;
  }) : [];

  const hasMore = displayCount < visible.length;
  const renderedComments = visible.slice(0, displayCount);

  // IntersectionObserver tự động load thêm khi scroll gần đến cuối danh sách (rootMargin 300px)
  useEffect(() => {
    if (!hasMore) return;
    const target = observerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount(prev => Math.min(prev + PAGE_SIZE, visible.length));
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, visible.length]);

  if (loading) {
    return (
      <div className="page thread-page">
        <div className="thread-page-inner">
          <div className="skeleton-thread-title" />
          <div className="skeleton-comment" />
          <div className="skeleton-comment" />
          <div className="skeleton-comment" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page thread-page">
        <div className="thread-page-inner">
          <div className="error-banner" role="alert">
            <WarningCircle aria-hidden="true" /> {error}
          </div>
          <Link to="/" className="btn btn-ghost"><ArrowLeft aria-hidden="true" /> {t('tp.home')}</Link>
        </div>
      </div>
    );
  }

  if (!data) return <div className="page thread-page" />;

  const displayTitle = data.thread.title && data.thread.title !== 'Thread' && data.thread.title.trim().length > 0
    ? data.thread.title
    : data.thread.content
    ? (data.thread.content.length > 140 ? data.thread.content.slice(0, 140) + '...' : data.thread.content)
    : t('tp.postFallback');

  const showFullContent = data.thread.content && data.thread.content.trim() !== displayTitle.trim();

  const scoredComments = data.comments.filter(c => c.score != null);

  const countBangNo = scoredComments.filter(c => c.score?.label === 'BÙNG NỔ').length;
  const countTrungLap = scoredComments.filter(c => c.score?.label === 'TRUNG LẬP').length;
  const countVuiVe = scoredComments.filter(c => c.score?.label === 'VUI VẺ').length;

  return (
    <div className="page thread-page">
      <div className="thread-detail-grid">
        {/* Cột trái (Chính): Chi tiết bài viết + Tóm tắt nhiệt độ + Danh sách bình luận */}
        <div className="thread-main-column">
          <Reveal>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Link to="/" className="thread-back">
                <ArrowLeft size={18} weight="bold" aria-hidden="true" /> {t('tp.back')}
              </Link>

              <button
                type="button"
                onClick={openEditModal}
                className="btn btn-ghost"
                style={{
                  padding: '5px 12px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: 'var(--radius-pill)',
                  color: 'var(--accent)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-raise)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <PencilSimple size={14} weight="bold" />
                <span>Sửa bài viết (Admin)</span>
              </button>
            </div>

            <div className="thread-post-card">
              <h1 className="thread-title" style={{ fontSize: '22px', fontWeight: '800', lineHeight: '1.4', margin: '0 0 12px', color: 'var(--ink)' }}>
                {displayTitle}
              </h1>

              {showFullContent && (
                <p className="thread-content" style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>
                  {data.thread.content}
                </p>
              )}

              <p className="thread-meta" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--muted)' }}>
                <span style={{ fontWeight: '700', color: 'var(--ink)' }}>@{data.thread.author_username ?? t('tp.anon')}</span>
                {data.thread.author_name && <span style={{ color: 'var(--ink-2)' }}>({data.thread.author_name})</span>}
                {data.thread.posted_at != null && <span>· {formatRelativeTime(data.thread.posted_at)}</span>}
                <span>· {data.thread.total_comments} {t('tp.commentsCount')}</span>
                <a href={data.thread.url} target="_blank" rel="noreferrer" className="thread-link" style={{ color: 'var(--accent)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {t('tp.onThreads')} <ArrowSquareOut size={13} />
                </a>
              </p>
            </div>
          </Reveal>

          {data.thread.scoring_status === 'scored' && data.breakdown && (
            <Reveal>
              <div className="thread-summary" style={{ marginBottom: '24px' }}>
                <HeatGauge breakdown={data.breakdown} />
                <div className="thread-summary-stats">
                  <span className="stat-chip anger">{t('tp.hot')} <span className="stat-n">{data.breakdown.bang_no}</span></span>
                  <span className="stat-chip neutral">{t('tp.neutral')} <span className="stat-n">{data.breakdown.trung_lap}</span></span>
                  <span className="stat-chip calm">{t('tp.calm')} <span className="stat-n">{data.breakdown.vui_ve}</span></span>
                </div>
                {data.thread.avg_anger_score != null && (
                  <p className="thread-avg">
                    {t('tp.avgLabel')}
                    <strong className="mono thread-avg-value" style={{ marginLeft: '8px' }}>
                      {data.thread.avg_anger_score.toFixed(1)}/100
                    </strong>
                  </p>
                )}
              </div>
            </Reveal>
          )}

          {/* Header Bình luận + Search Box + Filter Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '24px 0 18px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--ink)' }}>
              {t('tp.allComments')} ({visible.length})
            </h2>

            {/* Thanh tìm kiếm bình luận to, rộng, đẹp mắt và cân xứng */}
            <div style={{ position: 'relative', width: '100%' }}>
              <MagnifyingGlass
                size={18}
                weight="bold"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="search"
                placeholder={t('tp.searchComments')}
                value={commentSearch}
                onChange={e => setCommentSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 42px',
                  borderRadius: '14px',
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--ink)',
                  outline: 'none',
                  boxShadow: 'var(--shadow-sm)',
                  boxSizing: 'border-box',
                }}
              />
              {commentSearch && (
                <button
                  type="button"
                  onClick={() => setCommentSearch('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--border)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--ink)',
                    padding: 0,
                  }}
                >
                  <X size={12} weight="bold" />
                </button>
              )}
            </div>

            <div className="filter-tabs" style={{ margin: 0 }} role="tablist">
              <button className={`filter-tab${filter === 'all' ? ' active' : ''}`} role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>
                {t('tp.all')} ({data.comments.length})
              </button>
              <button className={`filter-tab${filter === 'BÙNG NỔ' ? ' active' : ''}`} role="tab" aria-selected={filter === 'BÙNG NỔ'} onClick={() => setFilter('BÙNG NỔ')}>
                {t('tp.hot')} ({countBangNo})
              </button>
              <button className={`filter-tab${filter === 'TRUNG LẬP' ? ' active' : ''}`} role="tab" aria-selected={filter === 'TRUNG LẬP'} onClick={() => setFilter('TRUNG LẬP')}>
                {t('tp.neutral')} ({countTrungLap})
              </button>
              <button className={`filter-tab${filter === 'VUI VẺ' ? ' active' : ''}`} role="tab" aria-selected={filter === 'VUI VẺ'} onClick={() => setFilter('VUI VẺ')}>
                {t('tp.calm')} ({countVuiVe})
              </button>
            </div>
          </div>

          {renderedComments.map((c, i) => (
            <Reveal key={c.id} delay={(i % 3) * 0.03}>
              <CommentCard comment={c} voteCounts={data.vote_counts[c.id] ?? { correct: 0, incorrect: 0 }} />
            </Reveal>
          ))}

          {/* Sentinel trigger tải thêm khi cuộn */}
          {hasMore && (
            <div ref={observerRef} style={{ padding: '16px 0', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setDisplayCount(prev => Math.min(prev + PAGE_SIZE, visible.length))}
                className="btn btn-ghost"
                style={{ fontSize: '13.5px', color: 'var(--muted)', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span>{t('tp.loadMore')}</span>
                <span style={{ fontSize: '12px', opacity: 0.75 }}>({renderedComments.length}/{visible.length})</span>
              </button>
            </div>
          )}

          {visible.length === 0 && (
            <div className="empty-state">
              <p className="empty-title">{t('tp.noComments')}</p>
              <p className="empty-subtitle">{t('tp.tryOther')}</p>
            </div>
          )}
        </div>

        {/* Cột phải (Phụ): Khung Thảo luận cộng đồng scroll độc lập dạng Sticky */}
        <aside className="thread-discussion-sidebar" style={{ paddingTop: '52px' }}>
          <div className="thread-discussion-sticky">
            <DiscussionBox threadId={data.thread.id} userComments={data.user_comments} onPosted={load} />
          </div>
        </aside>
      </div>

      {/* Modal Chỉnh sửa bài viết dành cho Admin */}
      {isEditing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) setIsEditing(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: 'var(--surface-raise)',
              borderRadius: '24px',
              border: '1.5px solid var(--border-strong, var(--border))',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
              padding: '28px',
              position: 'relative',
              boxSizing: 'border-box',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'var(--accent-light, #ffefe6)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PencilSimple size={20} weight="bold" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--ink)' }}>
                    Chỉnh sửa bài viết (Admin)
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                    Cập nhật tiêu đề, nội dung và thông tin tác giả bài Threads.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSaving && setIsEditing(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: '4px',
                  borderRadius: '8px',
                }}
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {editError && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#dc2626',
                  fontSize: '13.5px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <WarningCircle size={18} weight="bold" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  color: '#16a34a',
                  fontSize: '13.5px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle size={18} weight="bold" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Admin Secret Key */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--ink)', marginBottom: '6px' }}>
                  <Key size={15} weight="bold" color="var(--accent)" />
                  <span>Admin Secret Key</span>
                </label>
                <input
                  type="password"
                  value={editAdminKey}
                  onChange={(e) => setEditAdminKey(e.target.value)}
                  placeholder="Nhập ADMIN_SECRET_KEY..."
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: '13.5px',
                    color: 'var(--ink)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--ink)', marginBottom: '6px' }}>
                  Tiêu đề hiển thị (Title)
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Tiêu đề chính của bài viết..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--ink)',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Content */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--ink)', marginBottom: '6px' }}>
                  Nội dung bài viết đầy đủ (Content)
                </label>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Toàn bộ nội dung / caption bài viết..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: '14px',
                    color: 'var(--ink)',
                    boxSizing: 'border-box',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: '1.5',
                  }}
                />
              </div>

              {/* Author Username & Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--ink)', marginBottom: '6px' }}>
                    Tác giả (@username)
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="ví dụ: dtdgth"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: '13.5px',
                      color: 'var(--ink)',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--ink)', marginBottom: '6px' }}>
                    Tên hiển thị (Author Name)
                  </label>
                  <input
                    type="text"
                    value={editAuthorName}
                    onChange={(e) => setEditAuthorName(e.target.value)}
                    placeholder="Tên đầy đủ..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: '13.5px',
                      color: 'var(--ink)',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="btn btn-ghost"
                  style={{ borderRadius: '12px', padding: '10px 18px', fontSize: '13.5px' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary"
                  style={{
                    borderRadius: '12px',
                    padding: '10px 22px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FloppyDisk size={16} weight="bold" />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
