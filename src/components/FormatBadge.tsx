import { User, Users } from "lucide-react";

export type MatchFormat = "singles" | "doubles";

export function normalizeFormat(v: string | null | undefined): MatchFormat {
  return v === "doubles" ? "doubles" : "singles";
}

export function FormatBadge({
  format,
  size = "sm",
  prominent = false,
}: {
  format: string | null | undefined;
  size?: "sm" | "md";
  prominent?: boolean;
}) {
  const f = normalizeFormat(format);
  const label = f === "doubles" ? "Doubles" : "Singles";
  const Icon = f === "doubles" ? Users : User;
  const base =
    "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wider";
  const sz =
    size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]";
  const tone = prominent
    ? f === "doubles"
      ? "bg-navy text-court"
      : "bg-court text-navy"
    : f === "doubles"
      ? "bg-secondary text-navy"
      : "bg-secondary text-navy";
  return (
    <span className={`${base} ${sz} ${tone}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
