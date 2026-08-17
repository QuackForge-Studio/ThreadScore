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
  PencilSimple,
  SignOut,
  Lock,
} from '@phosphor-icons/react';
import { getStoredSupporters, DEFAULT_SUPPORTERS, type Supporter } from '../components/HallOfFame';
import { Reveal } from '../components/motion';

export default function AdminPage() {
  const [key, setKey] = useState(() => localStorage.getItem('ts_admin_key') ?? '');
  const [showKey, setShowKey] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supporterName, setSupporterName] = useState('');
  const [supporterTier, setSupporterTier] = useState<'legend' | 'hero' | 'backer'>('hero');
  const [supporterAmount, setSupporterAmount] = useState('10 ☕ Cà phê');
  const [supporterMessage, setSupporterMessage] = useState('');

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  }

  // Tự động kiểm tra nếu đã có key lưu từ trước
  useEffect(() => {
    const savedKey = localStorage.getItem('ts_admin_key');
    if (savedKey) {
      verifyKey(savedKey, true);
    }
  }, []);

  async function verifyKey(candidateKey: string, silent = false) {
    if (!candidateKey.trim()) {
      if (!silent) setError('Vui lòng nhập Admin Secret Key.');
      return;
    }
    setError(null);
    setIsVerifying(true);
    try {
      const r = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': candidateKey.trim() },
      });
      const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !data.ok) {
        throw new Error(data.error ?? 'Khóa quản trị (Secret Key) không chính xác!');
      }
      setKey(candidateKey.trim());
      localStorage.setItem('ts_admin_key', candidateKey.trim());
      setIsAuthenticated(true);
      if (!silent) showSuccess('Xác thực thành công! Chào mừng Quản trị viên.');
      // Auto load queue
      loadQueueWithKey(candidateKey.trim());
    } catch (e) {
      setIsAuthenticated(false);
      if (!silent) {
        setError(e instanceof Error ? e.message : 'Lỗi xác thực khóa quản trị');
      }
    } finally {
      setIsVerifying(false);
    }
  }

  function handleLogout() {
    setIsAuthenticated(false);
    localStorage.removeItem('ts_admin_key');
    setKey('');
    setPending([]);
    setWorkerResult(null);
    showSuccess('Đã đăng xuất khỏi phiên quản trị.');
  }

  async function loadQueueWithKey(adminKey: string) {
    setLoadingQueue(true);
    try {
      const r = await fetch('/api/queue/pending', { headers: { 'X-Admin-Key': adminKey } });
      if (r.ok) {
        const data = (await r.json()) as { requests: Array<{ id: string; url: string; status: string; created_at: number }> };
        setPending(data.requests || []);
      }
    } catch {
      // ignore in silent queue loader
    } finally {
      setLoadingQueue(false);
    }
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
  }

  function handleSaveSupporter(e: React.FormEvent) {
    e.preventDefault();
    if (!supporterName.trim()) {
      setError('Vui lòng nhập tên người ủng hộ.');
      return;
    }

    if (editingId) {
      // Cập nhật người ủng hộ hiện có
      const updated = supporters.map((s) =>
        s.id === editingId
          ? {
              ...s,
              name: supporterName.trim(),
              tier: supporterTier,
              amount: supporterAmount.trim() || undefined,
              message: supporterMessage.trim() || undefined,
            }
          : s
      );
      saveSupporters(updated);
      showSuccess(`Đã cập nhật thông tin của ${supporterName}!`);
      cancelEdit();
    } else {
      // Thêm người ủng hộ mới
      const newItem: Supporter = {
        id: Date.now().toString(),
        name: supporterName.trim(),
        tier: supporterTier,
        amount: supporterAmount.trim() || undefined,
        message: supporterMessage.trim() || undefined,
        date: new Date().getFullYear().toString(),
      };
      const updated = [newItem, ...supporters];
      saveSupporters(updated);
      showSuccess(`Đã thêm ${supporterName} vào Bảng Vinh Danh!`);
      setSupporterName('');
      setSupporterMessage('');
    }
  }

  function startEdit(s: Supporter) {
    setEditingId(s.id);
    setSupporterName(s.name);
    setSupporterTier(s.tier);
    setSupporterAmount(s.amount || '');
    setSupporterMessage(s.message || '');
    const formEl = document.getElementById('supporter-form');
    if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setSupporterName('');
    setSupporterTier('hero');
    setSupporterAmount('10 ☕ Cà phê');
    setSupporterMessage('');
  }

  function handleDeleteSupporter(id: string, name: string) {
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${name}" khỏi Bảng Vinh Danh?`)) {
      const updated = supporters.filter((s) => s.id !== id);
      saveSupporters(updated);
      if (editingId === id) cancelEdit();
      showSuccess(`Đã xóa ${name} khỏi Bảng Vinh Danh.`);
    }
  }

  function handleResetSupporters() {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục danh sách Bảng Vinh Danh về mặc định?')) {
      saveSupporters(DEFAULT_SUPPORTERS);
      cancelEdit();
      showSuccess('Đã khôi phục danh sách mặc định!');
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
              Bảng điều khiển quản trị hàng đợi cào dữ liệu, kích hoạt AI scoring và tinh chỉnh Bảng Vinh Danh.
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

        {/* ========================================================= */}
        {/* VIEW 1: KHI CHƯA XÁC THỰC KEY -> CHỈ HIỆN FORM ĐĂNG NHẬP KEY */}
        {/* ========================================================= */}
        {!isAuthenticated ? (
          <Reveal delay={0.05}>
            <div
              className="admin-card"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)',
                padding: 'var(--space-6)',
                boxShadow: 'var(--shadow-card)',
                maxWidth: '520px',
                margin: '0 auto',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'var(--anger-soft)',
                  color: 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Lock size={28} weight="duotone" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px', color: 'var(--ink)' }}>
                Xác Thực Quyền Quản Trị
              </h2>
              <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: '0 0 20px', lineHeight: '1.5' }}>
                Vui lòng nhập <b>Admin Secret Key</b> để mở khóa các công cụ quản trị hệ thống và Bảng Vinh Danh.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyKey(key);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div style={{ position: 'relative' }}>
                  <input
                    className="field-input mono"
                    type={showKey ? 'text' : 'password'}
                    placeholder="Nhập secret key quản trị..."
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    style={{ width: '100%', height: '46px', paddingRight: '44px', fontSize: '14px' }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    title={showKey ? 'Ẩn key' : 'Hiện key'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      padding: '4px',
                    }}
                  >
                    {showKey ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isVerifying}
                  style={{ height: '46px', justifyContent: 'center', fontSize: '14px', fontWeight: '700' }}
                >
                  <Key size={18} weight="bold" /> {isVerifying ? 'Đang kiểm tra...' : 'Xác Thực & Mở Khóa'}
                </button>
              </form>
            </div>
          </Reveal>
        ) : (
          /* ========================================================= */
          /* VIEW 2: ĐÃ XÁC THỰC THÀNH CÔNG -> HIỆN TOÀN BỘ DASHBOARD */
          /* ========================================================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Active Session Bar */}
            <Reveal delay={0.02}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 16px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} weight="fill" color="var(--calm-ink)" />
                  <span style={{ color: 'var(--ink)' }}>Phiên quản trị đang hoạt động</span>
                  <span className="mono" style={{ color: 'var(--muted)', fontSize: '12px' }}>
                    (Key: {key.slice(0, 4)}••••)
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleLogout}
                  style={{ fontSize: '12px', padding: '4px 10px', height: 'auto' }}
                >
                  <SignOut size={14} /> Đăng xuất
                </button>
              </div>
            </Reveal>

            {/* Card 1: Scraping Queue & Scoring Worker */}
            <Reveal delay={0.06}>
              <div
                className="admin-card"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)',
                  padding: 'var(--space-5)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
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
                    <div
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        background: 'var(--surface-sunk)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--faint)',
                        fontSize: '13px',
                      }}
                    >
                      Không có bài viết nào đang chờ trong hàng đợi.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                      }}
                    >
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
                          <span className="mono" style={{ color: 'var(--ink)' }}>
                            {r.url}
                          </span>
                          <span className="pill" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            Pending
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Reveal>

            {/* Card 2: Manual JSON Import */}
            <Reveal delay={0.1}>
              <div
                className="admin-card"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)',
                  padding: 'var(--space-5)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <UploadSimple size={20} weight="bold" color="var(--accent)" />
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--ink)' }}>
                    Upload JSON Thủ Công
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 12px' }}>
                  Dán file JSON trích xuất từ Chrome Extension (hoặc file backup) để nạp thẳng bài viết &amp; bình luận
                  lên cơ sở dữ liệu.
                </p>
                <textarea
                  className="admin-json mono"
                  rows={5}
                  placeholder='{"url": "https://www.threads.com/@user/post/...", "comments": [...]}'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-sunk)',
                    fontSize: '12px',
                  }}
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

            {/* Card 3: Hall of Fame Manager (With Add & Edit) */}
            <Reveal delay={0.14}>
              <div
                className="admin-card"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)',
                  padding: 'var(--space-5)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
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
                  Thêm, chỉnh sửa thông tin hoặc xóa các mạnh thường quân xuất hiện ở phần Bảng Vinh Danh dưới chân trang
                  Landing.
                </p>

                {/* Add / Edit Supporter Form */}
                <form
                  id="supporter-form"
                  onSubmit={handleSaveSupporter}
                  style={{
                    background: 'var(--surface-sunk)',
                    padding: '16px',
                    borderRadius: 'var(--radius-input)',
                    marginBottom: '18px',
                    border: editingId ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
                    transition: 'border-color 200ms ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: '700',
                        fontSize: '13.5px',
                        color: editingId ? 'var(--accent-strong)' : 'var(--ink)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {editingId ? (
                        <>
                          <PencilSimple size={16} weight="bold" /> Đang Chỉnh Sửa Người Ủng Hộ
                        </>
                      ) : (
                        <>
                          <Plus size={16} weight="bold" /> Thêm Người Tiếp Lửa Mới
                        </>
                      )}
                    </div>
                    {editingId && (
                      <button
                        type="button"
                        onClick={cancelEdit}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Hủy chỉnh sửa
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '10px',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: '11.5px',
                          fontWeight: '600',
                          color: 'var(--muted)',
                          display: 'block',
                          marginBottom: '4px',
                        }}
                      >
                        Tên / Nickname
                      </label>
                      <input
                        className="field-input"
                        placeholder="Ví dụ: Nguyễn Văn A"
                        value={supporterName}
                        onChange={(e) => setSupporterName(e.target.value)}
                        style={{ width: '100%', height: '36px', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '11.5px',
                          fontWeight: '600',
                          color: 'var(--muted)',
                          display: 'block',
                          marginBottom: '4px',
                        }}
                      >
                        Cấp độ (Tier)
                      </label>
                      <select
                        className="field-input"
                        value={supporterTier}
                        onChange={(e) => setSupporterTier(e.target.value as 'legend' | 'hero' | 'backer')}
                        style={{ width: '100%', height: '36px', fontSize: '13px' }}
                      >
                        <option value="legend">🔥 Legend (Đối tác / Sáng lập)</option>
                        <option value="hero">✨ Hero (Mạnh thường quân)</option>
                        <option value="backer">☕ Backer (Bạn tiếp lửa)</option>
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: '11.5px',
                          fontWeight: '600',
                          color: 'var(--muted)',
                          display: 'block',
                          marginBottom: '4px',
                        }}
                      >
                        Mức đóng góp / Cà phê
                      </label>
                      <input
                        className="field-input"
                        placeholder="Ví dụ: 10 ☕ Cà phê hoặc 200.000đ"
                        value={supporterAmount}
                        onChange={(e) => setSupporterAmount(e.target.value)}
                        style={{ width: '100%', height: '36px', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        fontSize: '11.5px',
                        fontWeight: '600',
                        color: 'var(--muted)',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Lời nhắn tri ân
                    </label>
                    <input
                      className="field-input"
                      placeholder="Ví dụ: Ủng hộ team phát triển công cụ mở cho cộng đồng!"
                      value={supporterMessage}
                      onChange={(e) => setSupporterMessage(e.target.value)}
                      style={{ width: '100%', height: '36px', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" style={{ fontSize: '13px', padding: '6px 14px' }}>
                      {editingId ? (
                        <>
                          <CheckCircle size={15} weight="bold" /> Lưu Thay Đổi
                        </>
                      ) : (
                        <>
                          <Plus size={15} weight="bold" /> Thêm Vào Bảng Vinh Danh
                        </>
                      )}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={cancelEdit}
                        style={{ fontSize: '13px', padding: '6px 12px' }}
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                </form>

                {/* Supporters List with Edit and Delete actions */}
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted)', marginBottom: '8px' }}>
                  Danh sách hiện đang hiển thị ({supporters.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {supporters.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: editingId === s.id ? 'var(--surface-raised)' : 'var(--surface-sunk)',
                        borderRadius: 'var(--radius-sm)',
                        border: editingId === s.id ? '1px solid var(--accent)' : '1px solid var(--border-soft)',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        {s.tier === 'legend' ? (
                          <Fire size={18} weight="fill" color="#F05A28" />
                        ) : s.tier === 'hero' ? (
                          <Sparkle size={18} weight="fill" color="#E5484D" />
                        ) : (
                          <Coffee size={18} weight="fill" color="var(--calm-ink)" />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--ink)' }}>{s.name}</span>
                            <span style={{ fontSize: '12px', color: 'var(--accent-strong)' }}>
                              ({s.amount || s.tier})
                            </span>
                          </div>
                          {s.message && (
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--muted)',
                                fontStyle: 'italic',
                                marginTop: '2px',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              "{s.message}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => startEdit(s)}
                          title="Chỉnh sửa thông tin"
                          style={{ padding: '6px 8px', color: 'var(--ink-2)', borderColor: 'transparent' }}
                        >
                          <PencilSimple size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleDeleteSupporter(s.id, s.name)}
                          title="Xóa người này khỏi Bảng Vinh Danh"
                          style={{ padding: '6px 8px', color: 'var(--anger-ink)', borderColor: 'transparent' }}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </div>
  );
}
