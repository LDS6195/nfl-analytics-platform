import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface EPAStat {
  team_abbr: string;
  situation: string;
  plays: number;
  epa_per_play: number;
  success_rate: number;
}

interface EPAAdvantage {
  situation: string;
  advantage: 'home' | 'away' | 'neutral';
  home_epa: number;
  away_epa: number;
  epa_diff: number;
  strength: 'significant' | 'moderate' | 'slight';
  description: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('game_id');

    if (!gameId) {
      return NextResponse.json({ error: 'game_id required' }, { status: 400 });
    }

    // Get game details
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!home_team_id (abbreviation),
        away_team:teams!away_team_id (abbreviation)
      `)
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const homeTeamAbbr = game.home_team.abbreviation;
    const awayTeamAbbr = game.away_team.abbreviation;

    // Fetch EPA stats for both teams
    const { data: homeStats, error: homeError } = await supabase
      .from('team_epa_stats')
      .select('*')
      .eq('team_abbr', homeTeamAbbr)
      .eq('season', 2024);

    const { data: awayStats, error: awayError } = await supabase
      .from('team_epa_stats')
      .select('*')
      .eq('team_abbr', awayTeamAbbr)
      .eq('season', 2024);

    if (homeError || awayError) {
      return NextResponse.json({ error: 'Failed to fetch EPA stats' }, { status: 500 });
    }

    // Convert to maps for easy lookup
    const homeStatsMap = new Map<string, EPAStat>();
    homeStats?.forEach(stat => homeStatsMap.set(stat.situation, stat));

    const awayStatsMap = new Map<string, EPAStat>();
    awayStats?.forEach(stat => awayStatsMap.set(stat.situation, stat));

    // Compare situations and find advantages
    const advantages: EPAAdvantage[] = [];

    const situations = [
      'overall',
      'third_down_short',
      'third_down_long',
      'red_zone',
      'passing',
      'rushing',
      'first_quarter',
      'fourth_quarter',
      'trailing',
      'leading'
    ];

    for (const situation of situations) {
      const homeStat = homeStatsMap.get(situation);
      const awayStat = awayStatsMap.get(situation);

      if (!homeStat || !awayStat) continue;

      const epaDiff = homeStat.epa_per_play - awayStat.epa_per_play;
      const absEpaDiff = Math.abs(epaDiff);

      let strength: 'significant' | 'moderate' | 'slight';
      if (absEpaDiff >= 0.15) strength = 'significant';
      else if (absEpaDiff >= 0.08) strength = 'moderate';
      else strength = 'slight';

      // Only include moderate or significant advantages
      if (absEpaDiff >= 0.08) {
        advantages.push({
          situation: formatSituation(situation),
          advantage: epaDiff > 0 ? 'home' : 'away',
          home_epa: homeStat.epa_per_play,
          away_epa: awayStat.epa_per_play,
          epa_diff: epaDiff,
          strength,
          description: generateDescription(
            situation,
            homeTeamAbbr,
            awayTeamAbbr,
            homeStat.epa_per_play,
            awayStat.epa_per_play,
            epaDiff
          ),
        });
      }
    }

    // Sort by absolute EPA difference (biggest advantages first)
    advantages.sort((a, b) => Math.abs(b.epa_diff) - Math.abs(a.epa_diff));

    return NextResponse.json({
      game_id: gameId,
      home_team: homeTeamAbbr,
      away_team: awayTeamAbbr,
      advantages,
      home_stats: Object.fromEntries(homeStatsMap),
      away_stats: Object.fromEntries(awayStatsMap),
    });

  } catch (error: any) {
    console.error('EPA matchup analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

function formatSituation(situation: string): string {
  const formats: Record<string, string> = {
    'overall': 'Overall Offense',
    'third_down_short': 'Third Down (Short)',
    'third_down_long': 'Third Down (Long)',
    'red_zone': 'Red Zone',
    'passing': 'Passing Game',
    'rushing': 'Rushing Game',
    'first_quarter': 'First Quarter',
    'fourth_quarter': 'Fourth Quarter',
    'trailing': 'When Trailing',
    'leading': 'When Leading',
  };
  return formats[situation] || situation;
}

function generateDescription(
  situation: string,
  homeTeam: string,
  awayTeam: string,
  homeEPA: number,
  awayEPA: number,
  epaDiff: number
): string {
  const advantageTeam = epaDiff > 0 ? homeTeam : awayTeam;
  const advantageEPA = Math.abs(epaDiff);
  const situationName = formatSituation(situation);

  return `${advantageTeam} has a ${advantageEPA.toFixed(3)} EPA/play advantage in ${situationName}`;
}
