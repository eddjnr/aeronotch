import { useMemo, useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import type { IslandMode } from '../../types';
import { getCalendarEvents } from '../../lib/tauri-commands';

interface CalendarWidgetProps {
  mode: IslandMode;
}

export function CalendarWidget({ mode }: CalendarWidgetProps) {
  const today = useMemo(() => new Date(), []);
  const [events, setEvents] = useState<any[]>([]);

  // Listen to Google Calendar events emitted from Rust backend
  useEffect(() => {
    // 1. Fetch initial events immediately on mount
    getCalendarEvents()
      .then((payload) => {
        if (payload && Array.isArray(payload.items)) {
          const now = Date.now();
          const upcoming = payload.items
            .filter((item: any) => {
              const end = item.end?.dateTime ? new Date(item.end.dateTime).getTime() : 0;
              const allDayEnd = item.end?.date ? new Date(item.end.date).getTime() : 0;
              return (end || allDayEnd) > now;
            })
            .slice(0, 10);
          setEvents(upcoming);
        }
      })
      .catch(console.error);

    // 2. Listen to updates
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
          .slice(0, 10); // Show up to 10 upcoming events with scroll support
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
    <div className="flex flex-col gap-3 h-full justify-between select-none">
      <div className="flex items-center gap-3">
        {/* Month/Year block stuck to the left with background opacity and blur */}
        <div className="flex flex-col items-center justify-center bg-white/[0.06] backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 shrink-0 select-none min-w-[45px]">
          <span className="text-[12px] font-bold text-white uppercase tracking-wider leading-none">{weekData.month}</span>
          <span className="text-[9px] font-semibold text-white/40 leading-none mt-1">{weekData.year}</span>
        </div>

        {/* Week grid */}
        <div className="flex flex-1 justify-between gap-0.5">
          {weekData.days.map((day) => (
            <div
              key={`${day.name}-${day.number}`}
              className="flex flex-col items-center gap-1 flex-1 min-w-0"
            >
              <span
                className={`text-[9px] font-semibold tracking-wide ${
                  day.isToday ? 'text-white' : 'text-white/40'
                }`}
              >
                {day.name}
              </span>
              <div
                className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold transition-all duration-150 ${
                  day.isToday
                    ? 'bg-white text-black shadow-[0_2px_8px_rgba(255,255,255,0.25)]'
                    : 'text-white/75 hover:bg-white/10'
                }`}
              >
                {day.number}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Events section */}
      <div
        className="flex flex-col gap-2 mt-1 border-t border-white/5 pt-2 max-h-[82px] overflow-y-auto pr-1"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.12) transparent',
        }}
      >
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} className="flex items-center justify-between text-[11px] text-white/90">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-0.5 h-3.5 rounded-full bg-[#007aff] flex-shrink-0" />
                <span className="truncate font-semibold max-w-[170px] text-white/95">
                  {event.summary || 'No Title'}
                </span>
              </div>
              <span className="text-[10px] text-white/50 font-mono flex-shrink-0 font-medium">
                {formatEventTime(event)}
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2 text-[10px] text-white/45 py-2">
            <CalendarCheck className="w-3.5 h-3.5 text-white/25" />
            <span className="font-medium">No upcoming events</span>
          </div>
        )}
      </div>
    </div>
  );
}
