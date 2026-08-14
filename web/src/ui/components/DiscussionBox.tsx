import { useState } from 'react';
import { postUserComment } from '../api';

export default function DiscussionBox({ threadId, userComments, onPosted }: {
  threadId: string;
  userComments: Array<{ id: string; display_name: string | null; content: string; created_at: number }>;
  onPosted: () => void;
}) {
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await postUserComment(threadId, content, name || undefined);
      setContent('');
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể gửi comment');
    }
  }

  return (
    <section className="discussion">
      <h3 className="discussion-title">Thảo luận</h3>
      {userComments.map(c => (
        <div key={c.id} className="discussion-comment">
          <strong>{c.display_name ?? 'Ẩn danh'}</strong>
          <p className="discussion-comment-body">{c.content}</p>
        </div>
      ))}
      <div className="discussion-form">
        <label className="field">
          <span className="field-label">Tên hiển thị (không bắt buộc)</span>
          <input className="field-input" placeholder="Ví dụ: Khách ghé thăm" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Bình luận của bạn</span>
          <textarea className="field-input" placeholder="Nhập nhận xét hoặc góc nhìn của bạn về bài viết này..." value={content} onChange={e => setContent(e.target.value)} rows={3} />
        </label>
        <button className="btn btn-primary" onClick={submit} disabled={!content.trim()}>Gửi bình luận</button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </section>
  );
}
