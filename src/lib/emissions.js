// Vayu Vibes Carbon Emissions Calculation Engine

export const COMMUTE_EMISSION_RATES = {
  metro: 0.041,   // kg CO2 per km
  bus: 0.089,     // kg CO2 per km
  carpool: 0.060, // kg CO2 per km (per person)
  solo_car: 0.210, // kg CO2 per km
  walk_bike: 0.0  // kg CO2 per km
};

export const WFH_EMISSION_RATES = {
  grid: 0.757,  // CEA India 2024 (kg CO2 per kWh)
  solar: 0.04, // kg CO2 per kWh
  mixed: 0.40  // estimated 50/50 split
};

export const WORKDAY_HOURS = 8;

export const WFH_DEVICES = {
  laptop:  { watts: 45,   label: 'Laptop' },
  monitor: { watts: 30,   label: 'External monitor' },
  router:  { watts: 10,   label: 'Router / WiFi' },
  lights:  { watts: 20,   label: 'Lights' },
  ac:      { watts: 1500, label: 'Air conditioning' },
};

export const LUNCH_EMISSIONS = {
  walk: 0.0,
  stay_in: 0.0,
  vehicle: 0.3 // kg CO2 fixed estimate
};

/**
 * Calculates commute emissions.
 * @param {string} mode - 'metro', 'bus', 'carpool', 'solo_car', 'walk_bike'
 * @param {number} distanceKm - Round trip distance in km
 * @returns {number} kg CO2
 */
export function calculateCommuteEmissions(mode, distanceKm) {
  const rate = COMMUTE_EMISSION_RATES[mode] ?? 0;
  return rate * (distanceKm || 0);
}

export function wfhEmissions({ electricitySource, hasAC, workHours = 8 }) {
  const baseKw = (45 + 30 + 10 + 20) / 1000      // 0.105 kW without AC
  const acKw   = hasAC ? 1500 / 1000 : 0          // 1.5 kW if AC on
  const totalKwh = (baseKw + acKw) * workHours

  const factors = {
    grid:  0.757,   // CEA India 2024
    solar: 0.04,    // lifecycle only
    mixed: 0.40,    // estimated 50/50 split
  }
  const factor = factors[electricitySource] || factors.grid
  return parseFloat((totalKwh * factor).toFixed(3))
}

/**
 * Calculates WFH office energy emissions.
 * @param {string} source - 'grid', 'solar', 'mixed'
 * @param {boolean} hasAC - AC running status
 * @returns {number} kg CO2
 */
export function calculateWFHEmissions(source, hasAC = false) {
  return wfhEmissions({ electricitySource: source, hasAC });
}

export const DAILY_WORST_CASE = 16.5;

export function carbonScore(dailyKg) {
  const raw = 100 - ((dailyKg / DAILY_WORST_CASE) * 100);
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Calculates total daily emissions.
 * @param {Object} log - Daily log details
 * @returns {Object} { totalKg, carbonScore, breakdown: { commute, wfh, lunch } }
 */
export function calculateDailyEmissions(log) {
  const { workLocation, commuteMode, commuteKm, wfhElectricitySource, lunchMode } = log;
  const hasAC = log.wfhHasAC ?? log.wfh_has_ac ?? false;

  let commuteKg = 0;
  let wfhKg = 0;
  let lunchKg = LUNCH_EMISSIONS[lunchMode] ?? 0;

  if (workLocation === 'office') {
    commuteKg = calculateCommuteEmissions(commuteMode, commuteKm);
  } else if (workLocation === 'home') {
    wfhKg = calculateWFHEmissions(wfhElectricitySource, hasAC);
  }

  const totalKg = commuteKg + wfhKg + lunchKg;
  const score = carbonScore(totalKg);

  return {
    totalKg: parseFloat(totalKg.toFixed(3)),
    carbonScore: score,
    breakdown: {
      commute: parseFloat(commuteKg.toFixed(3)),
      wfh: parseFloat(wfhKg.toFixed(3)),
      lunch: parseFloat(lunchKg.toFixed(3))
    }
  };
}

/**
 * Calculates user streak based on logs.
 * Count consecutive days with score >= 70, looking back chronologically.
 * @param {Array} logs - Sorted by date descending
 * @returns {Object} { currentStreak, lastSevenDots }
 */
export function calculateStreak(logs) {
  // Sort logs by date descending
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let currentStreak = 0;
  let active = true;

  // Let's find current streak of consecutive days with score >= 70
  // Note: we start checking from today/yesterday.
  for (let i = 0; i < sortedLogs.length; i++) {
    if (sortedLogs[i].carbon_score >= 70) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Get last 7 streak dots (filled = green day (score >= 70), empty = missed/amber/red (<70))
  // The dots represent the last 7 chronological log entries (or padded to 7 if less)
  const lastSevenDots = [];
  const recentLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-7);
  
  for (let i = 0; i < 7; i++) {
    const logIndex = recentLogs.length - 7 + i;
    if (logIndex >= 0 && recentLogs[logIndex]) {
      lastSevenDots.push({
        date: recentLogs[logIndex].date,
        logged: true,
        green: recentLogs[logIndex].carbon_score >= 70,
        score: recentLogs[logIndex].carbon_score
      });
    } else {
      lastSevenDots.push({
        logged: false,
        green: false,
        score: 0
      });
    }
  }

  return {
    currentStreak,
    lastSevenDots
  };
}
