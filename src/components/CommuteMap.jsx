import React, { useState, useEffect, useRef } from 'react';
import { isGoogleMapsConfigured, loadGoogleMapsScript, calculateHaversineDistance } from '../lib/googleMaps';

/**
 * CommuteMap Component - Embeds Google Maps or renders an interactive SVG Canvas mock map.
 * Supported Modes:
 * 1. 'picker' - For Onboarding/Profile to select Home and Office locations.
 * 2. 'route' - Draws route between Home and Office, colored by commute mode (green = metro, red = solo car).
 * 3. 'lunch' - Shows Office location and a 500m radius walking circle.
 */
export default function CommuteMap({
  mode = 'picker', // 'picker', 'route', 'lunch'
  homeLocation = null, // { lat, lng, address }
  officeLocation = null, // { lat, lng, address }
  commuteMode = 'metro', // for route color
  onLocationsSelected = null, // callback for picker: (home, office) => {}
}) {
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const mapRef = useRef(null);

  // Default coordinate if empty (Bangalore center)
  const defaultHome = homeLocation || { lat: 12.9716, lng: 77.5946, address: 'Koramangala, Bengaluru, Karnataka' };
  const defaultOffice = officeLocation || { lat: 12.9279, lng: 77.6271, address: 'HSR Layout, Bengaluru, Karnataka' };

  const [localHome, setLocalHome] = useState(defaultHome);
  const [localOffice, setLocalOffice] = useState(defaultOffice);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchTarget, setActiveSearchTarget] = useState('home'); // 'home' or 'office'

  // Pre-configured suggestions for simulated Places Autocomplete
  const autocompleteSuggestions = [
    { name: 'Indiranagar, Bengaluru', lat: 12.9719, lng: 77.6412 },
    { name: 'Koramangala 4th Block, Bengaluru', lat: 12.9343, lng: 77.6243 },
    { name: 'Whitefield, Bengaluru', lat: 12.9698, lng: 77.7499 },
    { name: 'Connaught Place, New Delhi', lat: 28.6304, lng: 77.2177 },
    { name: 'Gurugram Sector 21, NCR', lat: 28.5034, lng: 77.0699 },
    { name: 'Bandra West, Mumbai', lat: 19.0600, lng: 72.8362 },
    { name: 'Hitec City, Hyderabad', lat: 17.4483, lng: 78.3741 }
  ];

  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (isGoogleMapsConfigured) {
      loadGoogleMapsScript(() => {
        setGoogleMapsLoaded(true);
      });
    }
  }, []);

  // Sync props changes to local state
  useEffect(() => {
    if (homeLocation) setLocalHome(homeLocation);
    if (officeLocation) setLocalOffice(officeLocation);
  }, [homeLocation, officeLocation]);

  // Actual Google Maps initialization
  useEffect(() => {
    if (googleMapsLoaded && mapRef.current && isGoogleMapsConfigured) {
      try {
        const bounds = new window.google.maps.LatLngBounds();
        const homeLatLng = new window.google.maps.LatLng(localHome.lat, localHome.lng);
        const officeLatLng = new window.google.maps.LatLng(localOffice.lat, localOffice.lng);

        bounds.extend(homeLatLng);
        bounds.extend(officeLatLng);

        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 12,
          center: homeLatLng,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry',
              stylers: [{ color: '#F3F4F6' }]
            }
          ]
        });

        if (mode === 'picker') {
          // Draggable markers
          const homeMarker = new window.google.maps.Marker({
            position: homeLatLng,
            map: map,
            draggable: true,
            title: 'Home 🏠',
            icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
          });

          const officeMarker = new window.google.maps.Marker({
            position: officeLatLng,
            map: map,
            draggable: true,
            title: 'Office 🏢',
            icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
          });

          // Geocoder to resolve address on drag end
          const geocoder = new window.google.maps.Geocoder();

          const updateMarkerCoords = (type, latLng) => {
            const coords = { lat: latLng.lat(), lng: latLng.lng() };
            geocoder.geocode({ location: coords }, (results, status) => {
              const address = status === 'OK' ? results[0].formatted_address : `${type} Coordinate`;
              
              if (type === 'home') {
                const updated = { ...coords, address };
                setLocalHome(updated);
                if (onLocationsSelected) onLocationsSelected(updated, localOffice);
              } else {
                const updated = { ...coords, address };
                setLocalOffice(updated);
                if (onLocationsSelected) onLocationsSelected(localHome, updated);
              }
            });
          };

          homeMarker.addListener('dragend', () => updateMarkerCoords('home', homeMarker.getPosition()));
          officeMarker.addListener('dragend', () => updateMarkerCoords('office', officeMarker.getPosition()));

          // Autocomplete setup for inputs (in UI we will handle inputs, but we hook up elements)
          const homeInput = document.getElementById('home-search-input');
          const officeInput = document.getElementById('office-search-input');

          if (homeInput) {
            const autocompleteHome = new window.google.maps.places.Autocomplete(homeInput);
            autocompleteHome.addListener('place_changed', () => {
              const place = autocompleteHome.getPlace();
              if (place.geometry) {
                const updated = {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                  address: place.formatted_address || place.name
                };
                setLocalHome(updated);
                homeMarker.setPosition(place.geometry.location);
                map.setCenter(place.geometry.location);
                if (onLocationsSelected) onLocationsSelected(updated, localOffice);
              }
            });
          }

          if (officeInput) {
            const autocompleteOffice = new window.google.maps.places.Autocomplete(officeInput);
            autocompleteOffice.addListener('place_changed', () => {
              const place = autocompleteOffice.getPlace();
              if (place.geometry) {
                const updated = {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                  address: place.formatted_address || place.name
                };
                setLocalOffice(updated);
                officeMarker.setPosition(place.geometry.location);
                map.setCenter(place.geometry.location);
                if (onLocationsSelected) onLocationsSelected(localHome, updated);
              }
            });
          }

          map.fitBounds(bounds);
        } else if (mode === 'route') {
          // Commute Route Drawing
          const directionsService = new window.google.maps.DirectionsService();
          const commuteColors = {
            metro:   '#378ADD',   // blue
            bus:     '#1D9E75',   // green
            carpool: '#EF9F27',   // amber
            solo_car: '#E24B4A',  // red
            car:     '#E24B4A',   // red
            walk_bike: '#639922', // dark green
            bike:    '#639922',   // dark green
          };

          const directionsRenderer = new window.google.maps.DirectionsRenderer({
            polylineOptions: {
              strokeColor: commuteColors[commuteMode] || '#1D9E75',
              strokeWeight: 4,
            },
            suppressMarkers: false,
          });
          directionsRenderer.setMap(map);

          directionsService.route({
            origin: homeLatLng,
            destination: officeLatLng,
            travelMode: window.google.maps.TravelMode.DRIVING,
          }, (result, status) => {
            if (status === 'OK') {
              directionsRenderer.setDirections(result);
            } else {
              // Fallback to straight polyline if directions API fails
              new window.google.maps.Polyline({
                path: [homeLatLng, officeLatLng],
                geodesic: true,
                strokeColor: commuteColors[commuteMode] || '#1D9E75',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                map: map
              });
            }
          });
        } else if (mode === 'lunch') {
          // Center at Office, draw 500m radius
          map.setCenter(officeLatLng);
          map.setZoom(15);

          new window.google.maps.Marker({
            position: officeLatLng,
            map: map,
            title: 'Office 🏢',
            icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
          });

          new window.google.maps.Circle({
            strokeColor: '#1D9E75',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#1D9E75',
            fillOpacity: 0.15,
            map: map,
            center: officeLatLng,
            radius: 500 // 500 meters
          });
        }
      } catch (err) {
        console.error("Google Maps setup failed:", err);
      }
    }
  }, [googleMapsLoaded, mode, commuteMode]);

  // Handle Search Input in Mock Map Picker Mode
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length > 1) {
      const filtered = autocompleteSuggestions.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (s) => {
    const updatedLocation = {
      lat: s.lat,
      lng: s.lng,
      address: s.name
    };
    if (activeSearchTarget === 'home') {
      setLocalHome(updatedLocation);
      if (onLocationsSelected) onLocationsSelected(updatedLocation, localOffice);
    } else {
      setLocalOffice(updatedLocation);
      if (onLocationsSelected) onLocationsSelected(localHome, updatedLocation);
    }
    setSearchQuery('');
    setSuggestions([]);
  };

  // Mock Map interactive dragging clicks
  const handleMockMapClick = (e) => {
    if (mode !== 'picker') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Translate click relative position to coordinates within a reasonable range of Bangalore
    const centerLat = 12.9716;
    const centerLng = 77.5946;
    const clickLat = centerLat + (0.5 - y / rect.height) * 0.2;
    const clickLng = centerLng + (x / rect.width - 0.5) * 0.2;

    const newLoc = {
      lat: parseFloat(clickLat.toFixed(4)),
      lng: parseFloat(clickLng.toFixed(4)),
      address: `Custom Location (Lat: ${clickLat.toFixed(3)}, Lng: ${clickLng.toFixed(3)})`
    };

    if (activeSearchTarget === 'home') {
      setLocalHome(newLoc);
      if (onLocationsSelected) onLocationsSelected(newLoc, localOffice);
    } else {
      setLocalOffice(newLoc);
      if (onLocationsSelected) onLocationsSelected(localHome, newLoc);
    }
  };

  // Distance Calculation
  const distance = calculateHaversineDistance(
    localHome.lat, localHome.lng,
    localOffice.lat, localOffice.lng
  );

  // If google maps is configured and loaded, we output the google container
  if (isGoogleMapsConfigured) {
    return (
      <div className="w-full flex flex-col gap-3">
        {mode === 'picker' && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium uppercase">Search Home Location</label>
              <input
                id="home-search-input"
                type="text"
                placeholder="Enter home address..."
                className="w-full text-sm p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-carbon"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 font-medium uppercase">Search Office Location</label>
              <input
                id="office-search-input"
                type="text"
                placeholder="Enter office address..."
                className="w-full text-sm p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-carbon"
              />
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-60 bg-gray-100 rounded-2xl overflow-hidden border border-gray-100" />
        {mode === 'route' && (
          <div className="flex justify-between items-center text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl">
            <span>Route Distance:</span>
            <span className="font-semibold text-gray-800 text-sm">{distance} km</span>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // INTERACTIVE MOCK MAP MARKUP (SVG/Canvas fallback)
  // ----------------------------------------------------
  
  // Choose commute route line colors
  let routeColor = '#378ADD';
  if (commuteMode === 'metro' || commuteMode === 'walk_bike') routeColor = '#1D9E75';
  else if (commuteMode === 'solo_car') routeColor = '#E24B4A';
  else if (commuteMode === 'bus' || commuteMode === 'carpool') routeColor = '#EF9F27';

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Mock Search Header */}
      {mode === 'picker' && (
        <div className="flex flex-col gap-2 relative">
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveSearchTarget('home')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeSearchTarget === 'home' ? 'bg-white text-green-carbon shadow-sm' : 'text-gray-500'}`}
            >
              🏠 Home
            </button>
            <button
              onClick={() => setActiveSearchTarget('office')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeSearchTarget === 'office' ? 'bg-white text-blue-carbon shadow-sm' : 'text-gray-500'}`}
            >
              🏢 Office
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={`Search location for ${activeSearchTarget}...`}
              className="w-full text-sm p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-carbon"
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg mt-1 z-30 max-h-40 overflow-y-auto">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSuggestion(s)}
                    className="w-full text-left text-xs p-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-none"
                  >
                    📍 {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SVG Canvas Map */}
      <div 
        onClick={handleMockMapClick}
        className={`relative w-full h-60 bg-emerald-50 rounded-2xl overflow-hidden border border-emerald-100 flex items-center justify-center ${mode === 'picker' ? 'cursor-crosshair' : ''}`}
        style={{
          backgroundImage: 'radial-gradient(#d1fae5 1px, transparent 1.5px)',
          backgroundSize: '16px 16px',
        }}
      >
        {/* Map Grid overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-100/10 to-transparent pointer-events-none" />

        {/* Picker Mode Instruction */}
        {mode === 'picker' && (
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-[10px] text-gray-500 font-medium shadow-sm pointer-events-none border border-gray-100">
            Click map to set <span className="font-bold">{activeSearchTarget.toUpperCase()}</span>
          </div>
        )}

        {/* Render Commute Route */}
        {mode === 'route' && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <line 
              x1="35%" 
              y1="65%" 
              x2="65%" 
              y2="35%" 
              stroke={routeColor} 
              strokeWidth="4" 
              strokeDasharray="4 6"
              className="animate-pulse"
            />
          </svg>
        )}

        {/* Render Lunch Break 500m circle */}
        {mode === 'lunch' && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <circle 
              cx="50%" 
              cy="50%" 
              r="60" 
              fill="#1D9E75" 
              fillOpacity="0.15" 
              stroke="#1D9E75" 
              strokeWidth="2" 
            />
            {/* Eatery Mock Pins */}
            <circle cx="45%" cy="42%" r="4" fill="#EF9F27" />
            <text x="45%" y="36%" fontSize="8" fill="#4B5563" fontWeight="500" textAnchor="middle">Chai Stand ☕</text>
            
            <circle cx="58%" cy="54%" r="4" fill="#EF9F27" />
            <text x="58%" y="64%" fontSize="8" fill="#4B5563" fontWeight="500" textAnchor="middle">Dosa Corner 🍛</text>
          </svg>
        )}

        {/* Location Markers */}
        {mode !== 'lunch' && (
          <div 
            className="absolute flex flex-col items-center pointer-events-none"
            style={{ left: '35%', top: '65%', transform: 'translate(-50%, -100%)' }}
          >
            <span className="text-3xl filter drop-shadow">🏠</span>
            <div className="bg-white/95 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase text-green-carbon border shadow-sm">Home</div>
          </div>
        )}

        <div 
          className="absolute flex flex-col items-center pointer-events-none"
          style={{ 
            left: mode === 'lunch' ? '50%' : '65%', 
            top: mode === 'lunch' ? '50%' : '35%', 
            transform: 'translate(-50%, -100%)' 
          }}
        >
          <span className="text-3xl filter drop-shadow">🏢</span>
          <div className="bg-white/95 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase text-blue-carbon border shadow-sm">Office</div>
        </div>

        {/* Map Watermarks / Mock Label */}
        <div className="absolute bottom-2 right-2 text-[9px] text-gray-400 bg-white/70 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
          📍 Bangalore Map Grid (Simulation)
        </div>
      </div>

      {/* Address / Distance Badges */}
      <div className="flex flex-col gap-1 bg-white p-3 rounded-2xl border border-gray-100 text-xs text-gray-500">
        {mode === 'picker' && (
          <>
            <div className="flex justify-between items-center py-0.5">
              <span>🏠 Home:</span>
              <span className="font-semibold text-gray-800 text-right truncate max-w-[200px]" title={localHome.address}>{localHome.address}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span>🏢 Office:</span>
              <span className="font-semibold text-gray-800 text-right truncate max-w-[200px]" title={localOffice.address}>{localOffice.address}</span>
            </div>
          </>
        )}
        {mode === 'route' && (
          <div className="flex justify-between items-center">
            <span>Route Distance ({commuteMode}):</span>
            <span className="font-bold text-blue-carbon text-sm">{distance} km</span>
          </div>
        )}
        {mode === 'lunch' && (
          <div className="text-center text-[10px] text-green-carbon font-semibold uppercase tracking-wider">
            🟢 500m Walking Boundary Active around Office
          </div>
        )}
      </div>
    </div>
  );
}
