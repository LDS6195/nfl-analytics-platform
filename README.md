NFL Betting Analytics Platform Setup GuideThis guide covers the database schema for Supabase, the TypeScript interfaces, the database client initialization, and the required Next.js 14 App Router API endpoints.1. Environment SetupCreate a .env.local file in your project root:NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key # Required for Cron jobs (writes)
2. Database Schema (Supabase / PostgreSQL)Run the following SQL in your Supabase SQL Editor to create the required tables and relationships.-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Teams Table
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  external_id text unique not null, -- ID from ESPN/SportRADAR
  name text not null,
  abbreviation text not null,
  conference text,
  division text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Games Table
create table public.games (
  id uuid default uuid_generate_v4() primary key,
  external_id text unique not null,
  season integer not null,
  week integer not null,
  game_date timestamp with time zone not null,
  home_team_id uuid references public.teams(id),
  away_team_id uuid references public.teams(id),
  home_score integer,
  away_score integer,
  status text, -- 'scheduled', 'in_progress', 'completed'
  venue text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Odds Table
create table public.odds (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references public.games(id) on delete cascade,
  bookmaker text not null, -- e.g., 'DraftKings', 'FanDuel'
  market_type text not null, -- 'h2h', 'spread', 'totals'
  home_odds integer, -- American odds (e.g., -110)
  away_odds integer,
  home_point numeric, -- For spread (e.g., -3.5)
  away_point numeric,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Team Stats Table (Aggregated per game)
create table public.team_stats (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references public.games(id) on delete cascade,
  team_id uuid references public.teams(id),
  total_yards integer,
  passing_yards integer,
  rushing_yards integer,
  turnovers integer,
  penalties integer,
  penalty_yards integer,
  time_of_possession text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Team Splits Table (Home/Away tracking)
create table public.team_splits (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id),
  season integer not null,
  split_type text not null, -- 'home', 'away'
  wins integer default 0,
  losses integer default 0,
  ties integer default 0,
  avg_points_scored numeric,
  avg_points_allowed numeric,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, season, split_type)
);

-- Indexes for performance
create index idx_games_season_week on public.games(season, week);
create index idx_odds_game_id on public.odds(game_id);
3. Library & Type Definitionstypes/index.tsDefine your TypeScript interfaces.export interface Team {
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
lib/db.tsSetup the Supabase client. Note: We export a standard client for public reads and an admin client for the cron job.import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for client-side ops or public reads
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side writing (Cron jobs)
// WARNING: Never use this on the client side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
4. API Routes (Next.js App Router)app/api/cron/fetch-games/route.tsThis endpoint fetches data from ESPN and populates the teams and games tables. It uses upsert to handle both new games and updates to live scores.import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

// Prevent caching for this route
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Fetch data from ESPN NFL Scoreboard
    const response = await fetch(
      '[https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard](https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard)'
    );
    
    if (!response.ok) {
      throw new Error(`ESPN API responded with ${response.status}`);
    }

    const data = await response.json();
    const events = data.events || [];
    const seasonYear = data.season.year;
    const weekNumber = data.week.number;

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
          // Conference/Division usually requires a separate API call or mapping 
          // logic, leaving null for now or populating if available in deep object
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
        game_date: event.date, // ISO string from ESPN
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: parseInt(homeComp.score),
        away_score: parseInt(awayComp.score),
        status: event.status.type.state, // 'pre', 'in', 'post'
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
app/api/games/route.tsThis endpoint allows the frontend to fetch games, filtering by week and season.import { NextResponse } from 'next/server';
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
