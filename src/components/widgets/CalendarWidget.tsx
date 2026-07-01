import { useMemo } from 'react';
import { CalendarCheck } from 'lucide-react';
import type { IslandMode } from '../../types';

interface CalendarWidgetProps {
  mode: IslandMode;
}

export function CalendarWidget({ mode }: CalendarWidgetProps) {
  const today = useMemo(() => new Date(), []);

  const weekData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];

    for (let i = -3; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        name: dayNames[date.getDay()],
        number: date.getDate(),
        isToday: i === 0,
        dayOfWeek: date.getDay(),
      });
    }

    return {
      days,
      month: today.toLocaleString('en-US', { month: 'short' }),
      year: today.getFullYear(),
    };
  }, [today]);

  if (mode !== 'expanded') return null;

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Month/Year header */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-semibold text-white">{weekData.month}</span>
        <span className="text-[10px] text-white/40">{weekData.year}</span>
      </div>

      {/* Week grid */}
      <div className="flex gap-0.5">
        {weekData.days.map((day) => (
          <div
            key={`${day.name}-${day.number}`}
            className="flex flex-col items-center gap-0.5 w-[36px]"
          >
            <span
              className={`text-[9px] font-semibold ${
                day.isToday ? 'text-white' : 'text-white/40'
              }`}
            >
              {day.name}
            </span>
            <div
              className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                day.isToday
                  ? 'bg-white text-black'
                  : 'text-white/70 hover:bg-white/5'
              }`}
            >
              {day.number}
            </div>
          </div>
        ))}
      </div>

      {/* Events section */}
      <div className="flex items-center gap-1.5 mt-auto">
        <CalendarCheck className="w-3.5 h-3.5 text-white/30" />
        <span className="text-[10px] text-white/40">No events today</span>
      </div>
    </div>
  );
}
