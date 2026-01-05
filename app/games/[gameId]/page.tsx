// app/games/[gameId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import EPAMatchupAnalysis from '@/components/EPAMatchupAnalysis';

interface PageProps {
  params: Promise<{ gameId: string }>;
}

export default function GameDetailPage({ params }: PageProps) {
  const { gameId } = use(params);
  const [gameData, setGameData] = useState<any>(null);
  const [matchupData, setMatchupData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameData();
    fetchMatchupData();
  }, [gameId]);

  async function fetchGameData() {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      const data = await response.json();
      setGameData(data);
    } catch (error) {
      console.error('Failed to fetch game:', error);
    }
  }

  async function fetchMatchupData() {
    try {
      const response = await fetch(`/api/matchup?game_id=${gameId}`);
      const data = await response.json();
      setMatchupData(data);
    } catch (error) {
      console.error('Failed to fetch matchup:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading game analysis...</p>
        </div>
      </div>
    );
  }

  if (!gameData || !matchupData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Game not found</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
            ← Back to games
          </Link>
        </div>
      </div>
    );
  }

  const { game, home_team, away_team, best_odds } = gameData;
  const { analysis } = matchupData;

  // Format date
  const gameDate = new Date(game.date);
  const dateStr = gameDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  const timeStr = gameDate.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-blue-100 hover:text-white mb-4 inline-block">
            ← Back to all games
          </Link>
          <h1 className="text-3xl font-bold">Game Analysis</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Game Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-gray-600 dark:text-gray-400 mb-2">{dateStr}</div>
            <div className="text-lg text-gray-600 dark:text-gray-400">{timeStr}</div>
            <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">{game.venue}</div>
          </div>

          {/* Teams */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Away Team */}
            <div className="text-center">
              <Image 
                src={away_team.logo_url} 
                alt={away_team.name}
                width={120}
                height={120}
                className="mx-auto mb-4"
              />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {away_team.name}
              </h2>
              <div className="text-gray-600 dark:text-gray-400 mt-2">
                Away Record: {away_team.away_record}
              </div>
            </div>

            {/* VS / Score */}
            <div className="text-center">
              {game.status === 'pre' ? (
                <div className="text-4xl font-bold text-gray-400">VS</div>
              ) : (
                <div className="text-5xl font-bold text-gray-900 dark:text-white">
                  {game.away_score} - {game.home_score}
                </div>
              )}
            </div>

            {/* Home Team */}
            <div className="text-center">
              <Image 
                src={home_team.logo_url} 
                alt={home_team.name}
                width={120}
                height={120}
                className="mx-auto mb-4"
              />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {home_team.name}
              </h2>
              <div className="text-gray-600 dark:text-gray-400 mt-2">
                Home Record: {home_team.home_record}
              </div>
            </div>
          </div>
        </div>

        {/* Best Odds */}
        {best_odds && game.status === 'pre' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Best Available Odds
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Spread */}
              {best_odds.spread && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">SPREAD</div>
                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {home_team.abbreviation} {best_odds.spread.home.point}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {best_odds.spread.home.odds > 0 ? '+' : ''}{best_odds.spread.home.odds} 
                        <span className="text-xs ml-1">({best_odds.spread.home.bookmaker})</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {away_team.abbreviation} {best_odds.spread.away.point}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {best_odds.spread.away.odds > 0 ? '+' : ''}{best_odds.spread.away.odds}
                        <span className="text-xs ml-1">({best_odds.spread.away.bookmaker})</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Moneyline */}
              {best_odds.moneyline && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">MONEYLINE</div>
                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {home_team.abbreviation}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {best_odds.moneyline.home.odds > 0 ? '+' : ''}{best_odds.moneyline.home.odds}
                        <span className="text-xs ml-1">({best_odds.moneyline.home.bookmaker})</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {away_team.abbreviation}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {best_odds.moneyline.away.odds > 0 ? '+' : ''}{best_odds.moneyline.away.odds}
                        <span className="text-xs ml-1">({best_odds.moneyline.away.bookmaker})</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Total */}
              {best_odds.total && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">TOTAL</div>
                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Over {best_odds.total.over.line}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {best_odds.total.over.odds > 0 ? '+' : ''}{best_odds.total.over.odds}
                        <span className="text-xs ml-1">({best_odds.total.over.bookmaker})</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Under {best_odds.total.under.line}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {best_odds.total.under.odds > 0 ? '+' : ''}{best_odds.total.under.odds}
                        <span className="text-xs ml-1">({best_odds.total.under.bookmaker})</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Stats Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Season Statistics
          </h3>
          <div className="space-y-4">
            <StatComparison 
              label="Points Per Game"
              awayValue={away_team.stats.points_per_game.toFixed(1)}
              homeValue={home_team.stats.points_per_game.toFixed(1)}
              higherIsBetter={true}
            />
            <StatComparison 
              label="Points Allowed Per Game"
              awayValue={away_team.stats.points_allowed_per_game.toFixed(1)}
              homeValue={home_team.stats.points_allowed_per_game.toFixed(1)}
              higherIsBetter={false}
            />
            <StatComparison 
              label="Turnover Differential"
              awayValue={away_team.stats.turnover_differential > 0 ? `+${away_team.stats.turnover_differential}` : away_team.stats.turnover_differential.toString()}
              homeValue={home_team.stats.turnover_differential > 0 ? `+${home_team.stats.turnover_differential}` : home_team.stats.turnover_differential.toString()}
              higherIsBetter={true}
            />
          </div>
        </div>

        {/* Matchup Insights */}
        {analysis?.mismatches?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Key Matchup Insights
            </h3>
            <div className="space-y-3">
              {analysis.mismatches.map((mismatch: any, idx: number) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${
                    mismatch.strength === 'significant' 
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                      : mismatch.strength === 'moderate'
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">
                    {mismatch.category}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {mismatch.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Factors */}
        {analysis?.key_factors?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Key Factors
            </h3>
            <ul className="space-y-2">
              {analysis.key_factors.map((factor: string, idx: number) => (
                <li key={idx} className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span className="text-gray-700 dark:text-gray-300">{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* EPA Matchup Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <EPAMatchupAnalysis gameId={gameId} />
        </div>
      </div>
    </div>
  );
}

// Helper component for stat comparison bars
function StatComparison({ 
  label, 
  awayValue, 
  homeValue, 
  higherIsBetter 
}: { 
  label: string; 
  awayValue: string; 
  homeValue: string; 
  higherIsBetter: boolean;
}) {
  const awayNum = parseFloat(awayValue);
  const homeNum = parseFloat(homeValue);
  const total = Math.abs(awayNum) + Math.abs(homeNum);
  const awayPct = total > 0 ? (Math.abs(awayNum) / total) * 100 : 50;
  const homePct = 100 - awayPct;

  const awayBetter = higherIsBetter ? awayNum > homeNum : awayNum < homeNum;
  const homeBetter = higherIsBetter ? homeNum > awayNum : homeNum < awayNum;

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className={`font-semibold ${awayBetter ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
          {awayValue}
        </span>
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`font-semibold ${homeBetter ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
          {homeValue}
        </span>
      </div>
      <div className="flex h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`${awayBetter ? 'bg-green-500' : 'bg-gray-400'}`}
          style={{ width: `${awayPct}%` }}
        />
        <div 
          className={`${homeBetter ? 'bg-green-500' : 'bg-gray-400'}`}
          style={{ width: `${homePct}%` }}
        />
      </div>
    </div>
  );
}