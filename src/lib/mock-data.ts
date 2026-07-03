export type Player = {
  id: string;
  name: string;
  rating: number;
  provisional?: boolean;
  wins: number;
  losses: number;
  location: string;
  courts: string[];
  availability: string[];
  photo: string;
  bio?: string;
  streak?: number;
  ratingChange?: number;
};

// Deterministic pastel avatar per player via ui-avatars-style SVG data URI
function avatar(name: string, tone: string) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='160' height='160' rx='80' fill='${tone}'/><text x='50%' y='54%' text-anchor='middle' dominant-baseline='middle' font-family='Space Grotesk, sans-serif' font-size='64' font-weight='700' fill='#0b1230'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const tones = ["#d9f56b", "#c7d2fe", "#fecaca", "#fde68a", "#a7f3d0", "#fbcfe8", "#bae6fd", "#fed7aa"];

export const players: Player[] = [
  { id: "p1", name: "Wei Jie Tan", rating: 1842, wins: 34, losses: 12, location: "Tanjong Pagar", courts: ["Farrer Park", "Kallang Tennis Centre"], availability: ["Weekday evenings", "Sat AM"], streak: 4, ratingChange: 18 },
  { id: "p2", name: "Priya Raman", rating: 1798, wins: 41, losses: 19, location: "Bukit Timah", courts: ["SICC", "Burghley"], availability: ["Sun AM", "Weekday AM"] },
  { id: "p3", name: "Marcus Lim", rating: 1765, wins: 28, losses: 14, location: "Bishan", courts: ["Bishan ActiveSG", "Toa Payoh"], availability: ["Weekday evenings"] },
  { id: "p4", name: "Aisha Rahman", rating: 1721, wins: 22, losses: 15, location: "East Coast", courts: ["East Coast Park", "Kallang"], availability: ["Weekends"] },
  { id: "p5", name: "Jia Hui Ng", rating: 1698, wins: 19, losses: 11, location: "Clementi", courts: ["Clementi Sports Hall", "NUS"], availability: ["Sat PM", "Sun AM"] },
  { id: "p6", name: "Rafael Sim", rating: 1654, wins: 25, losses: 18, location: "Serangoon", courts: ["Serangoon Gardens", "Hougang"], availability: ["Weekday evenings"] },
  { id: "p7", name: "Nadia Koh", rating: 1621, wins: 17, losses: 13, location: "Holland Village", courts: ["Holland Drive", "SICC"], availability: ["Sun PM"] },
  { id: "p8", name: "Daniel Ong", rating: 1602, wins: 14, losses: 12, location: "Punggol", courts: ["Punggol ActiveSG"], availability: ["Sat AM"], provisional: true },
  { id: "p9", name: "Shirin Lau", rating: 1587, wins: 12, losses: 9, location: "Novena", courts: ["Farrer Park", "Novena"], availability: ["Weekday AM"] },
  { id: "p10", name: "Kenji Yamada", rating: 1560, wins: 11, losses: 10, location: "Tiong Bahru", courts: ["Delta Sports", "Tanjong Pagar CC"], availability: ["Weekends"] },
  { id: "p11", name: "Amirah Ismail", rating: 1524, wins: 9, losses: 8, location: "Woodlands", courts: ["Woodlands ActiveSG"], availability: ["Sun AM"], provisional: true },
  { id: "p12", name: "Bryan Teo", rating: 1489, wins: 7, losses: 11, location: "Jurong East", courts: ["Jurong East ActiveSG"], availability: ["Weekday evenings"] },
].map((p, i) => ({ ...p, photo: avatar(p.name, tones[i % tones.length]) }));

export const currentUser: Player = {
  id: "me",
  name: "You (Alex Chen)",
  rating: 1673,
  wins: 16,
  losses: 12,
  location: "Queenstown",
  courts: ["Farrer Park", "Delta Sports"],
  availability: ["Weekday evenings", "Sat AM"],
  photo: avatar("Alex Chen", "#d9f56b"),
  ratingChange: 12,
};

export const pendingConfirmation = {
  opponent: players[3],
  score: "6-4, 4-6, 7-5",
  ratingDelta: +14,
  playedAt: "Yesterday · Kallang Tennis Centre",
};

export const upcomingMatches = [
  { id: "m1", opponent: players[1], when: "Sat, 12 Oct · 8:00 AM", court: "Farrer Park Court 3" },
  { id: "m2", opponent: players[5], when: "Tue, 15 Oct · 7:30 PM", court: "Delta Sports Hall" },
];

export const openInvites = [
  { id: "i1", from: players[4], level: "Rated 1650–1720", when: "This Sunday AM", court: "Clementi Sports Hall" },
  { id: "i2", from: players[6], level: "Rated 1600–1680", when: "Fri evening", court: "Holland Drive" },
];

export const recentResults = [
  { id: "r1", a: players[0], b: players[2], score: "6-3, 6-4", when: "2h ago" },
  { id: "r2", a: players[3], b: players[7], score: "7-6, 6-2", when: "5h ago" },
  { id: "r3", a: players[1], b: players[9], score: "6-2, 3-6, 10-8", when: "Yesterday" },
];

export const lastFiveResults = [
  { id: "l1", opponent: "Priya Raman", result: "W", score: "6-4, 6-3", delta: +18 },
  { id: "l2", opponent: "Marcus Lim", result: "L", score: "4-6, 6-7", delta: -12 },
  { id: "l3", opponent: "Nadia Koh", result: "W", score: "6-2, 6-4", delta: +9 },
  { id: "l4", opponent: "Rafael Sim", result: "W", score: "7-5, 6-4", delta: +11 },
  { id: "l5", opponent: "Jia Hui Ng", result: "L", score: "5-7, 4-6", delta: -14 },
];
