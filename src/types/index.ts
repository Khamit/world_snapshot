// world_snapshot/src/types/index.ts
export type Category = "science" | "military" | "disasters" | "politics" | "popular" | "economy" | "health";

export interface NewsEvent {
  id: string;
  category: Category;
  title: string;
  detail?: string;
  intensity?: number;
  sentimentScore?: number;
  url?: string;
  source?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;        // ← добавим для отслеживания обновлений
  country?: string | null;   // ← страна, если привязана
  source_type?: 'api' | 'admin'; // ← тип источника
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
  globalEvents: NewsEvent[];
  globalMetrics: GlobalMetrics;
  adminEvents?: NewsEvent[];
  lightningBrief?: LightningBrief;
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