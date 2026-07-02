import { useEffect } from "react";
import {
  File,
  Folder,
  Image as ImageIcon,
  FileText,
  Film,
  Music as MusicIcon,
  Archive,
  Code,
  Copy,
  FolderOpen,
  Trash2,
  Upload,
  MoreVertical,
} from "lucide-react";
import { useTrayStore, TrayFile } from "../../stores/tray-store";
import { useIslandStore } from "../../stores/island-store";
import { useTranslation } from "../../hooks/useTranslation";
import {
  copyFilesToClipboard,
  revealInExplorer,
  openFileOnDisk,
} from "../../lib/tauri-commands";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

// Helper to format bytes
function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Helper to get extension-specific icons
function getFileIcon(extension: string, isDir: boolean) {
  if (isDir || extension === "folder") {
    return <Folder className="w-8 h-8 text-amber-400 fill-amber-400/20" />;
  }
  const ext = extension.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"].includes(ext)) {
    return <ImageIcon className="w-8 h-8 text-sky-400 fill-sky-400/10" />;
  }
  if (["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm"].includes(ext)) {
    return <Film className="w-8 h-8 text-indigo-400 fill-indigo-400/10" />;
  }
  if (["mp3", "wav", "ogg", "flac", "m4a", "aac"].includes(ext)) {
    return <MusicIcon className="w-8 h-8 text-rose-400 fill-rose-400/10" />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return <Archive className="w-8 h-8 text-orange-400 fill-orange-400/10" />;
  }
  if (
    [
      "html",
      "css",
      "js",
      "ts",
      "jsx",
      "tsx",
      "json",
      "rs",
      "py",
      "cpp",
      "c",
      "java",
      "cs",
      "go",
    ].includes(ext)
  ) {
    return <Code className="w-8 h-8 text-emerald-400 fill-emerald-400/10" />;
  }
  if (
    ["txt", "md", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(
      ext,
    )
  ) {
    return (
      <FileText className="w-8 h-8 text-neutral-300 fill-neutral-300/10" />
    );
  }
  return <File className="w-8 h-8 text-neutral-400 fill-neutral-400/10" />;
}

export function TrayWidget() {
  const { files, removeFile } = useTrayStore();
  const { t } = useTranslation();
  const setIsDropdownOpen = useIslandStore((s) => s.setIsDropdownOpen);

  // Reset dropdown open state on unmount
  useEffect(() => {
    return () => {
      setIsDropdownOpen(false);
    };
  }, [setIsDropdownOpen]);

  const handleOpen = async (file: TrayFile) => {
    try {
      await openFileOnDisk(file.path);
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  };

  const handleCopy = async (file: TrayFile) => {
    try {
      await copyFilesToClipboard([file.path]);
    } catch (err) {
      console.error("Failed to copy file:", err);
    }
  };

  const handleReveal = async (file: TrayFile) => {
    try {
      await revealInExplorer(file.path);
    } catch (err) {
      console.error("Failed to reveal file in explorer:", err);
    }
  };

  return (
    <div className="flex flex-col h-full text-white select-none relative">
      {files.length === 0 ? (
        // Empty State
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02] p-4 text-center transition-all duration-300">
          <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center mb-2.5">
            <Upload className="w-5 h-5 text-white/30" />
          </div>
          <span className="text-[11px] text-white/40 font-medium">
            {t("trayEmpty")}
          </span>
        </div>
      ) : (
        // File list state
        <div className="flex flex-col h-full justify-between">
          {/* <div className="flex items-center justify-between mb-1.5 px-1">
            <button
              onClick={clearTray}
              className="text-[9px] font-medium text-rose-400/70 hover:text-rose-400 transition-colors cursor-pointer bg-white/[0.02] hover:bg-rose-500/10 px-2 py-0.5 rounded-full"
            >
              Limpar
            </button>
          </div> */}

          <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-2.5 pr-2 py-1 scrollbar-none">
            {files.map((file) => (
              <div
                key={file.id}
                onDoubleClick={() => handleOpen(file)}
                className="relative flex-shrink-0 w-[100px] h-[95px] rounded-xl border border-white/[0.04] hover:border-white/10 flex flex-col items-center justify-between p-2.5 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer group"
              >
                {/* File Icon */}
                <div className="flex-1 flex items-center justify-center pointer-events-none">
                  {getFileIcon(file.extension, file.isDir)}
                </div>

                {/* File Name */}
                <div className="w-full text-center">
                  <div className="flex flex-col items-center pointer-events-none">
                    <span className="text-[10px] font-medium text-white/90 truncate w-full px-0.5 leading-tight">
                      {file.name}
                    </span>
                    <span className="text-[8px] text-white/40 mt-0.5 font-mono">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                </div>

                {/* Shadcn Dropdown Menu */}
                <DropdownMenu onOpenChange={setIsDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    className="dark w-[150px] bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl p-1 shadow-2xl flex flex-col gap-0.5 text-left text-white"
                    align="end"
                    side="top"
                    sideOffset={4}
                  >
                    {/* Copy */}
                    <DropdownMenuItem
                      onClick={() => handleCopy(file)}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-white/95 rounded-lg hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white transition-colors cursor-pointer text-left w-full"
                    >
                      <Copy className="w-3.5 h-3.5 text-white/50" />
                      <span>{t("trayCopy")}</span>
                    </DropdownMenuItem>

                    {/* Reveal */}
                    <DropdownMenuItem
                      onClick={() => handleReveal(file)}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-white/95 rounded-lg hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white transition-colors cursor-pointer text-left w-full"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-white/50" />
                      <span>{t("trayReveal")}</span>
                    </DropdownMenuItem>

                    {/* Divider */}
                    <DropdownMenuSeparator className="h-[1px] bg-white/[0.06] my-0.5" />

                    {/* Remove */}
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        removeFile(file.id);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-medium text-rose-400 rounded-lg hover:bg-rose-500/10 focus:bg-rose-500/10 focus:text-rose-400 transition-colors cursor-pointer text-left w-full"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400/60" />
                      <span>{t("trayRemove")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
