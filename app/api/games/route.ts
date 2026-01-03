import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');
    const season = searchParams.get('season');
    const teamId = searchParams.get('team_id');

    // Start building the query
    let query = supabase
      .from('games')
      .select(`
        *,
        home_team:teams!home_team_id (
          id, name, abbreviation, logo_url
        ),
        away_team:teams!away_team_id (
          id, name, abbreviation, logo_url
        ),
        odds:odds (
          bookmaker, home_odds, away_odds, home_point
        )
      `)
      .order('game_date', { ascending: true });

    // Apply filters if parameters exist
    if (season) query = query.eq('season', parseInt(season));
    if (week) query = query.eq('week', parseInt(week));
    
    // Filter by specific team (either home or away)
    if (teamId) {
      query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}