export const LEVELS = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_TO_RATING: Record<string, number> = {
  "2.5": 800,
  "3.0": 1000,
  "3.5": 1200,
  "4.0": 1400,
  "4.5": 1600,
  "5.0": 1800,
};

export function ratingForLevel(level: number): number {
  return LEVEL_TO_RATING[level.toFixed(1)] ?? 1000;
}

export const LEVEL_DESCRIPTIONS: Record<
  string,
  { headline: string; body: string }
> = {
  "2.5": {
    headline: "Just getting rolling",
    body: "You can rally a few balls back but points are still short. Comfortable with basic serves.",
  },
  "3.0": {
    headline: "Confident beginner",
    body: "You keep rallies going at a moderate pace, direct the ball to one side, and play full matches.",
  },
  "3.5": {
    headline: "Solid social player",
    body: "Consistent groundstrokes, dependable second serve, and you can construct points with intent.",
  },
  "4.0": {
    headline: "Strong club player",
    body: "You hit with pace and spin, cover the court well, and use tactics like approach shots and lobs.",
  },
  "4.5": {
    headline: "Competitive league player",
    body: "You dictate rallies, mix pace and spin, and have a reliable weapon under pressure.",
  },
  "5.0": {
    headline: "Tournament level",
    body: "You play at a high tactical level with well-developed shots, footwork and match-play instincts.",
  },
};

export const COURT_OPTIONS = [
  "Farrer Park",
  "Kallang Tennis Centre",
  "SICC",
  "Burghley",
  "Bishan ActiveSG",
  "Toa Payoh",
  "East Coast Park",
  "Clementi Sports Hall",
  "NUS",
  "Serangoon Gardens",
  "Hougang",
  "Holland Drive",
  "Punggol ActiveSG",
  "Novena",
  "Delta Sports",
  "Tanjong Pagar CC",
  "Woodlands ActiveSG",
  "Jurong East ActiveSG",
];

export const AVAILABILITY_OPTIONS = [
  "Weekday AM",
  "Weekday evenings",
  "Sat AM",
  "Sat PM",
  "Sun AM",
  "Sun PM",
  "Weekends",
];
