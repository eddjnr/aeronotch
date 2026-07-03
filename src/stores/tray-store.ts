import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getFileMetadata, renameFileOnDisk } from "../lib/tauri-commands";

export interface TrayFile {
  id: string;
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  extension: string;
  addedAt: number;
}

interface TrayState {
  files: TrayFile[];
  addFiles: (paths: string[]) => Promise<void>;
  removeFile: (id: string) => void;
  renameFile: (id: string, newName: string) => Promise<void>;
  clearTray: () => void;
  verifyFiles: () => Promise<void>;
  isVerifying: boolean;
}

const processingPaths = new Set<string>();

export const useTrayStore = create<TrayState>()(
  persist(
    (set, get) => ({
      files: [],
      isVerifying: false,
      addFiles: async (paths) => {
        const newFiles: TrayFile[] = [];
        const existingPaths = new Set(get().files.map((f) => f.path));

        const pathsToProcess = paths
          .map(p => p.replace(/\//g, "\\"))
          .filter(p => !existingPaths.has(p) && !processingPaths.has(p));

        if (pathsToProcess.length === 0) return;

        // Mark paths as processing synchronously to block duplicate concurrent requests
        pathsToProcess.forEach(p => processingPaths.add(p));

        try {
          for (const path of pathsToProcess) {
            try {
              const meta = await getFileMetadata(path);
              const ext = meta.is_dir
                ? "folder"
                : meta.name.split(".").pop()?.toLowerCase() || "";

              newFiles.push({
                id: crypto.randomUUID(),
                name: meta.name,
                path: path,
                size: meta.size,
                isDir: meta.is_dir,
                extension: ext,
                addedAt: Date.now(),
              });
            } catch (err) {
              console.error("Failed to load file metadata for path:", path, err);
            }
          }

          if (newFiles.length > 0) {
            set({ files: [...get().files, ...newFiles] });
          }
        } finally {
          // Always clear paths from processing list when finished
          pathsToProcess.forEach(p => processingPaths.delete(p));
        }
      },
      removeFile: (id) => {
        set({ files: get().files.filter((f) => f.id !== id) });
      },
      renameFile: async (id, newName) => {
        const file = get().files.find((f) => f.id === id);
        if (!file) return;

        try {
          // Trigger backend rename on disk
          const newPath = await renameFileOnDisk(file.path, newName);
          const ext = file.isDir
            ? "folder"
            : newName.split(".").pop()?.toLowerCase() || "";

          set({
            files: get().files.map((f) =>
              f.id === id
                ? {
                    ...f,
                    name: newName,
                    path: newPath,
                    extension: ext,
                  }
                : f
            ),
          });
        } catch (err) {
          console.error("Failed to rename file:", err);
          throw err; // bubble up to let UI handle the error feedback
        }
      },
      clearTray: () => set({ files: [] }),
      verifyFiles: async () => {
        const currentFiles = get().files;
        if (currentFiles.length === 0) return;
        set({ isVerifying: true });
        const validFiles: TrayFile[] = [];
        for (const file of currentFiles) {
          try {
            await getFileMetadata(file.path);
            validFiles.push(file);
          } catch {
            // File no longer exists — skip it
          }
        }
        set({ files: validFiles, isVerifying: false });
      },
    }),
    { name: "aeronotch-tray-files" }
  )
);
