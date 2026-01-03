// app/api/cron/fetch-odds/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { fetchNFLOdds, normalizeOddsData } from '@/lib/odds-api';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Fetch odds from The Odds API
    const oddsGames = await fetchNFLOdds();
    
    if (oddsGames.length === 0) {
      return NextResponse.json({
        message: 'No games with odds available',
        stats: { odds_processed: 0 }
      });
    }

    // 2. Normalize the odds data
    const normalizedOdds = normalizeOddsData(oddsGames);
    console.log(`Normalized ${normalizedOdds.length} odds records`);

    // 3. Fetch all teams from database to match names
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, name, abbreviation');

    if (teamsError) {
      throw new Error(`Failed to fetch teams: ${teamsError.message}`);
    }

    // 4. Fetch all games from database to match with odds
    const { data: games, error: gamesError } = await supabaseAdmin
      .from('games')
      .select('id, home_team_id, away_team_id, game_date')
      .gte('game_date', new Date().toISOString()) // Only upcoming games
      .order('game_date', { ascending: true });

    if (gamesError) {
      throw new Error(`Failed to fetch games: ${gamesError.message}`);
    }

    console.log(`Found ${games?.length || 0} upcoming games in database`);

    // 5. Create a mapping of team names to team IDs
    const teamNameToId = new Map<string, string>();
    teams?.forEach(team => {
      teamNameToId.set(team.name.toLowerCase(), team.id);
      teamNameToId.set(team.abbreviation.toLowerCase(), team.id);
    });

    // 6. Process and insert odds
    let oddsInserted = 0;
    let gamesMatched = 0;
    const processedGameIds = new Set<string>();

    for (const oddsRecord of normalizedOdds) {
      // Match the odds game to a database game
      const matchedGame = games?.find(game => {
        // Get team IDs for this game
        const gameHomeTeam = teams?.find(t => t.id === game.home_team_id);
        const gameAwayTeam = teams?.find(t => t.id === game.away_team_id);

        if (!gameHomeTeam || !gameAwayTeam) return false;

        // Check if team names match (case insensitive)
        const homeMatch = gameHomeTeam.name.toLowerCase() === oddsRecord.home_team.toLowerCase();
        const awayMatch = gameAwayTeam.name.toLowerCase() === oddsRecord.away_team.toLowerCase();

        return homeMatch && awayMatch;
      });

      if (!matchedGame) {
        console.log(`Could not match game: ${oddsRecord.away_team} @ ${oddsRecord.home_team}`);
        continue;
      }

      // Track unique games we've matched
      if (!processedGameIds.has(matchedGame.id)) {
        processedGameIds.add(matchedGame.id);
        gamesMatched++;
      }

      // Insert odds record
      const { error: insertError } = await supabaseAdmin
        .from('odds')
        .insert({
          game_id: matchedGame.id,
          bookmaker: oddsRecord.bookmaker,
          market_type: oddsRecord.market_type,
          home_odds: oddsRecord.home_odds,
          away_odds: oddsRecord.away_odds,
          home_point: oddsRecord.home_point,
          away_point: oddsRecord.away_point,
          timestamp: new Date().toISOString()
        });

      if (insertError) {
        console.error(`Error inserting odds for ${oddsRecord.bookmaker}:`, insertError);
        continue;
      }

      oddsInserted++;
    }

    console.log(`Inserted ${oddsInserted} odds records for ${gamesMatched} games`);

    return NextResponse.json({
      message: 'Odds sync complete',
      stats: {
        games_with_odds: oddsGames.length,
        games_matched: gamesMatched,
        odds_records_inserted: oddsInserted
      }
    });

  } catch (error: any) {
    console.error('Fetch odds failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch odds', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}