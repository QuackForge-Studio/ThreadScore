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
  MagnifyingGlass,
  ArrowSquareOut,
  FloppyDisk,
  Article,
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

  // Threads Editor State
  const [threadQuery, setThreadQuery] = useState('');
  const [searchingThread, setSearchingThread] = useState(false);
  const [recentThreads, setRecentThreads] = useState<Array<{ id: string; title: string | null; content?: string | null; url: string; author_username: string | null; total_comments: number }>>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selectedThread, setSelectedThread] = useState<{
    id: string;
    url: string;
    title: string;
    content: string;
    author_username: string;
    author_name: string;
  } | null>(null);
  const [savingThread, setSavingThread] = useState(false);
  const [threadEditSuccess, setThreadEditSuccess] = useState<string | null>(null);
  const [threadEditError, setThreadEditError] = useState<string | null>(null);

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

  // Threads Editor Functions
  async function loadRecentThreads() {
    setLoadingRecent(true);
    setThreadEditError(null);
    try {
      const r = await fetch('/api/threads?limit=15&sort=newest');
      if (r.ok) {
        const data = (await r.json()) as { threads?: Array<{ id: string; title: string | null; url: string; author_username: string | null; total_comments: number }> };
        setRecentThreads(data.threads || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingRecent(false);
    }
  }

  async function searchOrLoadThread(queryOverride?: string) {
    const q = (queryOverride ?? threadQuery).trim();
    if (!q) {
      setThreadEditError('Vui lòng nhập URL Threads hoặc ID bài viết.');
      return;
    }
    setSearchingThread(true);
    setThreadEditError(null);
    setThreadEditSuccess(null);

    try {
      // 1. Thử load trực tiếp theo id bài viết
      let threadData: { thread?: { id: string; url: string; title: string | null; content: string | null; author_username: string | null; author_name: string | null } } | null = null;
      try {
        const resDirect = await fetch(`/api/threads/${encodeURIComponent(q)}`);
        if (resDirect.ok) {
          threadData = (await resDirect.json()) as typeof threadData;
        }
      } catch {}

      // 2. Nếu không ra theo id, thử search theo URL/query
      if (!threadData?.thread) {
        const resSearch = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (resSearch.ok) {
          const searchData = (await resSearch.json()) as { matches?: Array<{ id: string; url: string; title: string | null; content: string | null; author_username: string | null; author_name: string | null }> };
          if (searchData.matches && searchData.matches.length > 0) {
            const first = searchData.matches[0];
            // Fetch chi tiết bài viết đầu tiên tìm thấy
            const resDetail = await fetch(`/api/threads/${first.id}`);
            if (resDetail.ok) {
              threadData = (await resDetail.json()) as typeof threadData;
            }
          }
        }
      }

      if (threadData?.thread) {
        const rawTitle = threadData.thread.title?.trim() ?? '';
        const rawContent = threadData.thread.content?.trim() ?? '';
        // Nếu title bị gán là "Thread" hoặc rỗng, tự động lấy content làm title
        const effectiveTitle = (!rawTitle || rawTitle === 'Thread') ? rawContent : rawTitle;

        setSelectedThread({
          id: threadData.thread.id,
          url: threadData.thread.url,
          title: effectiveTitle,
          content: rawContent,
          author_username: threadData.thread.author_username ?? '',
          author_name: threadData.thread.author_name ?? '',
        });
        showSuccess('Đã tải thông tin bài viết vào form chỉnh sửa!');
      } else {
        throw new Error('Không tìm thấy bài viết phù hợp với liên kết hoặc ID đã nhập.');
      }
    } catch (e) {
      setThreadEditError(e instanceof Error ? e.message : 'Lỗi tra cứu bài viết');
    } finally {
      setSearchingThread(false);
    }
  }

  async function handleSaveThreadEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedThread) return;
    setSavingThread(true);
    setThreadEditError(null);
    setThreadEditSuccess(null);

    try {
      const res = await fetch('/api/admin/thread-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': key,
        },
        body: JSON.stringify({
          id: selectedThread.id,
          title: selectedThread.title,
          content: selectedThread.content,
          author_username: selectedThread.author_username,
          author_name: selectedThread.author_name,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Lưu thay đổi thất bại.');
      }

      setThreadEditSuccess('Đã cập nhật bài viết thành công vào hệ thống!');
      showSuccess(`Đã cập nhật chi tiết bài viết "${selectedThread.title || selectedThread.id}"!`);
      // Reload recent list if open
      if (recentThreads.length > 0) {
        loadRecentThreads();
      }
    } catch (err) {
      setThreadEditError(err instanceof Error ? err.message : 'Lỗi cập nhật bài viết');
    } finally {
      setSavingThread(false);
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
    <div className="page admin-page">
      <div className="container">
        <Reveal>
          <div className="admin-header">
            <span className="section-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} weight="fill" color="var(--accent)" />
              Quản Trị Hệ Thống
            </span>
            <h1 className="section-title">ThreadScore Admin</h1>
            <p>
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
          <div className="admin-notice">
            <CheckCircle size={20} weight="fill" /> {successMsg}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 1: KHI CHƯA XÁC THỰC KEY -> CHỈ HIỆN FORM ĐĂNG NHẬP KEY */}
        {/* ========================================================= */}
        {!isAuthenticated ? (
          <Reveal delay={0.05}>
            <div className="admin-login-card">
              <div className="admin-login-icon">
                <Lock size={28} weight="duotone" />
              </div>
              <h2>Xác Thực Quyền Quản Trị</h2>
              <p>
                Vui lòng nhập <b>Admin Secret Key</b> để mở khóa các công cụ quản trị hệ thống và Bảng Vinh Danh.
              </p>

              <form
                className="admin-login-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyKey(key);
                }}
              >
                <div className="admin-key-wrap">
                  <input
                    className="field-input mono admin-key-input"
                    type={showKey ? 'text' : 'password'}
                    placeholder="Nhập secret key quản trị..."
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="admin-eye-btn"
                    onClick={() => setShowKey(!showKey)}
                    title={showKey ? 'Ẩn key' : 'Hiện key'}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Active Session Bar */}
            <Reveal delay={0.02}>
              <div className="admin-session-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
              <div className="admin-card">
                <div className="admin-card-head">
                  <h3 className="admin-card-title">
                    <Queue size={20} weight="bold" color="var(--calm-ink)" />
                    Hàng Đợi Yêu Cầu &amp; Chấm Điểm AI
                  </h3>
                  <div className="admin-btn-row">
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
                    <div className="admin-queue-empty">
                      Không có bài viết nào đang chờ trong hàng đợi.
                    </div>
                  ) : (
                    <div className="admin-queue-list">
                      {pending.map((r) => (
                        <div key={r.id} className="admin-queue-item">
                          <span className="mono" style={{ color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              <div className="admin-card">
                <div className="admin-card-head">
                  <h3 className="admin-card-title">
                    <UploadSimple size={20} weight="bold" color="var(--accent)" />
                    Upload JSON Thủ Công
                  </h3>
                </div>
                <p className="admin-card-sub">
                  Dán file JSON trích xuất từ Chrome Extension (hoặc file backup) để nạp thẳng bài viết &amp; bình luận
                  lên cơ sở dữ liệu.
                </p>
                <textarea
                  className="admin-json mono"
                  rows={5}
                  placeholder='{"url": "https://www.threads.com/@user/post/...", "comments": [...]}'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={uploadJson}
                  disabled={uploadingJson}
                >
                  <UploadSimple size={16} /> {uploadingJson ? 'Đang import...' : 'Import JSON Lên Database'}
                </button>
              </div>
            </Reveal>

            {/* Card 3: Threads Detail Editor (Chỉnh Sửa Bài Viết Thủ Công) */}
            <Reveal delay={0.12}>
              <div className="admin-card">
                <div className="admin-card-head">
                  <h3 className="admin-card-title">
                    <PencilSimple size={20} weight="bold" color="var(--accent)" />
                    Quản Lý &amp; Chỉnh Sửa Chi Tiết Bài Viết
                  </h3>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={loadRecentThreads}
                    disabled={loadingRecent}
                    style={{ fontSize: '12px', padding: '5px 12px' }}
                  >
                    <Article size={15} /> {loadingRecent ? 'Đang tải...' : 'Xem Bài Gần Đây'}
                  </button>
                </div>
                <p className="admin-card-sub">
                  Tìm kiếm bài viết bằng liên kết Threads hoặc ID bài viết để tinh chỉnh tiêu đề, nội dung và thông tin tác giả.
                </p>

                {/* Search / Lookup Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    searchOrLoadThread();
                  }}
                  style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}
                >
                  <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                    <MagnifyingGlass size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Dán link Threads (vd: https://www.threads.net/@user/post/...) hoặc nhập ID..."
                      value={threadQuery}
                      onChange={(e) => setThreadQuery(e.target.value)}
                      style={{ paddingLeft: '36px', height: '40px', fontSize: '13.5px' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={searchingThread}
                    style={{ height: '40px', padding: '0 16px', fontSize: '13px' }}
                  >
                    {searchingThread ? 'Đang tìm...' : 'Tra Cứu Bài Viết'}
                  </button>
                </form>

                {/* Notifications for Thread Editor */}
                {threadEditError && (
                  <div className="error-banner" role="alert" style={{ margin: '10px 0 16px' }}>
                    <WarningCircle size={18} weight="fill" /> {threadEditError}
                  </div>
                )}
                {threadEditSuccess && (
                  <div className="admin-notice" style={{ margin: '10px 0 16px' }}>
                    <CheckCircle size={18} weight="fill" /> {threadEditSuccess}
                  </div>
                )}

                {/* Recent Threads List */}
                {recentThreads.length > 0 && !selectedThread && (
                  <div style={{ margin: '12px 0 20px', padding: '14px', borderRadius: '14px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink)', marginBottom: '10px' }}>
                      Chọn bài viết gần đây để chỉnh sửa:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                      {recentThreads.map((t) => (
                        <div
                          key={t.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            background: 'var(--surface-raise)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {(t.title && t.title !== 'Thread' && t.title.trim().length > 0)
                                ? t.title
                                : (t.content && t.content.trim().length > 0)
                                ? (t.content.length > 85 ? t.content.slice(0, 85) + '...' : t.content)
                                : t.url}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                              @{t.author_username ?? 'ẩn danh'} · {t.total_comments} bình luận
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => searchOrLoadThread(t.id)}
                            style={{ fontSize: '12px', padding: '4px 10px', height: 'auto', color: 'var(--accent)' }}
                          >
                            <PencilSimple size={14} /> Sửa bài
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Form when a thread is loaded */}
                {selectedThread && (
                  <form
                    onSubmit={handleSaveThreadEdit}
                    className="admin-form-box editing"
                    style={{ marginTop: '12px' }}
                  >
                    <div className="admin-form-head">
                      <div style={{ color: 'var(--accent-strong)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                        <PencilSimple size={16} weight="bold" /> Đang Chỉnh Sửa Bài Viết
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={`/thread/${selectedThread.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost"
                          style={{ fontSize: '12px', padding: '4px 10px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Xem trên web</span>
                          <ArrowSquareOut size={13} />
                        </a>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setSelectedThread(null)}
                          style={{ fontSize: '12px', padding: '4px 8px', height: 'auto' }}
                        >
                          Đóng
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
                      ID: <span className="mono">{selectedThread.id}</span> · URL: <a href={selectedThread.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{selectedThread.url}</a>
                    </div>

                    {/* Content (Nội dung chính của Threads) */}
                    <div className="admin-field">
                      <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Nội dung bài viết (Content / Caption)</span>
                        <span style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 'normal' }}>* Bài viết Threads chỉ có nội dung này</span>
                      </label>
                      <textarea
                        className="field-input"
                        rows={4}
                        placeholder="Nội dung hoặc caption bài viết..."
                        value={selectedThread.content}
                        onChange={(e) => {
                          const newContent = e.target.value;
                          const isSync = !selectedThread.title || selectedThread.title === selectedThread.content || selectedThread.title === 'Thread';
                          setSelectedThread({
                            ...selectedThread,
                            content: newContent,
                            title: isSync ? newContent : selectedThread.title,
                          });
                        }}
                        style={{ resize: 'vertical', lineHeight: '1.5' }}
                      />
                    </div>

                    {/* Title (Tiêu đề tóm tắt hiển thị ngoài trang chủ) */}
                    <div className="admin-field">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="admin-label" style={{ margin: 0 }}>
                          Tiêu đề tóm tắt (Title - hiển thị ngoài trang chủ)
                        </label>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setSelectedThread({ ...selectedThread, title: selectedThread.content })}
                          style={{ fontSize: '11.5px', padding: '2px 8px', height: 'auto', color: 'var(--accent)' }}
                        >
                          Sao chép từ nội dung
                        </button>
                      </div>
                      <input
                        className="field-input"
                        type="text"
                        placeholder="Để trống sẽ tự động lấy toàn bộ nội dung bài viết..."
                        value={selectedThread.title}
                        onChange={(e) => setSelectedThread({ ...selectedThread, title: e.target.value })}
                        style={{ fontWeight: '600' }}
                      />
                    </div>

                    {/* Author info */}
                    <div className="admin-grid-2">
                      <div className="admin-field">
                        <label className="admin-label">Tác giả (@username)</label>
                        <input
                          className="field-input"
                          type="text"
                          placeholder="vd: kieuanhxinh0"
                          value={selectedThread.author_username}
                          onChange={(e) => setSelectedThread({ ...selectedThread, author_username: e.target.value })}
                        />
                      </div>
                      <div className="admin-field">
                        <label className="admin-label">Tên hiển thị (Author Name)</label>
                        <input
                          className="field-input"
                          type="text"
                          placeholder="Tên đầy đủ của tác giả..."
                          value={selectedThread.author_name}
                          onChange={(e) => setSelectedThread({ ...selectedThread, author_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="admin-form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingThread}
                        style={{ height: '38px', padding: '0 18px', fontSize: '13px' }}
                      >
                        <FloppyDisk size={16} /> {savingThread ? 'Đang lưu...' : 'Lưu Cập Nhật Bài Viết'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setSelectedThread(null)}
                        style={{ height: '38px', fontSize: '13px' }}
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </Reveal>

            {/* Card 4: Hall of Fame Manager (With Add & Edit) */}
            <Reveal delay={0.14}>
              <div className="admin-card">
                <div className="admin-card-head">
                  <h3 className="admin-card-title">
                    <Trophy size={20} weight="bold" color="#F05A28" />
                    Quản Lý Bảng Vinh Danh (Hall of Fame)
                  </h3>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleResetSupporters}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    Khôi phục mặc định
                  </button>
                </div>
                <p className="admin-card-sub">
                  Thêm, chỉnh sửa thông tin hoặc xóa các mạnh thường quân xuất hiện ở phần Bảng Vinh Danh dưới chân trang
                  Landing.
                </p>

                {/* Add / Edit Supporter Form */}
                <form
                  id="supporter-form"
                  onSubmit={handleSaveSupporter}
                  className={`admin-form-box${editingId ? ' editing' : ''}`}
                >
                  <div className="admin-form-head">
                    <div
                      style={{
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
                      <button type="button" className="admin-link-btn" onClick={cancelEdit}>
                        Hủy chỉnh sửa
                      </button>
                    )}
                  </div>

                  <div className="admin-form-grid">
                    <div>
                      <label className="admin-form-label">Tên / Nickname</label>
                      <input
                        className="field-input admin-form-input"
                        placeholder="Ví dụ: Nguyễn Văn A"
                        value={supporterName}
                        onChange={(e) => setSupporterName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="admin-form-label">Cấp độ (Tier)</label>
                      <select
                        className="field-input admin-form-input"
                        value={supporterTier}
                        onChange={(e) => setSupporterTier(e.target.value as 'legend' | 'hero' | 'backer')}
                      >
                        <option value="legend">🔥 Legend (Đối tác / Sáng lập)</option>
                        <option value="hero">✨ Hero (Mạnh thường quân)</option>
                        <option value="backer">☕ Backer (Bạn tiếp lửa)</option>
                      </select>
                    </div>
                    <div>
                      <label className="admin-form-label">Mức đóng góp / Cà phê</label>
                      <input
                        className="field-input admin-form-input"
                        placeholder="Ví dụ: 10 ☕ Cà phê hoặc 200.000đ"
                        value={supporterAmount}
                        onChange={(e) => setSupporterAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label className="admin-form-label">Lời nhắn tri ân</label>
                    <input
                      className="field-input admin-form-input"
                      placeholder="Ví dụ: Ủng hộ team phát triển công cụ mở cho cộng đồng!"
                      value={supporterMessage}
                      onChange={(e) => setSupporterMessage(e.target.value)}
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
                      className={`admin-supporter-item${editingId === s.id ? ' editing' : ''}`}
                    >
                      <div className="admin-supporter-main">
                        {s.tier === 'legend' ? (
                          <Fire size={18} weight="fill" color="#F05A28" />
                        ) : s.tier === 'hero' ? (
                          <Sparkle size={18} weight="fill" color="#E5484D" />
                        ) : (
                          <Coffee size={18} weight="fill" color="var(--calm-ink)" />
                        )}
                        <div className="admin-supporter-text">
                          <div className="admin-supporter-meta-row">
                            <span style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--ink)' }}>{s.name}</span>
                            <span style={{ fontSize: '12px', color: 'var(--accent-strong)' }}>
                              ({s.amount || s.tier})
                            </span>
                          </div>
                          {s.message && (
                            <div className="admin-supporter-msg">
                              "{s.message}"
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="admin-supporter-actions">
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
