
import React, { useMemo, useState } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, User, WithdrawalRequest, MembershipTier } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, syncAppStateToCloud, uploadImage, nuclearScrub, fetchAppStateFromCloud } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Search, 
  X, Wallet, Users, Zap, Award,
  ImageIcon, CheckCircle2, 
  MessageSquareWarning, Maximize2, Loader2, Database, Trash2,
  Signal, ShieldAlert, Rocket, Terminal, ZapOff, Check, XCircle
} from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const [tab, setTab] = useState<'withdrawals' | 'users' | 'memberships' | 'settings'>('withdrawals');
  const [isChecking, setIsChecking] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [connStatus, setConnStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [payloadSize, setPayloadSize] = useState<number>(0);
  
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [payoutNote, setPayoutNote] = useState<{ [key: string]: string }>({});

  const handleManualSync = async () => {
    setIsChecking(true);
    await syncAppStateToCloud(state);
    setIsChecking(false);
  };

  const testSupabaseConnection = async () => {
    setConnStatus('TESTING');
    try {
      const health = await checkCloudHealth();
      if (health.ok) {
        setConnStatus('SUCCESS');
        setPayloadSize(health.payloadSizeKb || 0);
      } else {
        setConnStatus('FAILED');
      }
    } catch (e) {
      setConnStatus('FAILED');
    }
  };

  const handleNuclearPurge = async () => {
    if (!window.confirm("PURGE DATA: This will strip all heavy images from the cloud to keep your Vercel bandwidth at 0%. Your balances are safe. Proceed?")) return;
    setIsChecking(true);
    try {
      const cloudData = await fetchAppStateFromCloud();
      if (!cloudData) throw new Error("Could not fetch cloud data");
      const cleanedData = nuclearScrub(cloudData);
      onStateUpdate(cleanedData);
      await syncAppStateToCloud({ ...state, ...cleanedData });
      await testSupabaseConnection();
      alert("Deployment Safety Purge Complete!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleMembershipAction = (userId: string, status: MembershipStatus) => {
    const updatedUsers = state.users.map(u => 
      u.id === userId ? { ...u, membershipStatus: status } : u
    );
    onStateUpdate({ users: updatedUsers });
  };

  const handleWithdrawalAction = (id: string, status: WithdrawalStatus) => {
    const updatedWithdrawals = state.withdrawals.map(w => 
      w.id === id ? { ...w, status, adminNote: payoutNote[id] || '' } : w
    );
    onStateUpdate({ withdrawals: updatedWithdrawals });
  };

  const filteredWithdrawals = useMemo(() => {
    return state.withdrawals.filter(w => w.userName.toLowerCase().includes(searchText.toLowerCase()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.withdrawals, searchText]);

  const pendingMemberships = useMemo(() => {
    return state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING);
  }, [state.users]);

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-700">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setViewingProofUrl(null)}>
           <button onClick={() => setViewingProofUrl(null)} className="absolute top-6 right-6 p-4 bg-malawi-red text-white rounded-full shadow-xl"><X size={24} /></button>
           <img src={viewingProofUrl} className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" alt="Proof" />
        </div>
      )}

      <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-5 bg-malawi-black text-white rounded-[2rem] border-b-8 border-malawi-red shadow-2xl">
            <Rocket size={36} className="text-malawi-green" />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-malawi-black">Admin HQ</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <ShieldCheck size={12} className="text-malawi-green" /> New Project Deployment Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Filter..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64 shadow-sm outline-none focus:ring-2 focus:ring-malawi-black transition-all font-medium" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] hover:bg-gray-50 transition-all shadow-sm active:scale-95"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'memberships', label: 'Activations', icon: Zap, count: pendingMemberships.length },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'settings', label: 'Safety Hub', icon: ShieldAlert }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border relative transition-all ${tab === t.id ? 'bg-malawi-black text-white shadow-xl scale-105 z-10' : 'bg-white text-gray-400 hover:text-gray-600 shadow-sm'}`}>
            <t.icon size={18} /> {t.label}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2 py-0.5 rounded-full text-[10px] border-2 border-white">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[3rem] border shadow-2xl overflow-hidden min-h-[600px]">
        {tab === 'memberships' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                <tr>
                  <th className="px-10 py-6">Affiliate</th>
                  <th className="px-10 py-6">Tier Selected</th>
                  <th className="px-10 py-6">Receipt</th>
                  <th className="px-10 py-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingMemberships.map(u => {
                  const tier = MEMBERSHIP_TIERS.find(t => t.tier === u.membershipTier);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="px-10 py-8">
                        <p className="font-black text-malawi-black">{u.fullName}</p>
                        <p className="text-[10px] text-gray-400 uppercase">@{u.username}</p>
                      </td>
                      <td className="px-10 py-8">
                        <span className="font-black px-3 py-1 rounded-lg text-[10px] uppercase border-2" style={{ color: tier?.color, borderColor: tier?.color }}>
                          {tier?.name} (MWK {tier?.price.toLocaleString()})
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        {u.membershipProofUrl ? (
                          <button onClick={() => setViewingProofUrl(u.membershipProofUrl || null)} className="w-16 h-10 rounded-lg overflow-hidden border hover:scale-110 transition-transform">
                            <img src={u.membershipProofUrl} className="w-full h-full object-cover" />
                          </button>
                        ) : 'No Proof'}
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleMembershipAction(u.id, MembershipStatus.ACTIVE)} className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all active:scale-95"><Check size={18} /></button>
                          <button onClick={() => handleMembershipAction(u.id, MembershipStatus.INACTIVE)} className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all active:scale-95"><XCircle size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {pendingMemberships.length === 0 && (
                   <tr><td colSpan={4} className="p-20 text-center text-gray-400 font-bold uppercase italic">No pending activations</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'settings' && (
          <div className="p-10 lg:p-16 space-y-12">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                   <div className="bg-malawi-green text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                      <div className="relative z-10">
                         <div className="flex items-center gap-4 mb-8">
                            <Rocket size={40} />
                            <h2 className="text-3xl font-black uppercase tracking-tight">Free Deployment Active</h2>
                         </div>
                         <p className="text-sm font-bold opacity-80 uppercase leading-relaxed mb-6">
                           Your database is currently optimized for Vercel. We have blocked all heavy image transfers to ensure you never pay for bandwidth.
                         </p>
                         <div className="flex gap-4">
                            <div className="bg-white/20 p-4 rounded-2xl">
                               <p className="text-[10px] font-black uppercase">Payload Size</p>
                               <p className="text-2xl font-black">{payloadSize.toFixed(1)} KB</p>
                            </div>
                            <div className="bg-white/20 p-4 rounded-2xl">
                               <p className="text-[10px] font-black uppercase">Sync Health</p>
                               <p className="text-2xl font-black">{connStatus === 'SUCCESS' ? 'EXCELLENT' : 'CHECKING...'}</p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-200">
                      <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-2"><Terminal size={20} /> Vercel Setup Guide</h3>
                      <div className="space-y-4 text-xs font-bold text-gray-500 uppercase">
                        <p className="flex items-center gap-3"><span className="w-6 h-6 rounded-lg bg-malawi-black text-white flex items-center justify-center">1</span> Connect GitHub to Vercel</p>
                        <p className="flex items-center gap-3"><span className="w-6 h-6 rounded-lg bg-malawi-black text-white flex items-center justify-center">2</span> Go to Settings -> Environment Variables</p>
                        <p className="flex items-center gap-3"><span className="w-6 h-6 rounded-lg bg-malawi-black text-white flex items-center justify-center">3</span> Add SUPABASE_URL and SUPABASE_KEY</p>
                      </div>
                   </div>
                </div>

                <div className="lg:col-span-4">
                   <div className="bg-malawi-black text-white p-10 rounded-[3.5rem] border-b-8 border-malawi-red shadow-2xl">
                      <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2 text-malawi-red">
                         <ZapOff size={24} /> Billing Block
                      </h3>
                      <button 
                        onClick={handleNuclearPurge}
                        disabled={isChecking}
                        className="w-full py-6 bg-malawi-red text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                      >
                        {isChecking ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
                        Billing Guard Purge
                      </button>
                      <p className="text-[9px] text-gray-500 font-black uppercase text-center mt-6">Cleans DB for Free Tier Safety</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {tab === 'withdrawals' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                <tr>
                  <th className="px-10 py-6">Affiliate</th>
                  <th className="px-10 py-6">Proof</th>
                  <th className="px-10 py-6">Amount</th>
                  <th className="px-10 py-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50/50">
                    <td className="px-10 py-8">
                       <p className="font-black text-malawi-black">{w.userName}</p>
                       <p className="text-[10px] text-gray-400 uppercase">{new Date(w.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-10 py-8">
                      {w.proofUrl && !w.proofUrl.includes("[") ? (
                        <button onClick={() => setViewingProofUrl(w.proofUrl || null)} className="w-12 h-12 rounded-xl overflow-hidden border shadow-sm">
                           <img src={w.proofUrl} className="w-full h-full object-cover" />
                        </button>
                      ) : <span className="text-[9px] font-black text-gray-300">Cleaned</span>}
                    </td>
                    <td className="px-10 py-8 font-black text-malawi-green">MWK {w.amount.toLocaleString()}</td>
                    <td className="px-10 py-8 text-center">
                       {w.status === 'PENDING' ? (
                         <div className="flex gap-2 justify-center">
                            <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} className="bg-green-500 text-white p-2 rounded-lg hover:scale-110"><Check size={14}/></button>
                            <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} className="bg-red-500 text-white p-2 rounded-lg hover:scale-110"><X size={14}/></button>
                         </div>
                       ) : (
                         <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{w.status}</span>
                       )}
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
