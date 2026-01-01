import React, { useMemo, useRef, useState } from 'react';

const FullCalendarSelector: React.FC<{
  selectedDates: string[];
  onChange: (dates: string[]) => void;
}> = ({ selectedDates, onChange }) => {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const toISODate = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

  const today = useMemo(() => startOfDay(new Date()), []);
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(today));
  const lastClickedRef = useRef<Date | null>(null);

  const monthLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
    return fmt.format(monthCursor);
  }, [monthCursor]);

  const isPastDate = (d: Date) => startOfDay(d).getTime() < today.getTime();

  const sortISO = (arr: string[]) => arr.slice().sort((a, b) => a.localeCompare(b));
  const commitSet = (set: Set<string>) => onChange(sortISO([...set]));

  const toggleOne = (date: Date) => {
    if (isPastDate(date)) return;
    const iso = toISODate(date);
    const next = new Set(selectedDates);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    commitSet(next);
  };

  const applyRange = (a: Date, b: Date, mode: 'add' | 'remove') => {
    const start = startOfDay(a);
    const end = startOfDay(b);

    const lo = start.getTime() <= end.getTime() ? start : end;
    const hi = start.getTime() <= end.getTime() ? end : start;

    const next = new Set(selectedDates);

    for (let d = new Date(lo); d.getTime() <= hi.getTime(); d.setDate(d.getDate() + 1)) {
      if (isPastDate(d)) continue;
      const iso = toISODate(d);
      if (mode === 'add') next.add(iso);
      else next.delete(iso);
    }

    commitSet(next);
  };

  const onDayClick = (date: Date, shiftKey: boolean) => {
    if (isPastDate(date)) return;

    const last = lastClickedRef.current;

    if (shiftKey && last) {
      const iso = toISODate(date);
      const mode: 'add' | 'remove' = selectedSet.has(iso) ? 'remove' : 'add';
      applyRange(last, date, mode);
    } else {
      toggleOne(date);
    }

    lastClickedRef.current = date;
  };

  const weeks = useMemo(() => {
    const firstOfMonth = startOfMonth(monthCursor);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const days: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push({ date: d, inMonth: d.getMonth() === monthCursor.getMonth() });
    }

    const chunked: Array<typeof days> = [];
    for (let i = 0; i < days.length; i += 7) chunked.push(days.slice(i, i + 7));
    return chunked;
  }, [monthCursor]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const goPrevMonth = () => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goThisMonth = () => setMonthCursor(startOfMonth(today));

  const clearAll = () => onChange([]);

  const selectWeekendsThisMonth = () => {
    const next = new Set(selectedDates);
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const last = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);

    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      if (isPastDate(d)) continue;
      const day = d.getDay();
      if (day === 0 || day === 6) next.add(toISODate(d));
    }

    commitSet(next);
  };

  const selectNext7Days = () => {
    const next = new Set(selectedDates);
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      next.add(toISODate(d));
    }
    commitSet(next);
  };

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-50 to-white border-b border-gray-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Work Dates</p>
          <h4 className="text-base font-semibold text-gray-900">{monthLabel}</h4>
          <p className="text-xs text-gray-500 mt-0.5">Tip: Shift-click to select a range</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevMonth}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Previous month"
            title="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goThisMonth}
            className="h-9 px-3 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
            title="Go to current month"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Next month"
            title="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="grid grid-cols-7 gap-1 text-xs font-medium text-gray-500 mb-2">
          {weekdayLabels.map((w) => (
            <div key={w} className="text-center py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid gap-1">
          {weeks.map((week) => (
            <div key={toISODate(week[0].date)} className="grid grid-cols-7 gap-1">
              {week.map(({ date, inMonth }) => {
                const iso = toISODate(date);
                const selected = selectedSet.has(iso);
                const isToday = isSameDay(date, today);
                const disabled = isPastDate(date);

                const base =
                  'h-10 w-full rounded-lg text-sm flex items-center justify-center transition-colors select-none';
                const faded = inMonth ? 'text-gray-900' : 'text-gray-400';
                const ringToday = isToday ? 'ring-2 ring-teal-300 ring-offset-1' : '';
                const stateStyles = disabled
                  ? 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
                  : selected
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200';

                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    onClick={(e) => onDayClick(date, e.shiftKey)}
                    className={`${base} ${faded} ${stateStyles} ${ringToday}`}
                    title={disabled ? `${iso} (past date)` : iso}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-gray-500">
            Selected: <span className="font-semibold text-gray-800">{selectedDates.length}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectNext7Days}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              Next 7 days
            </button>
            <button
              type="button"
              onClick={selectWeekendsThisMonth}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              Weekends (this month)
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              disabled={selectedDates.length === 0}
            >
              Clear
            </button>
          </div>
        </div>

        {selectedDates.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedDates.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-800 border border-teal-100"
              >
                {d}
                <button
                  type="button"
                  onClick={() => onChange(selectedDates.filter((x) => x !== d))}
                  className="text-teal-700 hover:text-teal-900"
                  aria-label={`Remove ${d}`}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FullCalendarSelector;
