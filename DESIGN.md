---
name: WiNotch
description: Sleek Apple-inspired Dynamic Island utility for Windows Desktop.
colors:
  primary: "#ffffff"
  neutral-bg: "#000000"
  border-subtle: "#1a1a1a"
typography:
  display:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  body:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "10px"
  lg: "20px"
components:
  card:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: WiNotch

## 1. Overview

**Creative North Star: "The Desktop Bezel Sanctuary"**

WiNotch is a premium, minimalist screen-top desktop accessory that integrates naturally with the physical monitor bezel. It serves as a visual hub for media controls, system metrics, and daily weather. The design language is characterized by deep translucent black panels, fine high-contrast borders, and organic spring animations. It explicitly rejects SaaS clutter, thick borders, and chaotic animations in favor of Apple-style precision and tranquility.

### Key Characteristics:
* **Organic Motion**: Spring animations with stiffness of (300/400) and damping of (30) to feel snappy and reactive.
* **Unified Bezel Connection**: Outward concave curves at the top corners blend the utility into the screen's edge.
* **High-Density Simplicity**: Information is highly compact, utilizing precise uppercase kickers and font sizes ranging from (10px) to (14px).

## 2. Colors

The color palette is strictly restrained, using a monochromatic core with micro-accents to indicate specific widget states (e.g. emerald for active status, blue for info panels).

### Primary
* **Crisp White** (#ffffff): Used for active text, icons, and primary buttons. Its rarity is preserved to direct the user's attention.

### Neutral
* **Bezel Black** (#000000): The core background color, matching the dark bezel of standard desktop monitors.
* **Translucent Panel** (rgba(0, 0, 0, 0.85)): Used for secondary background overlays to let desktop wallpapers seep through slightly.
* **Subtle Frost Border** (rgba(255, 255, 255, 0.06)): Used for all main panel borders to delineate the widget boundaries.

### Named Rules
**The 10% Accent Rule.** Colored accents (like Emerald or Blue) must occupy less than 10% of any screen surface to keep the interface feeling premium.

## 3. Typography

**Display Font:** Manrope Variable
**Body Font:** Inter Variable

The type scale is optimized for micro-legibility at a distance from the screen.

### Hierarchy
* **Display** (Bold, 14px, lineHeight: 1.2): Used for media titles and large statistics.
* **Headline** (SemiBold, 12px, lineHeight: 1.3): Used for subheadings and list headers.
* **Body** (Regular, 11px, lineHeight: 1.4): Used for general data and descriptions.
* **Label** (Medium, 10px, letterSpacing: 0.05em, uppercase): Used for kickers and resource indicators.

## 4. Elevation

Depth is conveyed through a hybrid of deep flat black fills, glassmorphism panel blur (backdrop-filter), and subtle dark shadows to elevate the island above the desktop wallpaper.

### Shadow Vocabulary
* **Island Shadow** (box-shadow: 0 8px 32px rgba(0,0,0,0.5)): Used on the main Dynamic Island body to float it above wallpapers.

## 5. Components

All components are designed to feel tactile and restrained.

### Island Body
* **Shape**: Rounded top corners (0px) connected with concave curves (20px radius) to the screen, and highly rounded bottom corners (20px radius).
* **Border**: Subtle frost border (rgba(255, 255, 255, 0.06)).
* **Background**: Solid black (#000000) or very high opacity black.

### Tab Navigation
* **Spacing**: 14px gap between tabs.
* **Icons**: lucide-react icons, styled with text-white/35 at rest and transitioning to text-white on hover or when active.

### Widgets
* **Margin/Padding**: Standard padding of 12px or 16px inside cards.
* **Layout**: Grid layout `grid-cols-[1.2fr_1fr]` or standard `grid-cols-[1fr_1fr]` to keep items balanced.

## 6. Do's and Don'ts

### Do:
* **Do** enforce a 1.5px overlap on all concave corner radial-gradients to prevent pixel gaps.
* **Do** truncate all long text titles using `truncate` and `min-w-0` to maintain layout structure.
* **Do** animate the sound equalizer using requestAnimationFrame for smooth 60fps performance.

### Don't:
* **Don't** use standard box-shadow on the same element that has a thick border; keep borders subtle (≤1px).
* **Don't** animate CSS layout properties (height/width) directly; let framer-motion handle it using CSS scale or layoutId.
* **Don't** add batter/wifi indicators in compact/preview mode; keep it restricted to core info.
