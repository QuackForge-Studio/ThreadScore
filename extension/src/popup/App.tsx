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
} from '@phosphor-icons/react';
import { getConfig, setConfig, type ExtensionConfig } from '../lib/storage';
import { scrapeActiveTab } from './manual';
import { runBatchFromPopup } from './batch';
import { pushImport } from '../lib/api';
import type { ScrapedThread } from '../content/scraper';
import { getUsage, isCooldownActive, getCooldownReason, POLICY } from './shared';

export default function App() {
  const [config, setConfigState] = useState<ExtensionConfig>({ webUrl: '', adminKey: '', autoEnabled: false });
  const [tab, setTab] = useState<'manual' | 'batch' | 'settings'>('manual');
  const [scraped, setScraped] = useState<ScrapedThread | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
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
      setScraped(s);
      log(`Quét thành công! Tìm thấy ${s.comments.length} bình luận.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi quét bài viết');
      log(`Thất bại: ${e instanceof Error ? e.message : 'Lỗi không xác định'}`);
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

            <button className="sp-btn sp-btn-accent sp-btn-block" onClick={doScrape} disabled={busy}>
              <Browser size={18} weight="bold" /> {busy ? 'Đang quét...' : 'Lấy bài + comments'}
            </button>

            {scraped && (
              <div className="sp-result-box">
                <div className="sp-result-meta">
                  <span className="sp-result-title">{scraped.title || 'Bài viết Threads'}</span>
                  <span className="sp-result-count">{scraped.comments.length} bình luận (đã gom cả phản hồi con)</span>
                </div>

                {scraped.comments.length > 0 && (
                  <div className="sp-comments-list">
                    {scraped.comments.slice(0, 15).map((c, idx) => (
                      <div key={idx} className="sp-comment-item">
                        <span className="sp-comment-user">@{c.author_username || 'người dùng'}:</span>
                        <span className="sp-comment-snippet">{c.text}</span>
                      </div>
                    ))}
                    {scraped.comments.length > 15 && (
                      <span style={{ fontSize: 10.5, color: '#888', textAlign: 'center', marginTop: 4 }}>
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
