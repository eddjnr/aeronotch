import { useMemo, useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import type { IslandMode } from '../../types';

interface CalendarWidgetProps {
  mode: IslandMode;
}

export function CalendarWidget({ mode }: CalendarWidgetProps) {
  const today = useMemo(() => new Date(), []);
  const [events, setEvents] = useState<any[]>([]);

  // Listen to Google Calendar events emitted from Rust backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen('google-calendar-events', (event: any) => {
      const payload = event.payload;
      if (payload && Array.isArray(payload.items)) {
        // Filter out past events and sort by start time
        const now = Date.now();
        const upcoming = payload.items
          .filter((item: any) => {
            const end = item.end?.dateTime ? new Date(item.end.dateTime).getTime() : 0;
            const allDayEnd = item.end?.date ? new Date(item.end.date).getTime() : 0;
            return (end || allDayEnd) > now;
          })
          .slice(0, 2); // Show top 2 upcoming events to fit the panel height nicely
        setEvents(upcoming);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

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

  const formatEventTime = (event: any) => {
    if (event.start?.date) return 'All Day';
    if (!event.start?.dateTime || !event.end?.dateTime) return '';
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return `${start.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })} - ${end.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })}`;
  };

  if (mode !== 'expanded') return null;

  return (
    <div className="flex flex-col gap-2 h-full justify-between select-none">
      <div>
        {/* Month/Year header */}
        <div className="flex items-baseline gap-1.5 mb-1.5">
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
      </div>

      {/* Events section */}
      <div className="flex flex-col gap-1.5 mt-2 border-t border-white/5 pt-2">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} className="flex items-center justify-between text-[9px] text-white/70">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285f4] flex-shrink-0" />
                <span className="truncate font-medium max-w-[150px] text-white">
                  {event.summary || 'No Title'}
                </span>
              </div>
              <span className="text-[8px] text-white/40 font-mono flex-shrink-0">
                {formatEventTime(event)}
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-1.5 text-[9px] text-white/40">
            <CalendarCheck className="w-3.5 h-3.5 text-white/20" />
            <span>No upcoming events</span>
          </div>
        )}
      </div>
    </div>
  );
}
