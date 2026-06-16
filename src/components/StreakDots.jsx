import React from 'react';

/**
 * StreakDots Component - Shows rolling streak status for the last 7 entries
 * along with milestone indicators and badges.
 */
export default function StreakDots({ logs = [], currentStreak = 0, lastSevenDots = [] }) {
  
  // Decide the milestone text based on the current streak count
  const milestoneText = React.useMemo(() => {
    if (currentStreak >= 10) {
      return "🌳 You've offset a flight meal (10+ Days)";
    } else if (currentStreak >= 5) {
      return "🌱 1 tree saved equivalent (5+ Days)";
    } else {
      return `Keep going! ${5 - currentStreak} more green days to save a tree equivalent.`;
    }
  }, [currentStreak]);

  return (
    <div className="material-card p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-gray-500 font-medium text-sm tracking-wider uppercase">Green Streak</h3>
          <p className="text-xs text-gray-400 mt-0.5">Days with score ≥ 70</p>
        </div>
        <div className="flex items-center gap-1 bg-green-50 text-green-carbon px-3 py-1 rounded-full text-xs font-semibold">
          🔥 <span className="text-sm font-bold">{currentStreak}</span> Days
        </div>
      </div>

      {/* Sequential Streak Dots */}
      <div className="flex justify-between items-center px-2 py-3 bg-gray-50 rounded-2xl">
        {lastSevenDots.map((dot, index) => {
          // Format day names for label
          const label = dot.date 
            ? new Date(dot.date).toLocaleDateString('en-IN', { weekday: 'narrow' })
            : '-';
          
          let circleColor = 'bg-gray-200 border-gray-300';
          let textColor = 'text-gray-400';

          if (dot.logged) {
            if (dot.green) {
              circleColor = 'bg-green-carbon border-green-600 scale-110';
              textColor = 'text-green-carbon font-semibold';
            } else {
              circleColor = 'bg-amber-carbon border-amber-500';
              textColor = 'text-amber-carbon font-medium';
            }
          }

          return (
            <div 
              key={index} 
              className="flex flex-col items-center gap-1.5 animate-scale-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div 
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] text-white transition-all duration-300 ${circleColor}`}
                title={dot.logged ? `Score: ${dot.score}` : 'Not logged'}
              >
                {dot.logged ? (dot.green ? '✓' : '!') : ''}
              </div>
              <span className={`text-[10px] uppercase tracking-wider ${textColor}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Milestone Card */}
      <div className="flex items-start gap-3 p-3.5 bg-green-50/50 rounded-2xl border border-green-100">
        <span className="text-2xl mt-0.5">🏆</span>
        <div>
          <h4 className="text-xs text-green-carbon font-medium tracking-wide uppercase">Current Milestone</h4>
          <p className="text-sm text-gray-700 font-medium mt-0.5">{milestoneText}</p>
        </div>
      </div>
    </div>
  );
}
