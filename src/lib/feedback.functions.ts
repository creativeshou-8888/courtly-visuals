import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const BADGE_OPTIONS = [
  "Super Forehand",
  "Super Backhand",
  "Super Serve",
  "Volley Master",
  "Power Hitter",
  "Slice Master",
  "Moonball Master",
  "All-Rounder",
  "Great Sport",
  "Rising Star",
  "Never Gives Up",
  "Dream Partner",
] as const;

export const LEADERBOARD_BADGES = [
  "Super Forehand",
  "Super Backhand",
  "Super Serve",
  "Great Sport",
  "All-Rounder",
  "Rising Star",
] as const;

export type Badge = (typeof BADGE_OPTIONS)[number];

const submitSchema = z.object({
  match_id: uuid,
  badges: z.array(z.string()).max(3),
  note: z.string().trim().max(300).nullable().optional(),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ context, data }) => {
    const badges = data.badges.filter((b): b is Badge =>
      (BADGE_OPTIONS as readonly string[]).includes(b),
    );
    const { data: row, error } = await (context.supabase as any).rpc(
      "submit_post_match_feedback",
      { _match_id: data.match_id, _badges: badges, _note: data.note ?? null },
    );
    if (error) throw new Error(error.message);
    return row as {
      id: string;
      match_id: string;
      giver_id: string;
      receiver_id: string;
      badges: string[];
      note: string | null;
      created_at: string;
    };
  });

export const getMyFeedbackForMatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ match_id: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as any)
      .from("post_match_feedback")
      .select("id,badges,note,created_at")
      .eq("match_id", data.match_id)
      .eq("giver_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row as { id: string; badges: string[]; note: string | null; created_at: string } | null;
  });

export type ProfileKudos = {
  badgeCounts: { badge: string; count: number }[];
  notes: { note: string; giver_name: string | null; created_at: string }[];
  totalFeedback: number;
};

export const getKudosForProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: uuid }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("post_match_feedback")
      .select("id,badges,note,giver_id,created_at")
      .eq("receiver_id", data.user_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const all = (rows ?? []) as {
      id: string;
      badges: string[];
      note: string | null;
      giver_id: string;
      created_at: string;
    }[];

    const counts = new Map<string, number>();
    for (const r of all) {
      for (const b of r.badges ?? []) counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    const badgeCounts = Array.from(counts.entries())
      .map(([badge, count]) => ({ badge, count }))
      .sort((a, b) => b.count - a.count);

    const withNotes = all.filter((r) => !!r.note).slice(0, 3);
    const giverIds = Array.from(new Set(withNotes.map((r) => r.giver_id)));
    const giverNames: Record<string, string> = {};
    if (giverIds.length) {
      const { data: profs } = await (context.supabase as any)
        .from("profiles")
        .select("id,name")
        .in("id", giverIds);
      for (const p of (profs ?? []) as any[]) giverNames[p.id] = p.name;
    }

    const notes = withNotes.map((r) => ({
      note: r.note!,
      giver_name: giverNames[r.giver_id] ?? null,
      created_at: r.created_at,
    }));

    return { badgeCounts, notes, totalFeedback: all.length } satisfies ProfileKudos;
  });

export type BadgeLeaderboard = {
  badge: string;
  players: { id: string; name: string; photo_url: string | null; count: number }[];
}[];

export const getBadgeLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("post_match_feedback")
      .select("receiver_id,badges");
    if (error) throw new Error(error.message);
    const all = (rows ?? []) as { receiver_id: string; badges: string[] }[];

    // badge -> receiverId -> count
    const map = new Map<string, Map<string, number>>();
    for (const badge of LEADERBOARD_BADGES) map.set(badge, new Map());
    for (const r of all) {
      for (const b of r.badges ?? []) {
        const inner = map.get(b);
        if (!inner) continue;
        inner.set(r.receiver_id, (inner.get(r.receiver_id) ?? 0) + 1);
      }
    }

    const allReceiverIds = Array.from(
      new Set(
        Array.from(map.values()).flatMap((m) => Array.from(m.keys())),
      ),
    );
    const profiles: Record<string, { id: string; name: string; photo_url: string | null }> = {};
    if (allReceiverIds.length) {
      const { data: profs } = await (context.supabase as any)
        .from("profiles")
        .select("id,name,photo_url")
        .in("id", allReceiverIds);
      for (const p of (profs ?? []) as any[]) profiles[p.id] = p;
    }

    const result: BadgeLeaderboard = LEADERBOARD_BADGES.map((badge) => {
      const inner = map.get(badge) ?? new Map();
      const players = Array.from(inner.entries())
        .map(([id, count]) => ({
          id,
          name: profiles[id]?.name ?? "Player",
          photo_url: profiles[id]?.photo_url ?? null,
          count,
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 10);
      return { badge, players };
    });

    return result;
  });
