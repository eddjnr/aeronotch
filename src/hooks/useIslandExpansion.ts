import { useRef, useCallback, useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useIslandStore } from "../stores/island-store";
import { useSettingsStore } from "../stores/settings-store";
import { useTrayStore } from "../stores/tray-store";
import type { IslandMode } from "../types";

export function useIslandExpansion(
  updateWindowSize: (
    targetMode: IslandMode,
    customPosition?: string,
  ) => Promise<void>,
) {
  const { mode, setMode, setIsDragging, setActiveTab, isDragging } =
    useIslandStore();
  const showTray = useSettingsStore((s) => s.showTray);
  const { addFiles } = useTrayStore();
  const isDropdownOpen = useIslandStore((state) => state.isDropdownOpen);

  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // ── Event handlers ──

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);

    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    if (mode === "compact") {
      hoverTimeoutRef.current = setTimeout(() => {
        if (useIslandStore.getState().mode === "compact") {
          updateWindowSize("expanded");
          setMode("expanded");
        }
      }, 300);
    }
  }, [mode, setMode, updateWindowSize]);

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

  // ── Effects ──

  // Drag & drop — auto-expand on file drag-over, add files on drop
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

          if (
            event.payload.type === "enter" ||
            event.payload.type === "over"
          ) {
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
        console.error(
          "Failed to setup drag and drop listener in Island:",
          err,
        );
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

  // Escape key → collapse
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

  return { isHovered, handleMouseEnter, handleMouseLeave, handleClick };
}
