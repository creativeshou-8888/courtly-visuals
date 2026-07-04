import {
  Target,
  Undo2,
  Zap,
  Grip,
  Bolt,
  Scissors,
  Moon,
  Crown,
  Handshake,
  Star,
  Shield,
  Users,
  Award,
  type LucideIcon,
} from "lucide-react";

export type BadgeMeta = {
  name: string;
  icon: LucideIcon;
  /** Soft accent bg */
  accentBg: string;
  /** Solid accent for icons/borders */
  accent: string;
  /** Text color on solid accent */
  onAccent: string;
};

export const BADGE_META: Record<string, BadgeMeta> = {
  "Super Forehand": {
    name: "Super Forehand",
    icon: Target,
    accentBg: "bg-orange-100",
    accent: "text-orange-600",
    onAccent: "text-orange-700",
  },
  "Super Backhand": {
    name: "Super Backhand",
    icon: Undo2,
    accentBg: "bg-sky-100",
    accent: "text-sky-600",
    onAccent: "text-sky-700",
  },
  "Super Serve": {
    name: "Super Serve",
    icon: Zap,
    accentBg: "bg-yellow-100",
    accent: "text-yellow-600",
    onAccent: "text-yellow-700",
  },
  "Volley Master": {
    name: "Volley Master",
    icon: Grip,
    accentBg: "bg-emerald-100",
    accent: "text-emerald-600",
    onAccent: "text-emerald-700",
  },
  "Power Hitter": {
    name: "Power Hitter",
    icon: Bolt,
    accentBg: "bg-red-100",
    accent: "text-red-600",
    onAccent: "text-red-700",
  },
  "Slice Master": {
    name: "Slice Master",
    icon: Scissors,
    accentBg: "bg-teal-100",
    accent: "text-teal-600",
    onAccent: "text-teal-700",
  },
  "Moonball Master": {
    name: "Moonball Master",
    icon: Moon,
    accentBg: "bg-indigo-100",
    accent: "text-indigo-600",
    onAccent: "text-indigo-700",
  },
  "All-Rounder": {
    name: "All-Rounder",
    icon: Crown,
    accentBg: "bg-amber-100",
    accent: "text-amber-600",
    onAccent: "text-amber-700",
  },
  "Great Sport": {
    name: "Great Sport",
    icon: Handshake,
    accentBg: "bg-lime-100",
    accent: "text-lime-700",
    onAccent: "text-lime-800",
  },
  "Rising Star": {
    name: "Rising Star",
    icon: Star,
    accentBg: "bg-fuchsia-100",
    accent: "text-fuchsia-600",
    onAccent: "text-fuchsia-700",
  },
  "Never Gives Up": {
    name: "Never Gives Up",
    icon: Shield,
    accentBg: "bg-rose-100",
    accent: "text-rose-600",
    onAccent: "text-rose-700",
  },
  "Dream Partner": {
    name: "Dream Partner",
    icon: Users,
    accentBg: "bg-violet-100",
    accent: "text-violet-600",
    onAccent: "text-violet-700",
  },
};

export function getBadgeMeta(name: string): BadgeMeta {
  return (
    BADGE_META[name] ?? {
      name,
      icon: Award,
      accentBg: "bg-secondary",
      accent: "text-navy",
      onAccent: "text-navy",
    }
  );
}
