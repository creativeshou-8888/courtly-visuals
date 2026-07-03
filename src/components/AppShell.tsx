import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Home, Search, Trophy, User } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/find", label: "Find", icon: Search },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/players/me", label: "Profile", icon: User, matchPath: "/profile" },
] as const;

// Nav uses `to: "/players/me"` legacy alias mapped visually to Profile;
// active check uses matchPath below.

function Logo() {
  return (
    <Link to="/home" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-navy text-court">
        <span className="h-3 w-3 rounded-full bg-court" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-navy">Courtly</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 md:h-16 md:max-w-5xl md:px-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active =
                item.to === "/players/me"
                  ? pathname.startsWith("/players/")
                  : pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-navy text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-navy"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full text-navy transition-colors hover:bg-secondary"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-court ring-2 ring-background" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:max-w-5xl md:px-8 md:pb-12 md:pt-8">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-3xl items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {navItems.map((item) => {
            const active =
              item.to === "/players/me"
                ? pathname.startsWith("/players/")
                : pathname === item.to;
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors ${
                    active ? "text-navy" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
                      active ? "bg-court text-navy" : "bg-transparent"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
