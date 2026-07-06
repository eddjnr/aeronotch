import { useIslandStore } from "../../stores/island-store";
import { useIslandWindow } from "../../hooks/useIslandWindow";
import { useIslandExpansion } from "../../hooks/useIslandExpansion";
import { IslandBackground } from "./IslandBackground";
import { IslandLayout } from "./IslandLayout";

export function Island() {
  const mode = useIslandStore((s) => s.mode);
  const { updateWindowSize } = useIslandWindow();
  const { isHovered, handleMouseEnter, handleMouseLeave, handleClick } =
    useIslandExpansion(updateWindowSize);

  return (
    <div className="flex items-start justify-center w-full pt-0">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="select-none relative"
        data-tauri-drag-region
      >
        <IslandBackground mode={mode} isHovered={isHovered}>
          <IslandLayout mode={mode} />
        </IslandBackground>
      </div>
    </div>
  );
}
