import { useEffect, useRef, useMemo } from 'react';

interface EqualizerProps {
  isPlaying: boolean;
  className?: string;
  barCount?: number; // Configurable quantity of bars (defaults to 6)
}

export function Equalizer({ isPlaying, className, barCount = 4 }: EqualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Dynamically calculate the parameters for each bar using a mathematical bell-curve (sine wave envelope)
  const barsData = useMemo(() => {
    const list = [];
    const minHeight = 25; // minimum height in percentage (approx 3.5px)

    for (let i = 0; i < barCount; i++) {
      // Relative position of the bar (0.0 to 1.0)
      const t = barCount > 1 ? i / (barCount - 1) : 0.5;

      // Sine-based bell curve: center peaks at 100% capacity, edges drop to ~38%
      const envelope = 0.38 + 0.62 * Math.sin(t * Math.PI);
      const maxAmplitude = minHeight + (100 - minHeight) * envelope;

      // Staggered delay from left to right (max 0.5s) to animate wave propagation
      const delay = t * 0.5;

      list.push({
        id: i,
        maxAmplitude,
        delay,
      });
    }
    return list;
  }, [barCount]);

  useEffect(() => {
    const bars = containerRef.current?.children;
    if (!bars || bars.length < barCount) return;

    // Initialize tracking arrays dynamically based on current barCount
    const currentHeights = new Array(barCount).fill(30);
    const targetHeights = new Array(barCount).fill(30);
    const minHeight = 25;

    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      for (let i = 0; i < barCount; i++) {
        const config = barsData[i];
        if (!config) continue;

        if (isPlaying) {
          // Occasionally pick a new target height to simulate dynamic music audio bands
          if (Math.random() < 0.2) {
            targetHeights[i] = minHeight + Math.random() * (config.maxAmplitude - minHeight);
          }
          // Smooth interpolation (lerp) for fluid sways
          currentHeights[i] += (targetHeights[i] - currentHeights[i]) * (1 - Math.exp(-12 * delta));
        } else {
          // Gently return to idle state
          currentHeights[i] += (minHeight - currentHeights[i]) * (1 - Math.exp(-8 * delta));
        }

        // Apply style directly to the DOM for performance optimization (bypass React render cycles)
        const bar = bars[i] as HTMLElement;
        if (bar) {
          bar.style.height = `${currentHeights[i]}%`;
        }
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, barCount, barsData]);

  return (
    <div
      ref={containerRef}
      className={`flex items-center gap-[2px] h-[15px] ${className ?? ''}`}
    >
      {barsData.map((bar) => (
        <div
          key={bar.id}
          className="w-[2px] bg-white/95 flex-shrink-0"
          style={{
            height: '30%',
            minHeight: 3.5,
            borderRadius: '999px' // Enforces perfect capsule rounded corners
          }}
        />
      ))}
    </div>
  );
}
