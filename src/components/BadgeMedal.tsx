import { Check } from "lucide-react";
import { getBadgeMeta } from "@/lib/badges";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizes: Record<Size, { box: string; icon: string; label: string; count: string }> = {
  sm: { box: "h-16 w-16", icon: "h-6 w-6", label: "text-[10px]", count: "text-[10px]" },
  md: { box: "h-20 w-20", icon: "h-7 w-7", label: "text-xs", count: "text-xs" },
  lg: { box: "h-24 w-24", icon: "h-9 w-9", label: "text-sm", count: "text-sm" },
};

export function BadgeMedal({
  name,
  count,
  size = "md",
  selected,
  disabled,
  showLabel = true,
  onClick,
  interactive,
}: {
  name: string;
  count?: number;
  size?: Size;
  selected?: boolean;
  disabled?: boolean;
  showLabel?: boolean;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const meta = getBadgeMeta(name);
  const Icon = meta.icon;
  const s = sizes[size];
  const Tag: any = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all",
        interactive && !disabled && "hover:-translate-y-0.5 hover:shadow-md",
        selected
          ? "border-court bg-court/20 shadow-md shadow-court/20"
          : disabled
            ? "border-border bg-background opacity-50"
            : "border-border bg-background",
      )}
    >
      <div className="relative">
        <div
          className={cn(
            "grid place-items-center rounded-2xl shadow-inner",
            s.box,
            selected ? "bg-court" : meta.accentBg,
          )}
        >
          <Icon className={cn(s.icon, selected ? "text-navy" : meta.accent)} strokeWidth={2.25} />
        </div>
        {selected && (
          <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-navy text-court ring-2 ring-background">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        )}
        {count != null && count > 0 && !selected && (
          <span className="absolute -right-1.5 -top-1.5 min-w-[1.5rem] rounded-full bg-navy px-1.5 py-0.5 text-center text-[10px] font-bold text-court ring-2 ring-background">
            ×{count}
          </span>
        )}
      </div>
      {showLabel && (
        <p className={cn("font-semibold leading-tight text-navy", s.label)}>{meta.name}</p>
      )}
    </Tag>
  );
}
