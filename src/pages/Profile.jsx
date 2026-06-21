import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import CommuteMap from '../components/CommuteMap';
import { isGoogleMapsConfigured, loadGoogleMapsScript } from '../lib/googleMaps';

/**
 * Profile Page - User profile settings and configurations
 * Manages draggable location coordinates, grid setups, and email notifications.
 */
export default function Profile() {
  const { user, updateProfile, signOut } = useAppStore();

  const [name, setName] = useState(user?.name || '');
  const [electricity, setElectricity] = useState(user?.electricity_source || 'grid');

  // Location states
  const [homeLoc, setHomeLoc] = useState({
    lat: user?.home_lat || 12.9716,
    lng: user?.home_lng || 77.5946,
    address: user?.home_address || 'Koramangala, Bengaluru'
  });
  const [officeLoc, setOfficeLoc] = useState({
    lat: user?.office_lat || 12.9279,
    lng: user?.office_lng || 77.6271,
    address: user?.office_address || 'HSR Layout, Bengaluru'
  });

  // Sync state when user object loads/changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setElectricity(user.electricity_source || 'grid');
      if (user.home_lat) {
        setHomeLoc({
          lat: user.home_lat,
          lng: user.home_lng,
          address: user.home_address || 'Koramangala, Bengaluru'
        });
      }
      if (user.office_lat) {
        setOfficeLoc({
          lat: user.office_lat,
          lng: user.office_lng,
          address: user.office_address || 'HSR Layout, Bengaluru'
        });
      }
    }
  }, [user]);

  // Local state for UI only notification toggles
  const [emailDigest, setEmailDigest] = useState(true);

  // New States for UX Improvements
  const [toast, setToast] = useState(null); // 'success' | 'error' | null
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [homeSavedAddress, setHomeSavedAddress] = useState('');
  const [officeSavedAddress, setOfficeSavedAddress] = useState('');
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  const mapRef = useRef(null);

  // Auto-dismiss toast after 3000ms
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Unsaved changes beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Intercept bottom nav click if dirty
  useEffect(() => {
    const handleCaptureClick = (e) => {
      if (!isDirty) return;
      const navButton = e.target.closest('nav button');
      if (navButton) {
        if (navButton.textContent.includes('Profile')) {
          return;
        }
        const leave = window.confirm("You have unsaved changes. Leave without saving?");
        if (!leave) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('click', handleCaptureClick, true);
    return () => window.removeEventListener('click', handleCaptureClick, true);
  }, [isDirty]);

  // Google Maps dynamic loading check
  useEffect(() => {
    if (isGoogleMapsConfigured) {
      loadGoogleMapsScript(() => {
        setGoogleMapsLoaded(true);
      });
    }
  }, []);

  // Reverse geocoding saved coordinates from profile
  useEffect(() => {
    const geocodeLocation = (lat, lng, callback) => {
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: parseFloat(lat), lng: parseFloat(lng) } }, (results, status) => {
          if (status === 'OK' && results?.[0]?.formatted_address) {
            callback(results[0].formatted_address);
          } else {
            callback(null);
          }
        });
      } else {
        callback(null);
      }
    };

    if (user?.home_lat && user?.home_lng) {
      geocodeLocation(user.home_lat, user.home_lng, (addr) => {
        setHomeSavedAddress(addr || user.home_address || 'Koramangala, Bengaluru');
      });
    } else {
      setHomeSavedAddress(user?.home_address || '');
    }

    if (user?.office_lat && user?.office_lng) {
      geocodeLocation(user.office_lat, user.office_lng, (addr) => {
        setOfficeSavedAddress(addr || user.office_address || 'HSR Layout, Bengaluru');
      });
    } else {
      setOfficeSavedAddress(user?.office_address || '');
    }
  }, [user, googleMapsLoaded]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateProfile({
        name,
        electricity_source: electricity,
        home_lat: homeLoc.lat,
        home_lng: homeLoc.lng,
        home_address: homeLoc.address,
        office_lat: officeLoc.lat,
        office_lng: officeLoc.lng,
        office_address: officeLoc.address,
      });
      if (res && res.success) {
        setToast('success');
        setIsDirty(false);
      } else {
        setToast('error');
      }
    } catch (err) {
      setToast('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeLocation = (target) => {
    mapRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      const buttons = mapRef.current?.querySelectorAll('button');
      if (buttons) {
        buttons.forEach(btn => {
          if (target === 'home' && btn.textContent.includes('Home')) {
            btn.click();
            const markers = mapRef.current?.querySelectorAll('div');
            markers?.forEach(m => {
              if (m.textContent.includes('Home')) {
                m.classList.add('animate-pulse');
                setTimeout(() => m.classList.remove('animate-pulse'), 2000);
              }
            });
          }
          if (target === 'office' && btn.textContent.includes('Office')) {
            btn.click();
            const markers = mapRef.current?.querySelectorAll('div');
            markers?.forEach(m => {
              if (m.textContent.includes('Office')) {
                m.classList.add('animate-pulse');
                setTimeout(() => m.classList.remove('animate-pulse'), 2000);
              }
            });
          }
        });
      }
    }, 400);
  };

  const handleLeaveTeam = async () => {
    await updateProfile({ team_code: null });
  };

  return (
    <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-6 animate-scale-in">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 150ms ease-in-out forwards;
        }
      `}</style>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '96px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          whiteSpace: 'nowrap',
        }}
        className={`
          flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium
          transition-all duration-300
          ${toast === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'}
        `}>
          {toast === 'success' ? '✅' : '❌'}
          {toast === 'success' ? 'Profile saved successfully' : 'Failed to save. Try again.'}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-light text-gray-900 leading-tight">Settings & Profile</h2>
        <p className="text-xs text-gray-400 mt-0.5 font-medium">Fine-tune your carbon calibrations</p>
      </div>

      {/* 1. Account details card */}
      <div className="material-card p-5 flex flex-col gap-4">
        <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider">General settings</h3>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-gray-500 font-bold uppercase">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-carbon"
            placeholder="Ananya Roy"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-gray-500 font-bold uppercase">Work Email</label>
          <input
            type="email"
            value={user?.email || ''}
            className="p-3 text-sm bg-gray-100 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed"
            disabled
          />
        </div>
      </div>

      {/* 2. Map Pickers for Coordinates */}
      <div ref={mapRef} className="material-card p-5 flex flex-col gap-4">
        <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Calibration coordinates</h3>

        <CommuteMap
          mode="picker"
          homeLocation={homeLoc}
          officeLocation={officeLoc}
          onLocationsSelected={(home, office) => {
            setHomeLoc(home);
            setOfficeLoc(office);
            setIsDirty(true);
          }}
        />
      </div>

      {/* Saved Locations Summary Card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-4">
        <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Your Saved Locations</h3>
        
        {!(user?.home_lat || user?.office_lat) ? (
          <div className="flex items-center gap-2.5 py-2 text-gray-400 text-xs italic">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>No location set yet — use the map above to pin your location</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Home Row */}
            <div className="flex justify-between items-start gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">🏠 Home</span>
                <span className="text-xs text-gray-650">{homeSavedAddress || 'No address set'}</span>
                {user?.home_lat && user?.home_lng && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    {parseFloat(user.home_lat).toFixed(4)}° N, {parseFloat(user.home_lng).toFixed(4)}° E
                  </span>
                )}
              </div>
              <button
                onClick={() => handleChangeLocation('home')}
                className="text-green-600 text-sm font-medium hover:underline border-none bg-transparent p-0 cursor-pointer"
              >
                Change
              </button>
            </div>

            <hr className="border-gray-100 my-0.5" />

            {/* Office Row */}
            <div className="flex justify-between items-start gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">🏢 Office</span>
                <span className="text-xs text-gray-650">{officeSavedAddress || 'No address set'}</span>
                {user?.office_lat && user?.office_lng && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    {parseFloat(user.office_lat).toFixed(4)}° N, {parseFloat(user.office_lng).toFixed(4)}° E
                  </span>
                )}
              </div>
              <button
                onClick={() => handleChangeLocation('office')}
                className="text-green-600 text-sm font-medium hover:underline border-none bg-transparent p-0 cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. WFH Power Settings */}
      <div className="material-card p-5 flex flex-col gap-4">
        <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Work From Home Grid draw</h3>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] text-gray-500 font-bold uppercase">Default Electricity Source</label>
          <div className="grid grid-cols-3 gap-2">
            {['grid', 'mixed', 'solar'].map((src) => (
              <button
                key={src}
                onClick={() => {
                  setElectricity(src);
                  setIsDirty(true);
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${electricity === src ? 'bg-green-50 border-green-carbon text-green-carbon' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
              >
                {src === 'grid' && '⚡ Grid'}
                {src === 'mixed' && '🌗 Mixed'}
                {src === 'solar' && '☀️ Solar'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Team Setup info */}
      <div className="material-card p-5 flex flex-col gap-3.5">
        <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Teams Challenge Configuration</h3>
        {user?.team_code ? (
          <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase leading-none">Joined Team Code</span>
              <span className="text-sm font-bold text-gray-800 mt-1">{user.team_code}</span>
            </div>
            <button
              onClick={handleLeaveTeam}
              className="text-[11px] font-bold bg-red-50 text-red-carbon border border-red-100 px-3 py-1.5 rounded-xl hover:bg-red-100/50 transition-all"
            >
              Leave Team
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No challenge team joined. Go to Team View tab to join one.</p>
        )}
      </div>

      {/* 5. Digest Toggle (UI-Only) */}
      <div className="material-card p-5 flex justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold text-gray-800">Weekly Email Digest</h3>
          <p className="text-[11px] text-gray-400">Receive reports of your eco offsets</p>
        </div>
        <button
          onClick={() => setEmailDigest(!emailDigest)}
          className={`w-12 h-6.5 rounded-full p-1 transition-all ${emailDigest ? 'bg-green-carbon flex justify-end' : 'bg-gray-200 flex justify-start'}`}
        >
          <div className="w-4.5 h-4.5 bg-white rounded-full shadow-xs" />
        </button>
      </div>

      {/* Action CTA buttons */}
      <div className="flex flex-col gap-2 mt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full py-4 bg-green-carbon hover:bg-green-600 text-white font-semibold text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 ${
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
            <>💾 Save Changes</>
          )}
        </button>

        {!confirmSignOut ? (
          <button
            onClick={() => setConfirmSignOut(true)}
            className="w-full py-3.5 bg-gray-100 hover:bg-gray-250 text-gray-600 font-semibold text-sm rounded-2xl transition-all border border-gray-200/50"
          >
            Sign Out Account
          </button>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in">
            <p className="text-sm font-medium text-gray-700 text-center">Are you sure you want to sign out?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmSignOut(false)}
                className="flex-1 py-2 text-xs font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={signOut}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-carbon rounded-xl hover:bg-red-650 transition-all cursor-pointer"
              >
                Yes, sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Margin Padding space */}
      <div className="h-12" />
    </div>
  );
}

