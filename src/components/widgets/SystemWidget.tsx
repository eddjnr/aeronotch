import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, MemoryStick, Zap, HardDrive } from "lucide-react";
import type { SystemStats, IslandMode } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";

interface SystemWidgetProps {
  stats: SystemStats | null;
  mode: IslandMode;
}

interface CircularProgressProps {
  value: number;
  color: string;
  label: string;
  unit?: string;
}

function CircularProgress({
  value,
  color,
  label,
  unit = "%",
}: CircularProgressProps) {
  const r = 29;
  const strokeWidth = 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset =
    circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-[76px] h-[76px] shrink-0 select-none">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 76 76">
        {/* Track circle */}
        <circle
          className="text-white/[0.03]"
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={r}
          cx={38}
          cy={38}
        />
        {/* Progress circle */}
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          strokeLinecap="round"
          r={r}
          cx={38}
          cy={38}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-[15px] font-semibold text-white tracking-tight leading-none">
          {value.toFixed(0)}
          <span className="text-[10px] text-white/60 font-semibold ml-0.5">
            {unit}
          </span>
        </span>
        <span className="text-[8.5px] text-white/35 tracking-wider font-medium uppercase mt-0.5 leading-none">
          {label}
        </span>
      </div>
    </div>
  );
}

export function SystemWidget({ stats, mode }: SystemWidgetProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "cpu" | "ram" | "gpu" | "storage"
  >("cpu");
  const { t } = useTranslation();

  if (!stats) return null;

  if (mode === "compact") {
    return null;
  }

  const formatGB = (bytes: number) => (bytes / 1073741824).toFixed(1);
  const formatDiskGB = (bytes: number) => (bytes / 1073741824).toFixed(0);

  return (
    <div className="flex flex-row gap-4 w-full h-full select-none">
      {/* Left side: Vertical Tabs */}
      <div className="flex flex-col gap-1.5 w-[106px] shrink-0 justify-center h-full relative pl-1">
        {(["cpu", "ram", "gpu", "storage"] as const).map((tab) => {
          const isActive = activeSubTab === tab;
          const config = {
            cpu: { label: "CPU", icon: Cpu, value: stats.cpu_usage },
            ram: {
              label: "RAM",
              icon: MemoryStick,
              value: stats.memory_percent,
            },
            gpu: { label: "GPU", icon: Zap, value: stats.gpu_usage },
            storage: {
              label: "DISK",
              icon: HardDrive,
              value: stats.disks[0]?.percent ?? 0,
            },
          }[tab];

          const Icon = config.icon;

          return (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`relative flex items-center justify-between px-2.5 py-1.5 rounded-[10px] text-[10px] font-semibold transition-all duration-200 cursor-pointer focus:outline-none select-none z-10 group ${
                isActive
                  ? "text-white font-bold"
                  : "text-white/45 hover:text-white/60"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSubTabIndicator"
                  className="absolute inset-0 bg-[#0a84ff]/[0.12] rounded-[10px] -z-10 shadow-[inset_0_1px_rgba(255,255,255,0.05),0_1px_3px_rgba(0,0,0,0.15)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="flex items-center gap-2">
                <Icon
                  className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-105"
                  style={{ color: isActive ? "#0a84ff" : undefined }}
                />
                {config.label}
              </span>
              <span
                className={`text-[10px] ${isActive ? "text-[#0a84ff] font-extrabold" : "text-white/50 font-bold"}`}
              >
                {config.value.toFixed(0)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Right side: Detailed View */}
      <div className="flex-1 bg-white/[0.01] border border-white/[0.03] rounded-[22px] p-3.5 flex flex-col justify-between min-w-0 h-full relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, x: 4, filter: "blur(2px)" }}
            animate={{ opacity: 1, x: 0, filter: "none" }}
            exit={{ opacity: 0, x: -4, filter: "blur(2px)" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex flex-row items-center gap-4 h-full w-full min-w-0"
          >
            {activeSubTab === "storage" && stats.disks.length > 1 ? (
              <div
                className="flex flex-col gap-3 w-full h-full justify-start py-0.5 overflow-y-auto pr-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255, 255, 255, 0.12) transparent",
                }}
              >
                {stats.disks.map((disk, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 w-full border-b border-white/[0.02] last:border-b-0 pb-1.5 last:pb-0"
                  >
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-white/95 text-[11.5px]">
                        {t("sysDrive")} ({disk.name})
                      </span>
                      <span className="text-[10.5px] text-white/60 font-medium">
                        {t("sysDriveOf", {
                          used: formatDiskGB(disk.used),
                          total: formatDiskGB(disk.total),
                          free: formatDiskGB(disk.total - disk.used),
                          percent: disk.percent.toFixed(0)
                        })}
                      </span>
                    </div>

                    {/* Horizontal Mini progress bar */}
                    <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.01]">
                      <motion.div
                        className="h-full rounded-full bg-[#0a84ff] shadow-[0_0_6px_rgba(10,132,255,0.2)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(disk.percent, 100)}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Left Column: Ring Progress */}
                <CircularProgress
                  value={
                    activeSubTab === "cpu"
                      ? stats.cpu_usage
                      : activeSubTab === "ram"
                        ? stats.memory_percent
                        : activeSubTab === "gpu"
                          ? stats.gpu_usage
                          : (stats.disks[0]?.percent ?? 0)
                  }
                  color="#0a84ff"
                  label={
                    activeSubTab === "cpu"
                      ? t("sysCpuUtil")
                      : activeSubTab === "ram"
                        ? t("sysRamAlloc")
                        : activeSubTab === "gpu"
                          ? t("sysGpuCore")
                          : t("sysDiskUsed")
                  }
                />

                {/* Right Column: Key Details */}
                <div className="flex-1 flex flex-col justify-center min-w-0 h-full py-1">
                  {activeSubTab === "cpu" && (
                    <div className="flex flex-col justify-between h-full min-w-0">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-medium text-white/30 uppercase tracking-widest">
                          {t("sysProcessor")}
                        </span>
                        <span
                          className="text-[13.5px] font-semibold text-white tracking-tight leading-tight truncate pr-1"
                          title={stats.cpu_name}
                        >
                          {stats.cpu_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="flex items-center gap-1.5 text-[9.5px] font-bold text-white/45 tracking-wider uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0a84ff] shadow-[0_0_8px_rgba(10,132,255,0.5)] animate-pulse" />
                          {t("sysLive")}
                        </span>
                        {stats.cpu_temp !== undefined &&
                        stats.cpu_temp !== null ? (
                          <span className="text-[11px] font-semibold text-white/70 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.03]">
                            {stats.cpu_temp.toFixed(0)}°C
                          </span>
                        ) : (
                          <span
                            className="text-[10px] font-medium text-white/30 bg-white/[0.02] px-2 py-0.5 rounded-md border border-white/[0.02] cursor-help transition-colors hover:bg-white/[0.04]"
                            title={t("sysCpuTempNaTooltip")}
                          >
                            N/A
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSubTab === "ram" && (
                    <div className="flex flex-col justify-between h-full min-w-0">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-medium text-white/30 uppercase tracking-widest">
                          {t("sysMemory")}
                        </span>
                        <span className="text-[13.5px] font-semibold text-white tracking-tight leading-tight">
                          {t("sysRamLabel")}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 mt-1.5 text-white/60">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                            {t("sysUsed")}
                          </span>
                          <span className="text-white/95 font-semibold text-[11.5px]">
                            {formatGB(stats.used_memory)} GB
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                            {t("sysTotal")}
                          </span>
                          <span className="text-white/95 font-semibold text-[11.5px]">
                            {formatGB(stats.total_memory)} GB
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSubTab === "gpu" && (
                    <div className="flex flex-col justify-between h-full min-w-0">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-medium text-white/30 uppercase tracking-widest">
                          {t("sysGraphics")}
                        </span>
                        <span
                          className="text-[13.5px] font-semibold text-white tracking-tight leading-tight truncate pr-1"
                          title={stats.gpu_name}
                        >
                          {stats.gpu_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="flex items-center gap-1.5 text-[9.5px] font-bold text-white/45 tracking-wider uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0a84ff] shadow-[0_0_8px_rgba(10,132,255,0.5)] animate-pulse" />
                          {t("sysLive")}
                        </span>
                        {stats.gpu_temp !== undefined &&
                        stats.gpu_temp !== null ? (
                          <span className="text-[11px] font-semibold text-white/70 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.03]">
                            {stats.gpu_temp.toFixed(0)}°C
                          </span>
                        ) : (
                          <span
                            className="text-[10px] font-medium text-white/30 bg-white/[0.02] px-2 py-0.5 rounded-md border border-white/[0.02] cursor-help transition-colors hover:bg-white/[0.04]"
                            title={t("sysGpuTempNaTooltip")}
                          >
                            N/A
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSubTab === "storage" && stats.disks.length === 1 && (
                    <div className="flex flex-col justify-between h-full min-w-0">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-medium text-white/30 uppercase tracking-widest">
                          {t("sysStorage")}
                        </span>
                        <span className="text-[13.5px] font-semibold text-white tracking-tight leading-tight">
                          {t("sysDrive")} ({stats.disks[0].name})
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 mt-1.5 text-white/60">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                            {t("sysUsed")}
                          </span>
                          <span className="text-white/95 font-semibold text-[11.5px]">
                            {formatDiskGB(stats.disks[0].used)} GB
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
                            {t("sysAvailable")}
                          </span>
                          <span className="text-white/95 font-semibold text-[11.5px]">
                            {formatDiskGB(
                              stats.disks[0].total - stats.disks[0].used,
                            )}{" "}
                            GB
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
