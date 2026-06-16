// Custom React hook to fetch air quality
import { useState, useEffect } from 'react';
import { fetchAirQuality } from '../lib/airQuality';

export function useAQI(lat, lng) {
  const [aqiData, setAqiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lat || !lng) {
      setAqiData(null);
      return;
    }

    let isMounted = true;
    async function getAQI() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAirQuality(lat, lng);
        if (isMounted) {
          setAqiData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    getAQI();
    return () => {
      isMounted = false;
    };
  }, [lat, lng]);

  return { aqiData, loading, error };
}
export default useAQI;
