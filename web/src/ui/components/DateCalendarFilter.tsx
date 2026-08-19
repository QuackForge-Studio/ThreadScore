import { useState, useEffect, useRef } from 'react';
import { CalendarBlank, CaretLeft, CaretRight, XCircle } from '@phosphor-icons/react';
import { useI18n } from '../i18n';
import { apiGet } from '../api';

export interface DateCalendarFilterProps {
  selectedDate: string | null; // Format YYYY-MM-DD
  onSelectDate: (date: string | null) => void;
}

export default function DateCalendarFilter({
  selectedDate,
  onSelectDate,
}: DateCalendarFilterProps) {
  const { t, lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [activeDatesMap, setActiveDatesMap] = useState<Record<string, number>>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Lấy danh sách ngày có bài viết từ API
  useEffect(() => {
    let cancelled = false;
    apiGet<{ dates: { date: string; count: number }[] }>('/api/threads?dates_only=true')
      .then((res) => {
        if (!cancelled && res.dates) {
          const map: Record<string, number> = {};
          for (const item of res.dates) {
            map[item.date] = item.count;
          }
          setActiveDatesMap(map);
        }
      })
      .catch(() => {
        // Fallback im lặng nếu offline / demo
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Đóng popover khi click ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Điều hướng tháng
  function handlePrevMonth() {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function handleGoToday() {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    onSelectDate(`${year}-${month}-${day}`);
    setIsOpen(false);
  }

  function handleClearDate(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    onSelectDate(null);
    setIsOpen(false);
  }

  function handleSelectDay(dayNum: number) {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const day = String(dayNum).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    onSelectDate(dateStr);
    setIsOpen(false);
  }

  // Tính toán các ngày trong tháng hiện tại
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-11

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) .. 6 (Sat)
  // Quy đổi để Thứ 2 là cột đầu tiên (0: Mon, 1: Tue, ..., 6: Sun)
  const startOffset = (firstDayOfWeek + 6) % 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // Format label nút kích hoạt
  const buttonLabel = (() => {
    if (!selectedDate) return t('calendar.allDates');
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return selectedDate;
    } catch {
      return selectedDate;
    }
  })();

  const monthTitle = (() => {
    if (lang === 'vi') {
      return `Tháng ${month + 1}, ${year}`;
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month]} ${year}`;
  })();

  const dayHeaders = lang === 'vi' 
    ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const totalActiveDaysInMonth = (() => {
    let count = 0;
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    for (const key of Object.keys(activeDatesMap)) {
      if (key.startsWith(prefix) && activeDatesMap[key] > 0) {
        count++;
      }
    }
    return count;
  })();

  return (
    <div className="calendar-filter-wrapper" ref={containerRef}>
      {/* Trigger Button */}
      <div className="calendar-trigger-group">
        <button
          type="button"
          className={`calendar-trigger-btn${selectedDate ? ' is-active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={t('calendar.filterByDate')}
          title={t('calendar.filterByDate')}
        >
          <CalendarBlank size={16} weight={selectedDate ? 'fill' : 'bold'} />
          <span className="calendar-trigger-text">{buttonLabel}</span>
          {selectedDate && (
            <span
              className="calendar-clear-btn"
              onClick={handleClearDate}
              title={t('calendar.clearFilter')}
              role="button"
              aria-label={t('calendar.clearFilter')}
            >
              <XCircle size={14} weight="fill" />
            </span>
          )}
        </button>
      </div>

      {/* Dropdown Calendar Modal / Popover */}
      {isOpen && (
        <div className="calendar-popover" role="dialog" aria-modal="false">
          {/* Header Tháng & Điều hướng */}
          <div className="calendar-header">
            <button
              type="button"
              className="cal-nav-btn"
              onClick={handlePrevMonth}
              title={t('calendar.prevMonth')}
              aria-label={t('calendar.prevMonth')}
            >
              <CaretLeft size={16} weight="bold" />
            </button>

            <span className="cal-month-title">{monthTitle}</span>

            <button
              type="button"
              className="cal-nav-btn"
              onClick={handleNextMonth}
              title={t('calendar.nextMonth')}
              aria-label={t('calendar.nextMonth')}
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>

          {/* Quick Actions Bar */}
          <div className="calendar-quick-bar">
            <button
              type="button"
              className={`cal-quick-btn${!selectedDate ? ' active' : ''}`}
              onClick={() => handleClearDate()}
            >
              {t('calendar.allDates')}
            </button>
            <button
              type="button"
              className={`cal-quick-btn${selectedDate === todayStr ? ' active' : ''}`}
              onClick={handleGoToday}
            >
              {t('calendar.today')}
            </button>
          </div>

          {/* Legend / Hint */}
          <div className="calendar-hint-row">
            <span className="cal-hint-dot" />
            <span className="cal-hint-text">
              {totalActiveDaysInMonth > 0 
                ? t('calendar.daysWithPostsCount').replace('{n}', String(totalActiveDaysInMonth))
                : t('calendar.highlightHint')}
            </span>
          </div>

          {/* Days Grid */}
          <div className="calendar-grid">
            {/* Hàng tên các thứ trong tuần */}
            {dayHeaders.map((dh, idx) => (
              <div key={`dh-${idx}`} className="cal-day-header">
                {dh}
              </div>
            ))}

            {/* Các ô trống đầu tháng */}
            {Array.from({ length: startOffset }).map((_, idx) => (
              <div key={`empty-${idx}`} className="cal-day-cell is-empty" aria-hidden="true" />
            ))}

            {/* Các ngày trong tháng */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const count = activeDatesMap[dateStr] || 0;
              const hasPosts = count > 0;
              const isSelected = selectedDate === dateStr;
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  className={`cal-day-cell cal-day-btn${hasPosts ? ' has-posts' : ''}${
                    isSelected ? ' is-selected' : ''
                  }${isToday ? ' is-today' : ''}`}
                  onClick={() => handleSelectDay(dayNum)}
                  title={
                    hasPosts
                      ? `${dateStr}: ${count} ${t('tc.postsCount') || 'bài viết'}`
                      : `${dateStr}`
                  }
                >
                  <span className="cal-day-num">{dayNum}</span>
                  {hasPosts && (
                    <span className="cal-post-indicator">
                      <span className="cal-dot" />
                      {count > 1 && <span className="cal-count-badge">{count}</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
