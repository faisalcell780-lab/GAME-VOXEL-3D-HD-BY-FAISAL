import type { GameStats } from "./engine";

export interface Quest {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: string;
  accent: string;
  icon: string;
  value: (stats: GameStats) => number;
}

export const QUESTS: Quest[] = [
  {
    id: "first-steps",
    title: "Langkah Pertama",
    description: "Jelajahi 100 blok di lembah",
    target: 100,
    reward: "250 XP",
    accent: "#a7eb76",
    icon: "footprints",
    value: (s) => s.distance,
  },
  {
    id: "miner",
    title: "Penambang Muda",
    description: "Tambang 15 blok",
    target: 15,
    reward: "400 XP",
    accent: "#eccb83",
    icon: "pickaxe",
    value: (s) => s.mined,
  },
  {
    id: "builder",
    title: "Arsitek Lembah",
    description: "Pasang 25 blok bangunan",
    target: 25,
    reward: "500 XP",
    accent: "#7fd6b0",
    icon: "hammer",
    value: (s) => s.placed,
  },
  {
    id: "climber",
    title: "Penakluk Puncak",
    description: "Capai ketinggian Y 24",
    target: 24,
    reward: "750 XP",
    accent: "#bcd6ff",
    icon: "mountain",
    value: (s) => s.peak,
  },
  {
    id: "night-owl",
    title: "Malam Pertama",
    description: "Saksikan malam di dunia",
    target: 1,
    reward: "300 XP",
    accent: "#c4b5fd",
    icon: "moon",
    value: (s) => s.nights,
  },
  {
    id: "voyager",
    title: "Penjelajah Sejati",
    description: "Tempuh 1.000 blok perjalanan",
    target: 1000,
    reward: "1.200 XP",
    accent: "#f8b4a0",
    icon: "compass",
    value: (s) => s.distance,
  },
];

export function questProgress(quest: Quest, stats: GameStats): number {
  return Math.max(0, Math.min(quest.target, quest.value(stats)));
}
