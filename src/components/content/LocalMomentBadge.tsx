import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/** Distinct badge for Nigerian cultural / local moment calendar entries. */
export function LocalMomentBadge({
  name,
  compact = false,
  className,
}: {
  name?: string | null;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      title={name ? `Local moment: ${name}` : "Local moment"}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-[#C9A84C]/35 bg-[#C9A84C]/10 font-medium text-[#C9A84C]",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        className
      )}
    >
      <MapPin className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
      {compact ? "Local" : name ? `Local · ${name}` : "Local moment"}
    </span>
  );
}
