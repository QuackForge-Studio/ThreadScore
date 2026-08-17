import { useState } from 'react';
import { ChatsCircle } from '@phosphor-icons/react';
import { postUserComment } from '../api';
import { useI18n } from '../i18n';

export default function DiscussionBox({ threadId, userComments, onPosted }: {
  threadId: string;
  userComments: Array<{ id: string; display_name: string | null; content: string; created_at: number }>;
  onPosted: () => void;
}) {
  const { t } = useI18n();
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
      setError(e instanceof Error ? e.message : t('tp.discussionErr'));
    }
  }

  return (
    <section className="discussion">
      <h3 className="discussion-title">
        <ChatsCircle size={20} weight="bold" color="var(--accent)" style={{ verticalAlign: '-3px', marginRight: '8px' }} />
        {t('tp.discussionTitle')}
      </h3>
      <p style={{ margin: '0 0 var(--space-3)', fontSize: '13.5px', color: 'var(--muted)' }}>{t('tp.discussionIntro')}</p>
      {userComments.map(c => (
        <div key={c.id} className="discussion-comment">
          <strong>{c.display_name ?? t('tp.discussionAnon')}</strong>
          <p className="discussion-comment-body">{c.content}</p>
        </div>
      ))}
      <div className="discussion-form">
        <label className="field">
          <span className="field-label">{t('tp.discussionName')}</span>
          <input className="field-input" placeholder={t('tp.discussionNamePh')} value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t('tp.discussionLabel')}</span>
          <textarea className="field-input" placeholder={t('tp.discussionPh')} value={content} onChange={e => setContent(e.target.value)} rows={3} />
        </label>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={!content.trim()}>{t('tp.discussionSend')}</button>
        {error && <p className="error-text" role="alert">{error}</p>}
      </div>
    </section>
  );
}
