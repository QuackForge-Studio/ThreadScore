import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchBox from '../components/SearchBox';

vi.mock('../api', () => ({
  searchThreads: vi.fn(async (q: string) => {
    if (q.includes('threads.net')) {
      return { kind: 'url', state: 'unknown' } as const;
    }
    return { kind: 'keyword', threads: [] } as const;
  }),
  requestThread: vi.fn(async () => ({ status: 'created' })),
}));

describe('SearchBox', () => {
  it('shows request button for unknown threads URL', async () => {
    render(<MemoryRouter><SearchBox /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/Tìm bài viết hoặc dán link Threads/i), {
      target: { value: 'https://www.threads.net/@x/post/C1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tìm/i }));
    await waitFor(() => expect(screen.getByText(/Bài viết này chưa có trên ThreadScore/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /Request bài viết/i })).toBeTruthy();
  });
});
