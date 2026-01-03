// lib/odds-api.ts

export interface OddsAPIGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface Market {
  key: string; // 'h2h', 'spreads', 'totals'
  last_update: string;
  outcomes: Outcome[];
}

export interface Outcome {
  name: string;
  price: number; // American odds format (e.g., -110, +150)
  point?: number; // For spreads and totals
}

export interface NormalizedOdds {
  game_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmaker: string;
  market_type: string;
  home_odds: number | null;
  away_odds: number | null;
  home_point: number | null;
  away_point: number | null;
}

/**
 * Fetches NFL odds from The Odds API
 */
export async function fetchNFLOdds(): Promise<OddsAPIGame[]> {
  const apiKey = process.env.ODDS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ODDS_API_KEY is not set in environment variables');
  }

  const url = new URL('https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds');
  url.searchParams.append('apiKey', apiKey);
  url.searchParams.append('regions', 'us');
  url.searchParams.append('markets', 'h2h,spreads,totals');
  url.searchParams.append('oddsFormat', 'american');

  console.log('Fetching odds from The Odds API...');

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`The Odds API error (${response.status}): ${errorText}`);
  }

  // Check remaining requests in headers
  const remainingRequests = response.headers.get('x-requests-remaining');
  const usedRequests = response.headers.get('x-requests-used');
  console.log(`Odds API - Requests used: ${usedRequests}, Remaining: ${remainingRequests}`);

  const data: OddsAPIGame[] = await response.json();
  console.log(`Fetched odds for ${data.length} games`);

  return data;
}

/**
 * Normalizes odds data from The Odds API into a flat structure for database storage
 */
export function normalizeOddsData(games: OddsAPIGame[]): NormalizedOdds[] {
  const normalized: NormalizedOdds[] = [];

  for (const game of games) {
    for (const bookmaker of game.bookmakers) {
      for (const market of bookmaker.markets) {
        const oddsRecord: NormalizedOdds = {
          game_id: game.id,
          home_team: game.home_team,
          away_team: game.away_team,
          commence_time: game.commence_time,
          bookmaker: bookmaker.key,
          market_type: market.key,
          home_odds: null,
          away_odds: null,
          home_point: null,
          away_point: null,
        };

        // Process outcomes based on market type
        if (market.key === 'h2h') {
          // Moneyline
          const homeOutcome = market.outcomes.find(o => o.name === game.home_team);
          const awayOutcome = market.outcomes.find(o => o.name === game.away_team);
          
          oddsRecord.home_odds = homeOutcome?.price || null;
          oddsRecord.away_odds = awayOutcome?.price || null;
        } 
        else if (market.key === 'spreads') {
          // Spreads
          const homeOutcome = market.outcomes.find(o => o.name === game.home_team);
          const awayOutcome = market.outcomes.find(o => o.name === game.away_team);
          
          oddsRecord.home_odds = homeOutcome?.price || null;
          oddsRecord.away_odds = awayOutcome?.price || null;
          oddsRecord.home_point = homeOutcome?.point || null;
          oddsRecord.away_point = awayOutcome?.point || null;
        } 
        else if (market.key === 'totals') {
          // Totals (Over/Under)
          const overOutcome = market.outcomes.find(o => o.name === 'Over');
          const underOutcome = market.outcomes.find(o => o.name === 'Under');
          
          // Store over in home_odds, under in away_odds
          oddsRecord.home_odds = overOutcome?.price || null;
          oddsRecord.away_odds = underOutcome?.price || null;
          // Store the total line in home_point
          oddsRecord.home_point = overOutcome?.point || null;
        }

        normalized.push(oddsRecord);
      }
    }
  }

  return normalized;
}