import React, { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import ScoreRing from '../components/ScoreRing';
import BreakdownBars from '../components/BreakdownBars';
import WeeklyChart from '../components/WeeklyChart';
import StreakDots from '../components/StreakDots';
import InsightCard from '../components/InsightCard';
import useStreak from '../hooks/useStreak';

/**
 * Dashboard Page - Inspired by Google Fit.
 * Renders Carbon Score, breakdowns, weekly rolling trends, streaks, and insights.
 */
export default function Dashboard({ onTabChange }) {
  const { user, logs, loading } = useAppStore();
  const { currentStreak, lastSevenDots } = useStreak(logs);

  // Retrieve today's log if created
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = useMemo(() => {
    return logs.find(log => log.date === todayStr);
  }, [logs, todayStr]);

  // Calculate average weekly score
  const weeklyAverageScore = useMemo(() => {
    // Take logs from the last 7 days
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const startStr = start.toISOString().split('T')[0];
    
    const recent = logs.filter(l => l.date >= startStr);
    if (recent.length === 0) return 0;
    
    const sum = recent.reduce((acc, log) => acc + log.carbon_score, 0);
    return Math.round(sum / recent.length);
  }, [logs]);

  // Skeleton loading state
  if (loading) {
    return (
      <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-5">
        <div className="h-6 bg-gray-200 rounded w-2/3 animate-pulse" />
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // Empty state check
  if (logs.length === 0) {
    return (
      <div className="flex-1 px-4 py-8 max-w-md mx-auto w-full flex flex-col justify-center items-center gap-6 text-center animate-scale-in">
        <div className="text-6xl animate-bounce">🌱</div>
        <div>
          <h2 className="text-2xl font-light text-gray-800">Your Green Journey Starts</h2>
          <p className="text-xs text-gray-400 mt-1.5 px-6 leading-relaxed">
            Track commuting, WFH grid draw, and lunch breaks to calculate your green score and save trees.
          </p>
        </div>

        <button
          onClick={() => onTabChange('log')}
          className="px-6 py-3.5 bg-green-carbon text-white text-sm font-semibold rounded-2xl shadow-sm hover:bg-green-600 transition-all flex items-center gap-2"
        >
          📝 Log Your First Day
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-5 animate-scale-in">
      
      {/* Header Profile Summary */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-light text-gray-900 leading-tight">
            Hi, <span className="font-semibold">{user?.name || 'Professional'}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Here is your carbon snapshot</p>
        </div>
        {!todayLog && (
          <button
            onClick={() => onTabChange('log')}
            className="text-[11px] font-bold bg-green-50 text-green-carbon border border-green-200 px-3 py-1.5 rounded-full hover:bg-green-100 transition-all"
          >
            + Log Today
          </button>
        )}
      </div>

      {/* 1. Carbon Score Ring (Material You style) */}
      <ScoreRing 
        score={todayLog ? todayLog.carbon_score : 100} 
        label={todayLog ? "Today's Score" : "No Log Saved Today (Showing 100)"} 
        weeklyAverage={weeklyAverageScore}
      />

      {/* 2. Daily Breakdown Horizontal Chart */}
      <BreakdownBars 
        breakdown={
          todayLog 
            ? { commute: todayLog.commute_km ? (todayLog.total_kg_co2 - (todayLog.lunch_mode === 'vehicle' ? 0.3 : 0) - (todayLog.wfh_electricity_source ? todayLog.total_kg_co2 : 0)) : 0, 
                wfh: todayLog.wfh_electricity_source ? (todayLog.total_kg_co2 - (todayLog.lunch_mode === 'vehicle' ? 0.3 : 0)) : 0, 
                lunch: todayLog.lunch_mode === 'vehicle' ? 0.3 : 0 }
            : { commute: 0, wfh: 0, lunch: 0 }
        } 
      />

      {/* 3. Weekly Trend Line Chart */}
      <WeeklyChart logs={logs} />

      {/* 4. Streak Tracker */}
      <StreakDots 
        logs={logs} 
        currentStreak={currentStreak} 
        lastSevenDots={lastSevenDots}
      />

      {/* 5. Insight Card */}
      <InsightCard />

      {/* Margin Padding space at bottom for mobile nav bar */}
      <div className="h-12" />
    </div>
  );
}
