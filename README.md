# 🌿 Vayu Vibes

> **Vayu** (वायु) = Air in Sanskrit &nbsp;·&nbsp; **Vibes** = the energy you bring to the planet

A carbon footprint tracker built for urban working professionals — helping them understand, log, and reduce their daily CO₂ impact through three simple decisions they already make every day.

Built as part of the **H2S Prompt Challenge**.

🔗 **Live app:** [vayu-vibes.vercel.app](https://vayu-vibes.vercel.app)

---

## 📌 Chosen Vertical

**Individual Carbon Footprint Tracking — Urban Working Professionals**

Most carbon tracking tools are built for corporations. Vayu Vibes targets the individual — specifically the hybrid/office-going professional in Indian cities — whose daily environmental impact is shaped almost entirely by three recurring choices:

1. Where they work (home vs office)
2. How they commute
3. How they spend their lunch or snack break

These three decisions account for the majority of a working professional's personal carbon output, yet no existing app addresses them together with enough context to drive real behaviour change.

---

## 💡 Approach and Logic

### The Core Insight — WFH Isn't Always Greener

The central, counterintuitive insight driving this product:

> A work-from-home day with air conditioning running on the Indian grid emits **~9.5 kg CO₂** — more than driving to office and back in a solo car (~6.3 kg CO₂).

This is the "aha moment" the app is designed to surface. Most people assume WFH = eco-friendly. The reality depends on their electricity source, whether AC is running, and how far their office actually is.

### Design Principles

- **No guilt, just data** — the app shows impact without lecturing
- **Under 60 seconds to log** — friction is the enemy of daily habits
- **Relatable units** — "3 trees saved" lands better than "65 kg CO₂"
- **Social proof** — team leaderboards drive collective behaviour change
- **Health + carbon together** — AQI shown alongside walking choices

### Emission Calculation Framework

Vayu Vibes uses the **GHG Protocol's three-scope framework**:

| Scope | What it covers | Tracked in Vayu Vibes |
|-------|---------------|----------------------|
| Scope 1 | Direct emissions (petrol car, cooking gas) | ✅ Solo car commute |
| Scope 2 | Purchased electricity | ✅ WFH home electricity |
| Scope 3 | Indirect/value chain (commuting, supply chain) | ✅ Metro, bus, carpool, lunch travel |

---

## ⚙️ How the Solution Works

### User Flow

```
Onboarding → Set home + office on map → Choose electricity source
     ↓
Daily Check-In (< 60 seconds)
     ↓
Work location? → [WFH] or [Office]
     ↓ (if Office)
Commute mode? → Metro / Bus / Carpool / Solo Car / Cycle/Walk
     ↓
AC running today? → Yes / No  (WFH only)
     ↓
Lunch break? → Walk / Vehicle / Stay at desk
     ↓
Carbon Score generated → Dashboard updated → Streak tracked
```

### Emission Calculations

All formulas live in `src/lib/emissions.js`.

**Commute:**
```
CO₂ (kg) = distance_km × emission_factor (kg/km)
```

| Mode | Emission Factor |
|------|----------------|
| Metro / Train | 0.041 kg/km |
| Bus | 0.089 kg/km |
| Carpool | 0.060 kg/km per person |
| Solo Car | 0.210 kg/km |
| Cycle / Walk | 0.000 kg/km |

Distance is auto-calculated via **Google Maps Distance Matrix API** using the user's saved home and office coordinates. Round trip = one-way × 2.

**WFH Electricity:**
```
CO₂ (kg) = power_draw_kWh × grid_factor (kg/kWh)
```

| Source | Grid Factor | Notes |
|--------|------------|-------|
| Indian Grid | 0.757 kg/kWh | CEA 2024 official figure |
| Solar | 0.040 kg/kWh | Lifecycle emissions only |
| Mixed | 0.400 kg/kWh | Estimated 50/50 split |

Device power draw (8h workday):

| Setup | kWh/day |
|-------|---------|
| Laptop + monitor + router + lights (no AC) | 0.65 kWh |
| With AC added | 12.6 kWh |

**Carbon Score:**
```
Score = 100 - ((daily_kg / 16.5) × 100)   clamped to [0, 100]
```
Where 16.5 kg is the worst-case realistic day (solo car 15km + AC on grid + car lunch).

| Score | Label | Daily kg |
|-------|-------|----------|
| > 70 | 🟢 Green | < 5 kg |
| 40–70 | 🟡 Amber | 5–10 kg |
| < 40 | 🔴 Red | > 10 kg |

**Annual impact translation:**
```
Trees equivalent  = total_kg_saved / 21.7   (one tree absorbs ~21.7 kg CO₂/year)
Flights avoided   = total_kg_saved / 110    (Mumbai–Delhi economy seat)
km not driven     = total_kg_saved / 0.21
```

### Key Features

**🗺️ Google Maps Integration**
- Home and office set once via map picker with Places Autocomplete
- Route drawn automatically on the commute log screen
- Route line colour changes by mode (blue = metro, red = solo car, green = bus)
- Distance Matrix API calculates real road distance, not straight-line

**🌬️ AQI-Aware Lunch Suggestions**
- OpenWeatherMap Air Pollution API fetches live AQI for user's location
- Contextual advice shown when "Walk" is selected:
  - AQI 0–50: "Great day to walk!"
  - AQI 51–100: "Walkable — avoid main roads"
  - AQI 101+: "Consider staying in or wearing a mask"

**🔥 Streak Tracking**
- Consecutive days with score ≥ 70 counted as a "green day"
- Milestone at 5 days: 🌱 "1 tree saved equivalent"
- Milestone at 10 days: 🌳 "You've offset a flight meal"

**👥 Team Leaderboard**
- Users join a team with a 6-character code
- Anonymised weekly kg rankings
- "You're saving X kg vs team average" insight card
- One-tap nudge message to share with colleagues

**📊 Dashboard**
- Animated carbon score ring (0–100)
- Daily breakdown: commute / home office / lunch
- 7-day rolling trend chart
- "WFH vs Office" comparison insight (appears after 3 logs of each type)
- Impact card: translates saved kg into relatable equivalents

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Routing | React Router v6 |
| Backend / Auth | Supabase (PostgreSQL + magic link auth) |
| Charts | Recharts |
| Maps | Google Maps JavaScript API |
| Air Quality | OpenWeatherMap Air Pollution API |
| Deployment | Vercel |

### Database Schema

```sql
users (
  id, email, name,
  home_lat, home_lng,
  office_lat, office_lng,
  electricity_source,   -- 'grid' | 'solar' | 'mixed'
  team_code,
  created_at
)

daily_logs (
  id, user_id, date,
  work_location,        -- 'wfh' | 'office'
  commute_mode,         -- 'metro' | 'bus' | 'carpool' | 'car' | 'bike'
  commute_km,
  has_ac,               -- boolean (WFH only)
  wfh_electricity_source,
  lunch_mode,           -- 'walk' | 'vehicle' | 'desk'
  total_kg_co2,
  carbon_score,
  steps_walked,
  created_at
)

teams (
  id, team_code, team_name, created_by, created_at
)
```

---

## 🧱 Assumptions Made

### Emission Factors
- Commute emission factors sourced from UK DEFRA / IPCC transport data — used as global approximations in the absence of India-specific per-mode figures
- Indian grid emission factor: **0.757 kg CO₂/kWh** from CEA (Central Electricity Authority) CO₂ Baseline Database Version 20.0, December 2024
- Solar lifecycle factor of 0.04 kg/kWh assumes standard rooftop photovoltaic system

### Device Power Draw
- Home office assumed to consist of: laptop (45W) + external monitor (30W) + router (10W) + lights (20W) = 105W base
- AC assumed at 1,500W (1.5 ton split AC, common in Indian urban homes)
- 8-hour workday assumed for all WFH calculations
- Office electricity not charged to the individual user (shared infrastructure, amortised across many employees)

### Distance & Routing
- Commute distance calculated as one-way road distance via Google Maps, doubled for round trip
- Transit (metro/bus) route distance used for those modes — slightly longer than driving in some cases
- Lunch break vehicle trip assumed at fixed 0.3 kg CO₂ if no precise distance available

### Users & Context
- Target user is an urban Indian professional commuting in a Tier 1 city (Bengaluru, Mumbai, Delhi, Hyderabad)
- Commute assumed to happen 5 days a week for office users
- Team feature assumes colleagues are in the same city / organisation
- WFH days assumed to run the full 8-hour workday from home

### Health / AQI
- AQI displayed is the user's current location at time of logging, not specifically at their lunch destination
- Walking steps for lunch break estimated at 600–1,200 steps (fixed range, not GPS-tracked in web version)
- Health advice is informational only and does not substitute medical guidance

---

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/yourusername/vayu-vibes.git
cd vayu-vibes

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your keys (see below)

# Start dev server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_OPENWEATHER_API_KEY=your_openweathermap_api_key
```

### Google Cloud APIs to enable
- Maps JavaScript API
- Places API (New)
- Distance Matrix API
- Geocoding API

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ScoreRing.jsx
│   ├── BreakdownBars.jsx
│   ├── WeeklyChart.jsx
│   ├── StreakDots.jsx
│   ├── CommuteMap.jsx
│   ├── AQICard.jsx
│   └── InsightCard.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── DailyLog.jsx
│   ├── TeamView.jsx
│   ├── Profile.jsx
│   └── Onboarding.jsx
├── lib/
│   ├── supabase.js
│   ├── emissions.js       ← all CO₂ calculation logic
│   ├── googleMaps.js
│   └── airQuality.js
├── store/
│   └── useAppStore.js     ← Zustand global state
└── hooks/
    ├── useAQI.js
    ├── useEmissions.js
    └── useStreak.js
```

---

## 🌱 What's Next (Roadmap)

- [ ] Android app with Google Health Connect integration for auto step sync
- [ ] Monthly carbon offset suggestions with verified project links
- [ ] Org-level dashboard for companies to track team emissions
- [ ] Notification reminders to log daily check-in
- [ ] Historical trends and year-on-year comparison
- [ ] Public profile / shareable carbon score card

---

## 👩‍💻 Built By

**Ananya** — Product Manager exploring the intersection of climate, behaviour change, and technology.

Built during the **H2S Prompt Challenge** using vibe coding on Cursor.

---

*Vayu Vibes is an H2S challenge submission. Emission factors are based on published research and official sources but should not be used for formal carbon reporting.*