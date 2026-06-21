import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import Dashboard from './pages/Dashboard';
import DailyLog from './pages/DailyLog';
import TeamView from './pages/TeamView';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';

// Layout Component containing the bottom navigation bar and page structure
function MainLayout() {
  const { user, isAuthenticated, initApp, loading } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Guard against React StrictMode double-invoking effects, which would
  // start two concurrent initApp() calls and create a race condition.
  const initRan = useRef(false);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    initApp();
  }, [initApp]);

  // Redirect to onboarding if authenticated but missing locations setup;
  // redirect away from /onboarding if locations are already configured.
  // IMPORTANT: require user !== null before evaluating home_lat.
  // Between set({ isAuthenticated: true }) and set({ user: data }),
  // there is a brief render where isAuthenticated=true but user=null.
  // Without the null guard, the check !user?.home_lat would fire incorrectly
  // and redirect an existing user to /onboarding.
  useEffect(() => {
    if (!loading && isAuthenticated && user !== null) {
      if (!user?.home_lat || !user?.office_lat) {
        // Locations not yet set — send to onboarding
        if (location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
        }
      } else if (location.pathname === '/onboarding') {
        // Already onboarded — don't stay on the onboarding route
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-screen bg-bg-app">
        <div className="w-12 h-12 rounded-full border-4 border-t-green-carbon border-gray-200 animate-spin" />
        <p className="text-xs text-gray-400 font-semibold mt-4 uppercase tracking-widest">Vayu Vibes</p>
      </div>
    );
  }

  // Switch to onboarding layout if not logged in
  if (!isAuthenticated) {
    return <Onboarding />;
  }

  const currentPath = location.pathname;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg-app text-gray-800 pb-20">
      
      {/* Top Ambient Bar */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-40 px-4 py-3.5 flex justify-between items-center shadow-xs">
        <span className="font-semibold text-base text-gray-800 tracking-tight flex items-center gap-1">
          🍃 <span className="text-green-carbon font-bold">Vayu</span> Vibes
        </span>
        {user?.team_code && (
          <span className="bg-blue-50 text-blue-carbon text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-blue-100">
            👥 {user.team_code}
          </span>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full">
        <Routes>
          <Route path="/" element={<Dashboard onTabChange={(tab) => navigate(tab === 'log' ? '/log' : '/')} />} />
          <Route path="/log" element={<DailyLog />} />
          <Route path="/team" element={<TeamView />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/onboarding" element={<Onboarding />} />
          {/* Catch-all — redirect unknown paths to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Google Fit Inspired Bottom Mobile Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 flex justify-around items-center z-40 shadow-lg max-w-md mx-auto rounded-t-2xl">
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3.5 rounded-2xl transition-all ${
            currentPath === '/' ? 'text-green-carbon bg-green-50/50' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="text-lg">🏡</span>
          <span className="text-[10px] font-bold tracking-wide">Home</span>
        </button>

        <button
          onClick={() => navigate('/log')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3.5 rounded-2xl transition-all ${
            currentPath === '/log' ? 'text-green-carbon bg-green-50/50' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="text-lg">📝</span>
          <span className="text-[10px] font-bold tracking-wide">Log</span>
        </button>

        <button
          onClick={() => navigate('/team')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3.5 rounded-2xl transition-all ${
            currentPath === '/team' ? 'text-green-carbon bg-green-50/50' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="text-lg">🤝</span>
          <span className="text-[10px] font-bold tracking-wide">Team</span>
        </button>

        <button
          onClick={() => navigate('/profile')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3.5 rounded-2xl transition-all ${
            currentPath === '/profile' ? 'text-green-carbon bg-green-50/50' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="text-lg">👤</span>
          <span className="text-[10px] font-bold tracking-wide">Profile</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}
