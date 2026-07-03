import { renderHook } from "@testing-library/react";
import { useSystemInfo } from "@/hooks/useSystemInfo";
import { useIslandStore } from "@/stores/island-store";
import type { SystemStats } from "@/types";

const mockListen = vi.fn();

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: any[]) => mockListen(...args),
}));

describe("useSystemInfo", () => {
  beforeEach(() => {
    useIslandStore.setState(useIslandStore.getInitialState());
    mockListen.mockReset();
  });

  it("listens for system-stats events and updates store", async () => {
    let listenCallback: ((event: { payload: SystemStats }) => void) | null = null;
    mockListen.mockImplementation((_event: string, cb: typeof listenCallback) => {
      listenCallback = cb;
      return Promise.resolve(vi.fn());
    });

    renderHook(() => useSystemInfo());

    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith("system-stats", expect.any(Function));
    });

    const stats: SystemStats = {
      cpu_name: "Intel Core i7",
      cpu_usage: 35,
      total_memory: 16384,
      used_memory: 8192,
      memory_percent: 50,
      gpu_name: "NVIDIA RTX 3080",
      gpu_usage: 22,
      disks: [
        { name: "C:", total: 500, used: 250, percent: 50 },
      ],
      cpu_temp: 65,
      gpu_temp: 72,
    };

    listenCallback!({ payload: stats });

    expect(useIslandStore.getState().systemStats).toEqual(stats);
  });

  it("updates store multiple times on subsequent events", async () => {
    let listenCallback: ((event: { payload: SystemStats }) => void) | null = null;
    mockListen.mockImplementation((_event: string, cb: typeof listenCallback) => {
      listenCallback = cb;
      return Promise.resolve(vi.fn());
    });

    renderHook(() => useSystemInfo());

    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    const stats1: SystemStats = {
      cpu_name: "Intel",
      cpu_usage: 10,
      total_memory: 16384,
      used_memory: 4096,
      memory_percent: 25,
      gpu_name: "NVIDIA",
      gpu_usage: 5,
      disks: [],
    };

    const stats2: SystemStats = {
      ...stats1,
      cpu_usage: 80,
      memory_percent: 75,
    };

    listenCallback!({ payload: stats1 });
    expect(useIslandStore.getState().systemStats!.cpu_usage).toBe(10);

    listenCallback!({ payload: stats2 });
    expect(useIslandStore.getState().systemStats!.cpu_usage).toBe(80);
  });

  it("cleans up listener on unmount", async () => {
    const unlisten = vi.fn();
    mockListen.mockResolvedValue(unlisten);

    const { unmount } = renderHook(() => useSystemInfo());

    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    unmount();
    await vi.waitFor(() => {
      expect(unlisten).toHaveBeenCalled();
    });
  });

  // NOTE: useSystemInfo does not catch listen() rejections.
  // The `listen` promise is used directly without .catch(),
  // which would cause an unhandled promise rejection at runtime.
  // This is a real bug — the hook should handle it gracefully.
});
