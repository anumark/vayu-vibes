import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { calculateHaversineDistance, isGoogleMapsConfigured, loadGoogleMapsScript } from '../lib/googleMaps';
import { useAQI } from '../hooks/useAQI';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calculateDailyEmissions } from '../lib/emissions';
import CommuteMap from '../components/CommuteMap';
import AQICard from '../components/AQICard';

// Timezone safe helper to format UTC dates to 'dd MMMM yyyy'
const format = (dateObj, formatStr) => {
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${day} ${months[dateObj.getUTCMonth()]} ${dateObj.getUTCFullYear()}`;
};

/**
 * SuccessScreen Component - inline success view after successful check-in
 */
const SuccessScreen = ({ log, onEdit }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 animate-scale-in">
      {/* Icon + heading */}
      <div className="text-5xl">✅</div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-800">
          Check-in saved!
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {format(new Date(log.date), 'dd MMMM yyyy')}
        </p>
      </div>

      {/* Mini summary card */}
      <div className="w-full material-card p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">🌱 Score today</span>
          <span className="text-lg font-semibold text-green-600">
            {log.score}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">🚇 Commute</span>
          <span>{log.commuteKg.toFixed(3)} kg CO₂</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">🏠 Home office</span>
          <span>{log.wfhKg.toFixed(3)} kg CO₂</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">🥗 Lunch break</span>
          <span>{log.lunchKg.toFixed(3)} kg CO₂</span>
        </div>
        <div className="border-t border-gray-100 pt-3 flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span>{log.totalKg.toFixed(3)} kg CO₂</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="w-full flex flex-col gap-3">
        {/* Primary — go to dashboard */}
        <button
          onClick={() => navigate('/')}
          className="w-full py-3.5 bg-green-carbon hover:bg-green-600 text-white font-semibold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          🏠 Go to Dashboard
        </button>

        {/* Secondary — view streak */}
        <button
          onClick={() => navigate('/?section=streak')}
          className="w-full py-3.5 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold text-sm rounded-2xl border border-orange-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          🔥 View My Streak
        </button>

        {/* Tertiary — edit log */}
        <button
          onClick={onEdit}
          className="w-full py-3 text-gray-400 text-sm underline hover:text-gray-600 transition-all cursor-pointer"
        >
          ✏️ Edit this log
        </button>
      </div>
    </div>
  );
};

/**
 * DailyLog Page - Simple activity checker
 * User records: WFH vs Office, Commutes, Power usage, and lunch routines.
 */
export default function DailyLog() {
  const { user, saveDailyLog, logs } = useAppStore();
  const navigate = useNavigate();
  
  const { home_lat, home_lng, office_lat, office_lng } = user || {};

  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [workLocation, setWorkLocation] = useState('home');
  const [commuteMode, setCommuteMode] = useState('metro');
  const [commuteKm, setCommuteKm] = useState(10);
  const [wfhElectricitySource, setWfhElectricitySource] = useState(user?.electricity_source || 'grid');
  const [wfhHasAC, setWfhHasAC] = useState(false);
  const [lunchMode, setLunchMode] = useState('stay_in');
  const [stepsWalked, setStepsWalked] = useState(800);

  // New states for UX improvements
  const [distanceSource, setDistanceSource] = useState('auto'); // 'auto' | 'manual'
  const [autoCommuteKm, setAutoCommuteKm] = useState(10);
  const [homeArea, setHomeArea] = useState('');
  const [officeArea, setOfficeArea] = useState('');
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  // Post-submission success and toast states
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [savedLog, setSavedLog] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [hasExistingLog, setHasExistingLog] = useState(false);

  // Load Google Maps script if configured
  useEffect(() => {
    if (isGoogleMapsConfigured) {
      loadGoogleMapsScript(() => {
        setGoogleMapsLoaded(true);
      });
    }
  }, []);

  // Check if a log already exists for the selected date
  useEffect(() => {
    const checkExisting = async () => {
      if (!user) return;
      if (isSupabaseConfigured && supabase && user.id !== 'mock-user-123') {
        try {
          const { data: existing } = await supabase
            .from('daily_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('date', date)
            .maybeSingle();
          
          setHasExistingLog(!!existing);
        } catch (e) {
          const localExisting = logs.find(log => log.date === date);
          setHasExistingLog(!!localExisting);
        }
      } else {
        const localExisting = logs.find(log => log.date === date);
        setHasExistingLog(!!localExisting);
      }
    };
    checkExisting();
  }, [date, user, logs]);

  // Sync / reverse-geocode home and office area names
  useEffect(() => {
    const geocodeToArea = (lat, lng, setArea, fallbackAddress) => {
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: parseFloat(lat), lng: parseFloat(lng) } }, (results, status) => {
          if (status === 'OK' && results?.[0]?.formatted_address) {
            const firstPart = results[0].formatted_address.split(',')[0];
            setArea(firstPart);
          } else if (fallbackAddress) {
            setArea(fallbackAddress.split(',')[0]);
          } else {
            setArea(`${parseFloat(lat).toFixed(4)}° N, ${parseFloat(lng).toFixed(4)}° E`);
          }
        });
      } else if (fallbackAddress) {
        setArea(fallbackAddress.split(',')[0]);
      } else {
        setArea(`${parseFloat(lat).toFixed(4)}° N, ${parseFloat(lng).toFixed(4)}° E`);
      }
    };

    if (home_lat && home_lng) {
      geocodeToArea(home_lat, home_lng, setHomeArea, user?.home_address);
    }
    if (office_lat && office_lng) {
      geocodeToArea(office_lat, office_lng, setOfficeArea, user?.office_address);
    }
  }, [user, googleMapsLoaded]);

  // Initial auto-calculate distance between home and office spots (Haversine fallback)
  useEffect(() => {
    if (home_lat && office_lat) {
      const dist = calculateHaversineDistance(
        home_lat, home_lng,
        office_lat, office_lng
      );
      const initialRoundTrip = parseFloat((dist * 2).toFixed(1));
      setCommuteKm(initialRoundTrip);
      setAutoCommuteKm(initialRoundTrip);
      setDistanceSource('auto');
    } else {
      setDistanceSource('manual');
    }
  }, [user]);

  // Fetch matrix distance when office is active or commute mode changes
  const fetchCommuteDistance = async () => {
    if (!home_lat || !office_lat) return;
    if (typeof google === 'undefined' || !google.maps) return;

    const travelModeMap = {
      metro:   google.maps.TravelMode.TRANSIT,
      bus:     google.maps.TravelMode.TRANSIT,
      carpool: google.maps.TravelMode.DRIVING,
      solo_car: google.maps.TravelMode.DRIVING,
      walk_bike: google.maps.TravelMode.BICYCLING,
    };

    const travelMode = travelModeMap[commuteMode] || google.maps.TravelMode.DRIVING;

    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [{ lat: parseFloat(home_lat), lng: parseFloat(home_lng) }],
      destinations: [{ lat: parseFloat(office_lat), lng: parseFloat(office_lng) }],
      travelMode: travelMode,
    }, (response, status) => {
      if (status === 'OK' && response?.rows?.[0]?.elements?.[0]?.distance) {
        const meters = response.rows[0].elements[0].distance.value;
        const km = parseFloat((meters / 1000).toFixed(1));
        const roundTripKm = parseFloat((km * 2).toFixed(1));
        setCommuteKm(roundTripKm);
        setAutoCommuteKm(roundTripKm);
        setDistanceSource('auto');
      }
    });
  };

  useEffect(() => {
    if (workLocation === 'office' && (googleMapsLoaded || window.google?.maps)) {
      fetchCommuteDistance();
    }
  }, [workLocation, commuteMode, googleMapsLoaded]);

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
  const aqiLat = workLocation === 'office' ? office_lat : home_lat;
  const aqiLng = workLocation === 'office' ? office_lng : home_lng;
  
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

    setIsSaving(true);
    const res = await saveDailyLog(payload);
    setIsSaving(false);
    if (res.success) {
      const emissions = calculateDailyEmissions(payload);
      setSavedLog({
        date: date,
        score: emissions.carbonScore,
        commuteKg: emissions.breakdown.commute,
        wfhKg: emissions.breakdown.wfh,
        lunchKg: emissions.breakdown.lunch,
        totalKg: emissions.totalKg,
      });

      // Show toast briefly
      setToast(true);
      setTimeout(() => {
        setToast(false);
        setSubmitSuccess(true);
      }, 2000);
    }
  };

  // Always render toast at top level so it persists during the 2s window
  // before the SuccessScreen swap
  const toastEl = toast ? (
    <div
      style={{
        position: 'fixed',
        bottom: '96px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        whiteSpace: 'nowrap',
      }}
      className="flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium bg-green-50 border border-green-200 text-green-800"
    >
      <span>✅</span>
      <span>Daily log saved!</span>
    </div>
  ) : null;

  if (submitSuccess && savedLog) {
    return (
      <>
        {toastEl}
        <SuccessScreen log={savedLog} onEdit={() => setSubmitSuccess(false)} />
      </>
    );
  }

  return (
    <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-6">
      {toastEl}

      <div>
        <h2 className="text-2xl font-light text-gray-900">Check In Today</h2>
        <p className="text-xs text-gray-400 mt-0.5">Log your working habits and daily carbon score</p>
      </div>

      {hasExistingLog && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm p-3.5 rounded-2xl flex items-center gap-2 animate-scale-in">
          <span>✏️</span>
          <span>You already logged today — saving will update your entry.</span>
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

              {/* Warning if no coordinates set */}
              {(!home_lat || !office_lat) && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex flex-col gap-2 animate-slide-down">
                  <div className="flex gap-2">
                    <span className="text-base">📍</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-amber-850">Set your home & office locations first</span>
                      <span className="text-[11px] text-amber-700 mt-0.5">to auto-calculate your commute distance.</span>
                    </div>
                  </div>
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/profile')}
                      className="text-xs font-semibold text-amber-800 underline hover:text-amber-900 border-none bg-transparent p-0 cursor-pointer"
                    >
                      Go to Profile →
                    </button>
                  </div>
                </div>
              )}

              {/* Display auto-calculated distance card if available */}
              {distanceSource === 'auto' && home_lat && office_lat && (
                <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 animate-slide-down">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Round Trip Distance</span>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span>📍</span>
                    <span className="font-semibold text-xs text-gray-800">
                      {homeArea || 'Home'} → {officeArea || 'Office'} → {homeArea || 'Home'}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-gray-800">{commuteKm} km</span>
                      <span className="text-green-600 text-xs font-semibold">(auto-calculated)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDistanceSource('manual')}
                      className="text-xs text-gray-400 underline border-none bg-transparent p-0 cursor-pointer hover:text-gray-600"
                    >
                      [Edit manually]
                    </button>
                  </div>
                </div>
              )}

              {/* Manual distance slider fallback */}
              {(!home_lat || !office_lat || distanceSource === 'manual') && (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs text-gray-500 font-semibold uppercase">
                    <span>Round Trip Distance</span>
                    <div className="flex items-center gap-2">
                      {home_lat && office_lat && (
                        <span className="text-[11px] text-gray-400 normal-case font-normal">
                          ← Auto-calculated: {autoCommuteKm} km{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setCommuteKm(autoCommuteKm);
                              setDistanceSource('auto');
                            }}
                            className="text-blue-carbon underline font-semibold cursor-pointer border-none bg-transparent p-0"
                          >
                            [Reset]
                          </button>
                        </span>
                      )}
                      <span className="font-mono text-gray-800 text-xs font-bold">{commuteKm} km</span>
                    </div>
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
              )}

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
          disabled={isSaving}
          className={`w-full py-4 bg-green-carbon hover:bg-green-600 text-white font-semibold text-sm rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 ${
            isSaving ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>📝 Save Daily Check-In</>
          )}
        </button>

      </form>
    </div>
  );
}
