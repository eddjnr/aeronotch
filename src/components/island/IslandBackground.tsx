import { motion, useReducedMotion } from "framer-motion";
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
    <div className="relative">
      {/* Corner ears — faux flare extending outward at top corners */}
      <div
        className="absolute top-0 -left-[12px] w-[12px] h-[12px] pointer-events-none z-10"
        style={{
          backgroundImage: `radial-gradient(circle at 0% 100%, transparent 12px, ${bgColor} 12px)`,
        }}
      />
      <div
        className="absolute top-0 -right-[12px] w-[12px] h-[12px] pointer-events-none z-10"
        style={{
          backgroundImage: `radial-gradient(circle at 100% 100%, transparent 12px, ${bgColor} 12px)`,
        }}
      />
      <motion.div
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
      </motion.div>
    </div>
  );
}
