import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
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
  Check,
  X,
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

// Helper to check if file is an image
function isImage(extension: string) {
  const ext = extension.toLowerCase();
  return ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"].includes(ext);
}

// Component to render image preview
function ImagePreview({ path, name }: { path: string; name: string }) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  let src = "";

  try {
    src = convertFileSrc(path);
  } catch {
    src = "";
  }

  if (!src || failedPath === path) {
    return <ImageIcon className="w-8 h-8 text-sky-400 fill-sky-400/10" />;
  }

  return (
    <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/5 shadow-sm border border-white/5 flex items-center justify-center">
      <img
        src={src}
        alt={name}
        onError={() => setFailedPath(path)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function TrayWidget() {
  const { files, removeFile, clearTray, verifyFiles, isVerifying } = useTrayStore();
  const { t } = useTranslation();
  const isDragging = useIslandStore((s) => s.isDragging);
  const setIsDropdownOpen = useIslandStore((s) => s.setIsDropdownOpen);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Verify all files still exist on mount, remove stale entries silently
  useEffect(() => {
    verifyFiles();
  }, [verifyFiles]);

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    toggleSelected(id);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleFileKeyDown = (id: string, e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    toggleSelected(id);
  };

  const handleCopySelected = async () => {
    const selectedFiles = files.filter((f) => selectedIds.includes(f.id));
    if (selectedFiles.length === 0) return;
    try {
      await copyFilesToClipboard(selectedFiles.map((f) => f.path));
      setSelectedIds([]);
    } catch (err) {
      console.error("Failed to copy selected files:", err);
      selectedFiles.forEach((f) => removeFile(f.id));
      setSelectedIds([]);
    }
  };

  const handleRemoveSelected = () => {
    selectedIds.forEach((id) => removeFile(id));
    setSelectedIds([]);
  };

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
      removeFile(file.id);
    }
  };

  const handleCopy = async (file: TrayFile) => {
    try {
      await copyFilesToClipboard([file.path]);
    } catch (err) {
      console.error("Failed to copy file:", err);
      removeFile(file.id);
    }
  };

  const handleReveal = async (file: TrayFile) => {
    try {
      await revealInExplorer(file.path);
    } catch (err) {
      console.error("Failed to reveal file in explorer:", err);
      removeFile(file.id);
    }
  };

  return (
    <div className="flex flex-col h-full text-white select-none relative">
      {files.length === 0 ? (
        // Empty State
        <div
          className={`flex-1 flex flex-col items-center justify-center border border-dashed rounded-xl p-4 text-center transition-all duration-200 ${
            isDragging
              ? "border-white/45 bg-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_0_18px_rgba(255,255,255,0.08)]"
              : "border-white/10 bg-white/[0.02]"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center mb-2.5 transition-all duration-200 ${
              isDragging ? "bg-white text-black scale-105" : "bg-white/[0.04]"
            }`}
          >
            {isVerifying ? (
              <svg className="w-5 h-5 animate-spin text-white/30" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Upload
                className={`w-5 h-5 transition-colors duration-200 ${
                  isDragging ? "text-black" : "text-white/30"
                }`}
              />
            )}
          </div>
          <span
            className={`text-sm transition-colors duration-200 ${
              isDragging ? "text-white/90" : "text-white/40"
            }`}
          >
            {isVerifying ? "Verifying..." : t("trayEmpty")}
          </span>
        </div>
      ) : (
        // File list state
        <div className="relative flex flex-col h-full min-h-0">
          {/* Header Action Bar */}
          <div className="relative flex h-7 flex-shrink-0 items-center justify-between px-1 pb-1.5 w-full overflow-hidden">
            {selectedIds.length > 0 ? (
              <div className="flex items-center gap-2 w-full justify-between animate-fade-in">
                <span className="flex ml-0.5 h-5 items-center rounded-full bg-white/[0.04] px-2 text-[9px] font-medium text-white/55 tabular-nums shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                  {selectedIds.length} {t("traySelectedCount")}
                </span>
                <div className="flex h-6 items-center gap-0.5 rounded-full border border-white/[0.07] bg-white/[0.045] p-0.5 shadow-[inset_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.18)]">
                  <button
                    type="button"
                    onClick={handleCopySelected}
                    className="flex h-5 items-center gap-1 rounded-full bg-white/[0.12] px-2.5 text-[9px] font-semibold text-white shadow-[inset_0_1px_rgba(255,255,255,0.08)] transition-all duration-150 hover:bg-white/[0.16] active:scale-[0.97] cursor-pointer"
                  >
                    <Copy className="w-2.5 h-2.5 text-sky-300" />
                    {t("trayCopy")}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveSelected}
                    className="flex h-5 items-center gap-1 rounded-full px-2.5 text-[9px] font-medium text-white/62 transition-all duration-150 hover:bg-rose-500/[0.13] hover:text-rose-100 active:scale-[0.97] cursor-pointer"
                  >
                    <Trash2 className="w-2.5 h-2.5 text-rose-300/85" />
                    {t("trayRemoveSelected")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    aria-label={t("trayClearSelection")}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-white/45 transition-all duration-150 hover:bg-white/[0.09] hover:text-white/80 active:scale-[0.94] cursor-pointer"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-[9px] text-white/30 font-medium ml-0.5">
                  {t("traySelectHint")}
                </span>
                <button
                  type="button"
                  onClick={clearTray}
                  className="text-[9px] font-medium text-rose-400/60 hover:text-rose-400 transition-colors cursor-pointer bg-white/[0.02] hover:bg-rose-500/10 px-2.5 py-0.5 rounded-full"
                >
                  {t("trayClearAll")}
                </button>
              </div>
            )}
          </div>

          <div
            className={`relative flex-1 min-h-0 overflow-x-auto overflow-y-hidden flex items-center gap-2.5 rounded-xl px-1 py-2 scrollbar-none transition-all duration-200 ${
              isDragging
                ? "border border-dashed border-white/30 bg-white/[0.025] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]"
                : "border border-transparent bg-transparent"
            }`}
          >
            {files.map((file) => (
              <div
                key={file.id}
                role="button"
                tabIndex={0}
                aria-pressed={selectedIds.includes(file.id)}
                aria-label={file.name}
                onDoubleClick={() => handleOpen(file)}
                onClick={(e) => handleToggleSelect(file.id, e)}
                onKeyDown={(e) => handleFileKeyDown(file.id, e)}
                className={`relative flex-shrink-0 w-[100px] h-[86px] rounded-xl border flex flex-col items-center justify-between p-2 transition-all duration-200 cursor-pointer group ${
                  selectedIds.includes(file.id)
                    ? "border-sky-500 bg-sky-500/10 shadow-[0_0_12px_rgba(14,165,233,0.15)]"
                    : "border-white/[0.04] hover:border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                {/* Selection Checkbox/Indicator */}
                <div
                  className={`absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all duration-200 z-10 ${
                    selectedIds.includes(file.id)
                      ? "bg-sky-500 border-sky-400 text-white"
                      : "bg-black/20 border-white/10 opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {selectedIds.includes(file.id) && (
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  )}
                </div>
                {/* File Icon / Preview */}
                <div className="flex-1 flex items-center justify-center pointer-events-none w-full h-[42px] overflow-hidden my-0.5">
                  {isImage(file.extension) ? (
                    <ImagePreview path={file.path} name={file.name} />
                  ) : (
                    getFileIcon(file.extension, file.isDir)
                  )}
                </div>

                {/* File Name */}
                <div className="w-full text-center">
                  <div className="flex flex-col items-center pointer-events-none">
                    <span className="text-[10px] font-medium text-white/90 truncate w-full px-0.5 leading-tight">
                      {file.name}
                    </span>
                  </div>
                </div>

                {/* Shadcn Dropdown Menu */}
                <DropdownMenu onOpenChange={setIsDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
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
