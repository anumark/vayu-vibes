import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import CommuteMap from '../components/CommuteMap';

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

  // Local state for UI only notification toggles
  const [emailDigest, setEmailDigest] = useState(true);
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = async () => {
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
    if (res.success) {
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    }
  };

  const handleLeaveTeam = async () => {
    await updateProfile({ team_code: null });
  };

  return (
    <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-6 animate-scale-in">
      <div>
        <h2 className="text-2xl font-light text-gray-900 leading-tight">Settings & Profile</h2>
        <p className="text-xs text-gray-400 mt-0.5 font-medium">Fine-tune your carbon calibrations</p>
      </div>

      {showSaved && (
        <div className="bg-green-50 border border-green-200 text-green-carbon text-xs p-3.5 rounded-2xl animate-scale-in">
          🎉 Settings and preferences updated!
        </div>
      )}

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
      <div className="material-card p-5 flex flex-col gap-4">
        <h3 className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Calibration coordinates</h3>
        
        <CommuteMap
          mode="picker"
          homeLocation={homeLoc}
          officeLocation={officeLoc}
          onLocationsSelected={(home, office) => {
            setHomeLoc(home);
            setOfficeLoc(office);
          }}
        />
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
                onClick={() => setElectricity(src)}
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
          className="w-full py-4 bg-green-carbon hover:bg-green-600 text-white font-semibold text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2"
        >
          💾 Save Changes
        </button>

        <button
          onClick={signOut}
          className="w-full py-3.5 bg-gray-100 hover:bg-gray-250 text-gray-600 font-semibold text-sm rounded-2xl transition-all border border-gray-200/50"
        >
          Sign Out Account
        </button>
      </div>

      {/* Margin Padding space */}
      <div className="h-12" />
    </div>
  );
}
