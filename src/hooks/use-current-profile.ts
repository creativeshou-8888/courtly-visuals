import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/profile.functions";

export function useCurrentProfile() {
  const fetchProfile = useServerFn(getMyProfile);
  return useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => fetchProfile(),
    staleTime: 30_000,
  });
}

export function useInvalidateProfile() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["me", "profile"] });
}

export type CurrentProfile = NonNullable<
  ReturnType<typeof useCurrentProfile>["data"]
>;

export function initialsAvatar(name: string) {
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='160' height='160' rx='80' fill='#d9f56b'/><text x='50%' y='54%' text-anchor='middle' dominant-baseline='middle' font-family='Space Grotesk, sans-serif' font-size='64' font-weight='700' fill='#0b1230'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
