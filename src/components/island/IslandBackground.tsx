import { motion, useWillChange } from 'framer-motion';
import { ISLAND_DIMENSIONS, SPRING } from '../../lib/animation-config';
import { useSettingsStore } from '../../stores/settings-store';
import type { IslandMode } from '../../types';

interface IslandBackgroundProps {
  mode: IslandMode;
  children: React.ReactNode;
  onAnimationComplete?: () => void;
}

export function IslandBackground({ mode, children, onAnimationComplete }: IslandBackgroundProps) {
  const opacity = useSettingsStore((s) => s.opacity);
  const willChange = useWillChange();
  const dims = ISLAND_DIMENSIONS[mode];

  return (
    <motion.div
      className="overflow-hidden"
      onAnimationComplete={onAnimationComplete}
      animate={{
        width: dims.width,
        height: dims.height,
        borderRadius: '0px 0px 16px 16px',
        transition: SPRING.island,
        clipPath: 'none',
        transitionEnd: {
          clipPath: 'inset(0 0 0 0 round 0px 0px 16px 16px)',
        },
      }}
      style={{
        willChange,
        background: `rgba(0, 0, 0, ${opacity})`,
        backdropFilter: 'blur(40px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
        boxShadow:
          '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
      }}
    >
      {children}
    </motion.div>
  );
}
