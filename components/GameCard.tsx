// components/GameCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

interface GameCardProps {
  game: {
    id: string;
    game_date: string;
    status: string;
    venue: string;
    home_score: number;
    away_score: number;
    home_team: {
      id: string;
      name: string;
      abbreviation: string;
      logo_url: string;
    };
    away_team: {
      id: string;
      name: string;
      abbreviation: string;
      logo_url: string;
    };
    odds: any[];
  };
}

export default function GameCard({ game }: GameCardProps) {
  // Format game date
  const gameDate = new Date(game.game_date);
  const dateStr = gameDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  const timeStr = gameDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });

  // Get best spread and total from odds
  const spreadOdds = game.odds?.find(o => o.market_type === 'spreads');
  const totalOdds = game.odds?.find(o => o.market_type === 'totals');

  return (
    <Link href={`/games/${game.id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 cursor-pointer border border-gray-200 dark:border-gray-700">
        {/* Date/Time Header */}
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {dateStr} • {timeStr}
        </div>

        {/* Teams */}
        <div className="space-y-4">
          {/* Away Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Image 
                src={game.away_team.logo_url} 
                alt={game.away_team.name}
                width={48}
                height={48}
                className="object-contain"
              />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {game.away_team.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {game.away_team.abbreviation}
                </div>
              </div>
            </div>
            {game.status !== 'pre' && (
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {game.away_score}
              </div>
            )}
          </div>

          {/* Home Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Image 
                src={game.home_team.logo_url} 
                alt={game.home_team.name}
                width={48}
                height={48}
                className="object-contain"
              />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {game.home_team.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {game.home_team.abbreviation}
                </div>
              </div>
            </div>
            {game.status !== 'pre' && (
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {game.home_score}
              </div>
            )}
          </div>
        </div>

        {/* Odds (only for pre-game) */}
        {game.status === 'pre' && (spreadOdds || totalOdds) && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {spreadOdds && (
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                    Spread
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {game.home_team.abbreviation} {spreadOdds.home_point > 0 ? '+' : ''}
                    {spreadOdds.home_point}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 text-xs">
                    ({spreadOdds.home_odds > 0 ? '+' : ''}{spreadOdds.home_odds})
                  </div>
                </div>
              )}
              {totalOdds && (
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                    Total
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    O/U {totalOdds.home_point}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 text-xs">
                    ({totalOdds.home_odds > 0 ? '+' : ''}{totalOdds.home_odds})
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View Analysis CTA */}
        <div className="mt-4 text-center">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            View Full Analysis →
          </span>
        </div>
      </div>
    </Link>
  );
}