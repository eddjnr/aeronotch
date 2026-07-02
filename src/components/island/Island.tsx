import { useRef, useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { ISLAND_DIMENSIONS } from "../../lib/animation-config";
import { setIslandSize } from "../../lib/tauri-commands";
import { useIslandStore } from "../../stores/island-store";
import { useSettingsStore } from "../../stores/settings-store";
import { IslandBackground } from "./IslandBackground";
import { IslandLayout } from "./IslandLayout";
import type { IslandMode } from "../../types";

export function Island() {
  const { mode, setMode } = useIslandStore();
  const position = useSettingsStore((s) => s.position);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Sync Tauri window size and screen position with island mode
  const updateWindowSize = useCallback(
    async (targetMode: IslandMode, customPosition = position) => {
      const dims = ISLAND_DIMENSIONS[targetMode];
      try {
        // Always use the expanded width to prevent horizontal window moving/centering jitter!
        const maxWidth = ISLAND_DIMENSIONS.expanded.width;
        await setIslandSize(maxWidth + 96, dims.height + 64, customPosition); // padding for shadow
      } catch {
        // May fail in dev browser mode
      }
    },
    [position],
  );

  // Handle settings changes emitted from the preferences window
  useEffect(() => {
    const unlistenPromise = listen("settings-changed", (event) => {
      const payload = event.payload as { key: string; value: any };
      if (payload && payload.key) {
        console.log("Settings changed in main window:", payload);
        useSettingsStore.setState({ [payload.key]: payload.value });
      }
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Update window size and coordinates when position changes
  useEffect(() => {
    updateWindowSize(mode);
  }, [position, updateWindowSize]);

  // Ensure correct size on startup
  useEffect(() => {
    updateWindowSize("compact");
  }, [updateWindowSize]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (mode === "compact") {
      hoverTimeoutRef.current = setTimeout(() => {
        // 1. Instantly expand Tauri window size first so there is space for the animation to grow into
        updateWindowSize("expanded");
        // 2. Start the react animation
        setMode("expanded");
      }, 300);
    }
  }, [mode, setMode, updateWindowSize]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (mode !== "compact") {
      leaveTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
        // 1. Start the collapse animation inside the webview (the window remains large)
        setMode("compact");
      }, 400);
    } else {
      setIsHovered(false);
    }
  }, [mode, setMode]);

  const handleClick = useCallback(() => {
    if (mode === "expanded") return;
    updateWindowSize("expanded");
    setMode("expanded");
  }, [mode, setMode, updateWindowSize]);

  // Handle when animation settles
  const handleAnimationComplete = useCallback(() => {
    // If the animation just finished settling into 'compact' mode, now we can shrink the Tauri window
    if (mode === "compact") {
      updateWindowSize("compact");
    }
  }, [mode, updateWindowSize]);

  // Handle Escape key to collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode !== "compact") {
        setMode("compact");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, setMode]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="flex items-start justify-center w-full pt-0"
      data-tauri-drag-region
    >
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="select-none relative"
      >
        <IslandBackground
          mode={mode}
          isHovered={isHovered}
          onAnimationComplete={handleAnimationComplete}
        >
          <IslandLayout mode={mode} />
        </IslandBackground>
      </div>
    </div>
  );
}
