import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ThreadPage from '../pages/ThreadPage';
import { I18nProvider } from '../i18n';

vi.mock('../api', () => ({
  apiGet: vi.fn(async (path: string) => {
    if (path.startsWith('/api/threads/t1')) {
      return {
        thread: {
          id: 't1', url: 'https://www.threads.net/@x/post/C1', title: 'Chủ đề test',
          content: 'Nội dung', author_username: 'x', author_name: 'X', posted_at: 1700000000,
          main_post_id: 'main-1', total_comments: 3, scoring_status: 'scored', avg_anger_score: 85,
          score_breakdown: JSON.stringify({ bang_no: 1, trung_lap: 0, vui_ve: 0 }), created_at: 1700000000,
        },
        comments: [
          {
            id: 'c1', thread_id: 't1', external_id: 'e1', author_username: 'u', author_name: null,
            text: 'Tôi ghét điều này', like_count: 5, posted_at: 1700000000, created_at: 1700000000,
            parent_id: 'main-1', reply_to_username: 'x',
            score: { id: 's1', comment_id: 'c1', score: 85, label: 'BÙNG NỔ', reason: 'Giận dữ', model: 'lexicon-fallback', created_at: 1700000000 },
          },
          {
            id: 'c2', thread_id: 't1', external_id: 'e2', author_username: 'v', author_name: null,
            text: 'Đúng vậy', like_count: 1, posted_at: 1700000100, created_at: 1700000100,
            parent_id: 'e1', reply_to_username: 'u',
            score: { id: 's2', comment_id: 'c2', score: 90, label: 'BÙNG NỔ', reason: 'Gay gắt', model: 'lexicon-fallback', created_at: 1700000100 },
          },
          {
            id: 'c3', thread_id: 't1', external_id: 'e3', author_username: 'x', author_name: 'X',
            text: 'Phần 2: tôi viết tiếp nè', like_count: 12, posted_at: 1700000200, created_at: 1700000200,
            parent_id: 'main-1', reply_to_username: null,
            score: { id: 's3', comment_id: 'c3', score: 20, label: 'VUI VẺ', reason: 'Bình thường', model: 'lexicon-fallback', created_at: 1700000200 },
          },
        ],
        breakdown: { bang_no: 2, trung_lap: 0, vui_ve: 1 },
        user_comments: [],
        vote_counts: { c1: { correct: 0, incorrect: 0 } },
      };
    }
    throw new Error('unexpected path');
  }),
  apiPost: vi.fn(),
  vote: vi.fn(),
  postUserComment: vi.fn(),
}));

function renderPage(lang: 'vi' | 'en' = 'vi') {
  localStorage.setItem('ts_lang', lang);
  return render(
    <MemoryRouter initialEntries={['/t/t1']}>
      <I18nProvider>
        <Routes>
          <Route path="/t/:id" element={<ThreadPage />} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('ThreadPage', () => {
  afterEach(() => localStorage.clear());

  it('renders thread title, average score and comment with score', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Chủ đề test')).toBeTruthy());
    expect(screen.getByText('85.0/100')).toBeTruthy();
    expect(screen.getAllByText('Tôi ghét điều này').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bùng nổ/).length).toBeGreaterThan(0);
  });

  it('renders author continuation block with the follow-up text', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Chủ đề test')).toBeTruthy());
    expect(screen.getByText(/Chủ thớt viết tiếp/)).toBeTruthy();
    expect(screen.getAllByText('Phần 2: tôi viết tiếp nè').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tác giả').length).toBeGreaterThan(0);
  });

  it('renders reply-to hint for nested reply', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Chủ đề test')).toBeTruthy());
    expect(screen.getByText('↳ Trả lời @u')).toBeTruthy();
  });

  it('renders English UI when language is English', async () => {
    renderPage('en');
    await waitFor(() => expect(screen.getByText('Chủ đề test')).toBeTruthy());
    expect(screen.getByText('85.0/100')).toBeTruthy();
    expect(screen.getByText(/Average anger score:/i)).toBeTruthy();
    expect(screen.getByText(/All comments/i)).toBeTruthy();
    expect(screen.getByText(/Discussion/i)).toBeTruthy();
    expect(screen.getByText(/Author continued/i)).toBeTruthy();
  });
});
