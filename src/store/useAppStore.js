// Zustand Store for Vayu Vibes State Management
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calculateDailyEmissions } from '../lib/emissions';

// Pre-filled mock data for teams so leaderboard has active content
const MOCK_TEAM_MEMBERS = [
  { name: 'Rohan Sharma', weekly_kg: 1.25, carbon_score: 95 },
  { name: 'Priya Iyer', weekly_kg: 3.48, carbon_score: 75 },
  { name: 'Amit Patel', weekly_kg: 5.60, carbon_score: 52 },
  { name: 'Sneha Reddy', weekly_kg: 0.84, carbon_score: 98 },
  { name: 'Karan Malhotra', weekly_kg: 4.10, carbon_score: 65 }
];

export const useAppStore = create((set, get) => ({
  user: null,
  logs: [],
  team: null,
  teamMembers: [],
  loading: false,
  error: null,
  isAuthenticated: false,

  // Initialize App (Fetch profile & logs)
  initApp: async () => {
    set({ loading: true, error: null });
    try {
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          set({ isAuthenticated: true });
          await get().fetchProfile(session.user.id, session.user.email);
          await get().fetchLogs();
          await get().fetchTeamMembers();
        } else {
          set({ isAuthenticated: false, loading: false });
        }
      } else {
        // LocalStorage Fallback Authentication check
        const storedUser = localStorage.getItem('vayu_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          set({ user: parsedUser, isAuthenticated: true });
          get().fetchLogs();
          get().fetchTeamMembers();
        } else {
          set({ isAuthenticated: false });
        }
        set({ loading: false });
      }
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Mock Sign In (For local testing without database auth)
  mockLogin: async (email, name = 'Urban Professional') => {
    set({ loading: true });
    const mockUser = {
      id: 'mock-user-123',
      email,
      name,
      home_lat: null,
      home_lng: null,
      office_lat: null,
      office_lng: null,
      electricity_source: 'grid',
      team_code: null,
      created_at: new Date().toISOString()
    };
    
    localStorage.setItem('vayu_user', JSON.stringify(mockUser));
    set({ user: mockUser, isAuthenticated: true, loading: false });
    
    // Create initial empty logs for mock user
    if (!localStorage.getItem('vayu_logs')) {
      localStorage.setItem('vayu_logs', JSON.stringify([]));
    }
    
    await get().fetchLogs();
    await get().fetchTeamMembers();
  },

  // Supabase Magic Link Sign In
  signInWithOtp: async (email) => {
    set({ loading: true, error: null });
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (error) throw error;
        set({ loading: false });
        return { success: true, message: 'Check your email for the magic link!' };
      } else {
        // Fallback: Login immediately
        await get().mockLogin(email);
        set({ loading: false });
        return { success: true, message: 'Logged in automatically in LocalStorage mode!' };
      }
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  // Fetch Profile
  fetchProfile: async (userId, email) => {
    try {
      if (isSupabaseConfigured) {
        let { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error && error.code === 'PGRST116') {
          // Profile does not exist yet, create one
          const newProfile = {
            id: userId,
            email,
            name: email.split('@')[0],
            electricity_source: 'grid',
            created_at: new Date().toISOString()
          };
          const { data: created, error: createErr } = await supabase
            .from('users')
            .insert(newProfile)
            .select()
            .single();

          if (createErr) throw createErr;
          data = created;
        } else if (error) {
          throw error;
        }

        set({ user: data });
      }
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Update Profile
  updateProfile: async (updates) => {
    set({ loading: true, error: null });
    const currentUser = get().user;
    if (!currentUser) return;

    try {
      const updatedUser = { ...currentUser, ...updates };

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', currentUser.id);

        if (error) throw error;
      } else {
        localStorage.setItem('vayu_user', JSON.stringify(updatedUser));
      }

      set({ user: updatedUser, loading: false });
      
      // If team code changed, refresh team members list
      if (updates.team_code) {
        await get().fetchTeamMembers();
      }
      return { success: true };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  // Fetch Logs
  fetchLogs: async () => {
    const currentUser = get().user;
    if (!currentUser) return;

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('date', { ascending: false });

        if (error) throw error;
        set({ logs: data });
      } else {
        const storedLogs = localStorage.getItem('vayu_logs') || '[]';
        const parsedLogs = JSON.parse(storedLogs);
        // filter logs by current user (in case storage shared)
        const userLogs = parsedLogs.filter(log => log.user_id === currentUser.id);
        const sortedLogs = userLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        set({ logs: sortedLogs });
      }
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Add/Update Daily Log
  saveDailyLog: async (logData) => {
    set({ loading: true, error: null });
    const currentUser = get().user;
    if (!currentUser) return { success: false, error: 'No user authenticated' };

    try {
      // Calculate carbon metrics
      const calculations = calculateDailyEmissions(logData);
      
      const newLog = {
        user_id: currentUser.id,
        date: logData.date, // 'YYYY-MM-DD'
        work_location: logData.workLocation,
        commute_mode: logData.workLocation === 'office' ? logData.commuteMode : null,
        commute_km: logData.workLocation === 'office' ? parseFloat(logData.commuteKm || 0) : null,
        wfh_electricity_source: logData.workLocation === 'home' ? logData.wfhElectricitySource : null,
        lunch_mode: logData.lunchMode,
        total_kg_co2: calculations.totalKg,
        carbon_score: calculations.carbonScore,
        steps_walked: logData.lunchMode === 'walk' ? parseInt(logData.stepsWalked || 0) : 0,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured) {
        // Upsert based on user_id and date
        const { error } = await supabase
          .from('daily_logs')
          .upsert(newLog, { onConflict: 'user_id,date' });

        if (error) throw error;
      } else {
        const storedLogs = JSON.parse(localStorage.getItem('vayu_logs') || '[]');
        // Check if there is already a log for this date, if so replace it (upsert)
        const filtered = storedLogs.filter(log => !(log.user_id === currentUser.id && log.date === logData.date));
        
        // Add random id for keying
        newLog.id = 'log-' + Math.random().toString(36).substr(2, 9);
        filtered.push(newLog);
        
        localStorage.setItem('vayu_logs', JSON.stringify(filtered));
      }

      await get().fetchLogs();
      set({ loading: false });
      return { success: true };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  // Join Team with 6-char Code
  joinTeam: async (teamCode) => {
    set({ loading: true, error: null });
    try {
      const codeUpper = teamCode.toUpperCase();
      
      if (isSupabaseConfigured) {
        // Verify team exists
        const { data: teamData, error: teamErr } = await supabase
          .from('teams')
          .select('*')
          .eq('team_code', codeUpper)
          .single();

        if (teamErr) throw new Error('Team code not found.');
        
        await get().updateProfile({ team_code: codeUpper });
        set({ team: teamData, loading: false });
      } else {
        // Mock success
        const mockTeam = {
          team_code: codeUpper,
          team_name: 'Urban Eco-Warriors',
          created_by: 'another-user-id'
        };
        await get().updateProfile({ team_code: codeUpper });
        set({ team: mockTeam, loading: false });
      }
      return { success: true };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  // Create Team
  createTeam: async (teamName) => {
    set({ loading: true, error: null });
    const currentUser = get().user;
    if (!currentUser) return { success: false, error: 'No user authenticated' };

    try {
      const teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const newTeam = {
        team_code: teamCode,
        team_name: teamName,
        created_by: currentUser.id,
        created_at: new Date().toISOString()
      };

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('teams')
          .insert(newTeam);

        if (error) throw error;
      } else {
        // Mock team registry in localStorage
        const storedTeams = JSON.parse(localStorage.getItem('vayu_teams') || '[]');
        storedTeams.push(newTeam);
        localStorage.setItem('vayu_teams', JSON.stringify(storedTeams));
      }

      await get().updateProfile({ team_code: teamCode });
      set({ team: newTeam, loading: false });
      return { success: true, code: teamCode };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { success: false, error: err.message };
    }
  },

  // Fetch Team Members Leaderboard
  fetchTeamMembers: async () => {
    const currentUser = get().user;
    if (!currentUser || !currentUser.team_code) {
      set({ teamMembers: [] });
      return;
    }

    try {
      if (isSupabaseConfigured) {
        // Fetch users in same team
        const { data: members, error: membersErr } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('team_code', currentUser.team_code);

        if (membersErr) throw membersErr;

        // For each user, fetch their total emissions for current week
        const memberLeaderboard = [];
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

        for (const member of members) {
          const { data: memberLogs, error: logsErr } = await supabase
            .from('daily_logs')
            .select('total_kg_co2, carbon_score')
            .eq('user_id', member.id)
            .gte('date', startOfWeekStr);

          if (logsErr) throw logsErr;
          
          const totalKg = memberLogs.reduce((sum, log) => sum + log.total_kg_co2, 0);
          const avgScore = memberLogs.length > 0
            ? Math.round(memberLogs.reduce((sum, log) => sum + log.carbon_score, 0) / memberLogs.length)
            : 0;

          memberLeaderboard.push({
            id: member.id,
            name: member.id === currentUser.id ? `${member.name} (You)` : member.name,
            weekly_kg: parseFloat(totalKg.toFixed(2)),
            carbon_score: avgScore,
            is_current_user: member.id === currentUser.id
          });
        }

        set({ teamMembers: memberLeaderboard.sort((a, b) => b.carbon_score - a.carbon_score) });
      } else {
        // LocalStorage Fallback Mock Team leaderboards
        // Fetch current user's weekly emissions
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

        const userLogs = get().logs.filter(log => log.date >= startOfWeekStr);
        const userWeeklyKg = userLogs.reduce((sum, log) => sum + log.total_kg_co2, 0);
        const userAvgScore = userLogs.length > 0
          ? Math.round(userLogs.reduce((sum, log) => sum + log.carbon_score, 0) / userLogs.length)
          : 0;

        const currentMember = {
          id: currentUser.id,
          name: `${currentUser.name || 'You'} (You)`,
          weekly_kg: parseFloat(userWeeklyKg.toFixed(2)),
          carbon_score: userAvgScore,
          is_current_user: true
        };

        const mockList = MOCK_TEAM_MEMBERS.map((m, idx) => ({
          id: `mock-member-${idx}`,
          name: m.name,
          weekly_kg: m.weekly_kg,
          carbon_score: m.carbon_score,
          is_current_user: false
        }));

        mockList.push(currentMember);
        // Sort by Carbon Score (greenest first - since higher carbon_score is greener)
        // Wait, leaderboard is rank based on lower carbon total or higher carbon score?
        // "weekly kg total: rank + weekly kg total" - lower total is greener!
        // The instructions say: "weekly kg total ... rank + weekly kg total. Carbon score (0-100, higher = greener)."
        // Let's sort by carbon score descending (higher = greener) or weekly_kg ascending (lower = greener)
        // Let's sort by weekly_kg ascending (lower emissions = higher rank) which is standard for carbon savings!
        set({ teamMembers: mockList.sort((a, b) => a.weekly_kg - b.weekly_kg) });
      }
    } catch (err) {
      set({ error: err.message });
    }
  },

  // Sign Out
  signOut: async () => {
    set({ loading: true });
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem('vayu_user');
      set({ user: null, logs: [], team: null, teamMembers: [], isAuthenticated: false, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  }
}));
