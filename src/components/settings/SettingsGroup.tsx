import type { ReactNode } from "react";

interface SettingsGroupProps {
  title: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SettingsGroup({ title, children, className = "", disabled = false }: SettingsGroupProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-[11px] uppercase tracking-wider font-semibold text-white/40 px-1 mb-2">
        {title}
      </span>
      <div className={`bg-[#2c2c2e] rounded-xl border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${disabled ? "opacity-45" : ""}`}>
        {children}
      </div>
    </div>
  );
}
