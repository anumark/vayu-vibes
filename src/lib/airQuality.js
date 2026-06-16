// Air Quality Service using OpenWeatherMap Air Pollution API or Local Mocking
import { isSupabaseConfigured } from './supabase';

const openWeatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

export const isOpenWeatherConfigured = 
  openWeatherApiKey && 
  openWeatherApiKey !== 'your_openweather_api_key_here';

/**
 * Fetches AQI for given lat/lng.
 * OpenWeatherMap Air Pollution returns AQI on a 1-5 scale:
 * 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = Very Poor.
 * We will scale this or convert it to a standard 0-500 index if needed, 
 * or directly map it to our required categories:
 * Good: "Great day to walk!"
 * Moderate: "Walkable — avoid main roads"
 * Unhealthy: "Consider staying in or wearing a mask"
 */
export async function fetchAirQuality(lat, lng) {
  if (!lat || !lng) {
    return { aqi: 0, text: 'No location selected', status: 'unknown' };
  }

  if (!isOpenWeatherConfigured) {
    // Generate a beautiful mock AQI based on the latitude/longitude
    // E.g., simulate a higher AQI near Delhi coordinates (lat 28.6, lng 77.2) and lower elsewhere
    const distToDelhi = Math.sqrt(Math.pow(lat - 28.61, 2) + Math.pow(lng - 77.23, 2));
    let mockAqiValue = 45; // default good
    
    if (distToDelhi < 1.0) {
      mockAqiValue = 165; // Delhi unhealthy
    } else if (distToDelhi < 4.0) {
      mockAqiValue = 82; // NCR moderate
    } else {
      // Semi-randomized realistic values for other urban nodes in India
      const sum = Math.abs(lat + lng);
      mockAqiValue = Math.floor((sum * 10) % 120);
    }

    return getAqiCategory(mockAqiValue);
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${openWeatherApiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch AQI');
    
    const data = await response.json();
    const owmAqi = data.list[0]?.main?.aqi || 1; // 1-5 scale

    // Map 1-5 scale to our 0-500 scale for UI consistency
    // 1 -> 30 (Good)
    // 2 -> 65 (Fair/Moderate)
    // 3 -> 90 (Moderate)
    // 4 -> 125 (Poor/Unhealthy)
    // 5 -> 180 (Very Poor/Unhealthy)
    const mockScale = {
      1: 25,
      2: 60,
      3: 85,
      4: 120,
      5: 185
    };
    
    return getAqiCategory(mockScale[owmAqi] || 25);
  } catch (error) {
    console.error('AQI Fetch error, falling back to mock:', error);
    return getAqiCategory(60); // Moderate fallback
  }
}

function getAqiCategory(aqiValue) {
  if (aqiValue <= 50) {
    return {
      aqi: aqiValue,
      status: 'good',
      color: '#1D9E75', // green
      text: 'Great day to walk!',
      badge: 'Good'
    };
  } else if (aqiValue <= 100) {
    return {
      aqi: aqiValue,
      status: 'moderate',
      color: '#EF9F27', // amber
      text: 'Walkable — avoid main roads',
      badge: 'Moderate'
    };
  } else {
    return {
      aqi: aqiValue,
      status: 'unhealthy',
      color: '#E24B4A', // red
      text: 'Consider staying in or wearing a mask',
      badge: 'Unhealthy'
    };
  }
}
