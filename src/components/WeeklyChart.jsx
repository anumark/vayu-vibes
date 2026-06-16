import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';

/**
 * WeeklyChart Component - Displays a 7-day rolling daily carbon emissions trend.
 * Uses Recharts AreaChart with a dashed reference line representing the overall average.
 */
export default function WeeklyChart({ logs = [] }) {
  // Process the last 7 days of logs (chronological order)
  const chartData = React.useMemo(() => {
    // Generate dates for the last 7 days
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    return dates.map(dateStr => {
      // Find log for this date
      const found = logs.find(l => l.date === dateStr);
      const dayName = new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short' }).substring(0, 3);
      
      return {
        date: dateStr,
        day: dayName,
        kg: found ? parseFloat(found.total_kg_co2.toFixed(3)) : 0,
        score: found ? found.carbon_score : null,
        logged: !!found
      };
    });
  }, [logs]);

  // Calculate user's average emissions over logged days
  const averageKg = React.useMemo(() => {
    const loggedDays = chartData.filter(d => d.logged);
    if (loggedDays.length === 0) return 0.0;
    const sum = loggedDays.reduce((acc, d) => acc + d.kg, 0);
    return parseFloat((sum / loggedDays.length).toFixed(3));
  }, [chartData]);

  // Premium Custom Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-100 rounded-xl shadow-lg text-xs flex flex-col gap-1">
          <p className="font-medium text-gray-400">{data.date}</p>
          <p className="text-gray-900 font-semibold text-sm">
            {data.kg.toFixed(3)} kg CO₂
          </p>
          {data.logged ? (
            <p className="text-green-carbon font-medium">Score: {data.score}</p>
          ) : (
            <p className="text-gray-400 italic">No entry logged</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="material-card p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-gray-500 font-medium text-sm tracking-wider uppercase">Weekly Trend</h3>
        <p className="text-xs text-gray-400 mt-0.5">7-day rolling carbon footprint</p>
      </div>

      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 5, left: -40, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#378ADD" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#378ADD" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }} 
            />
            {/* No axis labels on Y for clean Fit styling */}
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={false} 
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Dashed Your Average Line */}
            {averageKg > 0 && (
              <ReferenceLine 
                y={averageKg} 
                stroke="#9CA3AF" 
                strokeDasharray="4 4" 
                label={{ 
                  value: `Avg: ${averageKg} kg`, 
                  fill: '#6B7280', 
                  fontSize: 10,
                  position: 'insideBottomRight',
                  offset: 8 
                }} 
              />
            )}
            
            <Area 
              type="monotone" 
              dataKey="kg" 
              stroke="#378ADD" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorKg)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
