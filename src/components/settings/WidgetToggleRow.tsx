import type { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";

interface WidgetToggleRowProps {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onToggle: () => void;
}

export function WidgetToggleRow({
  icon,
  label,
  checked,
  onToggle,
}: WidgetToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 bg-transparent">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white">{label}</span>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} size="sm" />
    </div>
  );
}
