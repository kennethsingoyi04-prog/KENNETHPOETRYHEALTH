
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
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleApplyBan = (type: 'PERMANENT' | 'TEMPORARY') => {
    if (!inspectingUser || !disciplineReason.trim()) {
      alert("A reason is required to ban a user.");
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
    alert(`User ${inspectingUser.fullName} restricted.`);
  };

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
      u.username.toLowerCase().includes(searchText.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.users, searchText]);

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* USER INSPECTOR - SAFETY COMMAND */}
      {inspectingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-malawi-black/90 backdrop-blur-md overflow-y-auto">
           <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl flex flex-col my-8 max-h-[90vh]">
              <div className="bg-malawi-black p-10 text-white flex items-center justify-between rounded-t-[3rem]">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-malawi-red rounded-3xl flex items-center justify-center text-3xl font-black">
                       {inspectingUser.fullName.charAt(0)}
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tight">{inspectingUser.fullName}</h2>
                 </div>
                 <button onClick={() => setInspectingUser(null)} className="p-4 hover:bg-white/10 rounded-full transition-all"><X size={32}/></button>
              </div>

              <div className="p-10 space-y-8 overflow-y-auto">
                 <div className="bg-red-50 p-10 rounded-[3rem] border-4 border-red-100 space-y-6">
                    <div className="flex items-center gap-4 text-malawi-red">
                       <Gavel size={32} />
                       <h3 className="text-2xl font-black uppercase">Safety Command</h3>
                    </div>
                    <textarea 
                       value={disciplineReason}
                       onChange={(e) => setDisciplineReason(e.target.value)}
                       placeholder="Enter reason for restriction..."
                       className="w-full p-6 border rounded-3xl outline-none focus:ring-4 focus:ring-red-100 transition-all font-medium resize-none"
                       rows={3}
                    />
                    <div className="flex flex-wrap gap-3">
                       {inspectingUser.isBanned ? (
                          <button onClick={() => {
                             const updatedUsers = state.users.map(u => u.id === inspectingUser.id ? { ...u, isBanned: false } : u);
                             onStateUpdate({ users: updatedUsers });
                             setInspectingUser(null);
                             alert("User Unbanned");
                          }} className="bg-malawi-green text-white px-10 py-5 rounded-2xl font-black uppercase text-xs">Unban User</button>
                       ) : (
                          <>
                             <button onClick={() => handleApplyBan('PERMANENT')} className="bg-malawi-black text-white px-10 py-5 rounded-2xl font-black uppercase text-xs">Permanent Ban</button>
                             <div className="flex gap-2">
                                <input type="number" value={tempBanDays} onChange={e => setTempBanDays(e.target.value)} className="w-16 p-4 border rounded-2xl font-black text-center" />
                                <button onClick={() => handleApplyBan('TEMPORARY')} className="bg-malawi-red text-white px-10 py-5 rounded-2xl font-black uppercase text-xs">Temp Ban (Days)</button>
                             </div>
                          </>
                       )}
                    </div>
                 </div>
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
            <h1 className="text-4xl font-black uppercase tracking-tight text-malawi-black">Admin Command</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <ShieldCheck size={12} className="text-malawi-green" /> Netlify Bandwidth Guard Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64 shadow-sm" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] shadow-sm active:scale-95 transition-all"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'settings', label: 'Bandwidth Command', icon: Activity }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border transition-all ${tab === t.id ? 'bg-malawi-black text-white shadow-xl' : 'bg-white text-gray-400'}`}>
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[3rem] border shadow-2xl overflow-hidden min-h-[500px]">
        {tab === 'users' && (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                    <tr>
                       <th className="px-10 py-6">Affiliate</th>
                       <th className="px-10 py-6">Status</th>
                       <th className="px-10 py-6 text-center">Command</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                    {filteredUsers.map(u => (
                       <tr key={u.id} className="hover:bg-gray-50/50">
                          <td className="px-10 py-8">
                             <p className={`font-black uppercase tracking-tight ${u.isBanned ? 'text-red-500 line-through' : ''}`}>{u.fullName}</p>
                             <p className="text-[10px] text-gray-400">@{u.username}</p>
                          </td>
                          <td className="px-10 py-8">
                             <span className={`px-4 py-1 rounded-lg text-[9px] font-black uppercase ${u.isBanned ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                {u.isBanned ? 'RESTRICTED' : u.membershipTier}
                             </span>
                          </td>
                          <td className="px-10 py-8 text-center">
                             <button onClick={() => setInspectingUser(u)} className="px-6 py-2 bg-malawi-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-md">
                                Safety Control
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
             <div className="bg-malawi-green text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 space-y-6">
                   <div className="flex items-center gap-4">
                      <ShieldCheck size={48} />
                      <h2 className="text-3xl font-black uppercase tracking-tight">Zero-Billing Guard</h2>
                   </div>
                   <p className="text-sm font-bold opacity-80 uppercase leading-relaxed max-w-2xl">
                      To fix your Netlify shutdown: Background syncing has been DISABLED. 
                      Cloud syncing is now a manual action. This ensures your 100GB Netlify bandwidth lasts forever.
                   </p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/20 p-6 rounded-3xl border border-white/10">
                         <p className="text-[10px] font-black uppercase opacity-60">Database Weight</p>
                         <p className="text-3xl font-black">{payloadSize.toFixed(1)} KB</p>
                         <p className="text-[10px] opacity-40 mt-1 uppercase">Free Tier Limit: 500KB</p>
                      </div>
                      <div className="bg-white/20 p-6 rounded-3xl border border-white/10">
                         <p className="text-[10px] font-black uppercase opacity-60">Last Sync</p>
                         <p className="text-xl font-black">{lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}</p>
                         <p className="text-[10px] opacity-40 mt-1 uppercase">Status: {connStatus}</p>
                      </div>
                   </div>
                   <button onClick={handleManualSync} disabled={isChecking} className="px-10 py-5 bg-white text-malawi-green rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                      {isChecking ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
                      Execute Safe Cloud Sync
                   </button>
                </div>
                <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-[100px]"></div>
             </div>
          </div>
        )}

        {tab === 'withdrawals' && (
           <div className="p-20 text-center text-gray-400 uppercase italic font-black">Reviewing Payout Requests...</div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
