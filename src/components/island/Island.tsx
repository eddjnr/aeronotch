import { useRef, useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ISLAND_DIMENSIONS } from "../../lib/animation-config";
import { setIslandSize } from "../../lib/tauri-commands";
import { useIslandStore } from "../../stores/island-store";
import { useSettingsStore } from "../../stores/settings-store";
import { IslandBackground } from "./IslandBackground";
import { IslandLayout } from "./IslandLayout";
import type { IslandMode } from "../../types";
import { useTrayStore } from "../../stores/tray-store";

const EXPANDED_WINDOW_WIDTH = ISLAND_DIMENSIONS.expanded.width + 96;
const EXPANDED_WINDOW_HEIGHT = ISLAND_DIMENSIONS.expanded.height + 64;

export function Island() {
  const { mode, setMode, setIsDragging, setActiveTab, isDragging } =
    useIslandStore();
  const position = useSettingsStore((s) => s.position);
  const showTray = useSettingsStore((s) => s.showTray);
  const monitorPlacement = useSettingsStore((s) => s.monitorPlacement);
  const { addFiles } = useTrayStore();
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Position the window + update watcher with current pill dimensions.
  // Window is always at expanded size — never resizes between modes.
  const updateWindowSize = useCallback(
    async (targetMode: IslandMode, customPosition?: string) => {
      const dims = ISLAND_DIMENSIONS[targetMode];
      try {
        const effectivePosition =
          customPosition ?? useSettingsStore.getState().position;
        await setIslandSize(
          EXPANDED_WINDOW_WIDTH,
          EXPANDED_WINDOW_HEIGHT,
          effectivePosition,
          dims.width,
          dims.height,
        );
      } catch {
        // May fail in dev browser mode
      }
    },
    [],
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

  // Re-sync window position when the app regains focus (e.g. after alt-tab
  // from a fullscreen game that may have shifted the window or changed
  // monitor resolution).
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    const setup = async () => {
      unlisten = await getCurrentWebviewWindow().onFocusChanged(({ payload: focused }) => {
        if (focused) {
          const currentMode = useIslandStore.getState().mode;
          updateWindowSize(currentMode);
        }
      });
    };
    setup();
    return () => { unlisten?.(); };
  }, [updateWindowSize]);

  // Update window position + watcher when position or monitor changes
  useEffect(() => {
    updateWindowSize(mode);
  }, [position, monitorPlacement, updateWindowSize]);

  // Global drag & drop listener at window level to auto-expand compact notch
  useEffect(() => {
    if (!showTray) return;

    let isCleanedUp = false;
    let unlistenFn: (() => void) | null = null;

    const setupListener = async () => {
      try {
        const appWindow = getCurrentWebviewWindow();

        const removeListener = await appWindow.onDragDropEvent((event) => {
          if (isCleanedUp) return;

          const currentMode = useIslandStore.getState().mode;

          if (event.payload.type === "enter" || event.payload.type === "over") {
            if (currentMode !== "expanded") {
              updateWindowSize("expanded");
              setMode("expanded");
            }
            setActiveTab("tray");
            setIsDragging(true);
          } else if (event.payload.type === "drop") {
            setIsDragging(false);
            addFiles(event.payload.paths);
            setActiveTab("tray");
          } else if (event.payload.type === "leave") {
            setIsDragging(false);
          }
        });

        if (isCleanedUp) {
          removeListener();
        } else {
          unlistenFn = removeListener;
        }
      } catch (err) {
        console.error("Failed to setup drag and drop listener in Island:", err);
      }
    };

    setupListener();

    return () => {
      isCleanedUp = true;
      if (unlistenFn) unlistenFn();
    };
  }, [
    showTray,
    setMode,
    updateWindowSize,
    setIsDragging,
    setActiveTab,
    addFiles,
  ]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (mode === "compact") {
      hoverTimeoutRef.current = setTimeout(() => {
        // Only expand if still compact when the timeout fires
        if (useIslandStore.getState().mode === "compact") {
          updateWindowSize("expanded");
          setMode("expanded");
        }
      }, 300);
    }
  }, [mode, setMode, updateWindowSize]);

  const isDropdownOpen = useIslandStore((state) => state.isDropdownOpen);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (
      useIslandStore.getState().isDragging ||
      useIslandStore.getState().isDropdownOpen
    ) {
      setIsHovered(false);
      return;
    }
    if (mode !== "compact") {
      leaveTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
        // Only collapse if mode hasn't changed during the timeout
        if (useIslandStore.getState().mode !== "compact") {
          updateWindowSize("compact");
          setMode("compact");
        }
      }, 400);
    } else {
      setIsHovered(false);
    }
  }, [mode, setMode, updateWindowSize]);

  const handleClick = useCallback(() => {
    if (mode === "expanded") return;
    updateWindowSize("expanded");
    setMode("expanded");
  }, [mode, setMode, updateWindowSize]);

  // Collapse island when dropdown closes / drag ends and mouse is not hovering
  useEffect(() => {
    if (!isDropdownOpen && !isDragging && !isHovered && mode !== "compact") {
      const timer = setTimeout(() => {
        updateWindowSize("compact");
        setMode("compact");
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isDropdownOpen, isDragging, isHovered, mode, setMode, updateWindowSize]);

  // Handle Escape key to collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode !== "compact") {
        updateWindowSize("compact");
        setMode("compact");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, setMode, updateWindowSize]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex items-start justify-center w-full pt-0">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="select-none relative"
        data-tauri-drag-region
      >
        <IslandBackground mode={mode} isHovered={isHovered}>
          <IslandLayout mode={mode} />
        </IslandBackground>
      </div>
    </div>
  );
}
