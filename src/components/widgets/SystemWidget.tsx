import { useState } from 'react';
import { Cpu, MemoryStick, Zap, HardDrive } from 'lucide-react';
import type { SystemStats, IslandMode } from '../../types';

interface SystemWidgetProps {
  stats: SystemStats | null;
  mode: IslandMode;
}

export function SystemWidget({ stats, mode }: SystemWidgetProps) {
  const [activeSubTab, setActiveSubTab] = useState<'cpu' | 'ram' | 'gpu' | 'storage'>('cpu');

  if (!stats) return null;

  if (mode === 'compact' || mode === 'preview') {
    return null;
  }

  const formatGB = (bytes: number) => (bytes / 1073741824).toFixed(1);
  const formatDiskGB = (bytes: number) => (bytes / 1073741824).toFixed(0);

  return (
    <div className="flex flex-row gap-3 w-full h-[120px] select-none">
      {/* Left side: Vertical Tabs */}
      <div className="flex flex-col gap-1 w-[120px] shrink-0 justify-between py-0.5">
        <button
          onClick={() => setActiveSubTab('cpu')}
          className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[9.5px] font-semibold transition-all duration-150 cursor-pointer ${
            activeSubTab === 'cpu'
              ? 'bg-white/10 text-white border-l-2 border-[#007aff]'
              : 'text-white/45 hover:text-white/70 hover:bg-white/[0.03]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            CPU
          </span>
          <span className="font-mono text-[9px]">{stats.cpu_usage.toFixed(0)}%</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ram')}
          className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[9.5px] font-semibold transition-all duration-150 cursor-pointer ${
            activeSubTab === 'ram'
              ? 'bg-white/10 text-white border-l-2 border-[#34c759]'
              : 'text-white/45 hover:text-white/70 hover:bg-white/[0.03]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <MemoryStick className="w-3.5 h-3.5" />
            RAM
          </span>
          <span className="font-mono text-[9px]">{stats.memory_percent.toFixed(0)}%</span>
        </button>

        <button
          onClick={() => setActiveSubTab('gpu')}
          className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[9.5px] font-semibold transition-all duration-150 cursor-pointer ${
            activeSubTab === 'gpu'
              ? 'bg-white/10 text-white border-l-2 border-[#af52de]'
              : 'text-white/45 hover:text-white/70 hover:bg-white/[0.03]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            GPU
          </span>
          <span className="font-mono text-[9px]">{stats.gpu_usage.toFixed(0)}%</span>
        </button>

        <button
          onClick={() => setActiveSubTab('storage')}
          className={`flex items-center justify-between px-2 py-1.5 rounded-md text-[9.5px] font-semibold transition-all duration-150 cursor-pointer ${
            activeSubTab === 'storage'
              ? 'bg-white/10 text-white border-l-2 border-[#ff9500]'
              : 'text-white/45 hover:text-white/70 hover:bg-white/[0.03]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            DISK
          </span>
          <span className="font-mono text-[9px]">{stats.disk_percent.toFixed(0)}%</span>
        </button>
      </div>

      {/* Right side: Detailed View */}
      <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-lg p-2.5 flex flex-col justify-between min-w-0">
        {activeSubTab === 'cpu' && (
          <div className="flex flex-col justify-between h-full w-full min-w-0">
            <div className="flex justify-between items-center w-full min-w-0">
              <span className="text-[9.5px] font-bold text-white/80 uppercase tracking-wider">Processor Utilization</span>
              <span className="text-[9.5px] text-white/95 font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded">{stats.cpu_usage.toFixed(1)}%</span>
            </div>
            
            <div className="w-full my-1.5">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#007aff] transition-all duration-300 shadow-[0_0_8px_rgba(0,122,255,0.5)]"
                  style={{ width: `${Math.min(stats.cpu_usage, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center w-full min-w-0 text-[8.5px] text-white/40 font-medium">
              <span className="truncate max-w-[180px] font-semibold text-white/60">{stats.cpu_name}</span>
              <span>Real-time Monitoring</span>
            </div>
          </div>
        )}

        {activeSubTab === 'ram' && (
          <div className="flex flex-col justify-between h-full w-full min-w-0">
            <div className="flex justify-between items-center w-full min-w-0">
              <span className="text-[9.5px] font-bold text-white/80 uppercase tracking-wider">Memory Allocation</span>
              <span className="text-[9.5px] text-white/95 font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded">{stats.memory_percent.toFixed(1)}%</span>
            </div>
            
            <div className="w-full my-1.5">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#34c759] transition-all duration-300 shadow-[0_0_8px_rgba(52,199,89,0.5)]"
                  style={{ width: `${Math.min(stats.memory_percent, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center w-full min-w-0 text-[8.5px] text-white/40 font-medium">
              <span>Used: {formatGB(stats.used_memory)} GB</span>
              <span>Total: {formatGB(stats.total_memory)} GB</span>
            </div>
          </div>
        )}

        {activeSubTab === 'gpu' && (
          <div className="flex flex-col justify-between h-full w-full min-w-0">
            <div className="flex justify-between items-center w-full min-w-0">
              <span className="text-[9.5px] font-bold text-white/80 uppercase tracking-wider">Graphics Core Load</span>
              <span className="text-[9.5px] text-white/95 font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded">{stats.gpu_usage.toFixed(1)}%</span>
            </div>
            
            <div className="w-full my-1.5">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#af52de] transition-all duration-300 shadow-[0_0_8px_rgba(175,82,222,0.5)]"
                  style={{ width: `${Math.min(stats.gpu_usage, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center w-full min-w-0 text-[8.5px] text-white/40 font-medium">
              <span className="truncate max-w-[180px] font-semibold text-white/60">{stats.gpu_name}</span>
              <span>Real-time Rendering</span>
            </div>
          </div>
        )}

        {activeSubTab === 'storage' && (
          <div className="flex flex-col justify-between h-full w-full min-w-0">
            <div className="flex justify-between items-center w-full min-w-0">
              <span className="text-[9.5px] font-bold text-white/80 uppercase tracking-wider">Storage Capacity</span>
              <span className="text-[9.5px] text-white/95 font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded">{stats.disk_percent.toFixed(1)}%</span>
            </div>
            
            <div className="w-full my-1.5">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#ff9500] transition-all duration-300 shadow-[0_0_8px_rgba(255,149,0,0.5)]"
                  style={{ width: `${Math.min(stats.disk_percent, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center w-full min-w-0 text-[8.5px] text-white/40 font-medium">
              <span>Drive: {stats.disk_name}</span>
              <span>{formatDiskGB(stats.disk_used)} GB used of {formatDiskGB(stats.disk_total)} GB</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

