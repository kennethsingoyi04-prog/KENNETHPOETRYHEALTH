
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, Complaint, User, WithdrawalRequest, Referral, MembershipTier } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, CloudStatus, syncAppStateToCloud } from '../dataService';
import { 
  ShieldCheck, Loader2, AlertTriangle, 
  Cloud, CloudOff, Database, RefreshCw, Check, Search, Flame, Server,
  UserCheck, MessageSquare, Eye, X, CheckCircle2, Wallet, ExternalLink,
  ChevronRight, Users, TrendingUp, Calendar, Clock, ArrowLeft, Target, Award,
  Activity, Zap, UserPlus, LogIn, Filter, Edit3, Save, Ban, ShieldAlert,
  Trash2, Radio
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'activity' | 'withdrawals' | 'memberships' | 'users' | 'complaints'>('activity');
  const [cloudInfo, setCloudInfo] = useState<CloudStatus>({ ok: false, isCloud: true });
  const [isChecking, setIsChecking] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);

  const runHealthCheck = async () => {
    setIsChecking(true);
    const info = await checkCloudHealth();
    setCloudInfo(info);
    setIsChecking(false);
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const handleManualSync = async () => {
    setIsChecking(true);
    await syncAppStateToCloud(state);
    await runHealthCheck();
  };

  const activityLog = useMemo(() => {
    const events: { type: 'signup' | 'login', user: User, date: Date }[] = [];
    state.users.forEach(u => {
      events.push({ type: 'signup', user: u, date: new Date(u.createdAt) });
      if (u.lastLoginAt) {
        events.push({ type: 'login', user: u, date: new Date(u.lastLoginAt) });
      }
    });
    return events.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50);
  }, [state.users]);

  // Helper to determine if a user is currently "Online" (active in last 10 mins)
  const isUserOnline = (user: User) => {
    if (!user.lastLoginAt) return false;
    const lastActive = new Date(user.lastLoginAt).getTime();
    const now = new Date().getTime();
    return (now - lastActive) < 600000; // 10 minutes threshold
  };

  const liveUsersCount = useMemo(() => {
    return state.users.filter(u => isUserOnline(u)).length;
  }, [state.users]);

  const filteredWithdrawals = useMemo(() => {
    return state.withdrawals.filter(w => 
      w.userName.toLowerCase().includes(searchText.toLowerCase()) || 
      w.phone.includes(searchText)
    );
  }, [state.withdrawals, searchText]);

  const allUsers = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
      u.username.toLowerCase().includes(searchText.toLowerCase()) ||
      u.phone.includes(searchText)
    ).sort((a, b) => {
      // Primary sort: Online users first
      const aOnline = isUserOnline(a);
      const bOnline = isUserOnline(b);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      // Secondary sort: Last login time
      const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [state.users, searchText]);

  const handleWithdrawalAction = (id: string, status: WithdrawalStatus) => {
    const updatedWithdrawals = state.withdrawals.map(w => w.id === id ? { ...w, status } : w);
    onStateUpdate({ withdrawals: updatedWithdrawals });
  };

  const handleMembershipAction = (userId: string, status: MembershipStatus) => {
    const updatedUsers = state.users.map(u => 
      u.id === userId ? { ...u, membershipStatus: status } : u
    );
    onStateUpdate({ users: updatedUsers });
    if (inspectingUser?.id === userId) {
      setInspectingUser(prev => prev ? { ...prev, membershipStatus: status } : null);
    }
  };

  const handleReplyComplaint = (id: string) => {
    const reply = replyText[id];
    if (!reply?.trim()) return;
    const updatedComplaints = state.complaints.map(c => 
      c.id === id ? { ...c, reply, status: 'RESOLVED' as const, updatedAt: new Date().toISOString() } : c
    );
    onStateUpdate({ complaints: updatedComplaints });
    setReplyText(prev => ({ ...prev, [id]: '' }));
  };

  const UserInspector = ({ user }: { user: User }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<User>({ ...user });
    
    const directDownlines = state.users.filter(u => u.referredBy === user.id);
    const directIds = directDownlines.map(u => u.id);
    const indirectDownlines = state.users.filter(u => directIds.includes(u.referredBy || ''));
    const userReferrals = state.referrals.filter(r => r.referrerId === user.id);
    
    const isOnline = isUserOnline(user);

    const handleSave = () => {
      const updatedUsers = state.users.map(u => u.id === user.id ? editData : u);
      onStateUpdate({ users: updatedUsers });
      setInspectingUser(editData);
      setIsEditMode(false);
    };

    const toggleBan = () => {
      if (window.confirm(`Are you sure you want to ${editData.isBanned ? 'UNBAN' : 'BAN'} this user?`)) {
        const updated = { ...editData, isBanned: !editData.isBanned };
        const updatedUsers = state.users.map(u => u.id === user.id ? updated : u);
        onStateUpdate({ users: updatedUsers });
        setEditData(updated);
        setInspectingUser(updated);
      }
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setInspectingUser(null)}></div>
        <div className="relative bg-white w-full max-w-5xl h-full max-h-[95vh] rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
          <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
            <div className="flex items-center gap-4">
              <button onClick={() => setInspectingUser(null)} className="p-3 bg-white border hover:bg-gray-100 rounded-2xl transition-all shadow-sm">
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  {isEditMode ? (
                    <input 
                      className="text-xl sm:text-2xl font-black uppercase tracking-tight bg-white border rounded-lg px-2"
                      value={editData.fullName}
                      onChange={e => setEditData({...editData, fullName: e.target.value})}
                    />
                  ) : (
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">{user.fullName}</h2>
                  )}
                  {isOnline ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[8px] font-black uppercase tracking-widest">Live Now</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full border border-gray-200">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <span className="text-[8px] font-black uppercase tracking-widest">Offline</span>
                    </div>
                  )}
                  {user.isBanned && <div className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><Ban size={10}/> BANNED</div>}
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Affiliate ID: {user.id} • @{user.username}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditMode ? (
                <button onClick={handleSave} className="flex items-center gap-2 bg-malawi-green text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20">
                  <Save size={16} /> Save Changes
                </button>
              ) : (
                <button onClick={() => setIsEditMode(true)} className="flex items-center gap-2 bg-malawi-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                  <Edit3 size={16} /> Edit Profile
                </button>
              )}
              <button onClick={() => setInspectingUser(null)} className="p-2 text-gray-400 hover:text-malawi-red transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-10 scrollbar-hide">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-malawi-green text-white p-5 rounded-3xl shadow-lg shadow-green-500/10">
                <Wallet size={18} className="mb-2 opacity-60" />
                <p className="text-[9px] uppercase font-black tracking-widest opacity-80">Current Wallet</p>
                {isEditMode ? (
                  <input 
                    type="number"
                    className="w-full bg-white/20 border-white/30 border rounded px-1 font-black text-white"
                    value={editData.balance}
                    onChange={e => setEditData({...editData, balance: Number(e.target.value)})}
                  />
                ) : (
                  <p className="text-xl font-black">MWK {user.balance.toLocaleString()}</p>
                )}
              </div>
              <div className="bg-malawi-black text-white p-5 rounded-3xl shadow-lg">
                <TrendingUp size={18} className="mb-2 opacity-60 text-malawi-red" />
                <p className="text-[9px] uppercase font-black tracking-widest opacity-80">Total Revenue</p>
                {isEditMode ? (
                   <input 
                   type="number"
                   className="w-full bg-white/10 border-white/20 border rounded px-1 font-black text-white"
                   value={editData.totalEarnings}
                   onChange={e => setEditData({...editData, totalEarnings: Number(e.target.value)})}
                 />
                ) : (
                  <p className="text-xl font-black">MWK {user.totalEarnings.toLocaleString()}</p>
                )}
              </div>
              <div className="bg-gray-50 border p-5 rounded-3xl">
                <Users size={18} className="mb-2 text-blue-500" />
                <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest">Direct Team</p>
                <p className="text-xl font-black">{directDownlines.length}</p>
              </div>
              <div className="bg-gray-50 border p-5 rounded-3xl">
                <Award size={18} className="mb-2 text-yellow-600" />
                <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest">Active Tier</p>
                {isEditMode ? (
                  <select 
                    className="w-full bg-white border rounded px-1 text-xs font-black"
                    value={editData.membershipTier}
                    onChange={e => setEditData({...editData, membershipTier: e.target.value as MembershipTier})}
                  >
                    {Object.values(MembershipTier).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <p className="text-xl font-black">{user.membershipTier}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-3xl p-6 space-y-5 border border-gray-100">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Security & Moderation</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-gray-400">Status</span>
                       {isEditMode ? (
                         <select 
                           className="bg-white border rounded text-[9px] font-black"
                           value={editData.membershipStatus}
                           onChange={e => setEditData({...editData, membershipStatus: e.target.value as MembershipStatus})}
                         >
                           {Object.values(MembershipStatus).map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                       ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          user.membershipStatus === MembershipStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>{user.membershipStatus}</span>
                       )}
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-gray-400">Joined</span>
                       <span className="font-black">{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-gray-400">Last Seen</span>
                       <span className="font-black text-blue-600">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-gray-400">Contact</span>
                       {isEditMode ? (
                         <input className="bg-white border rounded px-1" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})}/>
                       ) : <span className="font-black">{user.phone}</span>}
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-gray-400">WhatsApp</span>
                       {isEditMode ? (
                         <input className="bg-white border rounded px-1" value={editData.whatsapp} onChange={e => setEditData({...editData, whatsapp: e.target.value})}/>
                       ) : <span className="font-black text-green-600">{user.whatsapp}</span>}
                    </div>
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <button 
                      onClick={toggleBan}
                      className={`w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border-2 transition-all ${
                        editData.isBanned ? 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200' : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white'
                      }`}
                    >
                      <ShieldAlert size={16} />
                      {editData.isBanned ? 'Unban User Access' : 'Permanent Ban Access'}
                    </button>
                    {user.membershipStatus === MembershipStatus.PENDING && !isEditMode && (
                      <button onClick={() => handleMembershipAction(user.id, MembershipStatus.ACTIVE)} className="w-full bg-malawi-green text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-green-500/20">
                        Quick Approve Membership
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                 <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <Target size={16} /> Network Track (L1: {directDownlines.length}, L2: {indirectDownlines.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {directDownlines.length === 0 ? (
                        <p className="col-span-full p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-400 italic">No one referred yet.</p>
                      ) : directDownlines.map(d => (
                        <div key={d.id} className="bg-white border p-4 rounded-2xl flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer" onClick={() => { setInspectingUser(d); setIsEditMode(false); }}>
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black">{d.fullName.charAt(0)}</div>
                              <div>
                                <p className="text-xs font-black">{d.fullName}</p>
                                <p className="text-[9px] text-gray-400">Total Profit Contribution: MWK {userReferrals.filter(r => r.referredId === d.id).reduce((acc, cur) => acc + cur.commission, 0).toLocaleString()}</p>
                              </div>
                           </div>
                           <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <Database size={16} /> Affiliate Earnings Log
                    </h3>
                    <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-5 py-3 font-black uppercase">From Affiliate</th>
                            <th className="px-5 py-3 font-black uppercase">Tier</th>
                            <th className="px-5 py-3 font-black uppercase">MWK Profit</th>
                            <th className="px-5 py-3 font-black uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {userReferrals.length === 0 ? (
                            <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic">No commission logs found.</td></tr>
                          ) : userReferrals.map(r => {
                            const source = state.users.find(u => u.id === r.referredId);
                            return (
                              <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-5 py-3 font-bold">{source?.fullName || 'Deleted'}</td>
                                <td className="px-5 py-3"><span className="bg-gray-100 px-2 py-0.5 rounded uppercase font-black">Level {r.level}</span></td>
                                <td className="px-5 py-3 font-black text-malawi-green">+{r.commission.toLocaleString()}</td>
                                <td className="px-5 py-3 text-gray-400">{new Date(r.timestamp).toLocaleDateString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {inspectingUser && <UserInspector user={inspectingUser} />}

      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-malawi-black text-white rounded-3xl shadow-xl border-b-4 border-malawi-red">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-malawi-black">Admin HQ</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${cloudInfo.ok ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {cloudInfo.ok ? 'Supabase Synchronized' : 'Cloud Sync Interrupted'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
             <input 
               type="text" 
               placeholder="Search Affiliates..." 
               className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl w-full md:w-80 shadow-sm focus:ring-2 focus:ring-malawi-green outline-none text-sm font-medium"
               value={searchText}
               onChange={(e) => setSearchText(e.target.value)}
             />
          </div>
          <button onClick={handleManualSync} className="p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all shadow-sm">
            <RefreshCw size={20} className={isChecking ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {[
          { id: 'activity', label: 'Live Stream', icon: Activity },
          { id: 'users', label: 'Affiliates', icon: Users, live: liveUsersCount },
          { id: 'withdrawals', label: 'Payout Hub', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'memberships', label: 'Activation', icon: Award, count: state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING).length },
          { id: 'complaints', label: 'Tickets', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border relative ${
              tab === t.id ? 'bg-malawi-black text-white border-malawi-black' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
            }`}
          >
            <t.icon size={16} />
            {t.label}
            {t.count ? <span className="ml-1 bg-malawi-red text-white px-2 py-0.5 rounded-full text-[9px]">{t.count}</span> : null}
            {t.live !== undefined && t.live > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white px-2 py-0.5 rounded-full text-[8px] animate-bounce shadow-lg flex items-center gap-1">
                <Radio size={8} /> {t.live} LIVE
              </span>
            )}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[600px]">
        {tab === 'activity' && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black uppercase">Platform Feed</h2>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Real-time Stream</span>
            </div>
            <div className="space-y-4">
              {activityLog.length === 0 ? (
                <div className="p-12 text-center text-gray-400 italic">No recent activity.</div>
              ) : activityLog.map((event, idx) => (
                <div key={idx} className="flex gap-4 items-start group border-l-2 border-transparent hover:border-malawi-green pl-4 transition-all">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    event.type === 'signup' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {event.type === 'signup' ? <UserPlus size={20} /> : <LogIn size={20} />}
                  </div>
                  <div className="flex-grow pt-1">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-black text-gray-900">
                        {event.type === 'signup' ? 'New Affiliate Joined: ' : 'Affiliate Logged In: '}
                        <button onClick={() => setInspectingUser(event.user)} className="text-malawi-green hover:underline decoration-2 font-black">{event.user.fullName}</button>
                      </p>
                      <span className="text-[10px] font-bold text-gray-300">{event.date.toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-gray-400">@{event.user.username} • {event.date.toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="overflow-x-auto">
             <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl border flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-600">{liveUsersCount} Users Live Now</span>
                  </div>
                  <div className="p-3 bg-white rounded-2xl border flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">{allUsers.length - liveUsersCount} Offline</span>
                  </div>
               </div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Showing all registered affiliates</p>
             </div>
             <table className="w-full text-left text-sm">
              <thead className="bg-white text-[10px] font-black uppercase text-gray-400">
                <tr>
                  <th className="px-8 py-5">Affiliate</th>
                  <th className="px-8 py-5">Live Presence</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Wallet (MWK)</th>
                  <th className="px-8 py-5">Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allUsers.map(u => {
                  const online = isUserOnline(u);
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors group ${u.isBanned ? 'opacity-50 grayscale bg-red-50/20' : ''} ${online ? 'bg-green-50/10' : ''}`}>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 shadow-sm transition-all ${online ? 'border-green-500 scale-105' : 'border-white'}`}>
                             {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" /> : <UserCheck size={20} className="text-gray-300" />}
                           </div>
                           <div>
                              <p className="font-black text-gray-900 flex items-center gap-2">
                                {u.fullName}
                                {u.isBanned && <Ban size={10} className="text-red-600" />}
                              </p>
                              <p className="text-[10px] text-gray-400 uppercase font-bold">@{u.username}</p>
                           </div>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         {online ? (
                           <div className="flex flex-col gap-0.5 animate-in slide-in-from-left">
                              <span className="flex items-center gap-1.5 text-green-600 font-black text-[9px] uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                                Online Now
                              </span>
                              <span className="text-[8px] text-gray-400 font-bold uppercase ml-3">Viewing Platform</span>
                           </div>
                         ) : (
                           <div className="flex flex-col gap-0.5 opacity-60">
                              <span className="text-gray-400 font-black text-[9px] uppercase tracking-widest">Offline</span>
                              <span className="text-[8px] text-gray-400 font-bold uppercase">Seen {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</span>
                           </div>
                         )}
                      </td>
                      <td className="px-8 py-5">
                         <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                           u.membershipStatus === MembershipStatus.ACTIVE ? 'bg-green-50 text-green-600' : 
                           u.membershipStatus === MembershipStatus.PENDING ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                         }`}>
                           {u.membershipStatus}
                         </span>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex flex-col">
                           <span className="font-black text-malawi-green text-sm">MWK {u.balance.toLocaleString()}</span>
                           <span className="text-[9px] text-gray-400 font-bold uppercase">Lifetime Rev: {u.totalEarnings.toLocaleString()}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <button 
                           onClick={() => setInspectingUser(u)}
                           className={`p-3 rounded-2xl transition-all shadow-sm border border-gray-100 flex items-center gap-2 mx-auto ${online ? 'bg-malawi-black text-white' : 'bg-gray-50 text-gray-400 hover:bg-malawi-black hover:text-white'}`}
                         >
                           <Eye size={18} />
                           <span className="text-[9px] font-black uppercase">Inspect</span>
                         </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'withdrawals' && (
          <div className="overflow-x-auto p-2">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                <tr>
                  <th className="px-8 py-5">Affiliate</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5">Gateway</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-center">Process</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-8 py-5">
                      <button onClick={() => setInspectingUser(state.users.find(u => u.id === w.userId) || null)} className="font-black text-malawi-green hover:underline">{w.userName}</button>
                      <p className="text-[10px] text-gray-400">{w.phone}</p>
                    </td>
                    <td className="px-8 py-5 font-black text-malawi-red">MWK {w.amount.toLocaleString()}</td>
                    <td className="px-8 py-5 text-[10px] font-black uppercase text-gray-400">{w.paymentMethod}</td>
                    <td className="px-8 py-5">
                       <span className={`text-[9px] font-black uppercase ${
                         w.status === 'PENDING' ? 'text-orange-500' : 'text-green-500'
                       }`}>{w.status}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <div className="flex gap-2 justify-center">
                         {w.status === 'PENDING' ? (
                           <>
                             <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} className="p-3 bg-malawi-green text-white rounded-xl shadow-lg"><Check size={16} /></button>
                             <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} className="p-3 bg-malawi-red text-white rounded-xl shadow-lg"><X size={16} /></button>
                           </>
                         ) : (
                           <span className="text-gray-300 italic text-xs">Closed</span>
                         )}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
