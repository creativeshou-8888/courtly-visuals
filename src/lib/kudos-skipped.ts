const KEY = "courtly.kudos.skipped.v1";

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function write(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function isKudosSkipped(matchId: string): boolean {
  return read().has(matchId);
}

export function markKudosSkipped(matchId: string) {
  const s = read();
  s.add(matchId);
  write(s);
}

export function clearKudosSkipped(matchId: string) {
  const s = read();
  s.delete(matchId);
  write(s);
}

/** Reactive hook returning current skipped set; refreshes when window gains focus. */
import { useEffect, useState } from "react";
export function useSkippedKudos() {
  const [skipped, setSkipped] = useState<Set<string>>(() => read());
  useEffect(() => {
    const onFocus = () => setSkipped(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSkipped(read());
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return {
    skipped,
    skip: (id: string) => {
      markKudosSkipped(id);
      setSkipped(new Set(read()));
    },
    unskip: (id: string) => {
      clearKudosSkipped(id);
      setSkipped(new Set(read()));
    },
  };
}
