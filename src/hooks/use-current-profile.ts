import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getMyProfile } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";

function useHasSession() {
  const [state, setState] = useState<{ ready: boolean; hasSession: boolean }>({
    ready: false,
    hasSession: false,
  });
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({ ready: true, hasSession: !!data.session });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState({ ready: true, hasSession: !!session });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return state;
}

export function useCurrentProfile() {
  const fetchProfile = useServerFn(getMyProfile);
  const { ready, hasSession } = useHasSession();
  return useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => fetchProfile(),
    staleTime: 30_000,
    enabled: ready && hasSession,
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
