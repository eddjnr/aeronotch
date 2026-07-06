import { LazyMotion, m, domAnimation, useReducedMotion } from "framer-motion";
import { ISLAND_DIMENSIONS, SPRING } from "../../lib/animation-config";
import { useSettingsStore } from "../../stores/settings-store";
import type { IslandMode } from "../../types";

interface IslandBackgroundProps {
  mode: IslandMode;
  isHovered: boolean;
  children: React.ReactNode;
}

export function IslandBackground({
  mode,
  isHovered,
  children,
}: IslandBackgroundProps) {
  const reduce = useReducedMotion();
  const opacity = useSettingsStore((s) => s.opacity);
  const dims = ISLAND_DIMENSIONS[mode];

  const radius = mode === "compact" ? 16 : 24;
  const bgColor = `rgba(0, 0, 0, ${opacity})`;

  const transition = reduce
    ? { duration: 0 }
    : {
        ...SPRING.island,
        filter: { duration: isHovered ? 0.25 : 0.8, ease: "easeInOut" },
      };

  const dropShadow = isHovered
    ? "drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.5))"
    : "drop-shadow(0px 0px 0px rgba(0, 0, 0, 0))";

  return (
    <LazyMotion features={domAnimation}>
    <div className="relative">
      {/* Corner ears — faux flare extending outward at top corners */}
      <svg
        width="12"
        height="12"
        className="absolute top-0 -left-[12px] pointer-events-none z-10"
      >
        <path d="M 0 0 L 12 0 L 12 12 A 12 12 0 0 0 0 0 Z" fill={bgColor} />
      </svg>
      <svg
        width="12"
        height="12"
        className="absolute top-0 -right-[12px] pointer-events-none z-10"
      >
        <path d="M 12 0 L 0 0 L 0 12 A 12 12 0 0 1 12 0 Z" fill={bgColor} />
      </svg>
      <m.div
        animate={{
          width: dims.width,
          height: dims.height,
          borderRadius: `0px 0px ${radius}px ${radius}px`,
          backgroundColor: bgColor,
          filter: dropShadow,
        }}
        transition={transition}
        style={{ overflow: "hidden" }}
      >
        {children}
      </m.div>
    </div>
    </LazyMotion>
  );
}
