import { useMemo, useEffect, useState } from "react";
import { CalendarCheck } from "reicon-react";
import { listen } from "@tauri-apps/api/event";
import type { IslandMode } from "../../types";
import { getCalendarEvents } from "../../lib/tauri-commands";
import { useTranslation } from "../../hooks/useTranslation";

interface CalendarWidgetProps {
  mode: IslandMode;
}

export function CalendarWidget({ mode }: CalendarWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { t, language } = useTranslation();

  // Helper to check if two Date objects fall on the same calendar day
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Listen to Google Calendar events emitted from Rust backend
  useEffect(() => {
    // 1. Fetch initial events immediately on mount
    setLoading(true);
    getCalendarEvents()
      .then((payload) => {
        if (payload && Array.isArray(payload.items)) {
          setEvents(payload.items);
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
      });

    // 2. Listen to updates
    let unlisten: (() => void) | undefined;

    listen("google-calendar-events", (event: any) => {
      const payload = event.payload;
      if (payload && Array.isArray(payload.items)) {
        setEvents(payload.items);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const weekData = useMemo(() => {
    const todayRef = new Date();
    const days = [];
    const locale = language === "pt-BR" ? "pt-BR" : "en-US";

    for (let i = -3; i <= 3; i++) {
      const date = new Date(todayRef);
      date.setDate(todayRef.getDate() + i);

      let dayName = date.toLocaleDateString(locale, { weekday: "short" });
      // Clean up trailing dots if any (e.g. "sex." -> "sex")
      dayName = dayName.replace(".", "");
      // Capitalize first letter
      dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

      days.push({
        name: dayName,
        number: date.getDate(),
        isToday: i === 0,
        dayOfWeek: date.getDay(),
        date: date,
      });
    }

    return {
      days,
      month: todayRef.toLocaleString(locale, { month: "short" }),
      year: todayRef.getFullYear(),
    };
  }, [language]);

  // Filter events to only show those scheduled on the selected day
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      let eventStart: Date;
      if (event.start?.date) {
        const parts = event.start.date.split("-");
        eventStart = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
        );
      } else if (event.start?.dateTime) {
        eventStart = new Date(event.start.dateTime);
      } else {
        return false;
      }
      return isSameDay(eventStart, selectedDate);
    });
  }, [events, selectedDate]);

  const formatEventTime = (event: any) => {
    if (event.start?.date) return t("allDay");
    if (!event.start?.dateTime || !event.end?.dateTime) return "";
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return `${start.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })} - ${end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}`;
  };

  if (mode !== "expanded") return null;

  return (
    <div className="flex flex-col gap-3 h-full justify-between select-none">
      <div className="flex items-center gap-3">
        {/* Month/Year block stuck to the left with background opacity and blur */}
        <div className="flex flex-col items-center justify-center bg-white/[0.06] backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 shrink-0 select-none min-w-[45px]">
          <span className="text-[12px] font-bold text-white uppercase tracking-wider leading-none">
            {weekData.month}
          </span>
          <span className="text-[9px] font-semibold text-white/40 leading-none mt-1">
            {weekData.year}
          </span>
        </div>

        {/* Week grid (interactive buttons) */}
        <div className="flex flex-1 justify-between gap-0.5">
          {weekData.days.map((day) => {
            const isSelected = isSameDay(day.date, selectedDate);
            return (
              <button
                key={`${day.name}-${day.number}`}
                onClick={() => setSelectedDate(day.date)}
                className="flex flex-col items-center gap-1 flex-1 min-w-0 focus:outline-none group"
              >
                <span
                  className={`text-[9px] font-semibold tracking-wide transition-colors ${
                    isSelected
                      ? "text-[#007aff]"
                      : day.isToday
                        ? "text-white"
                        : "text-white/40 group-hover:text-white/60"
                  }`}
                >
                  {day.name}
                </span>
                <div
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold transition-all duration-150 ${
                    isSelected
                      ? "bg-[#007aff] text-white shadow-[0_2px_8px_rgba(0,122,255,0.4)]"
                      : day.isToday
                        ? "bg-white/10 border border-white/20 text-white"
                        : "text-white/75 hover:bg-white/10"
                  }`}
                >
                  {day.number}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Events section */}
      {loading ? (
        <div className="flex flex-col gap-2 mt-1 border-t border-white/5 pt-2 h-[72px] justify-center">
          <div className="animate-pulse flex flex-col gap-2 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-0.5 h-3 bg-white/10 rounded-full" />
                <div className="h-3 bg-white/10 rounded w-24" />
              </div>
              <div className="h-3 bg-white/10 rounded w-16" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-0.5 h-3 bg-white/10 rounded-full" />
                <div className="h-3 bg-white/10 rounded w-20" />
              </div>
              <div className="h-3 bg-white/10 rounded w-12" />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col gap-2 mt-1 border-t border-white/5 pt-2 h-[72px] overflow-y-auto pr-1"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255, 255, 255, 0.12) transparent",
          }}
        >
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 text-[11px] text-white/90"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-0.5 h-3 rounded-full bg-[#007aff] flex-shrink-0" />
                  <span className="truncate font-semibold text-white/95">
                    {event.summary || t("noTitle")}
                  </span>
                </div>
                <span className="text-[10.5px] text-white/60 font-sans font-medium flex-shrink-0 tabular-nums">
                  {formatEventTime(event)}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-white/45 py-2">
              <CalendarCheck className="w-3.5 h-3.5 text-white/25" />
              <span className="font-medium">{t("noEvents")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
