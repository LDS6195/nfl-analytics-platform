'use client';

import { useEffect, useState } from 'react';

interface EPAAdvantage {
  situation: string;
  advantage: 'home' | 'away' | 'neutral';
  home_epa: number;
  away_epa: number;
  epa_diff: number;
  strength: 'significant' | 'moderate' | 'slight';
  description: string;
}

interface EPAMatchupData {
  game_id: string;
  home_team: string;
  away_team: string;
  advantages: EPAAdvantage[];
  home_stats: Record<string, any>;
  away_stats: Record<string, any>;
}

interface EPAMatchupAnalysisProps {
  gameId: string;
}

export default function EPAMatchupAnalysis({ gameId }: EPAMatchupAnalysisProps) {
  const [data, setData] = useState<EPAMatchupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatchupData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/analysis/epa-matchup?game_id=${gameId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch matchup analysis');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (gameId) {
      fetchMatchupData();
    }
  }, [gameId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Error loading matchup analysis</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No matchup data available for this game.</p>
      </div>
    );
  }

  const situations = [
    'overall',
    'passing',
    'rushing',
    'third_down_short',
    'third_down_long',
    'red_zone',
    'first_quarter',
    'fourth_quarter',
    'leading',
    'trailing'
  ];

  const formatSituation = (situation: string): string => {
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
  };

  const getCellStyle = (epaDiff: number, isHome: boolean) => {
    const absEpaDiff = Math.abs(epaDiff);
    const hasAdvantage = (isHome && epaDiff > 0) || (!isHome && epaDiff < 0);

    if (!hasAdvantage) return '';

    if (absEpaDiff >= 0.15) return 'bg-green-200 font-bold';
    if (absEpaDiff >= 0.08) return 'bg-green-100 font-bold';
    return 'font-bold';
  };

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">EPA Matchup Analysis</h2>
        <p className="text-gray-600 dark:text-gray-400">
          {data.home_team} vs {data.away_team} - Complete situational comparison
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300 dark:border-gray-600">
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Situation</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">{data.home_team} (Home)</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">{data.away_team} (Away)</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">Difference</th>
            </tr>
          </thead>
          <tbody>
            {situations.map((situation) => {
              const homeStat = data.home_stats[situation];
              const awayStat = data.away_stats[situation];

              const homeEPA = homeStat?.epa_per_play;
              const awayEPA = awayStat?.epa_per_play;

              const epaDiff = (homeEPA !== undefined && awayEPA !== undefined)
                ? homeEPA - awayEPA
                : null;

              return (
                <tr key={situation} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                    {formatSituation(situation)}
                  </td>
                  <td className={`py-3 px-4 text-center ${epaDiff !== null ? getCellStyle(epaDiff, true) : ''}`}>
                    {homeEPA !== undefined ? homeEPA.toFixed(3) : 'N/A'}
                  </td>
                  <td className={`py-3 px-4 text-center ${epaDiff !== null ? getCellStyle(epaDiff, false) : ''}`}>
                    {awayEPA !== undefined ? awayEPA.toFixed(3) : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300 font-mono">
                    {epaDiff !== null ? (epaDiff > 0 ? '+' : '') + epaDiff.toFixed(3) : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p className="mb-1"><span className="inline-block w-4 h-4 bg-green-200 mr-2"></span>Strong advantage (≥0.15 EPA difference)</p>
        <p><span className="inline-block w-4 h-4 bg-green-100 mr-2"></span>Moderate advantage (≥0.08 EPA difference)</p>
      </div>
    </div>
  );
}
