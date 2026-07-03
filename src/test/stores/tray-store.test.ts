import { useTrayStore } from "@/stores/tray-store";

const mockGetFileMetadata = vi.fn();
const mockRenameFileOnDisk = vi.fn();

vi.mock("@/lib/tauri-commands", () => ({
  getFileMetadata: (...args: any[]) => mockGetFileMetadata(...args),
  renameFileOnDisk: (...args: any[]) => mockRenameFileOnDisk(...args),
}));

describe("tray-store", () => {
  beforeEach(() => {
    useTrayStore.setState(useTrayStore.getInitialState());
    mockGetFileMetadata.mockReset();
    mockRenameFileOnDisk.mockReset();
  });

  it("starts with empty files", () => {
    expect(useTrayStore.getState().files).toEqual([]);
  });

  it("addFiles with valid path adds a file", async () => {
    mockGetFileMetadata.mockResolvedValue({
      name: "test.txt",
      path: "C:\\test.txt",
      size: 1024,
      is_dir: false,
    });

    await useTrayStore.getState().addFiles(["C:\\test.txt"]);
    const files = useTrayStore.getState().files;
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("test.txt");
    expect(files[0].extension).toBe("txt");
    expect(files[0].size).toBe(1024);
  });

  it("addFiles with directory marks isDir", async () => {
    mockGetFileMetadata.mockResolvedValue({
      name: "my-folder",
      path: "C:\\my-folder",
      size: 0,
      is_dir: true,
    });

    await useTrayStore.getState().addFiles(["C:\\my-folder"]);
    const files = useTrayStore.getState().files;
    expect(files).toHaveLength(1);
    expect(files[0].isDir).toBe(true);
    expect(files[0].extension).toBe("folder");
  });

  it("addFiles does not add duplicates", async () => {
    mockGetFileMetadata.mockResolvedValue({
      name: "test.txt",
      path: "C:\\test.txt",
      size: 1024,
      is_dir: false,
    });

    await useTrayStore.getState().addFiles(["C:\\test.txt"]);
    await useTrayStore.getState().addFiles(["C:\\test.txt"]);
    expect(useTrayStore.getState().files).toHaveLength(1);
  });

  it("removeFile removes by id", async () => {
    mockGetFileMetadata.mockResolvedValue({
      name: "test.txt",
      path: "C:\\test.txt",
      size: 1024,
      is_dir: false,
    });

    await useTrayStore.getState().addFiles(["C:\\test.txt"]);
    const id = useTrayStore.getState().files[0].id;
    useTrayStore.getState().removeFile(id);
    expect(useTrayStore.getState().files).toEqual([]);
  });

  it("clearTray removes all files", async () => {
    mockGetFileMetadata.mockResolvedValue({
      name: "a.txt",
      path: "C:\\a.txt",
      size: 100,
      is_dir: false,
    });

    await useTrayStore.getState().addFiles(["C:\\a.txt"]);
    useTrayStore.getState().clearTray();
    expect(useTrayStore.getState().files).toEqual([]);
  });

  it("renameFile updates name, path and extension", async () => {
    mockGetFileMetadata.mockResolvedValue({
      name: "old.txt",
      path: "C:\\old.txt",
      size: 1024,
      is_dir: false,
    });
    mockRenameFileOnDisk.mockResolvedValue("C:\\new.txt");

    await useTrayStore.getState().addFiles(["C:\\old.txt"]);
    const id = useTrayStore.getState().files[0].id;

    await useTrayStore.getState().renameFile(id, "new.txt");
    const file = useTrayStore.getState().files[0];
    expect(file.name).toBe("new.txt");
    expect(file.path).toBe("C:\\new.txt");
    expect(file.extension).toBe("txt");
  });

  it("renameFile does nothing for unknown id", async () => {
    await useTrayStore.getState().renameFile("nonexistent", "new.txt");
    expect(mockRenameFileOnDisk).not.toHaveBeenCalled();
  });

  it("addFiles skips paths with metadata errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetFileMetadata.mockRejectedValue(new Error("not found"));

    await useTrayStore.getState().addFiles(["C:\\bad.txt"]);
    expect(useTrayStore.getState().files).toEqual([]);
  });

  it("verifyFiles removes stale files", async () => {
    mockGetFileMetadata
      .mockResolvedValueOnce({
        name: "exists.txt",
        path: "C:\\exists.txt",
        size: 100,
        is_dir: false,
      })
      .mockRejectedValueOnce(new Error("not found"));

    useTrayStore.setState({
      files: [
        {
          id: "1",
          name: "exists.txt",
          path: "C:\\exists.txt",
          size: 100,
          isDir: false,
          extension: "txt",
          addedAt: Date.now(),
        },
        {
          id: "2",
          name: "gone.txt",
          path: "C:\\gone.txt",
          size: 200,
          isDir: false,
          extension: "txt",
          addedAt: Date.now(),
        },
      ],
    });

    await useTrayStore.getState().verifyFiles();
    expect(useTrayStore.getState().files).toHaveLength(1);
    expect(useTrayStore.getState().files[0].id).toBe("1");
  });

  it("verifyFiles does nothing on empty tray", async () => {
    await useTrayStore.getState().verifyFiles();
    expect(useTrayStore.getState().files).toEqual([]);
  });

  it("isVerifying is false after verify completes", async () => {
    mockGetFileMetadata.mockResolvedValue({
      name: "a.txt",
      path: "C:\\a.txt",
      size: 100,
      is_dir: false,
    });

    useTrayStore.setState({
      files: [
        {
          id: "1",
          name: "a.txt",
          path: "C:\\a.txt",
          size: 100,
          isDir: false,
          extension: "txt",
          addedAt: Date.now(),
        },
      ],
    });

    const verifyPromise = useTrayStore.getState().verifyFiles();
    expect(useTrayStore.getState().isVerifying).toBe(true);
    await verifyPromise;
    expect(useTrayStore.getState().isVerifying).toBe(false);
  });

  it("addFiles normalizes forward slashes to backslashes", async () => {
    mockGetFileMetadata.mockResolvedValue({
      name: "test.txt",
      path: "C:\\test.txt",
      size: 100,
      is_dir: false,
    });

    await useTrayStore.getState().addFiles(["C:/test.txt"]);
    expect(useTrayStore.getState().files).toHaveLength(1);
  });
});
