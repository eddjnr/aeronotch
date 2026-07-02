import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Music,
} from "lucide-react";
import { SPRING } from "../../lib/animation-config";
import { mediaControl, mediaSeek } from "../../lib/tauri-commands";
import { ProgressBar } from "./ProgressBar";
import { Equalizer } from "../island/Equalizer";
import type { MediaInfo, IslandMode } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";

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

  if (mode === "preview") {
    return (
      <div className="flex items-center gap-2.5">
        {media.thumbnail_url && (
          <img
            src={media.thumbnail_url}
            alt={media.title}
            className="w-8 h-8 rounded-md object-cover"
          />
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-medium text-white truncate max-w-[120px]">
            {media.title}
          </span>
        </div>
      </div>
    );
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
            <Equalizer isPlaying={true} />
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
      <div className="flex items-center justify-center gap-8 w-full select-none">
        <button
          type="button"
          onClick={() => mediaControl("Previous")}
          className="text-white/60 hover:text-white transition-colors cursor-pointer p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
        >
          <SkipBack className="w-4 h-4" fill="currentColor" />
        </button>

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
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={SPRING.button}
          className="text-white cursor-pointer p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50 flex items-center justify-center w-8 h-8"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={localIsPlaying ? "pause" : "play"}
              initial={{
                opacity: 0,
                scale: 0.6,
                rotate: localIsPlaying ? -30 : 30,
              }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{
                opacity: 0,
                scale: 0.6,
                rotate: localIsPlaying ? 30 : -30,
              }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="flex items-center justify-center"
            >
              {localIsPlaying ? (
                <Pause className="w-6 h-6" fill="currentColor" />
              ) : (
                <Play className="w-6 h-6" fill="currentColor" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        <button
          type="button"
          onClick={() => mediaControl("Next")}
          className="text-white/60 hover:text-white transition-colors cursor-pointer p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50"
        >
          <SkipForward className="w-4 h-4" fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
