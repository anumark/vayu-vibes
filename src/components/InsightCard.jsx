import React, { useState, useEffect } from 'react';

const TIPS = [
  {
    icon: '🚇',
    title: 'Commute Wisely',
    text: 'Metro saves 3.2× more CO₂ than carpooling on your route.'
  },
  {
    icon: '☀️',
    title: 'Power Source',
    text: 'WFH on solar days are your greenest days. Solar grid draw is only 0.04 kg CO₂/kWh!'
  },
  {
    icon: '🚶',
    title: 'Active Breaks',
    text: 'Your lunch walk saves ~109 kg CO₂ annually if done daily instead of ordering in via bike/scooter.'
  }
];

/**
 * InsightCard Component - Renders rotating energy insights
 * at the bottom of the user's dashboard.
 */
export default function InsightCard() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Automatically cycle tips every 12 seconds
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % TIPS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const tip = TIPS[index];

  return (
    <div className="material-card p-5 bg-gradient-to-br from-blue-50 to-indigo-50/35 border border-blue-100/30 flex flex-col gap-3 relative overflow-hidden transition-all duration-300">
      {/* Decorative SVG Accent */}
      <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-x-4 translate-y-4">
        <span className="text-8xl">{tip.icon}</span>
      </div>

      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="text-xl bg-white p-1.5 rounded-lg shadow-sm">{tip.icon}</span>
          <div>
            <h4 className="text-xs text-blue-carbon uppercase font-medium tracking-wider">Eco Insight</h4>
            <h3 className="text-sm font-semibold text-gray-800">{tip.title}</h3>
          </div>
        </div>
        <button 
          onClick={() => setIndex((prev) => (prev + 1) % TIPS.length)}
          className="text-xs text-blue-carbon hover:underline font-semibold bg-white px-2.5 py-1 rounded-lg border border-blue-100 shadow-sm"
        >
          Next Tip →
        </button>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed max-w-[90%] font-medium">
        "{tip.text}"
      </p>

      {/* Slide Indicators */}
      <div className="flex gap-1 mt-1 justify-start">
        {TIPS.map((_, idx) => (
          <div 
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-300 ${idx === index ? 'w-4 bg-blue-carbon' : 'w-1.5 bg-blue-100'}`}
          />
        ))}
      </div>
    </div>
  );
}
