// lib/stats-calculator.ts

export interface TeamSeasonStats {
  team_id: string;
  season: number;
  week: number;
  
  // Games played
  games_played: number;
  wins: number;
  losses: number;
  ties: number;
  
  // Offensive stats
  points_scored: number;
  points_per_game: number;
  total_yards: number;
  yards_per_game: number;
  passing_yards: number;
  passing_yards_per_game: number;
  rushing_yards: number;
  rushing_yards_per_game: number;
  
  // Defensive stats
  points_allowed: number;
  points_allowed_per_game: number;
  yards_allowed: number;
  yards_allowed_per_game: number;
  
  // Turnovers
  turnovers_gained: number;
  turnovers_lost: number;
  turnover_differential: number;
}

export interface TeamSplits {
  location: 'home' | 'away';
  games_played: number;
  wins: number;
  losses: number;
  win_percentage: number;
  points_per_game: number;
  points_allowed_per_game: number;
}

export interface MatchupMismatch {
  category: string;
  advantage: 'home' | 'away' | 'neutral';
  strength: 'significant' | 'moderate' | 'slight';
  description: string;
  home_value: number | string;
  away_value: number | string;
}

/**
 * Calculate season statistics for a team based on completed games
 */
export function calculateTeamStats(games: any[], teamId: string, currentWeek: number): TeamSeasonStats {
  const teamGames = games.filter(game => 
    (game.home_team_id === teamId || game.away_team_id === teamId) &&
    game.status === 'post' &&
    game.week <= currentWeek
  );

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let pointsScored = 0;
  let pointsAllowed = 0;
  let totalYards = 0;
  let yardsAllowed = 0;
  let turnoversGained = 0;
  let turnoversLost = 0;

  for (const game of teamGames) {
    const isHome = game.home_team_id === teamId;
    const teamScore = isHome ? game.home_score : game.away_score;
    const oppScore = isHome ? game.away_score : game.home_score;

    pointsScored += teamScore;
    pointsAllowed += oppScore;

    if (teamScore > oppScore) wins++;
    else if (teamScore < oppScore) losses++;
    else ties++;

    // Get team stats for this game if available
    const teamStats = game.team_stats?.find((s: any) => s.team_id === teamId);
    const oppStats = game.team_stats?.find((s: any) => s.team_id !== teamId);

    if (teamStats) {
      totalYards += teamStats.total_yards || 0;
      turnoversLost += teamStats.turnovers || 0;
    }

    if (oppStats) {
      yardsAllowed += oppStats.total_yards || 0;
      turnoversGained += oppStats.turnovers || 0;
    }
  }

  const gamesPlayed = teamGames.length;

  return {
    team_id: teamId,
    season: 2025,
    week: currentWeek,
    games_played: gamesPlayed,
    wins,
    losses,
    ties,
    points_scored: pointsScored,
    points_per_game: gamesPlayed > 0 ? pointsScored / gamesPlayed : 0,
    total_yards: totalYards,
    yards_per_game: gamesPlayed > 0 ? totalYards / gamesPlayed : 0,
    passing_yards: 0, // Would need more detailed stats
    passing_yards_per_game: 0,
    rushing_yards: 0,
    rushing_yards_per_game: 0,
    points_allowed: pointsAllowed,
    points_allowed_per_game: gamesPlayed > 0 ? pointsAllowed / gamesPlayed : 0,
    yards_allowed: yardsAllowed,
    yards_allowed_per_game: gamesPlayed > 0 ? yardsAllowed / gamesPlayed : 0,
    turnovers_gained: turnoversGained,
    turnovers_lost: turnoversLost,
    turnover_differential: turnoversGained - turnoversLost,
  };
}

/**
 * Calculate home/away splits for a team
 */
export function calculateTeamSplits(games: any[], teamId: string, location: 'home' | 'away'): TeamSplits {
  const relevantGames = games.filter(game => {
    if (location === 'home') {
      return game.home_team_id === teamId && game.status === 'post';
    } else {
      return game.away_team_id === teamId && game.status === 'post';
    }
  });

  let wins = 0;
  let pointsScored = 0;
  let pointsAllowed = 0;

  for (const game of relevantGames) {
    const isHome = location === 'home';
    const teamScore = isHome ? game.home_score : game.away_score;
    const oppScore = isHome ? game.away_score : game.home_score;

    pointsScored += teamScore;
    pointsAllowed += oppScore;

    if (teamScore > oppScore) wins++;
  }

  const gamesPlayed = relevantGames.length;

  return {
    location,
    games_played: gamesPlayed,
    wins,
    losses: gamesPlayed - wins,
    win_percentage: gamesPlayed > 0 ? wins / gamesPlayed : 0,
    points_per_game: gamesPlayed > 0 ? pointsScored / gamesPlayed : 0,
    points_allowed_per_game: gamesPlayed > 0 ? pointsAllowed / gamesPlayed : 0,
  };
}

/**
 * Compare two teams and identify mismatches
 */
export function identifyMismatches(
  homeTeam: any,
  awayTeam: any,
  homeStats: TeamSeasonStats,
  awayStats: TeamSeasonStats
): MatchupMismatch[] {
  const mismatches: MatchupMismatch[] = [];

  // Points per game differential
  const ppgDiff = Math.abs(homeStats.points_per_game - awayStats.points_per_game);
  if (ppgDiff > 7) {
    mismatches.push({
      category: 'Offensive Output',
      advantage: homeStats.points_per_game > awayStats.points_per_game ? 'home' : 'away',
      strength: ppgDiff > 10 ? 'significant' : 'moderate',
      description: `${homeStats.points_per_game > awayStats.points_per_game ? homeTeam.name : awayTeam.name} averages ${ppgDiff.toFixed(1)} more points per game`,
      home_value: homeStats.points_per_game.toFixed(1),
      away_value: awayStats.points_per_game.toFixed(1),
    });
  }

  // Defensive comparison
  const defDiff = Math.abs(homeStats.points_allowed_per_game - awayStats.points_allowed_per_game);
  if (defDiff > 5) {
    mismatches.push({
      category: 'Defensive Strength',
      advantage: homeStats.points_allowed_per_game < awayStats.points_allowed_per_game ? 'home' : 'away',
      strength: defDiff > 8 ? 'significant' : 'moderate',
      description: `${homeStats.points_allowed_per_game < awayStats.points_allowed_per_game ? homeTeam.name : awayTeam.name} allows ${defDiff.toFixed(1)} fewer points per game`,
      home_value: homeStats.points_allowed_per_game.toFixed(1),
      away_value: awayStats.points_allowed_per_game.toFixed(1),
    });
  }

  // Turnover differential
  const tovDiff = Math.abs(homeStats.turnover_differential - awayStats.turnover_differential);
  if (tovDiff > 5) {
    mismatches.push({
      category: 'Turnover Battle',
      advantage: homeStats.turnover_differential > awayStats.turnover_differential ? 'home' : 'away',
      strength: tovDiff > 8 ? 'significant' : 'moderate',
      description: `${homeStats.turnover_differential > awayStats.turnover_differential ? homeTeam.name : awayTeam.name} has a +${tovDiff} advantage in turnover differential`,
      home_value: homeStats.turnover_differential > 0 ? `+${homeStats.turnover_differential}` : homeStats.turnover_differential.toString(),
      away_value: awayStats.turnover_differential > 0 ? `+${awayStats.turnover_differential}` : awayStats.turnover_differential.toString(),
    });
  }

  // Yards per game
  const yardsDiff = Math.abs(homeStats.yards_per_game - awayStats.yards_per_game);
  if (yardsDiff > 50) {
    mismatches.push({
      category: 'Total Offense',
      advantage: homeStats.yards_per_game > awayStats.yards_per_game ? 'home' : 'away',
      strength: yardsDiff > 80 ? 'significant' : 'moderate',
      description: `${homeStats.yards_per_game > awayStats.yards_per_game ? homeTeam.name : awayTeam.name} averages ${yardsDiff.toFixed(0)} more yards per game`,
      home_value: homeStats.yards_per_game.toFixed(0),
      away_value: awayStats.yards_per_game.toFixed(0),
    });
  }

  return mismatches;
}

/**
 * Generate key factors for a matchup
 */
export function generateKeyFactors(
  homeTeam: any,
  awayTeam: any,
  homeStats: TeamSeasonStats,
  awayStats: TeamSeasonStats,
  homeSplits: TeamSplits,
  awaySplits: TeamSplits
): string[] {
  const factors: string[] = [];

  // Home field advantage
  if (homeSplits.win_percentage > 0.65) {
    factors.push(`${homeTeam.name} is strong at home (${homeSplits.wins}-${homeSplits.losses})`);
  }

  // Road struggles
  if (awaySplits.win_percentage < 0.35) {
    factors.push(`${awayTeam.name} struggles on the road (${awaySplits.wins}-${awaySplits.losses})`);
  }

  // Recent form (if we had last 3 games data)
  // This would require tracking game history

  // Record comparison
  const homeWinPct = homeStats.wins / homeStats.games_played;
  const awayWinPct = awayStats.wins / awayStats.games_played;
  
  if (Math.abs(homeWinPct - awayWinPct) > 0.3) {
    const betterTeam = homeWinPct > awayWinPct ? homeTeam : awayTeam;
    factors.push(`${betterTeam.name} has a significantly better record this season`);
  }

  return factors;
}