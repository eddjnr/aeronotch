import { motion } from "framer-motion";
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
  const opacity = useSettingsStore((s) => s.opacity);
  const dims = ISLAND_DIMENSIONS[mode];
  const R = 16; // outerRadius (concave top corners)
  const r = 16; // innerRadius (convex bottom corners)
  const w = dims.width;
  const h = dims.height;

  // Generate SVG path for the notch shape dynamically based on width and height
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
        transition: SPRING.island,
      }}
      className="relative"
    >
      {/* Background SVG path with drop shadow following the path geometry */}
      <motion.svg
        animate={{
          width: w + 2 * R,
          height: h,
        }}
        transition={SPRING.island}
        style={{
          position: "absolute",
          top: 0,
          left: -R,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        <defs>
          <filter
            id="island-shadow-pure"
            filterUnits="userSpaceOnUse"
            x="-100"
            y="-50"
            width="1000"
            height="400"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
            <feOffset in="blur" dx="0" dy="4" result="offset" />
            <feFlood flood-color="#000000" flood-opacity="0.5" result="color" />
            <feComposite in="color" in2="offset" operator="in" />
          </filter>
        </defs>
        {/* Shadow layer (only visible on hover, morphs with the target path) */}
        <motion.path
          animate={{
            d: targetPath,
            opacity: isHovered ? 1 : 0,
          }}
          transition={{
            d: SPRING.island,
            opacity: {
              type: "tween",
              duration: isHovered ? 0.25 : 0.8,
              ease: "easeInOut",
            },
          }}
          fill="black"
          filter="url(#island-shadow-pure)"
        />
        {/* Solid background layer */}
        <motion.path
          animate={{ d: targetPath }}
          transition={SPRING.island}
          fill={`rgba(0, 0, 0, ${opacity})`}
        />
      </motion.svg>

      {/* Content wrapper */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </motion.div>
  );
}
