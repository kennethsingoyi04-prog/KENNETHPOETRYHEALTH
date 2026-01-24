
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
  Activity, Gauge, Signal, ArrowRight, ShieldAlert, Rocket, Terminal
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
    if (!window.confirm("WARNING: This will pull ALL data from Supabase, strip every single Base64 image, and save it back. This is REQUIRED for Vercel deployment to avoid bandwidth blocks. User accounts and balances are SAFE. Proceed?")) return;
    
    setIsChecking(true);
    try {
      const cloudData = await fetchAppStateFromCloud();
      if (!cloudData) throw new Error("Could not fetch cloud data");
      
      const cleanedData = nuclearScrub(cloudData);
      
      onStateUpdate(cleanedData);
      await syncAppStateToCloud({ ...state, ...cleanedData });
      
      await testSupabaseConnection();
      alert("Nuclear Purge Complete! Your database is now lightweight. You are ready for Vercel.");
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

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => u.fullName.toLowerCase().includes(searchText.toLowerCase()) || u.username.toLowerCase().includes(searchText.toLowerCase()))
      .sort((a, b) => new Date(b.lastLoginAt || 0).getTime() - new Date(a.lastLoginAt || 0).getTime());
  }, [state.users, searchText]);

  const handlePayoutProofUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(prev => ({ ...prev, [id]: true }));
    const url = await uploadImage(file, 'payout_receipts');
    if (url) setPayoutProof(prev => ({ ...prev, [id]: url }));
    setIsUploading(prev => ({ ...prev, [id]: false }));
  };

  const handleWithdrawalAction = (id: string, status: WithdrawalStatus) => {
    const request = state.withdrawals.find(w => w.id === id);
    if (!request) return;
    let updatedUsers = [...state.users];
    if (status === WithdrawalStatus.REJECTED) {
      updatedUsers = state.users.map(u => u.id === request.userId ? { ...u, balance: u.balance + request.amount } : u);
    }
    const updatedWithdrawals = state.withdrawals.map(w => w.id === id ? { ...w, status, adminNote: payoutNote[id] || '', paymentProofUrl: payoutProof[id] || w.paymentProofUrl } : w);
    onStateUpdate({ withdrawals: updatedWithdrawals, users: updatedUsers });
    setPayoutNote(prev => ({ ...prev, [id]: '' }));
    setPayoutProof(prev => ({ ...prev, [id]: '' }));
  };

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
            <ShieldCheck size={36} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-malawi-black">Admin HQ</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <Rocket size={12} className="text-malawi-green" /> Vercel Deployment Ready
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Filter records..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-80 shadow-sm outline-none focus:ring-2 focus:ring-malawi-black transition-all font-medium" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] hover:bg-gray-50 transition-all shadow-sm active:scale-95"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'memberships', label: 'Activation', icon: Award, count: state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING).length },
          { id: 'complaints', label: 'Support', icon: MessageSquareWarning, count: state.complaints.filter(c => c.status === 'PENDING').length },
          { id: 'settings', label: 'Vercel Migration', icon: Terminal }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border relative transition-all ${tab === t.id ? 'bg-malawi-black text-white shadow-xl scale-105 z-10' : 'bg-white text-gray-400 hover:text-gray-600 shadow-sm'}`}>
            <t.icon size={18} /> {t.label}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2.5 py-1 rounded-full text-[9px] font-black border-2 border-white">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[3rem] border shadow-2xl overflow-hidden min-h-[600px]">
        {tab === 'settings' && (
          <div className="p-10 lg:p-16 space-y-12">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* VERCEL MIGRATION STEPS */}
                <div className="lg:col-span-8 space-y-8">
                   <div className="bg-malawi-black text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                      <div className="relative z-10">
                         <div className="flex items-center gap-4 mb-8">
                            <Rocket size={40} className="text-malawi-green" />
                            <h2 className="text-3xl font-black uppercase tracking-tight">Vercel Deployment Guide</h2>
                         </div>

                         <div className="space-y-8">
                            <div className="flex gap-5 items-start">
                               <div className="w-10 h-10 rounded-2xl bg-malawi-green text-white flex items-center justify-center font-black shrink-0 shadow-lg">1</div>
                               <div>
                                  <p className="font-black uppercase text-lg mb-1">Push to GitHub</p>
                                  <p className="text-sm text-gray-400">Ensure all local changes are pushed to your repository.</p>
                               </div>
                            </div>
                            <div className="flex gap-5 items-start">
                               <div className="w-10 h-10 rounded-2xl bg-malawi-green text-white flex items-center justify-center font-black shrink-0 shadow-lg">2</div>
                               <div>
                                  <p className="font-black uppercase text-lg mb-1">Import to Vercel</p>
                                  <p className="text-sm text-gray-400">Log into Vercel, click <b>"Add New"</b> -> <b>"Project"</b>. Select your GitHub repo.</p>
                               </div>
                            </div>
                            <div className="flex gap-5 items-start">
                               <div className="w-10 h-10 rounded-2xl bg-malawi-red text-white flex items-center justify-center font-black shrink-0 shadow-lg">3</div>
                               <div>
                                  <p className="font-black uppercase text-lg mb-1">Add Supabase Keys</p>
                                  <p className="text-sm text-gray-400">In Vercel Settings, add <code>SUPABASE_URL</code> and <code>SUPABASE_KEY</code> variables for security.</p>
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="absolute top-0 right-0 w-64 h-64 bg-malawi-green/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                   </div>

                   <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-200">
                      <div className="flex items-center justify-between mb-8">
                         <h3 className="text-xl font-black uppercase flex items-center gap-2"><Activity size={20} /> Bandwidth Meter</h3>
                         <button onClick={testSupabaseConnection} className="text-[10px] font-black text-malawi-green uppercase flex items-center gap-2 hover:underline">
                           <RefreshCw size={14} className={connStatus === 'TESTING' ? 'animate-spin' : ''} /> Refresh
                         </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-white p-8 rounded-3xl border shadow-sm">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Total JSON Weight</p>
                            <p className={`text-4xl font-black ${payloadSize > 100 ? 'text-malawi-red' : 'text-malawi-green'}`}>{payloadSize.toFixed(1)} KB</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">Target: Under 100 KB</p>
                         </div>
                         <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col justify-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Supabase Status</p>
                            <div className="flex items-center gap-3">
                               <div className={`w-3 h-3 rounded-full ${connStatus === 'SUCCESS' ? 'bg-malawi-green animate-pulse' : 'bg-gray-300'}`} />
                               <p className="text-xl font-black uppercase">{connStatus === 'SUCCESS' ? 'Connected' : 'Sync Pending'}</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* NUCLEAR ACTION */}
                <div className="lg:col-span-4 space-y-8">
                   <div className="bg-malawi-black text-white p-10 rounded-[3.5rem] border-b-8 border-malawi-red shadow-2xl relative">
                      <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2 text-malawi-red">
                         <ShieldAlert size={24} /> Cleanup Tool
                      </h3>
                      <p className="text-xs text-gray-400 font-medium mb-10 leading-relaxed uppercase">
                         Run this before your first Vercel deploy. It strips all Base64 bloat, ensuring your new site starts with zero bandwidth waste.
                      </p>
                      <button 
                        onClick={handleNuclearPurge}
                        disabled={isChecking}
                        className="w-full py-6 bg-malawi-red text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                      >
                        {isChecking ? <Loader2 className="animate-spin" /> : <Database size={18} />}
                        Nuclear Purge
                      </button>
                      <p className="text-[9px] text-gray-500 font-black uppercase text-center mt-6 tracking-widest">Optimizes DB for Vercel/Supabase</p>
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
                  <th className="px-10 py-6">Identity Proof</th>
                  <th className="px-10 py-6">Amount & Method</th>
                  <th className="px-10 py-6">Your Receipt</th>
                  <th className="px-10 py-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-10 py-8">
                       <p className="font-black text-malawi-black">{w.userName}</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">{new Date(w.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-10 py-8">
                      {w.proofUrl && !w.proofUrl.includes("[") ? (
                        <button onClick={() => setViewingProofUrl(w.proofUrl || null)} className="w-32 h-20 rounded-xl overflow-hidden border-2 border-white shadow-md relative group transition-transform hover:scale-105 active:scale-95">
                           <img src={w.proofUrl} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><Maximize2 size={16} /></div>
                        </button>
                      ) : <span className="text-[9px] font-black text-gray-300 uppercase italic">Cleaned</span>}
                    </td>
                    <td className="px-10 py-8">
                       <p className="text-2xl font-black text-malawi-green">MWK {w.amount.toLocaleString()}</p>
                       <p className="text-[10px] font-black text-gray-400 uppercase mt-1">{w.paymentMethod} • {w.phone}</p>
                    </td>
                    <td className="px-10 py-8 text-center">
                      {w.status === 'PENDING' ? (
                        <div className="flex flex-col gap-2 min-w-[150px]">
                           <input type="text" placeholder="Trans ID / Note" className="p-2 bg-gray-50 border rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-malawi-black transition-all" value={payoutNote[w.id] || ''} onChange={e => setPayoutNote(prev => ({ ...prev, [w.id]: e.target.value }))} />
                           <div className="flex gap-2">
                             <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} className="flex-grow bg-malawi-green text-white py-2 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all">Paid</button>
                             <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} className="flex-grow bg-malawi-red text-white py-2 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all">Refuse</button>
                           </div>
                        </div>
                      ) : (
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{w.status}</span>
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
