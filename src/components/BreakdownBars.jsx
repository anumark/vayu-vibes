import React from 'react';

/**
 * BreakdownBars Component - Displays a horizontal breakdown bar chart
 * showing carbon contribution from Commute, Home Office, and Lunch break.
 */
export default function BreakdownBars({ breakdown = { commute: 0, wfh: 0, lunch: 0 } }) {
  const { commute = 0, wfh = 0, lunch = 0 } = breakdown;
  const total = commute + wfh + lunch;

  const items = [
    {
      label: 'Commute',
      value: commute,
      icon: '🚇',
      // Max for commute is solo-car 20km = ~4.2kg
      max: 4.5,
      getColor: (val) => {
        if (val === 0) return '#1D9E75'; // green (walk/no commute)
        if (val > 2.0) return '#E24B4A'; // red (solo car)
        return '#EF9F27'; // amber (bus/metro long)
      }
    },
    {
      label: 'Home Office',
      value: wfh,
      icon: '🏠',
      // Max for WFH is grid (1.2 * 0.82) = ~0.98kg
      max: 1.2,
      getColor: (val) => {
        if (val === 0) return '#1D9E75';
        if (val > 0.5) return '#EF9F27'; // grid/mixed
        return '#1D9E75'; // solar
      }
    },
    {
      label: 'Lunch Break',
      value: lunch,
      icon: '🥗',
      // Max for lunch is vehicle = 0.3kg
      max: 0.5,
      getColor: (val) => {
        if (val === 0) return '#1D9E75'; // walk/stay in
        return '#EF9F27'; // vehicle snack run
      }
    }
  ];

  return (
    <div className="material-card p-6 flex flex-col gap-4">
      <h3 className="text-gray-500 font-medium text-sm tracking-wider uppercase mb-1">Carbon Breakdown</h3>
      
      <div className="flex flex-col gap-5">
        {items.map((item) => {
          const percentage = Math.min(100, Math.round((item.value / item.max) * 100));
          const color = item.getColor(item.value);

          return (
            <div key={item.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="text-base">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
                <div className="text-gray-500 font-medium">
                  <span className="text-gray-900 font-semibold">{item.value.toFixed(3)}</span> kg CO₂
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(item.value > 0 ? 5 : 0, percentage)}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div className="mt-2 pt-3 border-t border-gray-100 flex justify-between items-center text-sm">
          <span className="text-gray-500">Total Emissions Today:</span>
          <span className="text-base font-semibold text-gray-800">{total.toFixed(3)} kg CO₂</span>
        </div>
      )}
    </div>
  );
}
