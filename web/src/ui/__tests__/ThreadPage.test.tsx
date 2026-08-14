import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ThreadPage from '../pages/ThreadPage';

vi.mock('../api', () => ({
  apiGet: vi.fn(async (path: string) => {
    if (path.startsWith('/api/threads/t1')) {
      return {
        thread: {
          id: 't1', url: 'https://www.threads.net/@x/post/C1', title: 'Chủ đề test',
          content: 'Nội dung', author_username: 'x', author_name: 'X', posted_at: 1700000000,
          total_comments: 1, scoring_status: 'scored', avg_anger_score: 85,
          score_breakdown: JSON.stringify({ bang_no: 1, trung_lap: 0, vui_ve: 0 }), created_at: 1700000000,
        },
        comments: [{
          id: 'c1', thread_id: 't1', external_id: 'e1', author_username: 'u', author_name: null,
          text: 'Tôi ghét điều này', like_count: 5, posted_at: 1700000000, created_at: 1700000000,
          score: { id: 's1', comment_id: 'c1', score: 85, label: 'BÙNG NỔ', reason: 'Giận dữ', model: 'lexicon-fallback', created_at: 1700000000 },
        }],
        breakdown: { bang_no: 1, trung_lap: 0, vui_ve: 0 },
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

describe('ThreadPage', () => {
  it('renders thread title, average score and comment with score', async () => {
    render(
      <MemoryRouter initialEntries={['/t/t1']}>
        <Routes>
          <Route path="/t/:id" element={<ThreadPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Chủ đề test')).toBeTruthy());
    expect(screen.getByText('85.0/100')).toBeTruthy();
    expect(screen.getAllByText('Tôi ghét điều này').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bùng nổ/).length).toBeGreaterThan(0);
  });
});
