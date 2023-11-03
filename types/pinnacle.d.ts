export interface BetData {
  cutoffAt: string;
  isAlternate: boolean;
  key: string;
  limits: Limit[];
  matchupId: number;
  period: number;
  prices: Price[];
  status: string;
  type: string;
  version: number;
}

export interface Limit {
  amount: number;
  type: string;
}

export interface Price {
  designation: string;
  points: number;
  price: number;
}

export interface Match {
  ageLimit: number;
  altTeaser: boolean;
  bestOfX: number;
  external: {};
  featureOrder: number;
  hasAltSpread: boolean;
  hasAltTotal: boolean;
  hasLive: boolean;
  hasMarkets: boolean;
  id: number;
  isBetshareEnabled: boolean;
  isFeatured: boolean;
  isHighlighted: boolean;
  isLive: boolean;
  isPromoted: boolean;
  league: League;
  liveMode: null | string;
  parent: null;
  parentId: null;
  parlayRestriction: "unique_matchups";
  participants: Participant[];
  periods: Period[];
  rotation: number;
  startTime: string;
  state: {};
  status: "started";
  totalMarketCount: number;
  type: "matchup";
  units: "Regular";
  version: number;
  videoFeeds: string[];
}

interface League {
  ageLimit: number;
  external: {};
  featureOrder: number;
  group: string;
  id: number;
  isFeatured: boolean;
  isHidden: boolean;
  isPromoted: boolean;
  isSticky: boolean;
  matchupCount: number;
  matchupCountSE: number;
  name: string;
  sequence: number;
  sport: Sport;
}

interface Sport {
  featureOrder: number;
  id: number;
  isFeatured: boolean;
  isHidden: boolean;
  isSticky: boolean;
  matchupCount: number;
  matchupCountSE: number;
  name: string;
  primaryMarketType: "moneyline";
}

interface Participant {
  alignment: "home" | "away";
  name: string;
  order: number;
  stats: PeriodStats[];
}

interface PeriodStats {
  period: number;
}

interface Period {
  cutoffAt: string;
  hasMoneyline: boolean;
  hasSpread: boolean;
  hasTeamTotal: boolean;
  hasTotal: boolean;
  period: number;
  status: "open";
}
