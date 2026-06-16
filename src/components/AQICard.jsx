import React from 'react';

/**
 * AQICard Component - Displays AQI level and personalized walking guidelines
 * Good (0-50), Moderate (51-100), Unhealthy (101+)
 */
export default function AQICard({ aqiData = null, loading = false }) {
  if (loading) {
    return (
      <div className="material-card p-4 flex items-center justify-between border animate-pulse">
        <div className="flex flex-col gap-2">
          <div className="h-3.5 bg-gray-200 rounded w-24" />
          <div className="h-3 bg-gray-200 rounded w-36" />
        </div>
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
      </div>
    );
  }

  if (!aqiData) return null;

  const { aqi, text, color, badge } = aqiData;

  return (
    <div 
      className="material-card p-4 flex items-center justify-between border animate-slide-down"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}05` }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-medium tracking-wide text-gray-400">Local Air Quality</span>
          <span 
            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white uppercase"
            style={{ backgroundColor: color }}
          >
            {badge}
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-800 leading-tight">
          {text}
        </p>
      </div>

      <div 
        className="w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center text-center shadow-sm"
        style={{ borderColor: color, backgroundColor: '#FFFFFF' }}
      >
        <span className="text-[9px] uppercase font-bold text-gray-400 leading-none">AQI</span>
        <span className="text-sm font-extrabold" style={{ color: color }}>{aqi}</span>
      </div>
    </div>
  );
}
