/**
 * Centralized animation constants.
 *
 * Uses stiffness/damping springs matching the Dynamic Island reference component.
 * stiffness: 400, damping: 30 — snappy and responsive, like the real thing.
 */

/** Spring physics matching the Dynamic Island reference */
export const stiffness = 400;
export const damping = 30;

export const SPRING = {
  /** Main island container resize — snappy spring */
  island: { type: "spring" as const, stiffness, damping },
  /** Widget enter / exit / layout shift */
  widget: { type: "spring" as const, stiffness, damping, duration: 0.5 },
  /** Button press feedback */
  button: { type: "spring" as const, duration: 0.15, bounce: 0 },
  /** Slow, gentle transitions (settings panel, overlays) */
  gentle: { type: "spring" as const, stiffness: 300, damping: 35 },
} as const;

export const EASE = {
  /** Custom ease-out — never use default ease-in */
  out: [0.23, 1, 0.32, 1] as const,
  /** Smooth in-out for looping / oscillating animations */
  inOut: [0.77, 0, 0.175, 1] as const,
} as const;

/** Fixed border-radius: top edges are 0 (flush with screen top), bottom edges rounded */
export const BORDER_RADIUS = "0px 0px 16px 16px";

export const ISLAND_DIMENSIONS = {
  compact: { width: 250, height: 36 },
  preview: { width: 420, height: 52 },
  expanded: { width: 660, height: 184 },
} as const;
