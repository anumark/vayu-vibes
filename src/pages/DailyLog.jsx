import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { calculateHaversineDistance } from '../lib/googleMaps';
import { useAQI } from '../hooks/useAQI';
import CommuteMap from '../components/CommuteMap';
import AQICard from '../components/AQICard';

/**
 * DailyLog Page - Simple activity checker
 * User records: WFH vs Office, Commutes, Power usage, and lunch routines.
 */
export default function DailyLog() {
  const { user, saveDailyLog, logs } = useAppStore();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [workLocation, setWorkLocation] = useState('home');
  const [commuteMode, setCommuteMode] = useState('metro');
  const [commuteKm, setCommuteKm] = useState(10);
  const [wfhElectricitySource, setWfhElectricitySource] = useState(user?.electricity_source || 'grid');
  const [wfhHasAC, setWfhHasAC] = useState(false);
  const [lunchMode, setLunchMode] = useState('stay_in');
  const [stepsWalked, setStepsWalked] = useState(800);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-calculate distance between home and office profile spots
  useEffect(() => {
    if (user?.home_lat && user?.office_lat) {
      const dist = calculateHaversineDistance(
        user.home_lat, user.home_lng,
        user.office_lat, user.office_lng
      );
      // Double the distance for round trip commute
      setCommuteKm(parseFloat((dist * 2).toFixed(1)));
    }
  }, [user]);

  // Load existing log for the selected date if it exists to edit
  useEffect(() => {
    const existing = logs.find(log => log.date === date);
    if (existing) {
      setWorkLocation(existing.work_location);
      if (existing.work_location === 'office') {
        setCommuteMode(existing.commute_mode || 'metro');
        setCommuteKm(existing.commute_km || 10);
      } else {
        setWfhElectricitySource(existing.wfh_electricity_source || 'grid');
        setWfhHasAC(!!existing.wfh_has_ac);
      }
      setLunchMode(existing.lunch_mode);
      setStepsWalked(existing.steps_walked || 800);
    } else {
      // Defaults
      setWorkLocation('home');
      setCommuteMode('metro');
      setWfhElectricitySource(user?.electricity_source || 'grid');
      setWfhHasAC(false);
      setLunchMode('stay_in');
      setStepsWalked(800);
    }
  }, [date, logs, user]);

  // Fetch AQI based on office location if working at office, else home location (or current coords fallback)
  const aqiLat = workLocation === 'office' ? user?.office_lat : user?.home_lat;
  const aqiLng = workLocation === 'office' ? user?.office_lng : user?.home_lng;
  
  const { aqiData, loading: aqiLoading } = useAQI(
    lunchMode === 'walk' ? aqiLat : null, 
    lunchMode === 'walk' ? aqiLng : null
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      date,
      workLocation,
      commuteMode,
      commuteKm,
      wfhElectricitySource,
      wfhHasAC,
      lunchMode,
      stepsWalked: lunchMode === 'walk' ? stepsWalked : 0
    };

    const res = await saveDailyLog(payload);
    if (res.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  return (
    <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-light text-gray-900">Check In Today</h2>
        <p className="text-xs text-gray-400 mt-0.5">Log your working habits and daily carbon score</p>
      </div>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-carbon text-xs p-3.5 rounded-2xl flex items-center gap-2 animate-scale-in">
          🎉 <span>Log saved successfully! Dashboard updated.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        {/* Date Selector */}
        <div className="material-card p-4 flex justify-between items-center">
          <label className="text-xs text-gray-500 font-semibold uppercase">Log Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm font-semibold text-gray-800 bg-gray-50 p-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-carbon"
            max={todayStr}
          />
        </div>

        {/* 1. Work Location */}
        <div className="material-card p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Where are you working from?</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                type="button"
                onClick={() => setWorkLocation('home')}
                className={`py-3 rounded-2xl border text-sm font-semibold flex flex-col items-center gap-1.5 transition-all ${workLocation === 'home' ? 'bg-green-50 border-green-carbon text-green-carbon scale-[1.02]' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
              >
                <span className="text-2xl">🏠</span>
                <span>Work From Home</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkLocation('office')}
                className={`py-3 rounded-2xl border text-sm font-semibold flex flex-col items-center gap-1.5 transition-all ${workLocation === 'office' ? 'bg-blue-50 border-blue-carbon text-blue-carbon scale-[1.02]' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
              >
                <span className="text-2xl">🏢</span>
                <span>Office</span>
              </button>
            </div>
          </div>

          {/* Reveal WFH electricity details if Home */}
          {workLocation === 'home' && (
            <div className="animate-slide-down flex flex-col gap-2 mt-2 pt-3 border-t border-gray-50">
              <label className="text-xs text-gray-500 font-semibold uppercase">Home Electricity Source</label>
              <div className="grid grid-cols-3 gap-2">
                {['grid', 'mixed', 'solar'].map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setWfhElectricitySource(src)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border text-center transition-all ${wfhElectricitySource === src ? 'bg-green-50 border-green-carbon text-green-carbon' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                  >
                    {src === 'grid' && '⚡ Grid'}
                    {src === 'mixed' && '🌗 Mixed'}
                    {src === 'solar' && '☀️ Solar'}
                  </button>
                ))}
              </div>

              {/* AC Toggle Checkbox */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                <input
                  type="checkbox"
                  id="wfhHasAC"
                  checked={wfhHasAC}
                  onChange={(e) => setWfhHasAC(e.target.checked)}
                  className="w-4 h-4 accent-green-carbon rounded cursor-pointer"
                />
                <label htmlFor="wfhHasAC" className="text-xs text-gray-700 font-semibold cursor-pointer">
                  AC / air conditioning running today?
                </label>
              </div>

              {/* Contextual Warning Card */}
              {wfhHasAC && (
                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2 animate-slide-down">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-2">
                      <span className="text-lg">⚠️</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-amber-800">AC significantly increases your footprint today</span>
                        <span className="text-[11px] text-amber-700 mt-0.5">+9.1 kg CO₂ vs no AC</span>
                        <span className="text-[11px] text-amber-700 font-medium">Your WFH day with AC = 9.54 kg vs office day = ~2.1 kg</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                      Office may be greener today
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reveal Commute details if Office */}
          {workLocation === 'office' && (
            <div className="animate-slide-down flex flex-col gap-4 mt-2 pt-3 border-t border-gray-50">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-500 font-semibold uppercase">Commute Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'metro', label: '🚇 Metro', rate: '0.041' },
                    { key: 'bus', label: '🚌 Bus', rate: '0.089' },
                    { key: 'carpool', label: '🚙 Carpool', rate: '0.060' },
                    { key: 'solo_car', label: '🚗 Solo Car', rate: '0.210' },
                    { key: 'walk_bike', label: '🚲 Cycle/Walk', rate: '0' }
                  ].map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setCommuteMode(mode.key)}
                      className={`py-2.5 px-1 rounded-xl border text-center flex flex-col items-center justify-center gap-0.5 transition-all ${commuteMode === mode.key ? 'bg-blue-50 border-blue-carbon text-blue-carbon' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                    >
                      <span className="text-[11px] font-semibold">{mode.label}</span>
                      <span className="text-[9px] text-gray-400 font-medium">{mode.rate} kg/km</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold uppercase">
                  <span>Round Trip Distance</span>
                  <span className="font-mono text-gray-800 text-xs font-bold">{commuteKm} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="80"
                  step="0.5"
                  value={commuteKm}
                  onChange={(e) => setCommuteKm(parseFloat(e.target.value))}
                  className="w-full accent-blue-carbon h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer mt-1"
                />
              </div>

              {/* Draw commute route on mock map */}
              {user?.home_lat && (
                <div className="mt-1">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">Route Visualization</span>
                  <CommuteMap
                    mode="route"
                    homeLocation={{ lat: user.home_lat, lng: user.home_lng }}
                    officeLocation={{ lat: user.office_lat, lng: user.office_lng }}
                    commuteMode={commuteMode}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Lunch Break */}
        <div className="material-card p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Lunch / Snack Break Habit</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { key: 'walk', label: '🚶 Walk Out', desc: '0 kg CO₂' },
                { key: 'vehicle', label: '🛵 Vehicle', desc: '0.3 kg CO₂' },
                { key: 'stay_in', label: '🏢 Stay In', desc: '0 kg CO₂' }
              ].map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setLunchMode(mode.key)}
                  className={`py-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${lunchMode === mode.key ? 'bg-green-50 border-green-carbon text-green-carbon scale-[1.01]' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                >
                  <span className="text-[13px] font-bold">{mode.label}</span>
                  <span className="text-[9px] text-gray-400 font-medium">{mode.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reveal steps counter if Walk */}
          {lunchMode === 'walk' && (
            <div className="animate-slide-down flex flex-col gap-3.5 mt-1 pt-3 border-t border-gray-50">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold uppercase">
                  <span>Log Steps Walked</span>
                  <span className="font-mono text-gray-800 text-xs font-bold">{stepsWalked} steps</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="4000"
                  step="50"
                  value={stepsWalked}
                  onChange={(e) => setStepsWalked(parseInt(e.target.value))}
                  className="w-full accent-green-carbon h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer mt-1"
                />
              </div>

              {/* AQI pollution info card for walks */}
              <AQICard aqiData={aqiData} loading={aqiLoading} />
              
              {/* Radius lunch map circle */}
              {user?.office_lat && (
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1.5">Walkable Venues Map</span>
                  <CommuteMap
                    mode="lunch"
                    officeLocation={{ lat: user.office_lat, lng: user.office_lng }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="w-full py-4 bg-green-carbon hover:bg-green-600 text-white font-semibold text-sm rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2"
        >
          📝 Save Daily Check-In
        </button>

      </form>
    </div>
  );
}
