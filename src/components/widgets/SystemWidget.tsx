import { Cpu, MemoryStick } from 'lucide-react';
import type { SystemStats, IslandMode } from '../../types';

interface SystemWidgetProps {
  stats: SystemStats | null;
  mode: IslandMode;
}

export function SystemWidget({ stats, mode }: SystemWidgetProps) {
  if (!stats) return null;

  if (mode === 'compact' || mode === 'preview') {
    return null;
  }

  // Expanded
  return (
    <div className="flex flex-col gap-2.5">
      {/* CPU */}
      <div className="flex items-center gap-2">
        <Cpu className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex justify-between mb-0.5">
            <span className="text-[10px] text-white/50">CPU</span>
            <span className="text-[10px] text-white/70 font-mono">
              {stats.cpu_usage.toFixed(0)}%
            </span>
          </div>
          <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-white/90 transition-all duration-700"
              style={{ width: `${Math.min(stats.cpu_usage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Memory */}
      <div className="flex items-center gap-2">
        <MemoryStick className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex justify-between mb-0.5">
            <span className="text-[10px] text-white/50">RAM</span>
            <span className="text-[10px] text-white/70 font-mono">
              {(stats.used_memory / 1073741824).toFixed(1)}GB /{' '}
              {(stats.total_memory / 1073741824).toFixed(1)}GB
            </span>
          </div>
          <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-white/90 transition-all duration-700"
              style={{ width: `${Math.min(stats.memory_percent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
