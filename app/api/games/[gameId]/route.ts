// app/api/games/[gameId]/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { calculateTeamStats, calculateTeamSplits } from '@/lib/stats-calculator';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

export async function GET(
  request: Request,
  context: RouteParams
) {
  try {
    const { gameId } = await context.params;

    // Fetch the specific game with team details
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!home_team_id (*),
        away_team:teams!away_team_id (*),
        odds:odds (*)
      `)
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      console.error('Game fetch error:', gameError);
      return NextResponse.json({ error: 'Game not found', details: gameError?.message }, { status: 404 });
    }

    // Fetch all games to calculate stats
    const { data: allGames } = await supabase
      .from('games')
      .select('*')
      .eq('season', game.season)
      .lte('week', game.week);

    // Calculate current week
    const currentWeek = game.week;

    // Calculate team stats
    const homeStats = calculateTeamStats(allGames || [], game.home_team.id, currentWeek);
    const awayStats = calculateTeamStats(allGames || [], game.away_team.id, currentWeek);

    // Calculate splits
    const homeSplits = calculateTeamSplits(allGames || [], game.home_team.id, 'home');
    const awaySplits = calculateTeamSplits(allGames || [], game.away_team.id, 'away');

    // Find best odds for each market type
    const bestOdds = {
      spread: findBestOdds(game.odds, 'spreads'),
      moneyline: findBestOdds(game.odds, 'h2h'),
      total: findBestOdds(game.odds, 'totals'),
    };

    return NextResponse.json({
      game: {
        id: game.id,
        date: game.game_date,
        status: game.status,
        venue: game.venue,
        home_score: game.home_score,
        away_score: game.away_score,
      },
      home_team: {
        ...game.home_team,
        stats: homeStats,
        home_record: `${homeSplits.wins}-${homeSplits.losses}`,
      },
      away_team: {
        ...game.away_team,
        stats: awayStats,
        away_record: `${awaySplits.wins}-${awaySplits.losses}`,
      },
      odds: game.odds,
      best_odds: bestOdds,
    });

  } catch (error: any) {
    console.error('Fetch game details failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

function findBestOdds(odds: any[], marketType: string) {
  const relevantOdds = odds.filter((o: any) => o.market_type === marketType);
  
  if (relevantOdds.length === 0) return null;

  // For moneyline and spreads, find best odds for favorite and underdog
  if (marketType === 'h2h' || marketType === 'spreads') {
    // Home team best odds
    const bestHome = relevantOdds.reduce((best, current) => {
      return (current.home_odds > best.home_odds) ? current : best;
    });

    // Away team best odds
    const bestAway = relevantOdds.reduce((best, current) => {
      return (current.away_odds > best.away_odds) ? current : best;
    });

    return {
      home: {
        bookmaker: bestHome.bookmaker,
        odds: bestHome.home_odds,
        point: bestHome.home_point,
      },
      away: {
        bookmaker: bestAway.bookmaker,
        odds: bestAway.away_odds,
        point: bestAway.away_point,
      },
    };
  }

  // For totals, find best over and under
  if (marketType === 'totals') {
    const bestOver = relevantOdds.reduce((best, current) => {
      return (current.home_odds > best.home_odds) ? current : best;
    });

    const bestUnder = relevantOdds.reduce((best, current) => {
      return (current.away_odds > best.away_odds) ? current : best;
    });

    return {
      over: {
        bookmaker: bestOver.bookmaker,
        odds: bestOver.home_odds,
        line: bestOver.home_point,
      },
      under: {
        bookmaker: bestUnder.bookmaker,
        odds: bestUnder.away_odds,
        line: bestOver.home_point,
      },
    };
  }

  return null;
}