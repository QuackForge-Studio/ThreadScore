import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Key,
  Lightning,
  Queue,
  UploadSimple,
  Trophy,
  Trash,
  Plus,
  ArrowClockwise,
  CheckCircle,
  WarningCircle,
  Eye,
  EyeSlash,
  Sparkle,
  Fire,
  Coffee,
} from '@phosphor-icons/react';
import { getStoredSupporters, DEFAULT_SUPPORTERS, type Supporter } from '../components/HallOfFame';
import { Reveal } from '../components/motion';

export default function AdminPage() {
  const [key, setKey] = useState(() => localStorage.getItem('ts_admin_key') ?? '');
  const [showKey, setShowKey] = useState(false);
  const [pending, setPending] = useState<Array<{ id: string; url: string; status: string; created_at: number }>>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [runningWorker, setRunningWorker] = useState(false);
  const [workerResult, setWorkerResult] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [uploadingJson, setUploadingJson] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Supporters Manager State
  const [supporters, setSupporters] = useState<Supporter[]>(getStoredSupporters);
  const [newSupporterName, setNewSupporterName] = useState('');
  const [newSupporterTier, setNewSupporterTier] = useState<'legend' | 'hero' | 'backer'>('hero');
  const [newSupporterAmount, setNewSupporterAmount] = useState('10 ☕ Cà phê');
  const [newSupporterMessage, setNewSupporterMessage] = useState('');

  useEffect(() => {
    localStorage.setItem('ts_admin_key', key);
  }, [key]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  }

  async function loadQueue() {
    setError(null);
    setLoadingQueue(true);
    try {
      const r = await fetch('/api/queue/pending', { headers: { 'X-Admin-Key': key } });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw new Error((b as { error?: string }).error ?? `Lỗi HTTP ${r.status}`);
      }
      const data = (await r.json()) as { requests: Array<{ id: string; url: string; status: string; created_at: number }> };
      setPending(data.requests || []);
      showSuccess(`Đã tải ${data.requests?.length || 0} bài trong hàng đợi.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải hàng đợi');
    } finally {
      setLoadingQueue(false);
    }
  }

  async function runWorker() {
    setError(null);
    setRunningWorker(true);
    setWorkerResult(null);
    try {
      const r = await fetch('/api/admin/worker', { method: 'POST', headers: { 'X-Admin-Key': key } });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw new Error((b as { error?: string }).error ?? `Lỗi HTTP ${r.status}`);
      }
      const b = (await r.json()) as { processedThreads: number; scoredComments: number };
      const msg = `Đã xử lý ${b.processedThreads} bài, chấm điểm thành công ${b.scoredComments} bình luận!`;
      setWorkerResult(msg);
      showSuccess(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi chạy worker');
    } finally {
      setRunningWorker(false);
    }
  }

  async function uploadJson() {
    setError(null);
    if (!jsonText.trim()) {
      setError('Vui lòng dán nội dung JSON vào ô.');
      return;
    }
    setUploadingJson(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        throw new Error('Dữ liệu không phải là JSON hợp lệ!');
      }

      const r = await fetch('/api/admin/import-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key },
        body: JSON.stringify(parsed),
      });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw new Error((b as { error?: string }).error ?? `Lỗi import HTTP ${r.status}`);
      }
      setJsonText('');
      showSuccess('Đã import JSON lên database và kích hoạt scoring worker thành công!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi import JSON');
    } finally {
      setUploadingJson(false);
    }
  }

  // Supporter Management
  function saveSupporters(updated: Supporter[]) {
    setSupporters(updated);
    localStorage.setItem('ts_supporters', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    showSuccess('Đã lưu danh sách Bảng Vinh Danh!');
  }

  function handleAddSupporter(e: React.FormEvent) {
    e.preventDefault();
    if (!newSupporterName.trim()) {
      setError('Vui lòng nhập tên người ủng hộ.');
      return;
    }
    const newItem: Supporter = {
      id: Date.now().toString(),
      name: newSupporterName.trim(),
      tier: newSupporterTier,
      amount: newSupporterAmount.trim() || undefined,
      message: newSupporterMessage.trim() || undefined,
      date: new Date().getFullYear().toString(),
    };
    const updated = [newItem, ...supporters];
    saveSupporters(updated);
    setNewSupporterName('');
    setNewSupporterMessage('');
  }

  function handleDeleteSupporter(id: string) {
    const updated = supporters.filter((s) => s.id !== id);
    saveSupporters(updated);
  }

  function handleResetSupporters() {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục danh sách Bảng Vinh Danh về mặc định?')) {
      saveSupporters(DEFAULT_SUPPORTERS);
    }
  }

  return (
    <div className="page admin-page" style={{ padding: 'var(--space-6) var(--space-4) var(--space-9)' }}>
      <div className="container" style={{ maxWidth: '860px', margin: '0 auto' }}>
        <Reveal>
          <div className="admin-header" style={{ marginBottom: 'var(--space-6)' }}>
            <span className="section-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} weight="fill" color="var(--accent)" />
              Quản Trị Hệ Thống
            </span>
            <h1 className="section-title" style={{ fontSize: 'clamp(2rem, 5vw, 2.6rem)', marginTop: '6px' }}>
              ThreadScore Admin
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
              Quản lý hàng đợi cào dữ liệu, kích hoạt AI scoring và điều chỉnh Bảng Vinh Danh.
            </p>
          </div>
        </Reveal>

        {/* Global Notifications */}
        {error && (
          <div className="error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            <WarningCircle size={20} weight="fill" /> {error}
          </div>
        )}
        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--calm-soft)',
              color: 'var(--calm-ink)',
              border: '1px solid rgba(42, 111, 142, 0.25)',
              borderRadius: 'var(--radius-input)',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: 'var(--space-4)',
            }}
          >
            <CheckCircle size={20} weight="fill" /> {successMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Card 1: Admin Secret Key */}
          <Reveal delay={0.05}>
            <div className="admin-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Key size={20} weight="bold" color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--ink)' }}>
                  Khóa Quản Trị (Admin Secret Key)
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 12px' }}>
                Khóa bảo mật dùng để xác thực quyền chạy Scoring Worker và nạp dữ liệu. Tự động lưu trên trình duyệt của bạn.
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  className="field-input mono"
                  type={showKey ? 'text' : 'password'}
                  placeholder="Nhập secret key quản trị..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  style={{ flex: 1, height: '44px' }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? 'Ẩn key' : 'Hiện key'}
                  style={{ height: '44px', padding: '0 14px' }}
                >
                  {showKey ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </Reveal>

          {/* Card 2: Scraping Queue & Scoring Worker */}
          <Reveal delay={0.1}>
            <div className="admin-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Queue size={20} weight="bold" color="var(--calm-ink)" />
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--ink)' }}>
                    Hàng Đợi Yêu Cầu &amp; Chấm Điểm AI
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={loadQueue}
                    disabled={loadingQueue}
                    style={{ fontSize: '13px', padding: '7px 14px' }}
                  >
                    <ArrowClockwise size={15} /> {loadingQueue ? 'Đang tải...' : 'Tải Hàng Đợi'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={runWorker}
                    disabled={runningWorker}
                    style={{ fontSize: '13px', padding: '7px 14px' }}
                  >
                    <Lightning size={15} weight="fill" /> {runningWorker ? 'Đang chạy AI...' : 'Chạy Scoring Worker'}
                  </button>
                </div>
              </div>

              {workerResult && (
                <div className="admin-worker-result" style={{ margin: '12px 0' }}>
                  {workerResult}
                </div>
              )}

              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted)', marginBottom: '8px' }}>
                  Các bài viết đang chờ cào ({pending.length}):
                </div>
                {pending.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', background: 'var(--surface-sunk)', borderRadius: 'var(--radius-sm)', color: 'var(--faint)', fontSize: '13px' }}>
                    Không có bài viết nào đang chờ trong hàng đợi.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {pending.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'var(--surface-sunk)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12.5px',
                        }}
                      >
                        <span className="mono" style={{ color: 'var(--ink)' }}>{r.url}</span>
                        <span className="pill" style={{ fontSize: '11px', padding: '2px 8px' }}>Pending</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* Card 3: Manual JSON Import */}
          <Reveal delay={0.15}>
            <div className="admin-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <UploadSimple size={20} weight="bold" color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--ink)' }}>
                  Upload JSON Thủ Công
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 12px' }}>
                Dán file JSON trích xuất từ Chrome Extension (hoặc file backup) để nạp thẳng bài viết &amp; bình luận lên cơ sở dữ liệu.
              </p>
              <textarea
                className="admin-json mono"
                rows={5}
                placeholder='{"url": "https://www.threads.com/@user/post/...", "comments": [...]}'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border)', background: 'var(--surface-sunk)', fontSize: '12px' }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={uploadJson}
                disabled={uploadingJson}
                style={{ marginTop: '10px' }}
              >
                <UploadSimple size={16} /> {uploadingJson ? 'Đang import...' : 'Import JSON Lên Database'}
              </button>
            </div>
          </Reveal>

          {/* Card 4: Hall of Fame Manager */}
          <Reveal delay={0.2}>
            <div className="admin-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-5)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trophy size={20} weight="bold" color="#F05A28" />
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--ink)' }}>
                    Quản Lý Bảng Vinh Danh (Hall of Fame)
                  </h3>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleResetSupporters}
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  Khôi phục mặc định
                </button>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px' }}>
                Thêm hoặc xóa các mạnh thường quân xuất hiện ở phần Bảng Vinh Danh dưới chân trang Landing.
              </p>

              {/* Add Supporter Form */}
              <form onSubmit={handleAddSupporter} style={{ background: 'var(--surface-sunk)', padding: '14px', borderRadius: 'var(--radius-input)', marginBottom: '18px', border: '1px solid var(--border-soft)' }}>
                <div style={{ fontWeight: '700', fontSize: '13.5px', marginBottom: '10px', color: 'var(--ink)' }}>
                  + Thêm Người Tiếp Lửa Mới
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Tên / Nickname</label>
                    <input
                      className="field-input"
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={newSupporterName}
                      onChange={(e) => setNewSupporterName(e.target.value)}
                      style={{ width: '100%', height: '36px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Cấp độ (Tier)</label>
                    <select
                      className="field-input"
                      value={newSupporterTier}
                      onChange={(e) => setNewSupporterTier(e.target.value as 'legend' | 'hero' | 'backer')}
                      style={{ width: '100%', height: '36px', fontSize: '13px' }}
                    >
                      <option value="legend">🔥 Legend (Đối tác / Sáng lập)</option>
                      <option value="hero">✨ Hero (Mạnh thường quân)</option>
                      <option value="backer">☕ Backer (Bạn tiếp lửa)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Mức đóng góp / Cà phê</label>
                    <input
                      className="field-input"
                      placeholder="Ví dụ: 10 ☕ Cà phê hoặc 200.000đ"
                      value={newSupporterAmount}
                      onChange={(e) => setNewSupporterAmount(e.target.value)}
                      style={{ width: '100%', height: '36px', fontSize: '13px' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Lời nhắn tri ân</label>
                  <input
                    className="field-input"
                    placeholder="Ví dụ: Ủng hộ team phát triển công cụ mở cho cộng đồng!"
                    value={newSupporterMessage}
                    onChange={(e) => setNewSupporterMessage(e.target.value)}
                    style={{ width: '100%', height: '36px', fontSize: '13px' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '13px', padding: '6px 14px' }}>
                  <Plus size={15} weight="bold" /> Thêm Vào Bảng Vinh Danh
                </button>
              </form>

              {/* Supporters List */}
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted)', marginBottom: '8px' }}>
                Danh sách hiện đang hiển thị ({supporters.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {supporters.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--surface-sunk)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-soft)',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {s.tier === 'legend' ? (
                        <Fire size={18} weight="fill" color="#F05A28" />
                      ) : s.tier === 'hero' ? (
                        <Sparkle size={18} weight="fill" color="#E5484D" />
                      ) : (
                        <Coffee size={18} weight="fill" color="var(--calm-ink)" />
                      )}
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--ink)' }}>{s.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--accent-strong)', marginLeft: '8px' }}>
                          ({s.amount || s.tier})
                        </span>
                        {s.message && (
                          <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', marginTop: '2px' }}>
                            "{s.message}"
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => handleDeleteSupporter(s.id)}
                      title="Xóa người này khỏi Bảng Vinh Danh"
                      style={{ padding: '6px 8px', color: 'var(--anger-ink)', borderColor: 'transparent' }}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
