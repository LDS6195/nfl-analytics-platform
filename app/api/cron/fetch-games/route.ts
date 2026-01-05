import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

// Prevent caching for this route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Check if a specific week was requested
    const { searchParams } = new URL(request.url);
    const requestedWeek = searchParams.get('week');
    
    let url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
    
    // If week specified, add it to the URL
    if (requestedWeek) {
      url += `?dates=2025&seasontype=2&week=${requestedWeek}`;
    }
    
    console.log('Fetching from ESPN:', url);
    
    // 1. Fetch data from ESPN NFL Scoreboard
    const response = await fetch(url);
    
    console.log('ESPN API Response Status:', response.status);
    
    if (!response.ok) {
      throw new Error(`ESPN API responded with ${response.status}`);
    }

    const data = await response.json();
    console.log('ESPN Data received, events count:', data.events?.length);
    
    const events = data.events || [];
    const seasonYear = 2025; // Force 2025 season
    const weekNumber = requestedWeek ? parseInt(requestedWeek) : (data.week?.number || 18);

    let gamesProcessed = 0;
    let teamsProcessed = 0;

    // 2. Process each game event
    for (const event of events) {
      const competition = event.competitions[0];
      const competitors = competition.competitors;

      const homeComp = competitors.find((c: any) => c.homeAway === 'home');
      const awayComp = competitors.find((c: any) => c.homeAway === 'away');

      // Helper to process/upsert team
      const upsertTeam = async (comp: any) => {
        const teamData = {
          external_id: comp.team.id,
          name: comp.team.displayName,
          abbreviation: comp.team.abbreviation,
          logo_url: comp.team.logo || '',
        };

        const { data: team, error } = await supabaseAdmin
          .from('teams')
          .upsert(teamData, { onConflict: 'external_id' })
          .select()
          .single();

        if (error) throw error;
        teamsProcessed++;
        return team.id;
      };

      const homeTeamId = await upsertTeam(homeComp);
      const awayTeamId = await upsertTeam(awayComp);

      // 3. Upsert Game
      const gameData = {
        external_id: event.id,
        season: seasonYear,
        week: weekNumber,
        game_date: event.date,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: parseInt(homeComp.score) || 0,
        away_score: parseInt(awayComp.score) || 0,
        status: event.status.type.state,
        venue: competition.venue?.fullName || 'Unknown',
        updated_at: new Date().toISOString()
      };

      const { error: gameError } = await supabaseAdmin
        .from('games')
        .upsert(gameData, { onConflict: 'external_id' });

      if (gameError) {
        console.error('Error upserting game:', gameError);
        continue; 
      }
      gamesProcessed++;
    }

    return NextResponse.json({
      message: 'Sync complete',
      stats: {
        season: seasonYear,
        week: weekNumber,
        games_processed: gamesProcessed,
        teams_processed: teamsProcessed
      }
    });

  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message }, 
      { status: 500 }
    );
  }
}