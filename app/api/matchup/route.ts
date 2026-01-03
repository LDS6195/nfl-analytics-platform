// app/api/matchup/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import {
  calculateTeamStats,
  calculateTeamSplits,
  identifyMismatches,
  generateKeyFactors,
} from '@/lib/stats-calculator';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('game_id');
    const homeTeamId = searchParams.get('home_team');
    const awayTeamId = searchParams.get('away_team');

    if (!gameId && (!homeTeamId || !awayTeamId)) {
      return NextResponse.json(
        { error: 'Must provide either game_id or both home_team and away_team' },
        { status: 400 }
      );
    }

    let homeTeam, awayTeam, targetGame;

    // If game_id provided, fetch that game
    if (gameId) {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          home_team:teams!home_team_id (*),
          away_team:teams!away_team_id (*)
        `)
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      homeTeam = game.home_team;
      awayTeam = game.away_team;
      targetGame = game;
    } else {
      // Fetch teams separately
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', [homeTeamId, awayTeamId]);

      if (teamsError || !teams || teams.length !== 2) {
        return NextResponse.json({ error: 'Teams not found' }, { status: 404 });
      }

      homeTeam = teams.find(t => t.id === homeTeamId);
      awayTeam = teams.find(t => t.id === awayTeamId);
    }

    // Fetch all games for the season to calculate stats
    const { data: allGames, error: gamesError } = await supabase
      .from('games')
      .select('*')
      .eq('season', 2025)
      .order('week', { ascending: true });

    if (gamesError) {
      return NextResponse.json(
        { error: 'Failed to fetch games' },
        { status: 500 }
      );
    }

    // Calculate current week (highest week with completed games)
    const currentWeek = Math.max(
      ...allGames
        .filter((g: any) => g.status === 'post')
        .map((g: any) => g.week),
      1
    );

    // Calculate team statistics
    const homeStats = calculateTeamStats(allGames, homeTeam.id, currentWeek);
    const awayStats = calculateTeamStats(allGames, awayTeam.id, currentWeek);

    // Calculate home/away splits
    const homeSplits = calculateTeamSplits(allGames, homeTeam.id, 'home');
    const awaySplits = calculateTeamSplits(allGames, awayTeam.id, 'away');

    // Identify mismatches
    const mismatches = identifyMismatches(homeTeam, awayTeam, homeStats, awayStats);

    // Generate key factors
    const keyFactors = generateKeyFactors(
      homeTeam,
      awayTeam,
      homeStats,
      awayStats,
      homeSplits,
      awaySplits
    );

    // Fetch odds if this is for a specific game
    let odds = null;
    if (gameId) {
      const { data: oddsData } = await supabase
        .from('odds')
        .select('*')
        .eq('game_id', gameId)
        .order('timestamp', { ascending: false })
        .limit(30); // Get recent odds from multiple bookmakers

      odds = oddsData;
    }

    return NextResponse.json({
      game: targetGame || null,
      home_team: {
        info: homeTeam,
        stats: homeStats,
        home_splits: homeSplits,
      },
      away_team: {
        info: awayTeam,
        stats: awayStats,
        away_splits: awaySplits,
      },
      analysis: {
        mismatches,
        key_factors: keyFactors,
      },
      odds,
    });

  } catch (error: any) {
    console.error('Matchup analysis failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}