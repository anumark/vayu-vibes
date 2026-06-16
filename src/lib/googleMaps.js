// Google Maps API Loader and Utils

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const isGoogleMapsConfigured = 
  googleMapsApiKey && 
  googleMapsApiKey !== 'your_google_maps_api_key_here';

/**
 * Dynamically loads the Google Maps JavaScript API script.
 */
export function loadGoogleMapsScript(callback) {
  if (!isGoogleMapsConfigured) {
    console.warn("Google Maps API key is missing or set to placeholder. Operating in Mock Map mode.");
    return;
  }

  if (window.google && window.google.maps) {
    if (callback) callback();
    return;
  }

  const existingScript = document.getElementById('google-maps-script');
  if (existingScript) {
    existingScript.addEventListener('load', () => {
      if (callback) callback();
    });
    return;
  }

  const script = document.createElement('script');
  script.id = 'google-maps-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    if (callback) callback();
  };
  document.head.appendChild(script);
}

/**
 * Calculates distance between two coordinates using the Haversine formula (fallback/client calculation)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(1));
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}
