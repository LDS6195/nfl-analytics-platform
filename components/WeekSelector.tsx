// components/WeekSelector.tsx
'use client';

interface WeekSelectorProps {
  currentWeek: number;
  onWeekChange: (week: number) => void;
}

export default function WeekSelector({ currentWeek, onWeekChange }: WeekSelectorProps) {
  const weeks = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <div className="flex flex-wrap gap-2">
      {weeks.map((week) => (
        <button
          key={week}
          onClick={() => onWeekChange(week)}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all
            ${week === currentWeek
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
            }
          `}
        >
          Week {week}
        </button>
      ))}
    </div>
  );
}