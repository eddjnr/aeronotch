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
      <span className="text-[11px] uppercase tracking-wider font-semibold text-[#86868b] px-1 mb-2">
        {title}
      </span>
      <div className={`bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${disabled ? "opacity-45" : ""}`}>
        {children}
      </div>
    </div>
  );
}
