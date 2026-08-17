import { useEffect, useState } from 'react';
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
  MagnifyingGlassPlus,
  Funnel,
} from '@phosphor-icons/react';
import { getConfig, setConfig, type ExtensionConfig } from '../lib/storage';
import { scrapeActiveTab, scrapeTestActiveTab } from './manual';
import { runBatchFromPopup } from './batch';
import { pushImport } from '../lib/api';
import type { ScrapedThread, ScrapedComment } from '../content/scraper';
import { debugStats, type DebugStats, isSubReplyComment } from '../content/scraper';
import { getUsage, isCooldownActive, getCooldownReason, POLICY } from './shared';

export default function App() {
  const [config, setConfigState] = useState<ExtensionConfig>({ webUrl: '', adminKey: '', autoEnabled: false });
  const [tab, setTab] = useState<'manual' | 'batch' | 'settings'>('manual');
  const [scraped, setScraped] = useState<ScrapedThread | null>(null);
  const [lastStats, setLastStats] = useState<DebugStats | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Debug Inspector State
  const [showInspector, setShowInspector] = useState(false);
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

  function formatDebugStats(s: DebugStats): string {
    const parts = [
      `interceptor msgs=${s.interceptedMessages}`,
      `raw comments=${s.totalInterceptedRaw}`,
      `buffer=${s.bufferSize}`,
      `replies in buffer=${s.bufferedWithReplies}`,
      `GraphQL used=${s.graphQLComments}`,
      `DOM used=${s.domComments}`,
      `author links=${s.totalAuthorLinks}`,
      `skipped: sidebar=${s.skippedSidebar} aboveMain=${s.skippedAboveMain} inMain=${s.skippedInMain} noCard=${s.skippedNoCard} noText=${s.skippedNoText} mainText=${s.skippedMainText} dup=${s.skippedDup}`,
      `mainPost=${s.mainPostContainerTag}`,
      `expanders found=${s.expandersFound}`,
      `expanders clicked=${s.expandersClicked}`,
      `dom replies counted=${s.repliesCounted}`,
    ];
    return parts.join(' | ');
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
      log('Đang quét bài viết từ tab hiện tại...');
      const s = await scrapeActiveTab();
      const stats = s.debugStats || debugStats;
      setScraped(s);
      setLastStats({ ...stats });
      log(`Quét thành công! Tìm thấy ${s.comments.length} bình luận.`);
      log(`🔍 Debug: ${formatDebugStats(stats)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi quét bài viết');
      log(`Thất bại: ${e instanceof Error ? e.message : 'Lỗi không xác định'}`);
    } finally {
      setBusy(false);
    }
  }

  async function doHighlightOnPage() {
    setBusy(true);
    setError(null);
    try {
      log('🧪 Bắt đầu HIGHLIGHT phần tử trực tiếp trên trang Threads...');
      const s = await scrapeTestActiveTab(15);
      const stats = s.debugStats || debugStats;
      setScraped(s);
      setLastStats({ ...stats });
      log(`Đã viền đỏ & đánh số trực tiếp các comment trên tab Threads đang mở!`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi highlight trang');
      log(`Lỗi highlight: ${e instanceof Error ? e.message : 'Lỗi không xác định'}`);
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
      log(`Lỗi đẩy dữ liệu: ${e instanceof Error ? e.message : e}`);
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
    log('Đã tải xuống file JSON dữ liệu');
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
      log(`Lỗi batch: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  const replyCount =
    scraped?.comments.filter((c) => isSubReplyComment(c, scraped.author_username, scraped.main_post_id)).length ?? 0;
  const rootCount = (scraped?.comments.length ?? 0) - replyCount;
  const graphqlCount = scraped?.comments.filter((c) => c.external_id != null).length ?? 0;
  const domCount = (scraped?.comments.length ?? 0) - graphqlCount;

  const filteredComments = (scraped?.comments || []).filter((c) => {
    const isSub = isSubReplyComment(c, scraped?.author_username ?? null, scraped?.main_post_id ?? null);
    if (debugFilter === 'root') return !isSub;
    if (debugFilter === 'subreply') return isSub;
    if (debugFilter === 'graphql') return c.external_id != null;
    if (debugFilter === 'dom') return c.external_id == null;
    return true;
  });

  return (
    <div className="sp-root">
      {/* Top Header */}
      <header className="sp-header">
        <div className="sp-brand">
          <div className="sp-logo">
            <Fire size={20} weight="fill" color="#E5484D" />
          </div>
          <div className="sp-brand-titles">
            <span className="sp-title">ThreadScore</span>
            <span className="sp-subtitle">Side Panel Importer</span>
          </div>
        </div>
        <div className="sp-header-actions">
          <span className={`sp-badge ${config.webUrl && config.adminKey ? 'ready' : 'setup'}`}>
            <Circle size={8} weight="fill" className="sp-pulse-dot" />
            {config.webUrl && config.adminKey ? 'READY' : 'SETUP'}
          </span>
          <button
            type="button"
            className={`sp-icon-btn ${showConfig ? 'active' : ''}`}
            onClick={() => setShowConfig(!showConfig)}
            title="Cấu hình Server"
          >
            <Gear size={18} weight="duotone" />
          </button>
        </div>
      </header>

      {/* Config Drawer */}
      {showConfig && (
        <div className="sp-config-panel">
          <div className="sp-config-title">
            <SlidersHorizontal size={16} /> Cấu hình Kết Nối
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
          <button className="sp-btn sp-btn-primary" onClick={saveConfig}>
            <CheckCircle size={16} weight="bold" /> Lưu Cấu Hình
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="sp-tabs">
        <button
          className={`sp-tab ${tab === 'manual' ? 'active' : ''}`}
          onClick={() => setTab('manual')}
          disabled={busy}
        >
          <Browser size={16} weight="duotone" /> Bài Hiện Tại
        </button>
        <button
          className={`sp-tab ${tab === 'batch' ? 'active' : ''}`}
          onClick={() => setTab('batch')}
          disabled={busy}
        >
          <Queue size={16} weight="duotone" /> Batch Queue
        </button>
      </nav>

      {/* Main Body */}
      <main className="sp-body">
        {tab === 'manual' && (
          <div className="sp-card">
            <div className="sp-card-head">
              <span className="sp-card-title">Cào Dữ Liệu Bài Đang Xem</span>
              <span className="sp-card-desc">Quét trực tiếp tab Threads đang mở</span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              <button className="sp-btn sp-btn-accent sp-btn-block" onClick={doScrape} disabled={busy}>
                <Browser size={18} weight="bold" /> {busy ? 'Đang quét...' : 'Lấy bài + comments'}
              </button>
            </div>

            {scraped && (
              <div className="sp-result-box">
                <div className="sp-result-meta">
                  <span className="sp-result-title">{scraped.title || scraped.content || 'Bài viết Threads'}</span>
                  <span className="sp-result-count">
                    {scraped.comments.length} bình luận ({rootCount} gốc · {replyCount} phản hồi con)
                  </span>
                </div>

                {scraped.comments.length > 0 && (
                  <div className="sp-comments-list">
                    {scraped.comments.slice(0, 15).map((c, idx) => {
                      const isReply = isSubReplyComment(c, scraped.author_username, scraped.main_post_id);
                      const childRepliesCount = c.external_id
                        ? scraped.comments.filter((sub) => sub.parent_id === c.external_id).length
                        : 0;
                      const replyNum = Math.max(c.direct_reply_count ?? 0, childRepliesCount);

                      return (
                        <div key={idx} className={`sp-comment-item ${isReply ? 'sp-comment-reply' : ''}`}>
                          <div className="sp-comment-header">
                            <span className="sp-comment-user">@{c.author_username || 'người dùng'}</span>
                            {isReply && c.reply_to_username && (
                              <span className="sp-comment-reply-to">
                                ↳ trả lời <b>@{c.reply_to_username}</b>
                              </span>
                            )}
                          </div>
                          <span className="sp-comment-snippet">{c.text}</span>
                          <span className="sp-comment-meta">
                            {c.like_count > 0 && <span>♥ {c.like_count.toLocaleString('vi-VN')}</span>}
                            {c.like_count > 0 && (replyNum > 0 || c.posted_at) ? ' · ' : ''}
                            {replyNum > 0 && <span className="sp-reply-badge">💬 {replyNum} reply</span>}
                            {replyNum > 0 && c.posted_at ? ' · ' : ''}
                            {c.posted_at ? new Date(c.posted_at * 1000).toLocaleDateString('vi-VN') : ''}
                          </span>
                        </div>
                      );
                    })}
                    {scraped.comments.length > 15 && (
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', marginTop: 4 }}>
                        ... và {scraped.comments.length - 15} bình luận khác (Tải JSON để xem hết)
                      </span>
                    )}
                  </div>
                )}

                <div className="sp-btn-group">
                  <button className="sp-btn sp-btn-primary sp-flex-1" onClick={doPush} disabled={busy}>
                    <CloudArrowUp size={16} weight="bold" /> Đẩy lên Web
                  </button>
                  <button className="sp-btn sp-btn-secondary" onClick={doDownload}>
                    <DownloadSimple size={16} weight="bold" /> Tải JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'batch' && (
          <div className="sp-card">
            <div className="sp-card-head">
              <span className="sp-card-title">Xử Lý Batch Hàng Chờ</span>
              <span className="sp-card-desc">Tự động lấy queue từ server và quét</span>
            </div>

            <div className="sp-quota-panel">
              <div className="sp-quota-row">
                <span>Quota giờ:</span>
                <strong>{usageInfo.hour} / {POLICY.maxPerHour}</strong>
              </div>
              <div className="sp-quota-row">
                <span>Quota ngày:</span>
                <strong>{usageInfo.day} / {POLICY.maxPerDay}</strong>
              </div>
              {usageInfo.cooldown && (
                <div className="sp-cooldown-badge">
                  <Warning size={14} weight="fill" /> Cooldown: {usageInfo.reason || 'Tạm dừng'}
                </div>
              )}
            </div>

            <button className="sp-btn sp-btn-accent sp-btn-block" onClick={doBatch} disabled={busy}>
              <Play size={18} weight="fill" /> {busy ? 'Đang chạy batch...' : 'Chạy Batch Ngay'}
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
                <span className="sp-toggle-text">Tự động cào theo định kỳ (Alarm)</span>
              </label>
            </div>
          </div>
        )}

        {error && (
          <div className="sp-error-alert">
            <Warning size={16} weight="fill" /> {error}
          </div>
        )}

        {/* Debug Stats & Interactive Inspector Panel */}
        {lastStats && (
          <div className="sp-debug-panel">
            <div className="sp-debug-header-row">
              <div className="sp-debug-title">🔍 DEBUG STATS &amp; CHẨN ĐOÁN CHI TIẾT</div>
              <button
                type="button"
                className="sp-debug-toggle-btn"
                onClick={() => setShowInspector(!showInspector)}
              >
                <MagnifyingGlassPlus size={14} weight="bold" />
                {showInspector ? 'Ẩn Bảng Soi' : 'Soi Chi Tiết Comment'}
              </button>
            </div>

            <div className="sp-debug-grid">
              <span title="Số message postMessage từ interceptor">📨 Interceptor msgs: <b>{lastStats.interceptedMessages}</b></span>
              <span title="Tổng comment thô interceptor gửi lên">🗂 Raw comments: <b>{lastStats.totalInterceptedRaw}</b></span>
              <span title="Comment đang nằm trong buffer">🗃 Buffer: <b>{lastStats.bufferSize}</b></span>
              <span title="Phản hồi con trong buffer">🧵 Sub-replies: <b>{lastStats.bufferedWithReplies}</b></span>
              <span title="Số comment lấy từ GraphQL">📡 GraphQL used: <b>{lastStats.graphQLComments}</b></span>
              <span title="Số comment bổ sung từ DOM">🖥 DOM used: <b>{lastStats.domComments}</b></span>
              <span title="Tổng link author trên trang">🔗 Author links: <b>{lastStats.totalAuthorLinks}</b></span>
              <span title="Số link bị bỏ vì nằm trong mainPostContainer">🎯 Skipped inMain: <b>{lastStats.skippedInMain}</b></span>
              <span title="Số link bị bỏ vì nằm phía trên bài chính">⬆ Skipped aboveMain: <b>{lastStats.skippedAboveMain}</b></span>
              <span title="Số link bị bỏ vì sidebar/header">📦 Skipped sidebar: <b>{lastStats.skippedSidebar}</b></span>
              <span title="Số link bị bỏ vì không có card/text/trùng">🚫 Skipped noCard/noText/dup: <b>{lastStats.skippedNoCard}/{lastStats.skippedNoText}/{lastStats.skippedDup}</b></span>
              <span title="Container bài chính đang xác định là gì">🏷 Main post: <b>{lastStats.mainPostContainerTag}</b></span>
              <span title="ID bài viết chính">🆔 Root Post ID: <b>{scraped?.main_post_id || 'Chưa bắt'}</b></span>
            </div>

            {/* Visual Highlight Button */}
            <button
              type="button"
              className="sp-btn sp-btn-secondary sp-btn-block"
              onClick={doHighlightOnPage}
              disabled={busy}
              style={{ marginTop: 10, borderColor: 'rgba(217, 72, 31, 0.4)', color: 'var(--ember)' }}
            >
              <Flask size={16} weight="bold" color="var(--ember)" /> 🎯 Viền Đỏ Phần Tử Trực Tiếp Trên Trang Threads
            </button>

            {/* Detailed Comment Inspector Drawer */}
            {showInspector && scraped && (
              <div className="sp-inspector-container">
                <div className="sp-inspector-head">
                  <span><Funnel size={14} /> Lọc dữ liệu comment:</span>
                  <div className="sp-filter-pills">
                    <button
                      className={`sp-pill ${debugFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setDebugFilter('all')}
                    >
                      Tất cả ({scraped.comments.length})
                    </button>
                    <button
                      className={`sp-pill ${debugFilter === 'root' ? 'active' : ''}`}
                      onClick={() => setDebugFilter('root')}
                    >
                      📌 Gốc ({rootCount})
                    </button>
                    <button
                      className={`sp-pill ${debugFilter === 'subreply' ? 'active' : ''}`}
                      onClick={() => setDebugFilter('subreply')}
                    >
                      ↳ Sub-reply ({replyCount})
                    </button>
                    <button
                      className={`sp-pill ${debugFilter === 'graphql' ? 'active' : ''}`}
                      onClick={() => setDebugFilter('graphql')}
                    >
                      📡 GraphQL ({graphqlCount})
                    </button>
                    <button
                      className={`sp-pill ${debugFilter === 'dom' ? 'active' : ''}`}
                      onClick={() => setDebugFilter('dom')}
                    >
                      🖥 DOM ({domCount})
                    </button>
                  </div>
                </div>

                <div className="sp-inspector-list">
                  {filteredComments.length === 0 ? (
                    <div className="sp-log-empty">Không có comment nào khớp bộ lọc.</div>
                  ) : (
                    filteredComments.map((c, i) => {
                      const isSub = isSubReplyComment(c, scraped.author_username, scraped.main_post_id);
                      const isExpanded = expandedCommentIdx === i;

                      return (
                        <div key={i} className="sp-inspector-item">
                          <div
                            className="sp-inspector-item-row"
                            onClick={() => setExpandedCommentIdx(isExpanded ? null : i)}
                          >
                            <span className="sp-inspector-num">#{i + 1}</span>
                            <span className={`sp-inspector-badge ${isSub ? 'sub' : 'root'}`}>
                              {isSub ? '↳ SUB-REPLY' : '📌 GỐC'}
                            </span>
                            <span className="sp-inspector-source">
                              {c.external_id ? '📡 GraphQL' : '🖥 DOM'}
                            </span>
                            <span className="sp-inspector-user">@{c.author_username}</span>
                            <span className="sp-inspector-text">{c.text}</span>
                          </div>

                          {isExpanded && (
                            <div className="sp-inspector-detail">
                              <div className="sp-inspector-detail-row">
                                <b>external_id (ID comment):</b> <code>{c.external_id || 'null (từ DOM)'}</code>
                              </div>
                              <div className="sp-inspector-detail-row">
                                <b>parent_id (ID cha):</b>{' '}
                                <code>
                                  {c.parent_id || 'null'}
                                  {c.parent_id === scraped.main_post_id ? ' (Trùng ID Bài Gốc -> GỐC)' : ''}
                                </code>
                              </div>
                              <div className="sp-inspector-detail-row">
                                <b>reply_to_username:</b> <code>{c.reply_to_username || 'null'}</code>
                              </div>
                              <div className="sp-inspector-detail-row">
                                <b>direct_reply_count:</b> <code>{c.direct_reply_count ?? 0}</code>
                              </div>
                              <div className="sp-inspector-detail-row">
                                <b>like_count / posted_at:</b>{' '}
                                <code>{c.like_count} likes / {c.posted_at ? new Date(c.posted_at * 1000).toLocaleString('vi-VN') : 'null'}</code>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Real-time Log Output */}
        <div className="sp-log-container">
          <div className="sp-log-header">
            <TerminalWindow size={14} /> Nhật Ký Xử Lý
          </div>
          <div className="sp-log-body">
            {logLines.length === 0 ? (
              <span className="sp-log-empty">Chưa có nhật ký hoạt động nào.</span>
            ) : (
              logLines.map((line, i) => <div key={i} className="sp-log-line">{line}</div>)
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
