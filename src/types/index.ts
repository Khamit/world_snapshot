// world_snapshot/src/types/index.ts
export type Category = "science" | "military" | "disasters" | "politics" | "popular" | "economy" | "health";

export interface NewsEvent {  // ← переименовано с Event на NewsEvent
  id: string;
  category: Category;
  title: string;
  detail?: string;
  intensity?: number;
  sentimentScore?: number;
  url?: string;           // ← добавьте недостающие поля
  source?: string;        // ← добавьте недостающие поля
  publishedAt?: string;   // ← добавьте недостающие поля
  createdAt?: string;     // ← для admin событий
}

export interface GlobalMetrics {
  dailyDeaths: number;
  hourlyDeaths?: number;
  minuteDeaths?: number;
  secondDeaths?: number;
  deathsChange: string;
  activeConflicts: number;
  ecoCrises: number;
  politicalInstabilityDelta: string;
  scientificBreakthroughs: number;
  healthCrises?: number;
  economicStress?: number;
}

export interface BriefItem {
  id: string;
  title: string;
  description: string;
  url: string;
  date: string;
  category: string;
}

export interface LightningBrief {
  items: BriefItem[];
  lastUpdated: string;
  source: string;
}

export interface GlobalData {
  globalEvents: NewsEvent[];  // ← изменено
  globalMetrics: GlobalMetrics;
  adminEvents?: NewsEvent[];   // ← изменено
  lightningBrief?: LightningBrief;  // ← уточните тип вместо any
  lastUpdated: string;
}

export type CountryStatus = "war" | "high_tension" | "protests" | "stable" | "eco_crisis";

export interface CountryData {
  id: string;
  name: string;
  status: CountryStatus;
  color: string;
  summary: string;
  military: string;
  politics: string;
  eco: string;
  science: string;
  deaths_estimate: string;
  events?: string[];
}