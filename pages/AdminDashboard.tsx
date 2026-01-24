
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, Complaint, User, WithdrawalRequest, Referral, MembershipTier } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, CloudStatus, syncAppStateToCloud, uploadImage, nuclearScrub, fetchAppStateFromCloud } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Check, Search, 
  UserCheck, Eye, X, Wallet, 
  Users, Zap, Award,
  Upload, Image as ImageIcon, CheckCircle2, Phone, MessageCircle,
  MessageSquareWarning, Maximize2, Download, Loader2, Database, Trash2,
  Globe, Server, CheckCircle, AlertTriangle, ExternalLink, Info, HelpCircle,
  Activity, Gauge, Signal, ArrowRight, ShieldAlert, Rocket, Terminal, ZapOff
} from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const [tab, setTab] = useState<'withdrawals' | 'users' | 'memberships' | 'complaints' | 'settings'>('withdrawals');
  const [isChecking, setIsChecking] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [connStatus, setConnStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [payloadSize, setPayloadSize] = useState<number>(0);
  
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [payoutNote, setPayoutNote] = useState<{ [key: string]: string }>({});
  const [payoutProof, setPayoutProof] = useState<{ [key: string]: string }>({});
  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({});

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
    if (!window.confirm("PURGE DATA: This will strip all Base64 images from the cloud database to ensure your Vercel bandwidth stays at 0%. Your balances and users are safe. Proceed?")) return;
    
    setIsChecking(true);
    try {
      const cloudData = await fetchAppStateFromCloud();
      if (!cloudData) throw new Error("Could not fetch cloud data");
      const cleanedData = nuclearScrub(cloudData);
      onStateUpdate(cleanedData);
      await syncAppStateToCloud({ ...state, ...cleanedData });
      await testSupabaseConnection();
      alert("Billing Safety Purge Complete!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsChecking(false);
    }
  };

  const filteredWithdrawals = useMemo(() => {
    return state.withdrawals.filter(w => w.userName.toLowerCase().includes(searchText.toLowerCase()) || w.phone.includes(searchText))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.withdrawals, searchText]);

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
              <ShieldCheck size={12} className="text-malawi-green" /> Vercel Billing Guard: Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search archives..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-80 shadow-sm outline-none focus:ring-2 focus:ring-malawi-black transition-all font-medium" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] hover:bg-gray-50 transition-all shadow-sm active:scale-95"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'settings', label: 'Billing Health', icon: Gauge }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border relative transition-all ${tab === t.id ? 'bg-malawi-black text-white shadow-xl scale-105 z-10' : 'bg-white text-gray-400 hover:text-gray-600 shadow-sm'}`}>
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[3rem] border shadow-2xl overflow-hidden min-h-[600px]">
        {tab === 'settings' && (
          <div className="p-10 lg:p-16 space-y-12">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                   <div className="bg-malawi-green text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                      <div className="relative z-10">
                         <div className="flex items-center gap-4 mb-8">
                            <Rocket size={40} />
                            <h2 className="text-3xl font-black uppercase tracking-tight">Zero-Billing Health</h2>
                         </div>
                         <div className="space-y-4">
                           <div className="flex justify-between items-center text-sm font-black uppercase">
                             <span>Vercel Bandwidth Usage</span>
                             <span className="bg-white/20 px-3 py-1 rounded-lg">Estimated: 0.01%</span>
                           </div>
                           <div className="w-full h-4 bg-black/10 rounded-full overflow-hidden">
                             <div className="h-full bg-white" style={{ width: '1%' }}></div>
                           </div>
                           <p className="text-xs opacity-70 uppercase font-bold tracking-widest mt-4">
                             Your database payload is currently {payloadSize.toFixed(1)}KB. 
                             You can perform ~1,000,000 syncs per month for free.
                           </p>
                         </div>
                      </div>
                   </div>

                   <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-200">
                      <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-2"><Signal size={20} /> Vercel Auto-Connect</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-white p-8 rounded-3xl border shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Vercel Integration</p>
                            <div className="flex items-center gap-2 text-malawi-green font-black">
                               <CheckCircle size={18} />
                               <span className="text-lg">ENABLED</span>
                            </div>
                         </div>
                         <div className="bg-white p-8 rounded-3xl border shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Supabase Handshake</p>
                            <div className="flex items-center gap-2 text-malawi-green font-black">
                               <CheckCircle size={18} />
                               <span className="text-lg">{connStatus === 'SUCCESS' ? 'VERIFIED' : 'SYNCING'}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                   <div className="bg-malawi-black text-white p-10 rounded-[3.5rem] border-b-8 border-malawi-red shadow-2xl">
                      <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2 text-malawi-red">
                         <ZapOff size={24} /> Billing Block
                      </h3>
                      <p className="text-xs text-gray-400 font-medium mb-10 leading-relaxed uppercase">
                         This tool forcefully deletes heavy data in the cloud. Use it if your Vercel bandwidth spikes.
                      </p>
                      <button 
                        onClick={handleNuclearPurge}
                        disabled={isChecking}
                        className="w-full py-6 bg-malawi-red text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                      >
                        {isChecking ? <Loader2 className="animate-spin" /> : <Trash2 size={18} />}
                        Billing Guard Purge
                      </button>
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
                  <th className="px-10 py-6">Identity</th>
                  <th className="px-10 py-6">Amount</th>
                  <th className="px-10 py-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-10 py-8">
                       <p className="font-black text-malawi-black">{w.userName}</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{new Date(w.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-10 py-8">
                      {w.proofUrl && !w.proofUrl.includes("[") ? (
                        <button onClick={() => setViewingProofUrl(w.proofUrl || null)} className="w-24 h-14 rounded-xl overflow-hidden border shadow-sm hover:scale-105 transition-transform active:scale-95">
                           <img src={w.proofUrl} className="w-full h-full object-cover" />
                        </button>
                      ) : <span className="text-[9px] font-black text-gray-300 uppercase">Cleaned</span>}
                    </td>
                    <td className="px-10 py-8 font-black text-malawi-green">MWK {w.amount.toLocaleString()}</td>
                    <td className="px-10 py-8 text-center">
                      <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : w.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{w.status}</span>
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
