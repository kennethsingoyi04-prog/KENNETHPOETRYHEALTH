
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, Complaint, User, WithdrawalRequest, Referral } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, CloudStatus, syncAppStateToCloud } from '../dataService';
import { 
  ShieldCheck, Loader2, AlertTriangle, 
  Cloud, CloudOff, Database, RefreshCw, Check, Search, Flame, Server,
  UserCheck, MessageSquare, Eye, X, CheckCircle2, Wallet, ExternalLink,
  ChevronRight, Users, TrendingUp, Calendar, Clock, ArrowLeft, Target, Award,
  Activity, Zap, UserPlus, LogIn, Filter
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

  // --- Logic for Activity Feed ---
  const activityLog = useMemo(() => {
    const events: { type: 'signup' | 'login', user: User, date: Date }[] = [];
    state.users.forEach(u => {
      // Signup Event
      events.push({ type: 'signup', user: u, date: new Date(u.createdAt) });
      // Login Event (if exists)
      if (u.lastLoginAt) {
        events.push({ type: 'login', user: u, date: new Date(u.lastLoginAt) });
      }
    });
    return events.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50);
  }, [state.users]);

  // --- Filtered Lists ---
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
      const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [state.users, searchText]);

  // --- Actions ---
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

  const viewProof = (url?: string) => {
    if (!url) return;
    navigate(`/admin/proof-preview?url=${encodeURIComponent(url)}`);
  };

  // --- User Inspector Modal ---
  const UserInspector = ({ user }: { user: User }) => {
    const directDownlines = state.users.filter(u => u.referredBy === user.id);
    const directIds = directDownlines.map(u => u.id);
    const indirectDownlines = state.users.filter(u => directIds.includes(u.referredBy || ''));
    const userReferrals = state.referrals.filter(r => r.referrerId === user.id);
    
    const isOnline = user.lastLoginAt && (new Date().getTime() - new Date(user.lastLoginAt).getTime() < 600000);

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setInspectingUser(null)}></div>
        <div className="relative bg-white w-full max-w-5xl h-full max-h-[95vh] rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
            <div className="flex items-center gap-4">
              <button onClick={() => setInspectingUser(null)} className="p-3 bg-white border hover:bg-gray-100 rounded-2xl transition-all shadow-sm">
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">{user.fullName}</h2>
                  {isOnline && <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>}
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Affiliate ID: {user.id} • @{user.username}</p>
              </div>
            </div>
            <button onClick={() => setInspectingUser(null)} className="p-2 text-gray-400 hover:text-malawi-red transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-10 scrollbar-hide">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-malawi-green text-white p-5 rounded-3xl shadow-lg shadow-green-500/10">
                <Wallet size={18} className="mb-2 opacity-60" />
                <p className="text-[9px] uppercase font-black tracking-widest opacity-80">Current Wallet</p>
                <p className="text-xl font-black">MWK {user.balance.toLocaleString()}</p>
              </div>
              <div className="bg-malawi-black text-white p-5 rounded-3xl shadow-lg">
                <TrendingUp size={18} className="mb-2 opacity-60 text-malawi-red" />
                <p className="text-[9px] uppercase font-black tracking-widest opacity-80">Total Revenue</p>
                <p className="text-xl font-black">MWK {user.totalEarnings.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 border p-5 rounded-3xl">
                <Users size={18} className="mb-2 text-blue-500" />
                <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest">Direct Team</p>
                <p className="text-xl font-black">{directDownlines.length}</p>
              </div>
              <div className="bg-gray-50 border p-5 rounded-3xl">
                <Award size={18} className="mb-2 text-yellow-600" />
                <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest">Active Tier</p>
                <p className="text-xl font-black">{user.membershipTier}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Panel: User Data */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-3xl p-6 space-y-5 border border-gray-100">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Security & Access</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-gray-400">Status</span>
                       <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                         user.membershipStatus === MembershipStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                       }`}>{user.membershipStatus}</span>
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
                       <span className="font-black">{user.phone}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="font-bold text-gray-400">WhatsApp</span>
                       <span className="font-black text-green-600">{user.whatsapp}</span>
                    </div>
                  </div>
                  {user.membershipStatus === MembershipStatus.PENDING && (
                    <button onClick={() => handleMembershipAction(user.id, MembershipStatus.ACTIVE)} className="w-full bg-malawi-green text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-green-500/20">
                      Approve Membership Now
                    </button>
                  )}
                </div>
              </div>

              {/* Middle/Right: Referral Tree and Commissions */}
              <div className="lg:col-span-2 space-y-8">
                 {/* Team List */}
                 <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <Target size={16} /> Direct Referral Network ({directDownlines.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {directDownlines.length === 0 ? (
                        <p className="col-span-full p-8 text-center bg-gray-50 rounded-2xl text-xs text-gray-400 italic">No one referred yet.</p>
                      ) : directDownlines.map(d => (
                        <div key={d.id} className="bg-white border p-4 rounded-2xl flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer" onClick={() => setInspectingUser(d)}>
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black">{d.fullName.charAt(0)}</div>
                              <div>
                                <p className="text-xs font-black">{d.fullName}</p>
                                <p className="text-[9px] text-gray-400">Balance: MWK {d.balance.toLocaleString()}</p>
                              </div>
                           </div>
                           <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      ))}
                    </div>
                 </div>

                 {/* Commission History */}
                 <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <Database size={16} /> Affiliate Earnings Audit
                    </h3>
                    <div className="bg-white border rounded-3xl overflow-hidden">
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

      {/* Admin Stats Header */}
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
               placeholder="Search by Name, ID, or Phone..." 
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

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {[
          { id: 'activity', label: 'Live Feed', icon: Activity },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'memberships', label: 'Tiers', icon: Award, count: state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING).length },
          { id: 'complaints', label: 'Support', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${
              tab === t.id ? 'bg-malawi-black text-white border-malawi-black' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
            }`}
          >
            <t.icon size={16} />
            {t.label}
            {t.count ? <span className="ml-1 bg-malawi-red text-white px-2 py-0.5 rounded-full text-[9px]">{t.count}</span> : null}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[600px]">
        {/* Activity Tab */}
        {tab === 'activity' && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black uppercase">Recent System Events</h2>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Real-time Stream</span>
            </div>
            <div className="space-y-4">
              {activityLog.map((event, idx) => (
                <div key={idx} className="flex gap-4 items-start group">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    event.type === 'signup' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {event.type === 'signup' ? <UserPlus size={20} /> : <LogIn size={20} />}
                  </div>
                  <div className="flex-grow pt-1">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-black text-gray-900">
                        {event.type === 'signup' ? 'New Registration: ' : 'User Logged In: '}
                        <button onClick={() => setInspectingUser(event.user)} className="text-malawi-green hover:underline">{event.user.fullName}</button>
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

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                <tr>
                  <th className="px-8 py-5">Identity</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Earnings</th>
                  <th className="px-8 py-5">Activity</th>
                  <th className="px-8 py-5 text-center">Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                           {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" /> : <UserCheck size={20} className="text-gray-300" />}
                         </div>
                         <div>
                            <p className="font-black text-gray-900">{u.fullName}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">@{u.username}</p>
                         </div>
                       </div>
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
                         <span className="text-[9px] text-gray-400 font-bold uppercase">Rev: {u.totalEarnings.toLocaleString()}</span>
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-gray-500 text-[10px]">
                            <Clock size={12} className="opacity-40" />
                            <span className="font-bold">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</span>
                          </div>
                          {u.lastLoginAt && (
                            <div className="flex items-center gap-1.5 text-blue-500 text-[10px]">
                              <Zap size={10} className="opacity-40" />
                              <span className="font-black uppercase tracking-tighter">{new Date(u.lastLoginAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          )}
                       </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <button 
                         onClick={() => setInspectingUser(u)}
                         className="p-3 bg-gray-50 hover:bg-malawi-black hover:text-white rounded-2xl transition-all shadow-sm border border-gray-100"
                       >
                         <Eye size={18} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Withdrawals Tab */}
        {tab === 'withdrawals' && (
          <div className="overflow-x-auto p-2">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                <tr>
                  <th className="px-8 py-5">Requester</th>
                  <th className="px-8 py-5">Payout</th>
                  <th className="px-8 py-5">Gateway</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-center">Approve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-8 py-5">
                      <p className="font-black">{w.userName}</p>
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
