export interface Team {
  id: string;
  external_id: string;
  name: string;
  abbreviation: string;
  logo_url: string;
}

export interface Game {
  id: string;
  external_id: string;
  season: number;
  week: number;
  game_date: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  venue: string;
}