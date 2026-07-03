import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const levelSchema = z.union([
  z.literal(2.5),
  z.literal(3.0),
  z.literal(3.5),
  z.literal(4.0),
  z.literal(4.5),
  z.literal(5.0),
]);

const onboardingSchema = z.object({
  name: z.string().trim().min(1).max(80),
  photo_url: z.string().url().max(2048).nullable().optional(),
  level: levelSchema,
  preferred_courts: z.array(z.string().max(80)).max(20).default([]),
  availability: z.array(z.string().max(40)).max(20).default([]),
  phone: z.string().trim().max(30).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  photo_url: z.string().url().max(2048).nullable().optional(),
  preferred_courts: z.array(z.string().max(80)).max(20).optional(),
  availability: z.array(z.string().max(40)).max(20).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase.rpc as any)("get_my_profile").single();
    if (error) throw new Error(error.message);
    return data as {
      id: string;
      name: string;
      email: string;
      photo_url: string | null;
      level: number | null;
      initial_rating: number | null;
      current_rating: number | null;
      provisional: boolean;
      rated_matches: number;
      wins: number;
      losses: number;
      preferred_courts: string[];
      availability: string[];
      phone: string | null;
      bio: string | null;
      onboarded: boolean;
      created_at: string;
    } | null;
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => onboardingSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase.rpc as any)("complete_onboarding", {
      _name: data.name,
      _photo_url: data.photo_url ?? null,
      _level: data.level,
      _preferred_courts: data.preferred_courts,
      _availability: data.availability,
      _phone: data.phone ?? null,
      _bio: data.bio ?? null,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("profiles")
      .update(data as never)
      .eq("id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

