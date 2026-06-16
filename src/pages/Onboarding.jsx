import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import CommuteMap from '../components/CommuteMap';

/**
 * Onboarding Page - Initial flow if user hasn't set up coordinates
 * Asks for Home & Office spots via map picker, energy sources, and team setup.
 */
export default function Onboarding() {
  const { updateProfile, mockLogin } = useAppStore();
  const [step, setStep] = useState(1); // 1: Login/Mock, 2: Map Setup, 3: Power & Team
  
  // Login fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  // Location fields
  const [homeLoc, setHomeLoc] = useState({ lat: 12.9716, lng: 77.5946, address: 'Koramangala, Bengaluru, Karnataka' });
  const [officeLoc, setOfficeLoc] = useState({ lat: 12.9279, lng: 77.6271, address: 'HSR Layout, Bengaluru, Karnataka' });

  // Preferences fields
  const [electricity, setElectricity] = useState('grid');
  const [teamCode, setTeamCode] = useState('');
  const [teamAction, setTeamAction] = useState('none'); // 'none', 'join', 'create'
  const [newTeamName, setNewTeamName] = useState('');
  
  const { joinTeam, createTeam } = useAppStore();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    await mockLogin(email, name || 'Eco Professional');
    setStep(2);
  };

  const handleMapSubmit = () => {
    setStep(3);
  };

  const handleFinish = async () => {
    // 1. Save locations and electricity source
    await updateProfile({
      home_lat: homeLoc.lat,
      home_lng: homeLoc.lng,
      home_address: homeLoc.address,
      office_lat: officeLoc.lat,
      office_lng: officeLoc.lng,
      office_address: officeLoc.address,
      electricity_source: electricity,
    });

    // 2. Handle team selection
    if (teamAction === 'join' && teamCode) {
      await joinTeam(teamCode);
    } else if (teamAction === 'create' && newTeamName) {
      await createTeam(newTeamName);
    }

    // Refresh page or trigger redirect
    window.location.reload();
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 max-w-md mx-auto w-full">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-gray-900 tracking-tight flex items-center justify-center gap-1.5">
          💨 <span className="font-semibold text-green-carbon">Vayu</span> Vibes
        </h1>
        <p className="text-sm text-gray-400 mt-1">Carbon consciousness for Indian professionals</p>
      </div>

      <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-gray-100/50">
        
        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Onboarding</span>
          <div className="flex gap-1">
            <div className={`w-6 h-1 rounded-full ${step >= 1 ? 'bg-green-carbon' : 'bg-gray-200'}`} />
            <div className={`w-6 h-1 rounded-full ${step >= 2 ? 'bg-green-carbon' : 'bg-gray-200'}`} />
            <div className={`w-6 h-1 rounded-full ${step >= 3 ? 'bg-green-carbon' : 'bg-gray-200'}`} />
          </div>
        </div>

        {/* STEP 1: Quick Email Sign In */}
        {step === 1 && (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 animate-scale-in">
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-800">Welcome to Vayu Vibes</h2>
              <p className="text-xs text-gray-400 mt-1">Let's check carbon impact on your daily routines.</p>
            </div>

            <div className="flex flex-col gap-1 mt-2">
              <label className="text-xs text-gray-500 font-semibold">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ananya Roy"
                className="p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-carbon"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-semibold">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ananya@company.com"
                className="p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-carbon"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-green-carbon hover:bg-green-600 text-white font-medium text-sm rounded-xl transition-all shadow-sm"
            >
              Get Started
            </button>
          </form>
        )}

        {/* STEP 2: Draggable Maps Picker */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-scale-in">
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-800">Setup Locations</h2>
              <p className="text-xs text-gray-400 mt-1">Select your Home 🏠 and Office 🏢 coordinates on the map.</p>
            </div>

            <CommuteMap
              mode="picker"
              homeLocation={homeLoc}
              officeLocation={officeLoc}
              onLocationsSelected={(home, office) => {
                setHomeLoc(home);
                setOfficeLoc(office);
              }}
            />

            <button
              onClick={handleMapSubmit}
              className="w-full mt-2 py-3 bg-green-carbon hover:bg-green-600 text-white font-medium text-sm rounded-xl transition-all shadow-sm"
            >
              Save Locations & Continue
            </button>
          </div>
        )}

        {/* STEP 3: Electricity & Teams */}
        {step === 3 && (
          <div className="flex flex-col gap-4 animate-scale-in">
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-800">Preferences & Team</h2>
              <p className="text-xs text-gray-400 mt-1">Help us calibrate WFH draw rates & select a team.</p>
            </div>

            {/* Electricity Source */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Home Electricity Source</label>
              <div className="grid grid-cols-3 gap-2">
                {['grid', 'mixed', 'solar'].map((src) => (
                  <button
                    key={src}
                    onClick={() => setElectricity(src)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${electricity === src ? 'bg-green-50 border-green-500 text-green-carbon' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                  >
                    {src === 'grid' && '⚡ Grid'}
                    {src === 'mixed' && '🌗 Mixed'}
                    {src === 'solar' && '☀️ Solar'}
                  </button>
                ))}
              </div>
            </div>

            {/* Teams setup */}
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Vayu Challenge Team</label>
              <div className="flex bg-gray-50 p-1 rounded-xl gap-1">
                {['none', 'join', 'create'].map((act) => (
                  <button
                    key={act}
                    onClick={() => setTeamAction(act)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${teamAction === act ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400'}`}
                  >
                    {act === 'none' ? 'Skip' : act}
                  </button>
                ))}
              </div>

              {teamAction === 'join' && (
                <input
                  type="text"
                  placeholder="Enter 6-character Code (e.g. ECO123)"
                  maxLength={6}
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  className="p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-carbon mt-1 text-center font-mono font-semibold tracking-widest"
                />
              )}

              {teamAction === 'create' && (
                <input
                  type="text"
                  placeholder="Enter Team Name (e.g. Acme Green)"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-carbon mt-1"
                />
              )}
            </div>

            <button
              onClick={handleFinish}
              className="w-full mt-4 py-3 bg-green-carbon hover:bg-green-600 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
            >
              Complete Setup 🎉
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
