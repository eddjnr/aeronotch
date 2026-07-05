import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { SPRING } from "../../lib/animation-config";
import { toggleMicMute } from "../../lib/tauri-commands";
import type { MicStatus } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";

interface MicWidgetProps {
  micStatus: MicStatus | null;
  /**
   * - "compact": tiny icon-only indicator shown in the compact pill.
   * - "header": persistent quick-action pill shown in the expanded header, next to Settings,
   *   accessible regardless of which tab is active — this is the "quick mute/unmute for calls" control.
   */
  variant: "compact" | "header";
}

export function MicWidget({ micStatus, variant }: MicWidgetProps) {
  const { t } = useTranslation();
  const [localMuted, setLocalMuted] = useState(micStatus?.is_muted ?? false);

  useEffect(() => {
    if (micStatus) {
      setLocalMuted(micStatus.is_muted);
    }
  }, [micStatus?.is_muted]);

  if (!micStatus || !micStatus.has_device) return null;

  const handleToggle = (e: React.MouseEvent) => {
    // Prevent bubbling to the parent Island container, which expands/collapses on click.
    e.stopPropagation();
    const nextMuted = !localMuted;
    setLocalMuted(nextMuted);
    toggleMicMute().catch((err) => {
      console.error(err);
      setLocalMuted(!nextMuted);
    });
  };

  const iconTransition = { duration: 0.12, ease: "easeOut" as const };

  if (variant === "compact") {
    return (
      <motion.button
        type="button"
        onClick={handleToggle}
        whileTap={{ scale: 0.88 }}
        transition={SPRING.button}
        title={localMuted ? t("micMuted") : t("micLive")}
        className={`flex items-center justify-center w-4 h-4 rounded-full cursor-pointer focus-visible:outline-none transition-colors ${
          localMuted ? "text-red-400" : "text-white/85 hover:text-white"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={localMuted ? "muted" : "live"}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={iconTransition}
            className="flex items-center justify-center"
          >
            {localMuted ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    );
  }

  // variant === "header": persistent quick-action pill in the expanded header.
  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      transition={SPRING.button}
      title={localMuted ? t("micUnmuteAction") : t("micMuteAction")}
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer select-none focus:outline-none transition-colors ${
        localMuted
          ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
          : "text-white/50 hover:text-white hover:bg-white/[0.06]"
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={localMuted ? "muted" : "live"}
          initial={{ opacity: 0, scale: 0.6, rotate: localMuted ? -20 : 20 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.6, rotate: localMuted ? 20 : -20 }}
          transition={iconTransition}
          className="flex items-center justify-center"
        >
          {localMuted ? (
            <MicOff className="w-3.5 h-3.5" />
          ) : (
            <Mic className="w-3.5 h-3.5" />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
