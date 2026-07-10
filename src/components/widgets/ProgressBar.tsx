import { useEffect, useRef } from "react";

interface ProgressBarProps {
  current: number; // seconds
  total: number; // seconds
  isPlaying: boolean;
  onSeek?: (position: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ProgressBar({
  current,
  total,
  isPlaying,
  onSeek,
}: ProgressBarProps) {
  const currentRef = useRef(current);
  const startTimeRef = useRef(Date.now());
  const isDraggingRef = useRef(false);
  const dragPosRef = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const timeTextRef = useRef<HTMLSpanElement>(null);

  // Sync with parent props (only when not actively scrubbing/dragging)
  useEffect(() => {
    if (isDraggingRef.current) return;

    currentRef.current = current;
    startTimeRef.current = Date.now();

    const progress = total > 0 ? (current / total) * 100 : 0;
    if (barRef.current) barRef.current.style.width = `${progress}%`;
    if (thumbRef.current) thumbRef.current.style.left = `${progress}%`;
    if (timeTextRef.current)
      timeTextRef.current.textContent = formatTime(current);

    if (!isPlaying || total === 0) return;

    // High frequency local ticker (100ms) updating style directly to bypass React render cycles
    const interval = setInterval(() => {
      if (isDraggingRef.current) return;

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newPos = Math.min(current + elapsed, total);
      currentRef.current = newPos;

      const newProgress = (newPos / total) * 100;
      if (barRef.current) barRef.current.style.width = `${newProgress}%`;
      if (thumbRef.current) thumbRef.current.style.left = `${newProgress}%`;
      if (timeTextRef.current)
        timeTextRef.current.textContent = formatTime(newPos);
    }, 100);

    return () => clearInterval(interval);
  }, [current, total, isPlaying]);

  // Ensure userSelect is always restored if the component unmounts while a
  // drag is in progress (the mouseup handler won't fire in that case).
  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        document.body.style.userSelect = "";
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (total === 0) return;
    isDraggingRef.current = true;

    // Lock text selection during drag scrubbing gesture
    document.body.style.userSelect = "none";

    // Highlight the thumb knob explicitly during active dragging
    if (thumbRef.current) thumbRef.current.style.opacity = "1";

    const updatePosition = (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(x / rect.width, 1));
      const seekPos = percent * total;
      dragPosRef.current = seekPos;

      // Direct DOM updates for 60fps/120fps drag scrubbing
      const newProgress = percent * 100;
      if (barRef.current) barRef.current.style.width = `${newProgress}%`;
      if (thumbRef.current) thumbRef.current.style.left = `${newProgress}%`;
      if (timeTextRef.current)
        timeTextRef.current.textContent = formatTime(seekPos);
    };

    // Seek instantly on click position
    updatePosition(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updatePosition(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.userSelect = "";

      // Release thumb knob highlight
      if (thumbRef.current) thumbRef.current.style.opacity = "";

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (onSeek) {
        onSeek(dragPosRef.current);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const currentProgress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full flex items-center gap-2.5 text-[9px] text-white/50 select-none">
      <span ref={timeTextRef} className="w-7 text-left">
        {formatTime(current)}
      </span>
      <div
        ref={containerRef}
        className="relative flex-1 h-3.5 group flex items-center"
        onMouseDown={handleMouseDown}
      >
        {/* Slider Track Container */}
        <div className="w-full h-1 bg-white/10 rounded-full relative transition-colors group-hover:bg-white/20">
          {/* Active Filled Progress */}
          <div
            ref={barRef}
            className="h-full bg-white/80 transition-colors group-hover:bg-white rounded-full"
            style={{ width: `${currentProgress}%` }}
          />
          {/* Draggable Knob (Thumb) */}
          <div
            ref={thumbRef}
            className="w-2 h-2 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.35)] absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-opacity duration-150 opacity-0 group-hover:opacity-100 pointer-events-none"
            style={{ left: `${currentProgress}%` }}
          />
        </div>
      </div>
      <span className="w-7 text-right">{formatTime(total)}</span>
    </div>
  );
}
