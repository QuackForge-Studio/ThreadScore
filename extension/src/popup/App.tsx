import { useEffect, useState, useMemo } from 'react';
import {
  Fire,
  CloudArrowUp,
  DownloadSimple,
  Play,
  Gear,
  CheckCircle,
  Warning,
  Circle,
  Browser,
  Queue,
  SlidersHorizontal,
  TerminalWindow,
  Flask,
  StopCircle,
  CaretDown,
  ArrowClockwise,
  Lightbulb,
  ChatCircleText,
  User,
} from '@phosphor-icons/react';
import { getConfig, setConfig, type ExtensionConfig } from '../lib/storage';
import { scrapeActiveTab, scrapeTestActiveTab, stopActiveTabScrape, getActiveTabInfo, type TabInfo } from './manual';
import { runBatchFromPopup } from './batch';
import { pushImport } from '../lib/api';
import type { ScrapedThread, ScrapedComment } from '../content/scraper';
import {
  debugStats,
  type DebugStats,
  isSubReplyComment,
  computeCommentDepth,
  isAuthorContinuation,
} from '../content/scraper';
import { getUsage, isCooldownActive, getCooldownReason, POLICY } from './shared';

export default function App() {
  const [config, setConfigState] = useState<ExtensionConfig>({ webUrl: '', adminKey: '', autoEnabled: false });
  const [tab, setTab] = useState<'manual' | 'batch'>('manual');
  const [tabInfo, setTabInfo] = useState<TabInfo>({ title: '', url: '', isThreads: true, username: null });
  const [scraped, setScraped] = useState<ScrapedThread | null>(null);
  const [lastStats, setLastStats] = useState<DebugStats | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Debug Inspector State
  const [debugFilter, setDebugFilter] = useState<'all' | 'root' | 'subreply' | 'graphql' | 'dom'>('all');
  const [expandedCommentIdx, setExpandedCommentIdx] = useState<number | null>(null);

  const [usageInfo, setUsageInfo] = useState<{ hour: number; day: number; cooldown: boolean; reason: string | null }>({
    hour: 0,
    day: 0,
    cooldown: false,
    reason: null,
  });

  useEffect(() => {
    getConfig().then((cfg) => {
      setConfigState(cfg);
      if (!cfg.webUrl || !cfg.adminKey) setShowConfig(true);
    });
    refreshUsage();
    
    const updateTab = () => {
      getActiveTabInfo().then((info) => {
        if (info && (info.url || info.username || info.title)) {
          setTabInfo(info);
        }
      });
    };
    updateTab();
    const interval = setInterval(updateTab, 2000);
    window.addEventListener('focus', updateTab);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateTab);
    };
  }, []);

  async function refreshUsage() {
    const usage = await getUsage();
    const now = Date.now();
    const hourCutoff = now - 60 * 60 * 1000;
    const hour = usage.timestamps.filter((t) => t > hourCutoff).length;
    const day = usage.timestamps.length;
    setUsageInfo({
      hour,
      day,
      cooldown: isCooldownActive(usage),
      reason: await getCooldownReason(),
    });
  }

  function log(msg: string) {
    const time = new Date().toLocaleTimeString('vi-VN');
    setLogLines((prev) => [...prev, `[${time}] ${msg}`]);
  }

  async function saveConfig() {
    await setConfig(config);
    if (config.autoEnabled) {
      chrome.runtime.sendMessage({ type: 'TS_SETUP_ALARM' });
    } else {
      chrome.runtime.sendMessage({ type: 'TS_CLEAR_ALARM' });
    }
    log('Đã lưu cấu hình server');
    setShowConfig(false);
  }

  async function doScrape() {
    setBusy(true);
    setError(null);
    try {
      log('Bắt đầu quét bài viết từ tab Threads...');
      const s = await scrapeActiveTab();
      const stats = s.debugStats || debugStats;
      setScraped(s);
      setLastStats({ ...stats });
      if (s.author_username || s.title) {
        setTabInfo((prev) => ({
          ...prev,
          username: s.author_username || prev.username,
          title: s.title || prev.title,
        }));
      }
      log(`Quét hoàn tất: ${s.comments.length} bình luận.`);
      if (s.highlightSummary) {
        log(
          `Đã đánh dấu ${s.highlightSummary.highlighted} card trên trang — ${s.highlightSummary.totalComments} bình luận · ${s.highlightSummary.totalReplies} phản hồi (xem overlay góc phải trang Threads).`
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi quét bài viết';
      setError(msg);
      log(`Thất bại: ${msg}`);
      setShowDetails(true); // Tự động mở log khi gặp lỗi
    } finally {
      setBusy(false);
    }
  }

  async function doHighlightOnPage() {
    setBusy(true);
    setError(null);
    try {
      log('Đang viền đỏ & đánh số trực tiếp phần tử trên trang Threads...');
      const s = await scrapeTestActiveTab(15);
      const stats = s.debugStats || debugStats;
      setScraped(s);
      setLastStats({ ...stats });
      if (s.highlightSummary) {
        log(
          `Highlight xong: ${s.highlightSummary.highlighted} card — ${s.highlightSummary.totalComments} bình luận · ${s.highlightSummary.totalReplies} phản hồi (xem overlay góc phải trang Threads).`
        );
      } else {
        log('Đã highlight xong trên trang Threads.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi highlight');
    } finally {
      setBusy(false);
    }
  }

  async function doPush() {
    if (!scraped) return;
    setBusy(true);
    setError(null);
    try {
      log('Đang đẩy dữ liệu lên server ThreadScore...');
      const r = await pushImport(config, scraped);
      log(`Thành công! Đã lưu bài viết & ${r.commentCount} bình luận.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi đẩy dữ liệu');
      setShowDetails(true);
    } finally {
      setBusy(false);
    }
  }

  async function doDownload() {
    if (!scraped) return;
    const blob = new Blob([JSON.stringify(scraped, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `threadscore-${scraped.thread_id || 'import'}.json`;
    a.click();
    log('Đã tải xuống file JSON');
  }

  async function doBatch() {
    setBusy(true);
    setError(null);
    try {
      log('Bắt đầu chạy Batch cào danh sách Queue...');
      await runBatchFromPopup(config, log);
      await refreshUsage();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi xử lý batch');
      setShowDetails(true);
    } finally {
      setBusy(false);
    }
  }

  const { replyCount, rootCount, graphqlCount, domCount, continuationCount } = useMemo(() => {
    if (!scraped) {
      return { replyCount: 0, rootCount: 0, graphqlCount: 0, domCount: 0, continuationCount: 0 };
    }
    const replies = scraped.comments.filter((c) =>
      isSubReplyComment(c, scraped.author_username, scraped.main_post_id)
    ).length;
    const gq = scraped.comments.filter((c) => c.external_id != null).length;
    const cont = scraped.comments.filter((c) =>
      isAuthorContinuation(
        c,
        scraped.author_username,
        scraped.main_post_id,
        `${scraped.title ?? ''} ${scraped.content ?? ''}`
      )
    ).length;
    return {
      replyCount: replies,
      rootCount: scraped.comments.length - replies,
      graphqlCount: gq,
      domCount: scraped.comments.length - gq,
      continuationCount: cont,
    };
  }, [scraped]);

  const commentDepth = useMemo(() => {
    return scraped
      ? computeCommentDepth(scraped.comments, scraped.main_post_id)
      : new Map<ScrapedComment, number>();
  }, [scraped]);

  const filteredComments = useMemo(() => {
    return (scraped?.comments || []).filter((c) => {
      const isSub = isSubReplyComment(c, scraped?.author_username ?? null, scraped?.main_post_id ?? null);
      if (debugFilter === 'root') return !isSub;
      if (debugFilter === 'subreply') return isSub;
      if (debugFilter === 'graphql') return c.external_id != null;
      if (debugFilter === 'dom') return c.external_id == null;
      return true;
    });
  }, [scraped, debugFilter]);

  const isConfigured = Boolean(config.webUrl && config.adminKey);

  return (
    <div className="sp-root">
      {/* Header */}
      <header className="sp-header">
        <div className="sp-brand">
          <div className="sp-logo">
            <Fire size={18} weight="fill" />
          </div>
          <div className="sp-brand-titles">
            <span className="sp-title">ThreadScore</span>
            <div className="sp-header-status">
              <span className={`sp-status-dot ${isConfigured ? 'connected' : 'setup'}`} />
              <span>
                {tabInfo.isThreads
                  ? 'Connected · Threads tab detected'
                  : isConfigured
                  ? 'Connected · Sẵn sàng'
                  : 'Chưa cấu hình API'}
              </span>
            </div>
          </div>
        </div>

        <div className="sp-header-actions">
          <button
            type="button"
            className={`sp-icon-btn ${showConfig ? 'active' : ''}`}
            onClick={() => setShowConfig(!showConfig)}
            title="Cấu hình kết nối"
          >
            <Gear size={16} weight="bold" />
          </button>
        </div>
      </header>

      {/* Config Drawer */}
      {showConfig && (
        <div className="sp-config-panel">
          <div className="sp-config-title">
            <SlidersHorizontal size={14} /> Cấu hình máy chủ
          </div>
          <div className="sp-field">
            <label>Domain Server Web</label>
            <input
              placeholder="https://threadscore.quackforge.io.vn"
              value={config.webUrl}
              onChange={(e) => setConfigState({ ...config, webUrl: e.target.value })}
            />
          </div>
          <div className="sp-field">
            <label>Admin Secret Key</label>
            <input
              placeholder="Nhập secret key..."
              type="password"
              value={config.adminKey}
              onChange={(e) => setConfigState({ ...config, adminKey: e.target.value })}
            />
          </div>
          <button className="sp-btn sp-btn-cta" onClick={saveConfig}>
            <CheckCircle size={15} weight="bold" /> Lưu cấu hình
          </button>
        </div>
      )}

      {/* Segmented Control Tabs */}
      <div className="sp-tabs-wrap">
        <div className="sp-segmented-tabs">
          <button
            className={`sp-seg-tab ${tab === 'manual' ? 'active' : ''}`}
            onClick={() => setTab('manual')}
            disabled={busy}
          >
            <Browser size={15} weight="duotone" />
            <span>Bài Hiện Tại</span>
          </button>
          <button
            className={`sp-seg-tab ${tab === 'batch' ? 'active' : ''}`}
            onClick={() => setTab('batch')}
            disabled={busy}
          >
            <Queue size={15} weight="duotone" />
            <span>Batch Queue</span>
            <span className="sp-tab-badge">Queue</span>
          </button>
        </div>
      </div>

      {/* Body Content */}
      <main className="sp-body">
        {tab === 'manual' && (
          <div className="sp-card">
            {/* Post Target Preview */}
            <div className="sp-post-preview">
              <div className="sp-post-avatar">
                {scraped?.author_avatar_url ? (
                  <img
                    src={scraped.author_avatar_url}
                    alt={tabInfo.username ?? ''}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : tabInfo.username ? (
                  tabInfo.username.charAt(0).toUpperCase()
                ) : (
                  <User size={18} />
                )}
              </div>
              <div className="sp-post-meta">
                <span className="sp-post-author">
                  {tabInfo.username ? `@${tabInfo.username}` : 'Trang Threads đang mở'}
                </span>
                <span className="sp-post-subtitle">
                  {tabInfo.title ? tabInfo.title : 'Đã phát hiện tab bài viết sẵn sàng để quét'}
                </span>
              </div>
            </div>

            {/* Action State: Idle vs Scanning */}
            {!busy ? (
              <button className="sp-btn sp-btn-cta sp-btn-block" onClick={doScrape}>
                <Fire size={17} weight="fill" /> Quét bài viết
              </button>
            ) : (
              <div className="sp-scanning-box">
                <div className="sp-scanning-head">
                  <div className="sp-scanning-label">
                    <ArrowClockwise size={16} weight="bold" className="sp-scan-spinner" />
                    <span>Đang quét bài viết &amp; bình luận...</span>
                  </div>
                </div>

                <div className="sp-progress-track">
                  <div className="sp-progress-fill" />
                </div>

                <div className="sp-scanning-chips">
                  <span className="sp-chip">📡 GraphQL + DOM</span>
                  <span className="sp-chip">🧵 Sub-replies auto-expand</span>
                </div>

                <button
                  type="button"
                  className="sp-btn sp-btn-destructive sp-btn-block"
                  onClick={async () => {
                    log('Đang yêu cầu dừng quét...');
                    await stopActiveTabScrape();
                  }}
                >
                  <StopCircle size={16} weight="fill" /> Dừng quét &amp; lấy kết quả
                </button>
              </div>
            )}

            {/* Results Overview */}
            {scraped && (
              <div className="sp-result-container">
                <div className="sp-result-header">
                  <span className="sp-result-title">{scraped.title || scraped.content || 'Bài viết Threads'}</span>
                  <div className="sp-result-stats">
                    <span className="sp-stat-pill success">
                      <ChatCircleText size={13} weight="bold" /> {scraped.comments.length} bình luận
                    </span>
                    <span className="sp-stat-pill">📌 {rootCount} gốc</span>
                    <span className="sp-stat-pill">↳ {replyCount} phản hồi</span>
                    {continuationCount > 0 && (
                      <span className="sp-stat-pill author">✍️ {continuationCount} tiếp nối</span>
                    )}
                  </div>
                </div>

                {scraped.comments.length > 0 && (
                  <div className="sp-comments-preview">
                    {scraped.comments.slice(0, 10).map((c, idx) => {
                      const isReply = isSubReplyComment(c, scraped.author_username, scraped.main_post_id);
                      const depth = commentDepth.get(c) ?? 0;
                      const isAuthorUser = Boolean(c.author_username && scraped.author_username && c.author_username.toLowerCase() === scraped.author_username.toLowerCase());
                      const isContinuation = isAuthorContinuation(c, scraped.author_username, scraped.main_post_id, `${scraped.title ?? ''} ${scraped.content ?? ''}`);
                      return (
                        <div
                          key={idx}
                          className={`sp-comment-card ${isReply ? 'sub' : ''}`}
                          style={{ marginLeft: depth > 0 ? Math.min(depth, 6) * 14 : undefined }}
                        >
                          <div className="sp-comment-author-row">
                            <span className="sp-comment-author">@{c.author_username || 'user'}</span>
                            {isAuthorUser && <span className="sp-comment-author-badge">{isContinuation ? 'Viết tiếp' : 'Tác giả'}</span>}
                            {isReply && c.reply_to_username && (
                              <span className="sp-comment-reply-hint">↳ @{c.reply_to_username}</span>
                            )}
                          </div>
                          <span className="sp-comment-body">{c.text}</span>
                          <div className="sp-comment-footer">
                            {c.like_count > 0 && <span>♥ {c.like_count}</span>}
                            {c.direct_reply_count ? <span>💬 {c.direct_reply_count} reply</span> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="sp-btn-group">
                  <button className="sp-btn sp-btn-primary sp-flex-1" onClick={doPush} disabled={busy}>
                    <CloudArrowUp size={15} weight="bold" /> Đẩy lên Web
                  </button>
                  <button className="sp-btn sp-btn-secondary" onClick={doDownload}>
                    <DownloadSimple size={15} weight="bold" /> Tải JSON
                  </button>
                </div>
              </div>
            )}

            {/* Subtle tip when idle */}
            {!scraped && !busy && (
              <div className="sp-tip-card">
                <Lightbulb size={16} weight="bold" color="var(--coral)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  <b>Mẹo:</b> Bạn có thể thêm nhiều bài vào Batch Queue để tự động cào ngầm theo hạn mức an toàn.
                </span>
              </div>
            )}
          </div>
        )}

        {tab === 'batch' && (
          <div className="sp-card">
            <div className="sp-quota-panel">
              <div className="sp-quota-row">
                <span>Quota giờ:</span>
                <b>
                  {usageInfo.hour} / {POLICY.maxPerHour} bài
                </b>
              </div>
              <div className="sp-quota-progress">
                <div
                  className="sp-quota-bar"
                  style={{ width: `${Math.min(100, (usageInfo.hour / POLICY.maxPerHour) * 100)}%` }}
                />
              </div>

              <div className="sp-quota-row" style={{ marginTop: 6 }}>
                <span>Quota ngày:</span>
                <b>
                  {usageInfo.day} / {POLICY.maxPerDay} bài
                </b>
              </div>
              <div className="sp-quota-progress">
                <div
                  className="sp-quota-bar"
                  style={{ width: `${Math.min(100, (usageInfo.day / POLICY.maxPerDay) * 100)}%` }}
                />
              </div>

              {usageInfo.cooldown && (
                <div className="sp-error-alert">
                  <Warning size={15} weight="fill" /> Cooldown: {usageInfo.reason || 'Tạm dừng vì an toàn'}
                </div>
              )}
            </div>

            <button className="sp-btn sp-btn-cta sp-btn-block" onClick={doBatch} disabled={busy}>
              <Play size={16} weight="fill" /> {busy ? 'Đang chạy batch...' : 'Chạy Batch Ngay'}
            </button>

            <div className="sp-toggle-row">
              <label className="sp-toggle-label">
                <input
                  type="checkbox"
                  checked={config.autoEnabled}
                  onChange={(e) => {
                    const next = { ...config, autoEnabled: e.target.checked };
                    setConfigState(next);
                    setConfig(next);
                    if (e.target.checked) chrome.runtime.sendMessage({ type: 'TS_SETUP_ALARM' });
                    else chrome.runtime.sendMessage({ type: 'TS_CLEAR_ALARM' });
                  }}
                />
                <span>Tự động quét định kỳ qua Chrome Alarm</span>
              </label>
            </div>
          </div>
        )}

        {error && (
          <div className="sp-error-alert">
            <Warning size={16} weight="fill" /> {error}
          </div>
        )}

        {/* Collapsible Details & Log Accordion */}
        <div className="sp-accordion">
          <button
            type="button"
            className="sp-accordion-trigger"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span>› Chi tiết xử lý &amp; Nhật ký kỹ thuật</span>
            <CaretDown
              size={14}
              style={{
                transform: showDetails ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms ease',
              }}
            />
          </button>

          {showDetails && (
            <div className="sp-accordion-content">
              {lastStats && (
                <div className="sp-debug-grid">
                  <span>
                    GraphQL: <b>{lastStats.graphQLComments}</b>
                  </span>
                  <span>
                    DOM: <b>{lastStats.domComments}</b>
                  </span>
                  <span>
                    Buffer: <b>{lastStats.bufferSize}</b>
                  </span>
                  <span>
                    Sub-replies: <b>{lastStats.bufferedWithReplies}</b>
                  </span>
                </div>
              )}

              {scraped && (
                <button
                  type="button"
                  className="sp-btn sp-btn-secondary sp-btn-block"
                  onClick={doHighlightOnPage}
                  disabled={busy}
                  style={{ fontSize: 11.5, padding: '6px 10px' }}
                >
                  <Flask size={14} weight="bold" color="var(--coral)" /> Viền đỏ phần tử trên tab Threads
                </button>
              )}

              {/* Log stream */}
              <div className="sp-log-body">
                {logLines.length === 0 ? (
                  <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                    Chưa có nhật ký hoạt động.
                  </span>
                ) : (
                  logLines.map((line, i) => (
                    <div key={i} className="sp-log-line">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
