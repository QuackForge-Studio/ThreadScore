import { useEffect, useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

export default function AdminPage() {
  const [key, setKey] = useState(() => localStorage.getItem('ts_admin_key') ?? '');
  const [pending, setPending] = useState<Array<{ id: string; url: string; status: string; created_at: number }>>([]);
  const [workerResult, setWorkerResult] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadQueue() {
    setError(null);
    try {
      const r = await fetch('/api/queue/pending', { headers: { 'X-Admin-Key': key } });
      if (!r.ok) throw new Error(`Lỗi ${r.status}`);
      setPending((await r.json() as { requests: never }).requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải queue');
    }
  }

  async function runWorker() {
    setError(null);
    try {
      const r = await fetch('/api/admin/worker', { method: 'POST', headers: { 'X-Admin-Key': key } });
      if (!r.ok) throw new Error(`Lỗi ${r.status}`);
      const b = await r.json() as { processedThreads: number; scoredComments: number };
      setWorkerResult(`Đã xử lý ${b.processedThreads} bài, chấm ${b.scoredComments} comments`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi chạy worker');
    }
  }

  async function uploadJson() {
    setError(null);
    try {
      const r = await fetch('/api/admin/import-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
        body: JSON.stringify(JSON.parse(jsonText)),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})) as { error?: string }).error ?? `Lỗi ${r.status}`);
      setJsonText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi import JSON');
    }
  }

  useEffect(() => { localStorage.setItem('ts_admin_key', key); }, [key]);

  return (
    <div className="page">
      <h2 className="page-title">Admin</h2>
      <label className="field">
        <span className="field-label">Admin secret key</span>
        <input
          className="field-input"
          type="password"
          placeholder="Nhập secret key"
          value={key}
          onChange={e => setKey(e.target.value)}
        />
      </label>
      <div className="admin-actions">
        <button className="btn btn-ghost" onClick={loadQueue}>Tải queue</button>
        <button className="btn btn-ghost" onClick={runWorker}>Chạy scoring worker</button>
      </div>
      {workerResult && <p className="admin-worker-result">{workerResult}</p>}
      {pending.map(r => <p key={r.id} className="admin-pending mono">{r.url}</p>)}
      <h3 className="admin-section-title">Upload JSON thủ công</h3>
      <textarea className="admin-json mono" rows={6} placeholder='{"url": "...", "comments": [...]}' value={jsonText} onChange={e => setJsonText(e.target.value)} />
      <button className="btn btn-primary" onClick={uploadJson}>Import JSON</button>
      {error && (
        <div className="error-banner" role="alert">
          <WarningCircle aria-hidden="true" /> {error}
        </div>
      )}
    </div>
  );
}
