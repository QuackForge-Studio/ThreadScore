import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DateCalendarFilter from '../components/DateCalendarFilter';
import { I18nProvider } from '../i18n';

vi.mock('../api', () => ({
  apiGet: vi.fn(async (url: string) => {
    if (url.includes('dates_only=true')) {
      return {
        dates: [
          { date: '2026-08-19', count: 3 },
          { date: '2026-08-18', count: 1 },
        ],
      };
    }
    return {};
  }),
}));

function renderCalendar(selectedDate: string | null = null, onSelectDate = vi.fn(), lang: 'vi' | 'en' = 'vi') {
  localStorage.setItem('ts_lang', lang);
  return render(
    <I18nProvider>
      <DateCalendarFilter selectedDate={selectedDate} onSelectDate={onSelectDate} />
    </I18nProvider>
  );
}

describe('DateCalendarFilter', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders default trigger button with "Tất cả ngày"', () => {
    renderCalendar(null);
    expect(screen.getByText('Tất cả ngày')).toBeTruthy();
  });

  it('opens calendar popover when trigger button is clicked', async () => {
    renderCalendar(null);
    const triggerBtn = screen.getByRole('button', { name: /Lọc theo ngày/i });
    fireEvent.click(triggerBtn);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
    expect(screen.getByText('Hôm nay')).toBeTruthy();
  });

  it('calls onSelectDate when a day is chosen', async () => {
    const handleSelect = vi.fn();
    renderCalendar(null, handleSelect);
    
    const triggerBtn = screen.getByRole('button', { name: /Lọc theo ngày/i });
    fireEvent.click(triggerBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    // Bấm chọn ngày 15
    const dayBtn = screen.getByText('15');
    fireEvent.click(dayBtn);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-15$/);
  });

  it('renders English labels when language is set to English', async () => {
    renderCalendar(null, vi.fn(), 'en');
    expect(screen.getByText('All dates')).toBeTruthy();

    const triggerBtn = screen.getByRole('button', { name: /Filter by date/i });
    fireEvent.click(triggerBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
    expect(screen.getByText('Today')).toBeTruthy();
  });
});
