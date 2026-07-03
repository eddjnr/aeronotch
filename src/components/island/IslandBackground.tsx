import { motion, useReducedMotion } from "framer-motion";
import { ISLAND_DIMENSIONS, SPRING } from "../../lib/animation-config";
import { useSettingsStore } from "../../stores/settings-store";
import type { IslandMode } from "../../types";

interface IslandBackgroundProps {
  mode: IslandMode;
  isHovered: boolean;
  children: React.ReactNode;
  onAnimationComplete?: () => void;
}

export function IslandBackground({
  mode,
  isHovered,
  children,
  onAnimationComplete,
}: IslandBackgroundProps) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : SPRING.island;
  const opacity = useSettingsStore((s) => s.opacity);
  const dims = ISLAND_DIMENSIONS[mode];
  const R = 16;
  const r = 16;
  const w = dims.width;
  const h = dims.height;

  const getPath = (width: number, height: number) => {
    return [
      `M 0 0`,
      `Q ${R} 0 ${R} ${R}`,
      `L ${R} ${height - r}`,
      `Q ${R} ${height} ${R + r} ${height}`,
      `L ${R + width - r} ${height}`,
      `Q ${R + width} ${height} ${R + width} ${height - r}`,
      `L ${R + width} ${R}`,
      `Q ${R + width} 0 ${R + width + R} 0`,
      `Z`,
    ].join(" ");
  };

  const pathCompact = getPath(
    ISLAND_DIMENSIONS.compact.width,
    ISLAND_DIMENSIONS.compact.height,
  );
  const pathPreview = getPath(
    ISLAND_DIMENSIONS.preview.width,
    ISLAND_DIMENSIONS.preview.height,
  );
  const pathExpanded = getPath(
    ISLAND_DIMENSIONS.expanded.width,
    ISLAND_DIMENSIONS.expanded.height,
  );

  const targetPath =
    mode === "compact"
      ? pathCompact
      : mode === "preview"
        ? pathPreview
        : pathExpanded;

  return (
    <motion.div
      onAnimationComplete={onAnimationComplete}
      animate={{
        width: w,
        height: h,
        transition,
      }}
      className="relative"
      style={{
        filter: isHovered
          ? "drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.5))"
          : "drop-shadow(0px 0px 0px rgba(0, 0, 0, 0))",
        transition: reduce ? "none" : `filter ${isHovered ? "0.25s" : "0.8s"} ease-in-out`,
      }}
    >
      <motion.svg
        animate={{
          width: w + 2 * R,
          height: h,
        }}
        transition={transition}
        style={{
          position: "absolute",
          top: 0,
          left: -R,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        {/* Solid background layer — single path morphs in sync with container */}
        <motion.path
          animate={{ d: targetPath }}
          transition={transition}
          fill={`rgba(0, 0, 0, ${opacity})`}
        />
      </motion.svg>

      <div className="relative z-10 w-full h-full">{children}</div>
    </motion.div>
  );
}
