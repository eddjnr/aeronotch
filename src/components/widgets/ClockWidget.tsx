import { useState, useEffect } from 'react';
import type { IslandMode } from '../../types';

interface ClockWidgetProps {
  mode: IslandMode;
}

export function ClockWidget({ mode }: ClockWidgetProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  if (mode === 'compact' || mode === 'preview') {
    return (
      <div className="flex items-center">
        <span className="text-[12px] font-semibold text-white/95 tracking-tight">
          {hours}:{minutes}
        </span>
      </div>
    );
  }

  // Expanded mode
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  };
  const dateStr = time.toLocaleDateString('en-US', options);

  return (
    <div className="flex flex-col">
      <span className="text-xl font-semibold text-white tracking-tight">
        {hours}:{minutes}
      </span>
      <span className="text-[10px] text-white/40 mt-0.5">{dateStr}</span>
    </div>
  );
}
