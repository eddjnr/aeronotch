import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music } from "reicon-react";
import { SPRING } from "../../lib/animation-config";
import { mediaControl, mediaSeek } from "../../lib/tauri-commands";
import { ProgressBar } from "./ProgressBar";
import { Equalizer } from "../island/Equalizer";
import type { MediaInfo, IslandMode } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";
import { Next2, Previous2, PlayCircle, PauseCircle } from "reicon-react";

interface MusicWidgetProps {
  media: MediaInfo | null;
  mode: IslandMode;
}

export function MusicWidget({ media, mode }: MusicWidgetProps) {
  const { t } = useTranslation();
  const [localIsPlaying, setLocalIsPlaying] = useState(
    media?.is_playing ?? false,
  );

  useEffect(() => {
    if (media) {
      setLocalIsPlaying(media.is_playing);
    }
  }, [media?.is_playing]);

  if (!media) {
    if (mode === "expanded") {
      return (
        <div className="flex items-center justify-center h-full text-white/30 text-sm">
          {t("noMusic")}
        </div>
      );
    }
    return null;
  }

  if (mode === "compact") {
    return null; // Equalizer is shown separately in compact
  }

  // Expanded mode — full player
  return (
    <div className="flex flex-col justify-between h-full w-full py-1.5 px-2 min-w-0">
      {/* Top Section: Album Art + Metadata + Mini Equalizer */}
      <div className="flex items-center gap-3 w-full min-w-0">
        {/* Album Art */}
        <div className="relative flex-shrink-0">
          <motion.div
            className="w-11 h-11 rounded-lg overflow-hidden bg-white/5 shadow-sm"
            layoutId="album-art"
            transition={SPRING.widget}
          >
            {media.thumbnail_url ? (
              <img
                src={media.thumbnail_url}
                alt={media.album}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-5 h-5 text-white/20" />
              </div>
            )}
          </motion.div>
        </div>

        {/* Track Title + Artist */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="text-xs font-semibold text-white truncate leading-tight select-none">
            {media.title}
          </h3>
          <p className="text-[10px] text-white/50 truncate mt-0.5 select-none">
            {media.artist}
          </p>
        </div>

        {/* Mini Real-time Equalizer */}
        {localIsPlaying && (
          <div className="flex-shrink-0 pr-1 select-none">
            <Equalizer isPlaying={localIsPlaying} />
          </div>
        )}
      </div>

      {/* Middle Section: Progress Bar */}
      <div className="w-full">
        <ProgressBar
          current={media.position_seconds}
          total={media.duration_seconds}
          isPlaying={localIsPlaying}
          onSeek={(pos) => {
            mediaSeek(pos).catch(console.error);
          }}
        />
      </div>

      {/* Bottom Section: Controls (Prev, Play/Pause, Next) */}
      <div className="flex items-center justify-center gap-5 w-full select-none">
        <motion.button
          type="button"
          onClick={() => mediaControl("Previous").catch(console.error)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING.button}
          className="text-white/60 hover:text-white transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
        >
          <Previous2 size={24} fill="currentColor" weight="Filled" />
        </motion.button>

        <motion.button
          type="button"
          onClick={() => {
            const nextState = !localIsPlaying;
            setLocalIsPlaying(nextState);
            mediaControl("PlayPause").catch((err) => {
              console.error(err);
              setLocalIsPlaying(!nextState);
            });
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING.button}
          className="text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50 flex items-center justify-center w-10 h-10 relative rounded-full"
        >
          <AnimatePresence initial={false}>
            {localIsPlaying ? (
              <motion.div
                key="pause"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <PauseCircle size={40} fill="currentColor" weight="Filled" />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <PlayCircle size={40} fill="currentColor" weight="Filled" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => mediaControl("Next").catch(console.error)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING.button}
          className="text-white/60 hover:text-white transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
        >
          <Next2 size={24} fill="currentColor" weight="Filled" />
        </motion.button>
      </div>
    </div>
  );
}
