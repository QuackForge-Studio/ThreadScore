import { useEffect, useState } from 'react';
import { getConfig, setConfig, type ExtensionConfig } from '../lib/storage';
import { scrapeActiveTab } from './manual';
import { runBatch } from './batch';
import { pushImport } from '../lib/api';
import type { ScrapedThread } from '../content/scraper';

export default function App() {
  const [config, setConfigState] = useState<ExtensionConfig>({ webUrl: '', adminKey: '' });
  const [tab, setTab] = useState<'manual' | 'batch'>('manual');
  const [scraped, setScraped] = useState<ScrapedThread | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getConfig().then(setConfigState); }, []);

  function log(msg: string) { setLogLines(prev => [...prev, msg]); }

  async function saveConfig() {
    await setConfig(config);
    log('Đã lưu cấu hình');
  }

  async function doScrape() {
    setBusy(true); setError(null);
    try {
      const s = await scrapeActiveTab();
      setScraped(s);
      log(`Scrape OK: ${s.comments.length} comments`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi scrape');
    } finally {
      setBusy(false);
    }
  }

  async function doPush() {
    if (!scraped) return;
    setBusy(true); setError(null);
    try {
      const r = await pushImport(config, scraped);
      log(`Đã đẩy lên web: ${r.commentCount} comments`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi đẩy dữ liệu');
    } finally {
      setBusy(false);
    }
  }

  async function doDownload() {
    if (!scraped) return;
    const blob = new Blob([JSON.stringify(scraped, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'threadscore-import.json';
    a.click();
  }

  async function doBatch() {
    setBusy(true); setError(null);
    try {
      const r = await runBatch(config, log);
      log(`Batch xong: ${r.done} OK, ${r.failed} fail`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi batch');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ width: 380, padding: 12, fontFamily: 'system-ui' }}>
      <h3 style={{ margin: '0 0 8px' }}>ThreadScore Importer</h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input placeholder="Web URL" value={config.webUrl} onChange={e => setConfigState({ ...config, webUrl: e.target.value })} style={{ flex: 1 }} />
        <input placeholder="Admin key" type="password" value={config.adminKey} onChange={e => setConfigState({ ...config, adminKey: e.target.value })} style={{ flex: 1 }} />
        <button onClick={saveConfig}>Lưu</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => setTab('manual')} disabled={busy}>Import bài đang xem</button>
        <button onClick={() => setTab('batch')} disabled={busy}>Batch từ Queue</button>
      </div>

      {tab === 'manual' && (
        <div>
          <button onClick={doScrape} disabled={busy}>Lấy bài + comments hiện tại</button>
          {scraped && (
            <div style={{ marginTop: 8 }}>
              <p>{scraped.title ?? '(không có tiêu đề)'} — {scraped.comments.length} comments</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={doPush} disabled={busy}>Đẩy lên web</button>
                <button onClick={doDownload}>Tải JSON</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'batch' && (
        <div>
          <button onClick={doBatch} disabled={busy}>Chạy batch</button>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {logLines.length > 0 && (
        <pre style={{ maxHeight: 180, overflow: 'auto', background: '#f5f5f5', padding: 8, fontSize: 11 }}>
          {logLines.join('\n')}
        </pre>
      )}
    </div>
  );
}
