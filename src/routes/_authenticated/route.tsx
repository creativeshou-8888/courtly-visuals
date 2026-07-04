import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
  useLocation,
  Navigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/hooks/use-current-profile";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { userId: data.user.id };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const router = useRouter();
  const location = useLocation();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useCurrentProfile();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        qc.clear();
        router.navigate({ to: "/auth", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, qc]);


  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  // If profile exists but onboarding not done, force onboarding
  const onOnboarding = location.pathname.startsWith("/onboarding");
  if (profile && !profile.onboarded && !onOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  if (profile && profile.onboarded && onOnboarding) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
