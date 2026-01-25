
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
  BookOpen
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
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [showTechnicalSetup, setShowTechnicalSetup] = useState(false);
  
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [payoutNote, setPayoutNote] = useState<{ [key: string]: string }>({});

  const SUPABASE_SQL = `-- 1. Create the main data storage table
CREATE TABLE IF NOT EXISTS public.app_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Security (RLS)
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- 3. Allow your app to read/write data
CREATE POLICY "Public Full Access" ON public.app_state FOR ALL USING (true) WITH CHECK (true);

-- 4. Create a bucket for receipts and IDs (Storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Allow public to upload to images bucket
CREATE POLICY "Public Upload Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'images');`;

  const ENV_TEMPLATE = `SUPABASE_URL=[PASTE_YOUR_PROJECT_URL_HERE]
SUPABASE_KEY=[PASTE_YOUR_ANON_PUBLIC_KEY_HERE]
API_KEY=[PASTE_YOUR_GEMINI_API_KEY_HERE]`;

  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const handleManualSync = async () => {
    setIsChecking(true);
    await syncAppStateToCloud(state);
    setIsChecking(false);
    testSupabaseConnection();
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

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(ENV_TEMPLATE);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 3000);
  };

  const handleNuclearPurge = async () => {
    if (!window.confirm("PURGE DATA: This will strip all heavy strings from the cloud to keep your Supabase bandwidth at 0%. Your balances are safe. Proceed?")) return;
    setIsChecking(true);
    try {
      const cloudData = await fetchAppStateFromCloud();
      if (!cloudData) throw new Error("Could not fetch cloud data");
      const cleanedData = nuclearScrub(cloudData);
      onStateUpdate(cleanedData);
      await syncAppStateToCloud({ ...state, ...cleanedData });
      await testSupabaseConnection();
      alert("Zero-Billing Guard Purge Complete!");
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

  const handleBookSellerAction = (userId: string, status: BookSellerStatus) => {
    const updatedUsers = state.users.map(u => 
      u.id === userId ? { ...u, bookSellerStatus: status } : u
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

  const bookApplications = useMemo(() => {
    return state.users.filter(u => u.bookSellerStatus === BookSellerStatus.PENDING);
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
              <ShieldCheck size={12} className="text-malawi-green" /> Free-Forever Mode Active
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
          { id: 'books', label: 'Book Sellers', icon: BookOpen, count: bookApplications.length },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'settings', label: 'Safety', icon: ShieldAlert }
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

        {tab === 'books' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                   <tr>
                      <th className="px-10 py-6">Affiliate Name</th>
                      <th className="px-10 py-6">Contact Details</th>
                      <th className="px-10 py-6">WhatsApp</th>
                      <th className="px-10 py-6 text-center">Approve / Reject</th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   {bookApplications.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50">
                         <td className="px-10 py-8">
                            <p className="font-black text-malawi-black">{u.fullName}</p>
                            <p className="text-[10px] text-gray-400 uppercase">@{u.username}</p>
                         </td>
                         <td className="px-10 py-8">
                            <p className="text-sm font-bold">{u.bookSellerPhone || u.phone}</p>
                         </td>
                         <td className="px-10 py-8">
                            <a href={`https://wa.me/${u.bookSellerWhatsapp || u.whatsapp}`} target="_blank" className="text-malawi-green font-black text-[10px] uppercase flex items-center gap-2">
                               <MessageSquareWarning size={14} /> Open Chat
                            </a>
                         </td>
                         <td className="px-10 py-8">
                            <div className="flex justify-center gap-3">
                               <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.APPROVED)} className="bg-green-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-green-600 active:scale-95 transition-all">Approve</button>
                               <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.REJECTED)} className="bg-red-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 active:scale-95 transition-all">Reject</button>
                            </div>
                         </td>
                      </tr>
                   ))}
                   {bookApplications.length === 0 && (
                      <tr><td colSpan={4} className="p-20 text-center text-gray-400 font-bold uppercase italic">No pending seller applications</td></tr>
                   )}
                </tbody>
             </table>
          </div>
        )}

        {tab === 'settings' && (
          <div className="p-10 lg:p-16 space-y-12 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 space-y-8">
                   <div className="bg-malawi-green text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                      <div className="relative z-10">
                         <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                               <Rocket size={40} />
                               <h2 className="text-3xl font-black uppercase tracking-tight">System Status</h2>
                            </div>
                            {connStatus === 'SUCCESS' && (
                              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full border border-white/20">
                                 <CheckCircle2 size={16} />
                                 <span className="text-[10px] font-black uppercase">Active</span>
                              </div>
                            )}
                         </div>
                         <p className="text-sm font-bold opacity-80 uppercase leading-relaxed mb-6">
                           Your platform is currently running on the Supabase Free Tier. We have optimized all data transfers to ensure your hosting remains 100% free of charge.
                         </p>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/20 p-5 rounded-3xl border border-white/10">
                               <p className="text-[10px] font-black uppercase opacity-60">Database Size</p>
                               <p className="text-2xl font-black">{payloadSize.toFixed(1)} KB</p>
                               <div className="w-full bg-white/20 h-1 rounded-full mt-3 overflow-hidden">
                                  <div className="bg-white h-full" style={{ width: `${Math.min((payloadSize / 512) * 100, 100)}%` }}></div>
                               </div>
                            </div>
                            <div className="bg-white/20 p-5 rounded-3xl border border-white/10">
                               <p className="text-[10px] font-black uppercase opacity-60">Connection</p>
                               <p className="text-2xl font-black">{connStatus === 'SUCCESS' ? 'HEALTHY' : 'TESTING...'}</p>
                            </div>
                         </div>
                      </div>
                      <div className="absolute bottom-[-10%] right-[-5%] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                   </div>

                   {showTechnicalSetup && (
                     <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                        <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-200">
                           <div className="flex items-center justify-between mb-8">
                              <h3 className="text-xl font-black uppercase flex items-center gap-2"><Terminal size={20} /> SQL Editor Block</h3>
                              <button onClick={handleCopySql} className="flex items-center gap-2 bg-malawi-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95">
                                 {copiedSql ? <ClipboardCheck size={14} className="text-malawi-green" /> : <Copy size={14} />}
                                 Copy SQL
                              </button>
                           </div>
                           <div className="bg-malawi-black p-6 rounded-2xl overflow-x-auto">
                             <pre className="text-[10px] font-mono text-malawi-green leading-relaxed">{SUPABASE_SQL}</pre>
                           </div>
                        </div>

                        <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-200">
                           <div className="flex items-center justify-between mb-8">
                              <h3 className="text-xl font-black uppercase flex items-center gap-2"><Key size={20} /> Netlify Env Block</h3>
                              <button onClick={handleCopyEnv} className="flex items-center gap-2 bg-malawi-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95">
                                 {copiedEnv ? <ClipboardCheck size={14} className="text-malawi-green" /> : <Copy size={14} />}
                                 Copy Env
                              </button>
                           </div>
                           <div className="bg-malawi-black p-6 rounded-2xl font-mono text-[10px] text-malawi-green">
                              <pre className="whitespace-pre-wrap">{ENV_TEMPLATE}</pre>
                           </div>
                        </div>
                     </div>
                   )}

                   <div className="flex justify-center">
                      <button 
                        onClick={() => setShowTechnicalSetup(!showTechnicalSetup)}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-malawi-black flex items-center gap-2 transition-all"
                      >
                        <Settings2 size={14} />
                        {showTechnicalSetup ? 'Hide Technical Setup Guide' : 'Show Technical Setup Guide'}
                      </button>
                   </div>
                </div>

                <div className="lg:col-span-5">
                   <div className="bg-malawi-black text-white p-12 rounded-[4rem] border-b-[12px] border-malawi-red shadow-2xl relative overflow-hidden">
                      <div className="relative z-10 space-y-8">
                         <div className="flex items-center gap-4 text-malawi-red">
                            <ZapOff size={32} />
                            <h3 className="text-2xl font-black uppercase tracking-tight">Zero-Billing Guard</h3>
                         </div>
                         <p className="text-sm font-bold opacity-60 uppercase leading-relaxed">
                           Use this tool to scrub large cached images and heavy metadata from your cloud storage. This keeps your database lightweight and ensures you never exceed the free bandwidth limits.
                         </p>
                         <button 
                           onClick={handleNuclearPurge}
                           disabled={isChecking}
                           className="w-full py-7 bg-malawi-red hover:bg-red-700 text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                         >
                           {isChecking ? <Loader2 className="animate-spin" /> : <Trash2 size={20} />}
                           Execute Billing Safety Purge
                         </button>
                         <div className="p-5 bg-white/5 border border-white/10 rounded-3xl">
                            <div className="flex items-center gap-3 text-malawi-green mb-2">
                               <ShieldCheck size={18} />
                               <span className="text-[10px] font-black uppercase">Safe for Balances</span>
                            </div>
                            <p className="text-[10px] font-bold opacity-40 uppercase">This purge only removes heavy visual caches. All user balances, referrals, and passwords are protected.</p>
                         </div>
                      </div>
                      <div className="absolute top-[-10%] left-[-5%] w-48 h-48 bg-malawi-red/10 rounded-full blur-3xl"></div>
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
                      ) : <span className="text-[9px] font-black text-gray-300">Protected</span>}
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
