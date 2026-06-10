export interface PlatformResult {
  platform: string;
  found: boolean;
  url: string;
  username?: string;
  bio?: string;
  location?: string;
  posts?: Array<{
    title?: string;
    name?: string;
    url?: string;
    score?: number;
    stars?: number;
    reactions?: number;
    subreddit?: string;
  }>;
  followers?: number;
  following?: number;
  [key: string]: any;
}

export interface RiskScore {
  total: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';
  factors: Array<{
    name: string;
    score: number;
    max: number;
    details: string;
  }>;
}

export interface AliasEntry {
  alias: string;
  score: number;
  match_type: string;
}

export interface ShadowAccount {
  platform: string;
  username: string;
  url: string;
  similarity_score: number;
  variant_type: string;
}

export interface BreachData {
  found: boolean;
  breach_count?: number;
  pastes_count?: number;
  breaches?: Array<{
    name: string;
    domain: string;
    date: string;
    description: string;
    data_classes: string[];
  }>;
}

export interface PasteResult {
  title: string;
  url: string;
  date: string;
  snippet: string;
}

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  elapsed_seconds: number;
  platforms_found: number;
  platforms_checked: number;
  risk_score: RiskScore;
  platforms: PlatformResult[];
  alias_map: Record<string, AliasEntry[]>;
  shadow_accounts: ShadowAccount[];
  geo_mentions: Array<{
    platform: string;
    location: string;
  }>;
  timeline: Array<{
    platform: string;
    title: string;
    url: string;
    score: number;
    subreddit?: string;
  }>;
  breach_data: BreachData | null;
  paste_results: PasteResult[];
  news_articles: NewsArticle[];
  timestamp: string;
  wikidata?: {
    found: boolean;
    wikidata_id?: string;
    label?: string;
    description?: string;
    aliases?: string[];
    date_of_birth?: string;
    nationality?: string;
    occupation?: string[];
    social_ids?: Record<string, string>;
  };
}

export interface PhoneResult {
  phone: string;
  valid: boolean;
  carrier?: string;
  location?: string;
  line_type?: string;
  country?: string;
  truecaller_name?: string;
  truecaller_email?: string;
  leak_count?: number;
  leaks?: any[];
  raw_truecaller?: any;
  error?: string;
  nccrp_check_url?: string;
  nccrp_note?: string;
  tafcop_check_url?: string;
  tafcop_note?: string;
}

export interface OfficerProfile {
  name: string;
  badge: string;
  station: string;
  saved: boolean;
}
