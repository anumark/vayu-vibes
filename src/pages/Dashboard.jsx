import React, { useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();

  useEffect(() => {
    if (location.search.includes('section=streak')) {
      setTimeout(() => {
        document.getElementById('streak-section')
          ?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [location]);

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

  // WFH vs Office comparison insight computation
  const wfhVsOfficeInsight = useMemo(() => {
    const wfhLogs = logs.filter(log => log.work_location === 'home');
    const officeLogs = logs.filter(log => log.work_location === 'office');
    
    if (wfhLogs.length >= 3 && officeLogs.length >= 3) {
      const wfhTotal = wfhLogs.reduce((sum, log) => sum + log.total_kg_co2, 0);
      const officeTotal = officeLogs.reduce((sum, log) => sum + log.total_kg_co2, 0);
      
      const wfh_avg = parseFloat((wfhTotal / wfhLogs.length).toFixed(2));
      const office_avg = parseFloat((officeTotal / officeLogs.length).toFixed(2));
      
      const diff = parseFloat(Math.abs(wfh_avg - office_avg).toFixed(2));
      const winner = wfh_avg < office_avg ? 'WFH' : 'Office';
      
      return {
        show: true,
        wfh_avg,
        office_avg,
        winner,
        diff
      };
    }
    return { show: false };
  }, [logs]);

  // Environmental equivalents saved calculation (baseline 16.5 kg CO2/day worst-case)
  const totalSaved = useMemo(() => {
    const baseline = 16.5;
    return logs.reduce((sum, log) => sum + Math.max(0, baseline - log.total_kg_co2), 0);
  }, [logs]);

  const equivalents = useMemo(() => {
    const kg = totalSaved;
    return {
      treesAbsorbed: parseFloat((kg / 21.7).toFixed(1)),     // one tree absorbs ~21.7 kg CO₂/year
      flightsMumbaiDelhi: parseFloat((kg / 110).toFixed(1)), // ~110 kg CO₂ per economy seat
      kmDriven: parseFloat((kg / 0.21).toFixed(0)),          // vs solo car
    };
  }, [totalSaved]);

  const translationMessage = useMemo(() => {
    const kg = totalSaved;
    if (kg <= 0) return null;
    
    const eq = equivalents;
    if (kg < 50) {
      return `This month you saved the equivalent of not driving ${eq.kmDriven} km 🚗 compared to a solo car commute!`;
    } else if (kg <= 200) {
      return `This month you saved the equivalent of planting ${eq.treesAbsorbed} trees 🌳 (which absorb CO₂ all year)!`;
    } else {
      return `This month you saved the equivalent of avoiding ${eq.flightsMumbaiDelhi} economy seats on flights from Mumbai to Delhi ✈️!`;
    }
  }, [totalSaved, equivalents]);

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

      {/* Annual Impact Savings Translation Card */}
      {translationMessage && (
        <div className="material-card p-4.5 bg-gradient-to-br from-green-50/60 to-emerald-50/30 border border-green-100/50 rounded-2xl flex items-center gap-3 animate-scale-in">
          <span className="text-3xl">🌱</span>
          <div>
            <h4 className="text-[10px] text-green-carbon uppercase font-bold tracking-wider">Your Environmental Impact</h4>
            <p className="text-xs font-semibold text-gray-700 mt-1 leading-relaxed">
              {translationMessage}
            </p>
          </div>
        </div>
      )}

      {/* 4. Streak Tracker */}
      <div id="streak-section">
        <StreakDots 
          logs={logs} 
          currentStreak={currentStreak} 
          lastSevenDots={lastSevenDots}
        />
      </div>

      {/* WFH vs Office comparison card */}
      {wfhVsOfficeInsight.show && (
        <div className="material-card p-5 bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-100 flex flex-col gap-3 relative overflow-hidden animate-scale-in">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="text-xl bg-white p-1.5 rounded-lg shadow-sm">📊</span>
              <div>
                <h4 className="text-[10px] text-blue-carbon uppercase font-bold tracking-wider">Workplace Comparison</h4>
                <h3 className="text-sm font-semibold text-gray-800">WFH vs Office Footprint</h3>
              </div>
            </div>
            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
              Surprise Stat
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed font-semibold">
            Your WFH days average <span className="font-bold text-gray-800">{wfhVsOfficeInsight.wfh_avg} kg CO₂</span>.
            <br />
            Your office days average <span className="font-bold text-gray-800">{wfhVsOfficeInsight.office_avg} kg CO₂</span>.
            <br />
            <span className="text-blue-carbon font-bold">{wfhVsOfficeInsight.winner}</span> is greener for you by <span className="font-bold text-blue-carbon">{wfhVsOfficeInsight.diff} kg/day</span>.
          </p>
        </div>
      )}

      {/* 5. Insight Card */}
      <InsightCard />

      {/* Margin Padding space at bottom for mobile nav bar */}
      <div className="h-12" />
    </div>
  );
}
