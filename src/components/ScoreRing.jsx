import React, { useEffect, useState } from 'react';

/**
 * ScoreRing Component - Displays a circular Material You progress ring for Carbon score
 * Animates on load. Color-codes: Green (>70), Amber (40-70), Red (<40)
 */
export default function ScoreRing({ score = 100, label = "Today's Score", weeklyAverage = null }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    // Staggered value count-up animation
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  // Calculations for SVG circle
  const radius = 45;
  const circumference = 2 * Math.PI * radius; // ~282.7
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Determine color theme based on score
  let strokeColor = '#1D9E75'; // green-carbon
  let bgColorClass = 'bg-green-50 text-green-carbon';
  if (score < 40) {
    strokeColor = '#E24B4A'; // red-carbon
    bgColorClass = 'bg-red-50 text-red-carbon';
  } else if (score <= 70) {
    strokeColor = '#EF9F27'; // amber-carbon
    bgColorClass = 'bg-amber-50 text-amber-carbon';
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 material-card">
      <h3 className="text-gray-500 font-medium text-sm tracking-wider uppercase mb-3">{label}</h3>
      
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* SVG Circular Progress Ring */}
        <svg className="w-full h-full transform -rotate-90">
          {/* Background Ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#F3F4F6"
            strokeWidth="10"
            fill="transparent"
          />
          {/* Animated Foreground Ring */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={strokeColor}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            style={{
              strokeDashoffset: strokeDashoffset,
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
              strokeLinecap: 'round'
            }}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-light text-gray-900" style={{ fontWeight: 300 }}>
            {animatedScore}
          </span>
          <span className="text-xs uppercase text-gray-400 font-medium tracking-wide">
            Green Score
          </span>
        </div>
      </div>

      {/* Weekly Average Badge */}
      {weeklyAverage !== null && (
        <div className={`mt-4 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${bgColorClass}`}>
          <span>Weekly Avg: </span>
          <span className="font-semibold">{weeklyAverage}</span>
        </div>
      )}
    </div>
  );
}
