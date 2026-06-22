import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useAppStore } from './store/useAppStore';
import Dashboard from './pages/Dashboard';
import DailyLog from './pages/DailyLog';
import TeamView from './pages/TeamView';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';

// ---------------------------------------------------------------------------
// FullScreenLoader — shown while auth state is being determined
// ---------------------------------------------------------------------------
function FullScreenLoader() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center h-screen bg-bg-app">
      <div className="w-12 h-12 rounded-full border-4 border-t-green-carbon border-gray-200 animate-spin" />
      <p className="text-xs text-gray-400 font-semibold mt-4 uppercase tracking-widest">
        Vayu Vibes
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// checkUserOnboarding — single source of truth for "is this user done?"
// Returns: 'new' | 'incomplete' | 'done'
// ---------------------------------------------------------------------------
async function checkUserOnboarding(userId) {
  if (!isSupabaseConfigured || !supabase) {
    // localStorage mode: check the mock user object
    const stored = localStorage.getItem('vayu_user');
    if (!stored) return 'new';
    const u = JSON.parse(stored);
    if (u.id !== 'mock-user-123') return 'new';
    return u.home_lat != null && u.office_lat != null ? 'done' : 'incomplete';
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('onboarding_complete, home_lat, office_lat')
    .eq('id', userId)
    .single();

  // PGRST116 = row not found = brand-new account
  if (error?.code === 'PGRST116' || !profile) return 'new';

  const isComplete =
    profile.onboarding_complete === true ||
    (profile.home_lat != null && profile.office_lat != null);

  return isComplete ? 'done' : 'incomplete';
}

// ---------------------------------------------------------------------------
// OnboardingGuard — prevents existing users from accessing /onboarding
// directly via URL bar. Only new / incomplete users are let through.
// ---------------------------------------------------------------------------
function OnboardingGuard({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'allow' | 'deny'

  useEffect(() => {
    const run = async () => {
      if (!isSupabaseConfigured || !supabase) {
        // localStorage mode
        const stored = localStorage.getItem('vayu_user');
        if (!stored) { setStatus('allow'); return; }
        const u = JSON.parse(stored);
        const done = u.home_lat != null && u.office_lat != null;
        setStatus(done ? 'deny' : 'allow');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus('allow'); return; } // unauthenticated → Onboarding handles it

      const result = await checkUserOnboarding(session.user.id);
      setStatus(result === 'done' ? 'deny' : 'allow');
    };
    run();
  }, []);

  if (status === 'checking') return <FullScreenLoader />;
  if (status === 'deny') return <Navigate to="/" replace />;
  return children;
}

// ---------------------------------------------------------------------------
// MainLayout — manages auth state and renders the correct shell
// ---------------------------------------------------------------------------

// authStatus: 'loading' | 'unauthenticated' | 'onboarding' | 'ready'
function MainLayout() {
  const { initApp, user } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Auth routing state — separate from Zustand store loading
  const [authStatus, setAuthStatus] = useState('loading');
  const initRan = useRef(false);

  // -------------------------------------------------------------------------
  // checkUserState — runs on mount and on SIGNED_IN events
  // -------------------------------------------------------------------------
  const checkUserState = React.useCallback(async (session) => {
    if (!session?.user) {
      setAuthStatus('unauthenticated');
      return;
    }

    try {
      const result = await checkUserOnboarding(session.user.id);
      if (result === 'new' || result === 'incomplete') {
        setAuthStatus('onboarding');
      } else {
        setAuthStatus('ready');
      }
    } catch (err) {
      console.error('checkUserState error:', err);
      // Default to ready on unexpected error — less disruptive for existing users
      setAuthStatus('ready');
    }
  }, []);

  // -------------------------------------------------------------------------
  // Boot: get current session + subscribe to auth state changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    const boot = async () => {
      if (!isSupabaseConfigured || !supabase) {
        // localStorage / mock mode — delegate to Zustand store
        await initApp();
        // After initApp, check localStorage directly
        const stored = localStorage.getItem('vayu_user');
        if (!stored) {
          setAuthStatus('unauthenticated');
          return;
        }
        const u = JSON.parse(stored);
        if (u.id !== 'mock-user-123') {
          setAuthStatus('unauthenticated');
          return;
        }
        const done = u.home_lat != null && u.office_lat != null;
        setAuthStatus(done ? 'ready' : 'onboarding');
        return;
      }

      // Supabase mode
      const { data: { session } } = await supabase.auth.getSession();
      await checkUserState(session);

      // Also run initApp to populate Zustand store for all pages
      if (session?.user) initApp();

      // Subscribe to auth changes — handle sign-in and sign-out
      if (!window.__vayuAuthListener) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (_event === 'SIGNED_OUT') {
              setAuthStatus('unauthenticated');
              // Navigate to unauthenticated state (Onboarding acts as login)
              navigate('/', { replace: true });
              return;
            }
            if (_event === 'SIGNED_IN') {
              await checkUserState(session);
              if (session?.user) initApp();
            }
            // Ignore TOKEN_REFRESHED, USER_UPDATED, etc.
          }
        );
        window.__vayuAuthListener = subscription;
      }
    };

    boot();
  }, [checkUserState, initApp, navigate]);

  // -------------------------------------------------------------------------
  // Re-check after onboarding completes
  // When Onboarding.jsx calls navigate('/') after saving the profile,
  // location.pathname changes to '/' but authStatus is still 'onboarding'.
  // Detect this and re-run checkUserOnboarding so authStatus flips to 'ready'.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (authStatus !== 'onboarding') return;
    if (location.pathname === '/onboarding') return;

    // User has navigated away from /onboarding — re-check their profile
    const recheck = async () => {
      setAuthStatus('loading');
      try {
        if (!isSupabaseConfigured || !supabase) {
          const stored = localStorage.getItem('vayu_user');
          if (stored) {
            const u = JSON.parse(stored);
            const done = u.home_lat != null && u.office_lat != null;
            setAuthStatus(done ? 'ready' : 'onboarding');
          } else {
            setAuthStatus('unauthenticated');
          }
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setAuthStatus('unauthenticated'); return; }
        const result = await checkUserOnboarding(session.user.id);
        setAuthStatus(result === 'done' ? 'ready' : 'onboarding');
      } catch {
        setAuthStatus('ready'); // default to ready on error
      }
    };
    recheck();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // -------------------------------------------------------------------------
  // Routing based on authStatus
  // -------------------------------------------------------------------------

  // While checking auth state, show loader
  if (authStatus === 'loading') return <FullScreenLoader />;

  // Unauthenticated: show Onboarding as login screen (step 1)
  if (authStatus === 'unauthenticated') {
    // If they try to access /onboarding while not logged in, show it
    // (it functions as the login/signup page)
    return <Onboarding />;
  }

  // New / incomplete onboarding — send to /onboarding
  if (authStatus === 'onboarding') {
    // If already at /onboarding, render it; otherwise redirect
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Authenticated + onboarding complete — main app shell
  const currentPath = location.pathname;
  const hideNav = currentPath === '/onboarding';

  // If an onboarded user somehow lands on /onboarding, bounce them out
  if (authStatus === 'ready' && currentPath === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg-app text-gray-800 pb-20">

      {/* Top Ambient Bar — hidden during onboarding */}
      {!hideNav && (
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
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full">
        <Routes>
          <Route path="/" element={<Dashboard onTabChange={(tab) => navigate(tab === 'log' ? '/log' : '/')} />} />
          <Route path="/log"     element={<DailyLog />} />
          <Route path="/team"    element={<TeamView />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/onboarding" element={
            <OnboardingGuard>
              <Onboarding />
            </OnboardingGuard>
          } />
          {/* Catch-all — redirect unknown paths to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Bottom Navigation Bar — hidden on /onboarding */}
      {!hideNav && (
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
      )}
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
