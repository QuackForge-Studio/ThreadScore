import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SearchBox from '../components/SearchBox';
import { I18nProvider } from '../i18n';

vi.mock('../api', () => ({
  searchThreads: vi.fn(async (q: string) => {
    if (q.includes('threads.net')) {
      return { kind: 'url', state: 'unknown' } as const;
    }
    return { kind: 'keyword', threads: [] } as const;
  }),
  requestThread: vi.fn(async () => ({ status: 'created' })),
}));

function renderBox(lang: 'vi' | 'en' = 'vi') {
  localStorage.setItem('ts_lang', lang);
  return render(
    <MemoryRouter>
      <I18nProvider>
        <SearchBox />
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('SearchBox', () => {
  afterEach(() => localStorage.clear());

  it('shows request button for unknown threads URL', async () => {
    renderBox();
    fireEvent.change(screen.getByPlaceholderText(/Tìm bài viết hoặc dán link Threads/i), {
      target: { value: 'https://www.threads.net/@x/post/C1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Tìm/i }));
    await waitFor(() => expect(screen.getByText(/Bài viết này chưa có trên ThreadScore/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /Request bài viết/i })).toBeTruthy();
  });

  it('submits search on Enter key', async () => {
    renderBox();
    const input = screen.getByPlaceholderText(/Tìm bài viết hoặc dán link Threads/i);
    fireEvent.change(input, { target: { value: 'https://www.threads.net/@x/post/C1' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    await waitFor(() => expect(screen.getByText(/Bài viết này chưa có trên ThreadScore/i)).toBeTruthy());
  });

  it('shows English strings when language is English', async () => {
    renderBox('en');
    fireEvent.change(screen.getByPlaceholderText(/Search threads or paste a Threads link/i), {
      target: { value: 'https://www.threads.net/@x/post/C1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    await waitFor(() => expect(screen.getByText(/This thread is not on ThreadScore yet/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /Request thread/i })).toBeTruthy();
  });
});
