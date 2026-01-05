// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import GameCard from '@/components/GameCard';
import WeekSelector from '@/components/WeekSelector';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(18); // Default to current week
  const [sortBy, setSortBy] = useState<'date' | 'spread'>('date');

  useEffect(() => {
    fetchGames();
  }, [currentWeek]);

  async function fetchGames() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/games?season=2025&week=${currentWeek}`
      );
      const data = await response.json();
      setGames(data.data || []);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
    }
  }

  // Sort games
  const sortedGames = [...games].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(a.game_date).getTime() - new Date(b.game_date).getTime();
    } else {
      // Sort by spread (games with biggest spreads first)
      const aSpread = a.odds?.find((o: any) => o.market_type === 'spreads');
      const bSpread = b.odds?.find((o: any) => o.market_type === 'spreads');
      const aValue = Math.abs(aSpread?.home_point || 0);
      const bValue = Math.abs(bSpread?.home_point || 0);
      return bValue - aValue;
    }
  });

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">NFL Betting Analytics</h1>
          <p className="text-blue-100">
            Data-driven insights for smarter betting decisions
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Week Selector */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Select Week
          </h2>
          <WeekSelector 
            currentWeek={currentWeek} 
            onWeekChange={setCurrentWeek}
          />
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">{games.length}</span> games
          </div>
          
          <div className="flex gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 mr-2">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'spread')}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm text-gray-900 dark:text-white"
            >
              <option value="date">Game Time</option>
              <option value="spread">Spread Size</option>
            </select>
          </div>
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading games...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No games found for Week {currentWeek}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}