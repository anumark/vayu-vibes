import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * TeamView Page - Team challenges and leaderboard rank lists.
 * Compares user weekly footprint totals with teammates and triggers nudge sharing.
 */
export default function TeamView() {
  const { user, teamMembers, joinTeam, createTeam } = useAppStore();
  const [teamCode, setTeamCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [action, setAction] = useState('join'); // 'join' or 'create'
  const [status, setStatus] = useState({ success: null, message: '' });
  const [copied, setCopied] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!teamCode) return;
    const res = await joinTeam(teamCode);
    if (res.success) {
      setStatus({ success: true, message: 'Joined team successfully!' });
    } else {
      setStatus({ success: false, message: res.error || 'Failed to join.' });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!teamName) return;
    const res = await createTeam(teamName);
    if (res.success) {
      setStatus({ success: true, message: `Created team successfully! Code: ${res.code}` });
    } else {
      setStatus({ success: false, message: res.error || 'Failed to create.' });
    }
  };

  // Calculations for Leaderboard statistics
  const leaderboardStats = React.useMemo(() => {
    if (teamMembers.length === 0) return { avg: 0, delta: 0, currentUserWeekly: 0 };
    
    const totalWeekly = teamMembers.reduce((sum, m) => sum + m.weekly_kg, 0);
    const avg = parseFloat((totalWeekly / teamMembers.length).toFixed(2));
    
    const currentUser = teamMembers.find(m => m.is_current_user);
    const currentUserWeekly = currentUser ? currentUser.weekly_kg : 0;
    
    // Delta (Negative delta means user is saving compared to average - which is good!)
    const delta = parseFloat((currentUserWeekly - avg).toFixed(2));
    return { avg, delta, currentUserWeekly };
  }, [teamMembers]);

  // Nudge Action - Copy pre-filled message
  const handleNudge = () => {
    const nudgeMsg = `Hey Eco-warriors! 🍃 I'm tracking my carbon footprints on Vayu Vibes. My weekly total is ${leaderboardStats.currentUserWeekly} kg CO₂. Let's make this week green! Team Code: ${user?.team_code}`;
    navigator.clipboard.writeText(nudgeMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // If user is not yet in a team, show Join / Create Form
  if (!user?.team_code) {
    return (
      <div className="flex-1 px-4 py-8 max-w-md mx-auto w-full flex flex-col justify-center gap-6 animate-scale-in">
        <div className="text-center">
          <div className="text-5xl mb-3">🤝</div>
          <h2 className="text-2xl font-light text-gray-800">Join a Team Challenge</h2>
          <p className="text-xs text-gray-400 mt-1.5 px-6 leading-relaxed">
            Collaborate with colleagues to reduce commute energy draw and lead the green leaderboard.
          </p>
        </div>

        {status.message && (
          <div className={`text-xs p-3 rounded-xl border text-center ${status.success ? 'bg-green-50 border-green-200 text-green-carbon' : 'bg-red-50 border-red-200 text-red-carbon'}`}>
            {status.message}
          </div>
        )}

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs flex flex-col gap-4">
          <div className="flex bg-gray-50 p-1 rounded-xl gap-1">
            <button
              onClick={() => { setAction('join'); setStatus({ success: null, message: '' }); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${action === 'join' ? 'bg-white text-green-carbon shadow-xs' : 'text-gray-400'}`}
            >
              Join Team
            </button>
            <button
              onClick={() => { setAction('create'); setStatus({ success: null, message: '' }); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${action === 'create' ? 'bg-white text-green-carbon shadow-xs' : 'text-gray-400'}`}
            >
              Create Team
            </button>
          </div>

          {action === 'join' ? (
            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-semibold uppercase">Enter Team Code</label>
                <input
                  type="text"
                  placeholder="e.g. ECO123"
                  maxLength={6}
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  className="p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-carbon text-center font-mono font-semibold tracking-widest"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-green-carbon hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all shadow-xs"
              >
                Join Team Challenge
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-semibold uppercase">Team Name</label>
                <input
                  type="text"
                  placeholder="e.g. Koramangala Hub"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="p-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-carbon"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-green-carbon hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-all shadow-xs"
              >
                Create Team Challenge
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full flex flex-col gap-5 animate-scale-in">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-light text-gray-900 leading-tight">
            Team: <span className="font-semibold">{user.team_code}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Eco Leaderboard (Weekly Carbon Footprint)</p>
        </div>
      </div>

      {/* 1. Insight Delta Stats Card */}
      {leaderboardStats.delta <= 0 ? (
        <div className="material-card p-4.5 bg-green-50 border border-green-150 rounded-2xl flex items-center gap-3">
          <span className="text-3xl">🌱</span>
          <div>
            <h4 className="text-[10px] text-green-carbon uppercase font-bold tracking-wider">Eco Champion</h4>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">
              You're saving <span className="font-bold text-green-carbon">{Math.abs(leaderboardStats.delta)} kg CO₂</span> vs team average ({leaderboardStats.avg} kg)!
            </p>
          </div>
        </div>
      ) : (
        <div className="material-card p-4.5 bg-amber-50 border border-amber-150 rounded-2xl flex items-center gap-3">
          <span className="text-3xl">💡</span>
          <div>
            <h4 className="text-[10px] text-amber-carbon uppercase font-bold tracking-wider">Eco Tip</h4>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">
              You're drawing <span className="font-bold text-amber-carbon">{leaderboardStats.delta} kg CO₂</span> more than team average ({leaderboardStats.avg} kg). Try commuting by Metro tomorrow!
            </p>
          </div>
        </div>
      )}

      {/* 2. Leaderboard List */}
      <div className="material-card p-5 flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs text-gray-400 font-bold uppercase tracking-wider border-b border-gray-50 pb-2">
          <span>Rank & Member</span>
          <span>Weekly Footprint</span>
        </div>

        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
          {teamMembers.map((member, index) => {
            const isUser = member.is_current_user;
            const rank = index + 1;
            
            let rankEmoji = '🥉';
            if (rank === 1) rankEmoji = '🥇';
            else if (rank === 2) rankEmoji = '🥈';

            return (
              <div 
                key={member.id} 
                className={`flex justify-between items-center p-3 rounded-2xl border transition-all ${isUser ? 'bg-green-50 border-green-200 shadow-xs' : 'bg-gray-50 border-gray-100'}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-gray-400 w-5 text-center">
                    {rank <= 3 ? rankEmoji : rank}
                  </span>
                  <div className="flex flex-col">
                    <span className={`text-xs font-semibold ${isUser ? 'text-green-carbon font-bold' : 'text-gray-700'}`}>
                      {member.name}
                    </span>
                    <span className="text-[9px] text-gray-400">Score Rating: {member.carbon_score}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-bold ${isUser ? 'text-green-carbon' : 'text-gray-900'}`}>
                    {member.weekly_kg}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium ml-1">kg CO₂</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Nudge Team Call to Action */}
      <button
        onClick={handleNudge}
        className="w-full py-4 bg-blue-carbon hover:bg-blue-600 text-white font-semibold text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 mt-1"
      >
        📣 {copied ? 'Message Copied!' : 'Nudge Team (Share Progress)'}
      </button>

      {/* Bottom Padding */}
      <div className="h-12" />
    </div>
  );
}
