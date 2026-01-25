
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, User, WithdrawalRequest, MembershipTier, BookSellerStatus } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, syncAppStateToCloud, uploadImage, nuclearScrub, fetchAppStateFromCloud } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Search, 
  X, Wallet, Users, Zap, Award,
  ImageIcon, CheckCircle2, 
  MessageSquareWarning, Maximize2, Loader2, Database, Trash2,
  Signal, ShieldAlert, Rocket, Terminal, ZapOff, Check, XCircle,
  Copy, ClipboardCheck, Info, ExternalLink, Key, FileCode, Settings2,
  BookOpen, Eye, User as UserIcon, Mail, Phone, Hash, Calendar, DollarSign,
  UserCheck, Smartphone, Clock, ListChecks, ArrowRight, Gavel, AlertTriangle, Ban,
  Activity
} from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const [tab, setTab] = useState<'withdrawals' | 'users' | 'memberships' | 'settings' | 'books'>('withdrawals');
  const [isChecking, setIsChecking] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [connStatus, setConnStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [payloadSize, setPayloadSize] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  
  // Discipline UI State
  const [disciplineReason, setDisciplineReason] = useState("");
  const [tempBanDays, setTempBanDays] = useState("7");

  useEffect(() => {
    refreshHealth();
  }, []);

  const refreshHealth = async () => {
    setConnStatus('TESTING');
    const health = await checkCloudHealth();
    setConnStatus(health.ok ? 'SUCCESS' : 'FAILED');
    setPayloadSize(health.payloadSizeKb || 0);
    setLastSyncTime(health.lastSync || null);
  };

  const handleManualSync = async () => {
    setIsChecking(true);
    try {
      await syncAppStateToCloud(state);
      await refreshHealth();
      alert("Platform data backed up to cloud. Netlify remains free.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleIssueWarning = () => {
    if (!inspectingUser || !disciplineReason.trim()) {
      alert("Enter a reason for the warning.");
      return;
    }
    const updatedUsers = state.users.map(u => 
      u.id === inspectingUser.id 
        ? { ...u, warnings: [...(u.warnings || []), disciplineReason.trim()] } 
        : u
    );
    onStateUpdate({ users: updatedUsers });
    setDisciplineReason("");
    const refreshed = updatedUsers.find(u => u.id === inspectingUser.id);
    if (refreshed) setInspectingUser(refreshed);
    alert(`Warning issued to ${inspectingUser.fullName}.`);
  };

  const handleApplyBan = (type: 'PERMANENT' | 'TEMPORARY') => {
    if (!inspectingUser || !disciplineReason.trim()) {
      alert("A reason is required to restrict an account.");
      return;
    }
    
    let expiry = undefined;
    if (type === 'TEMPORARY') {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(tempBanDays));
      expiry = d.toISOString();
    }

    const updatedUsers = state.users.map(u => 
      u.id === inspectingUser.id 
        ? { 
            ...u, 
            isBanned: true, 
            banType: type, 
            banReason: disciplineReason.trim(),
            banExpiresAt: expiry 
          } 
        : u
    );
    onStateUpdate({ users: updatedUsers });
    setDisciplineReason("");
    const refreshed = updatedUsers.find(u => u.id === inspectingUser.id);
    if (refreshed) setInspectingUser(refreshed);
    alert(`Account for ${inspectingUser.fullName} has been ${type} banned.`);
  };

  const handleUnban = () => {
    if (!inspectingUser) return;
    const updatedUsers = state.users.map(u => 
      u.id === inspectingUser.id 
        ? { ...u, isBanned: false, banType: undefined, banReason: undefined, banExpiresAt: undefined } 
        : u
    );
    onStateUpdate({ users: updatedUsers });
    const refreshed = updatedUsers.find(u => u.id === inspectingUser.id);
    if (refreshed) setInspectingUser(refreshed);
    alert(`All restrictions lifted for ${inspectingUser.fullName}`);
  };

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
      u.username.toLowerCase().includes(searchText.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.users, searchText]);

  const getUserReferralNetwork = (userId: string) => {
    const l1 = state.users.filter(u => u.referredBy === userId);
    const l1Ids = l1.map(u => u.id);
    const l2 = state.users.filter(u => l1Ids.includes(u.referredBy || ''));
    return { l1, l2, l1Count: l1.length, l2Count: l2.length };
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* USER INSPECTOR - SAFETY COMMAND CENTER */}
      {inspectingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-malawi-black/95 backdrop-blur-xl overflow-y-auto">
           <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl flex flex-col my-8 max-h-[90vh] border border-white/20">
              <div className="bg-malawi-black p-10 text-white flex items-center justify-between rounded-t-[4rem]">
                 <div className="flex items-center gap-6">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black shadow-2xl ${inspectingUser.isBanned ? 'bg-malawi-red' : 'bg-malawi-green'}`}>
                       {inspectingUser.fullName.charAt(0)}
                    </div>
                    <div>
                       <h2 className="text-3xl font-black uppercase tracking-tight">{inspectingUser.fullName}</h2>
                       <p className="text-malawi-green text-xs font-black uppercase tracking-widest mt-1">@{inspectingUser.username}</p>
                    </div>
                 </div>
                 <button onClick={() => setInspectingUser(null)} className="p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-95"><X size={32}/></button>
              </div>

              <div className="p-10 space-y-12 overflow-y-auto flex-grow">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-8 rounded-[2.5rem] border text-center">
                       <p className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Platform Wallet</p>
                       <p className="text-3xl font-black text-malawi-green">MWK {inspectingUser.balance.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-[2.5rem] border text-center">
                       <p className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Network Growth</p>
                       <p className="text-2xl font-black">{getUserReferralNetwork(inspectingUser.id).l1Count} Directs</p>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-[2.5rem] border text-center">
                       <p className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Join Date</p>
                       <p className="text-sm font-black uppercase">{new Date(inspectingUser.createdAt).toLocaleDateString()}</p>
                    </div>
                 </div>

                 {/* DISCIPLINE PANEL - THE SAFETY COMMAND HUB */}
                 <div className="bg-red-50 p-10 rounded-[3.5rem] border-4 border-red-100 space-y-8 shadow-inner relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-5%] text-red-100/50 -rotate-12 pointer-events-none">
                       <Gavel size={240} />
                    </div>
                    
                    <div className="relative z-10 flex items-center gap-4 text-malawi-red">
                       <div className="p-4 bg-malawi-red text-white rounded-2xl shadow-xl">
                          <ShieldAlert size={32} />
                       </div>
                       <div>
                          <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Safety & Discipline HQ</h3>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mt-1">Enforce Platform Terms & Safety</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                       <div className="space-y-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-red-500 ml-2">Reason for Disciplinary Action</label>
                             <textarea 
                                value={disciplineReason}
                                onChange={(e) => setDisciplineReason(e.target.value)}
                                placeholder="E.g. Fraudulent payment proof, system manipulation, spam..."
                                className="w-full p-6 bg-white border border-red-200 rounded-[2.5rem] text-sm font-medium outline-none focus:ring-8 focus:ring-red-100 transition-all resize-none shadow-sm"
                                rows={4}
                             />
                          </div>
                          
                          <div className="flex flex-wrap gap-3">
                             {inspectingUser.isBanned ? (
                                <button onClick={handleUnban} className="flex-grow py-5 bg-malawi-green text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                                   <UserCheck size={20} /> Lift All Restrictions
                                </button>
                             ) : (
                                <>
                                   <button onClick={handleIssueWarning} className="flex-grow py-5 bg-yellow-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-yellow-600 transition-all active:scale-95 flex items-center justify-center gap-2">
                                      <AlertTriangle size={18} /> Issue Warning
                                   </button>
                                   <button onClick={() => handleApplyBan('PERMANENT')} className="flex-grow py-5 bg-malawi-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2">
                                      <Ban size={18} /> Permanent Ban
                                   </button>
                                   <div className="flex gap-2 w-full">
                                      <div className="relative flex-grow">
                                         <input 
                                            type="number" 
                                            value={tempBanDays}
                                            onChange={e => setTempBanDays(e.target.value)}
                                            className="w-full p-5 bg-white border border-red-200 rounded-2xl font-black text-center text-sm outline-none focus:ring-4 focus:ring-red-100"
                                         />
                                         <span className="absolute top-1/2 -translate-y-1/2 right-4 text-[9px] font-black text-gray-300 uppercase">Days</span>
                                      </div>
                                      <button onClick={() => handleApplyBan('TEMPORARY')} className="px-8 py-5 bg-malawi-red text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-red-800 transition-all active:scale-95">
                                         Temporary Ban
                                      </button>
                                   </div>
                                </>
                             )}
                          </div>
                       </div>

                       <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[3rem] border border-red-100 space-y-6 max-h-[400px] overflow-y-auto shadow-sm">
                          <h4 className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2 tracking-widest">
                             <Activity size={14} className="text-red-400" /> Disciplinary Logs
                          </h4>
                          
                          {inspectingUser.isBanned && (
                             <div className="p-6 bg-red-600 text-white rounded-3xl border shadow-xl animate-in fade-in zoom-in-95">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">ACTIVE BAN: {inspectingUser.banType}</p>
                                <p className="text-lg font-black mt-2 leading-tight italic">"{inspectingUser.banReason}"</p>
                                {inspectingUser.banExpiresAt && (
                                   <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20 text-[10px] font-black uppercase">
                                      <Clock size={12} /> Expiry: {new Date(inspectingUser.banExpiresAt).toLocaleString()}
                                   </div>
                                )}
                             </div>
                          )}

                          {inspectingUser.warnings && inspectingUser.warnings.length > 0 ? (
                             <div className="space-y-3">
                                {inspectingUser.warnings.map((w, i) => (
                                   <div key={i} className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-start gap-3">
                                      <AlertTriangle size={14} className="text-yellow-600 mt-0.5 shrink-0" />
                                      <p className="text-xs font-bold text-yellow-800 leading-snug">Warning #{i+1}: {w}</p>
                                   </div>
                                ))}
                             </div>
                          ) : (
                             <div className="py-12 flex flex-col items-center justify-center text-gray-300">
                                <ShieldCheck size={48} className="opacity-20 mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest italic">Clean Discipline Record</p>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>

                 {/* Network Detail */}
                 <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                       <h3 className="text-xl font-black uppercase tracking-tight">Referral Network Map</h3>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lifetime Impact</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-3">
                          <div className="flex items-center justify-between px-2">
                             <p className="text-[10px] font-black uppercase text-malawi-green">Level 1 Directs</p>
                             <span className="text-[10px] font-black">{getUserReferralNetwork(inspectingUser.id).l1Count} People</span>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-3xl border space-y-2 max-h-[250px] overflow-y-auto">
                             {getUserReferralNetwork(inspectingUser.id).l1.map(u => (
                                <div key={u.id} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                                   <span className="text-xs font-black uppercase tracking-tight">{u.fullName}</span>
                                   <span className="text-[9px] font-bold text-gray-400">@{u.username}</span>
                                </div>
                             ))}
                             {getUserReferralNetwork(inspectingUser.id).l1.length === 0 && <p className="text-center py-6 text-[10px] font-black text-gray-300 uppercase italic">No direct referrals</p>}
                          </div>
                       </div>
                       <div className="space-y-3">
                          <div className="flex items-center justify-between px-2">
                             <p className="text-[10px] font-black uppercase text-blue-500">Level 2 Indirects</p>
                             <span className="text-[10px] font-black">{getUserReferralNetwork(inspectingUser.id).l2Count} People</span>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-3xl border space-y-2 max-h-[250px] overflow-y-auto">
                             {getUserReferralNetwork(inspectingUser.id).l2.map(u => (
                                <div key={u.id} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                                   <span className="text-xs font-black uppercase tracking-tight">{u.fullName}</span>
                                   <span className="text-[9px] font-bold text-gray-400">@{u.username}</span>
                                </div>
                             ))}
                             {getUserReferralNetwork(inspectingUser.id).l2.length === 0 && <p className="text-center py-6 text-[10px] font-black text-gray-300 uppercase italic">No indirect referrals</p>}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-10 border-t bg-gray-50 rounded-b-[4rem] flex justify-center">
                 <button onClick={() => setInspectingUser(null)} className="px-16 py-5 bg-malawi-black text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-gray-800">
                    Exit Inspector
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Admin Header */}
      <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-5 bg-malawi-black text-white rounded-[2rem] border-b-8 border-malawi-red shadow-2xl">
            <Rocket size={36} className="text-malawi-green" />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-malawi-black">Admin Command HQ</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <ShieldCheck size={12} className="text-malawi-green" /> Netlify Bandwidth Guard: ENABLED
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search affiliates..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64 shadow-sm outline-none focus:ring-2 focus:ring-malawi-black transition-all font-medium" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] shadow-sm active:scale-95 transition-all" title="Backup to Cloud"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payout Requests', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'users', label: 'Affiliate Directory', icon: Users, count: state.users.length },
          { id: 'settings', label: 'Bandwidth Command', icon: Activity }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border relative transition-all ${tab === t.id ? 'bg-malawi-black text-white shadow-xl scale-105 z-10' : 'bg-white text-gray-400 hover:text-gray-600 shadow-sm'}`}>
            <t.icon size={18} /> {t.label}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2 py-0.5 rounded-full text-[10px] border-2 border-white">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[4rem] border shadow-2xl overflow-hidden min-h-[500px]">
        {tab === 'users' && (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                    <tr>
                       <th className="px-10 py-6">Affiliate Name</th>
                       <th className="px-10 py-6">Wallet Balance</th>
                       <th className="px-10 py-6">Status</th>
                       <th className="px-10 py-6 text-center">Safety Control</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                    {filteredUsers.map(u => (
                       <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${u.isBanned ? 'opacity-50' : ''}`}>
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-3">
                                {u.isBanned ? <Ban size={18} className="text-malawi-red" /> : <div className="w-3 h-3 rounded-full bg-malawi-green animate-pulse" />}
                                <div>
                                   <p className={`font-black uppercase tracking-tight ${u.isBanned ? 'text-malawi-red line-through' : 'text-malawi-black'}`}>{u.fullName}</p>
                                   <p className="text-[10px] text-gray-400 font-bold">@{u.username}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-10 py-8 font-black text-malawi-green">MWK {u.balance.toLocaleString()}</td>
                          <td className="px-10 py-8">
                             <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${u.isBanned ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600'}`}>
                                {u.isBanned ? 'RESTRICTED' : u.membershipTier}
                             </span>
                          </td>
                          <td className="px-10 py-8 text-center">
                             <button onClick={() => setInspectingUser(u)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 mx-auto active:scale-95 shadow-md">
                                <ShieldCheck size={14} /> Inspect Account
                             </button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}

        {tab === 'settings' && (
          <div className="p-16 space-y-12">
             <div className="bg-malawi-green text-white p-16 rounded-[4.5rem] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 space-y-8">
                   <div className="flex items-center gap-6">
                      <ShieldCheck size={64} />
                      <h2 className="text-4xl font-black uppercase tracking-tight leading-none">Netlify Credit Protector</h2>
                   </div>
                   <p className="text-lg font-bold opacity-80 uppercase leading-relaxed max-w-2xl">
                      IMPORTANT: Every time you 'Deploy' a site, Netlify consumes build credits. 
                      To stay FREE, use the 'Cloud Sync' button below instead of re-deploying your site code.
                   </p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/20 p-8 rounded-[2.5rem] border border-white/10">
                         <p className="text-[11px] font-black uppercase opacity-60 tracking-widest">Database Usage</p>
                         <p className="text-4xl font-black">{payloadSize.toFixed(1)} KB</p>
                         <p className="text-[10px] opacity-40 mt-2 uppercase font-black">Free Tier Safe-Zone: 500KB</p>
                      </div>
                      <div className="bg-white/20 p-8 rounded-[2.5rem] border border-white/10">
                         <p className="text-[11px] font-black uppercase opacity-60 tracking-widest">Platform Connectivity</p>
                         <p className="text-4xl font-black">{connStatus === 'SUCCESS' ? 'HEALTHY' : 'SYNC ERROR'}</p>
                         <p className="text-[10px] opacity-40 mt-2 uppercase font-black">Supabase DB Sync: Active</p>
                      </div>
                   </div>
                   <button onClick={handleManualSync} disabled={isChecking} className="px-12 py-6 bg-white text-malawi-green rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl flex items-center gap-3 active:scale-95 transition-all hover:bg-gray-100">
                      {isChecking ? <Loader2 className="animate-spin" size={24} /> : <RefreshCw size={24} />}
                      Secure Cloud Backup Now
                   </button>
                </div>
                <div className="absolute top-[-30%] right-[-15%] w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px] pointer-events-none"></div>
             </div>
          </div>
        )}

        {tab === 'withdrawals' && (
           <div className="p-20 text-center space-y-6">
              <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-gray-300">
                 <Wallet size={48} />
              </div>
              <p className="text-gray-400 uppercase italic font-black text-sm">Accessing Payout Ledger...</p>
           </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
