import { renderHook } from "@testing-library/react";
import { useMediaInfo } from "@/hooks/useMediaInfo";
import { useIslandStore } from "@/stores/island-store";
import type { MediaInfo } from "@/types";

const mockListen = vi.fn();
const mockGetMediaInfo = vi.fn();

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: any[]) => mockListen(...args),
}));

vi.mock("@/lib/tauri-commands", () => ({
  getMediaInfo: (...args: any[]) => mockGetMediaInfo(...args),
}));

describe("useMediaInfo", () => {
  beforeEach(() => {
    useIslandStore.setState(useIslandStore.getInitialState());
    mockListen.mockReset();
    mockGetMediaInfo.mockReset();
  });

  it("fetches initial media info and updates store on mount", async () => {
    const media: MediaInfo = {
      title: "Song",
      artist: "Artist",
      album: "Album",
      is_playing: true,
      position_seconds: 10,
      duration_seconds: 200,
      thumbnail_url: null,
      app_name: "Spotify",
    };
    mockGetMediaInfo.mockResolvedValue(media);
    mockListen.mockResolvedValue(vi.fn());

    renderHook(() => useMediaInfo());

    await vi.waitFor(() => {
      expect(useIslandStore.getState().mediaInfo).toEqual(media);
    });
  });

  it("sets mediaInfo to null when initial fetch returns null", async () => {
    mockGetMediaInfo.mockResolvedValue(null);
    mockListen.mockResolvedValue(vi.fn());

    renderHook(() => useMediaInfo());

    await vi.waitFor(() => {
      expect(useIslandStore.getState().mediaInfo).toBeNull();
    });
  });

  it("handles initial fetch error silently", async () => {
    mockGetMediaInfo.mockRejectedValue(new Error("fetch failed"));
    mockListen.mockResolvedValue(vi.fn());

    renderHook(() => useMediaInfo());

    await vi.waitFor(() => {
      expect(useIslandStore.getState().mediaInfo).toBeNull();
    });
  });

  it("listens for media-changed events and updates store", async () => {
    let listenCallback: ((event: { payload: MediaInfo | null }) => void) | null = null;
    mockGetMediaInfo.mockResolvedValue(null);
    mockListen.mockImplementation((_event: string, cb: typeof listenCallback) => {
      listenCallback = cb;
      return Promise.resolve(vi.fn());
    });

    renderHook(() => useMediaInfo());

    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith("media-changed", expect.any(Function));
    });

    const updated: MediaInfo = {
      title: "New Song",
      artist: "New Artist",
      album: "New Album",
      is_playing: false,
      position_seconds: 0,
      duration_seconds: 180,
      thumbnail_url: null,
      app_name: "YouTube Music",
    };

    listenCallback!({ payload: updated });

    expect(useIslandStore.getState().mediaInfo).toEqual(updated);
  });

  it("cleans up listener on unmount", async () => {
    const unlisten = vi.fn();
    mockGetMediaInfo.mockResolvedValue(null);
    mockListen.mockResolvedValue(unlisten);

    const { unmount } = renderHook(() => useMediaInfo());

    await vi.waitFor(() => {
      expect(mockListen).toHaveBeenCalled();
    });

    unmount();
    expect(unlisten).toHaveBeenCalled();
  });

  it("logs error when listener setup fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetMediaInfo.mockResolvedValue(null);
    mockListen.mockRejectedValue(new Error("listen failed"));

    renderHook(() => useMediaInfo());

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to listen to media changes:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });
});
