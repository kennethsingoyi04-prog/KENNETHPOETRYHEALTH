
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, Complaint, User, WithdrawalRequest, Referral, MembershipTier } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, CloudStatus, syncAppStateToCloud, uploadImage } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Check, Search, 
  UserCheck, Eye, X, Wallet, 
  Users, Zap, Award,
  Upload, Image as ImageIcon, CheckCircle2, Phone, MessageCircle,
  MessageSquareWarning, Maximize2, Download, Loader2, Database, Trash2,
  Globe, Server, CheckCircle, AlertTriangle, ExternalLink, Info, HelpCircle,
  Activity, Gauge, Signal
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

  const handleDatabasePurge = () => {
    if (!window.confirm("CRITICAL: This deletes all heavy image data (Base64) to save your site. It will NOT delete user balances or accounts. Proceed?")) return;
    
    setIsChecking(true);
    const scrubString = (val: any) => {
      if (typeof val === 'string' && (val.startsWith('data:image') || val.length > 2000)) {
        return "[PURGED_FOR_BANDWIDTH]";
      }
      return val;
    };

    const newState = {
      users: state.users.map(u => ({ ...u, membershipProofUrl: scrubString(u.membershipProofUrl) })),
      withdrawals: state.withdrawals.map(w => ({ 
        ...w, 
        proofUrl: scrubString(w.proofUrl), 
        paymentProofUrl: scrubString(w.paymentProofUrl) 
      })),
      complaints: state.complaints.map(c => ({ ...c, imageUrl: scrubString(c.imageUrl) }))
    };

    onStateUpdate(newState);
    setTimeout(async () => {
      await syncAppStateToCloud({ ...state, ...newState });
      setIsChecking(false);
      testSupabaseConnection();
      alert("Database Purged! Your site should now be safe from Netlify billing blocks.");
    }, 1000);
  };

  const isUserOnline = (user: User) => {
    if (!user.lastLoginAt) return false;
    const lastActive = new Date(user.lastLoginAt).getTime();
    const now = new Date().getTime();
    return (now - lastActive) < 300000; 
  };

  const getTimeSinceActive = (user: User) => {
    if (!user.lastLoginAt) return "Never";
    const lastActive = new Date(user.lastLoginAt).getTime();
    const now = new Date().getTime();
    const diffMins = Math.floor((now - lastActive) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return new Date(user.lastLoginAt).toLocaleDateString();
  };

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

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => u.fullName.toLowerCase().includes(searchText.toLowerCase()) || u.username.toLowerCase().includes(searchText.toLowerCase()))
      .sort((a, b) => {
        const aOn = isUserOnline(a);
        const bOn = isUserOnline(b);
        if (aOn && !bOn) return -1;
        if (!aOn && bOn) return 1;
        return new Date(b.lastLoginAt || 0).getTime() - new Date(a.lastLoginAt || 0).getTime();
      });
  }, [state.users, searchText]);

  const filteredWithdrawals = useMemo(() => {
    return state.withdrawals.filter(w => w.userName.toLowerCase().includes(searchText.toLowerCase()) || w.phone.includes(searchText))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.withdrawals, searchText]);

  const UserInspectorModal = ({ user }: { user: User }) => {
    const isOnline = isUserOnline(user);
    const directDownlines = state.users.filter(u => u.referredBy === user.id);
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setInspectingUser(null)}></div>
        <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
          <div className="p-8 border-b flex justify-between items-center bg-gray-50">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-2xl bg-malawi-black flex items-center justify-center text-white text-2xl font-black">{user.fullName.charAt(0)}</div>
               <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">{user.fullName}</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">@{user.username} • {isOnline ? 'Online Now' : 'Last seen ' + getTimeSinceActive(user)}</p>
               </div>
            </div>
            <button onClick={() => setInspectingUser(null)} className="p-2 hover:bg-gray-200 rounded-xl"><X size={24} /></button>
          </div>
          <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="bg-malawi-green text-white p-6 rounded-3xl">
              <p className="text-[10px] font-black uppercase opacity-60">Balance</p>
              <p className="text-2xl font-black">MWK {user.balance.toLocaleString()}</p>
            </div>
            <div className="bg-malawi-black text-white p-6 rounded-3xl">
              <p className="text-[10px] font-black uppercase opacity-60">Earnings</p>
              <p className="text-2xl font-black">MWK {user.totalEarnings.toLocaleString()}</p>
            </div>
            <div className="bg-gray-100 p-6 rounded-3xl">
              <p className="text-[10px] font-black uppercase text-gray-400">Directs</p>
              <p className="text-2xl font-black">{directDownlines.length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-700">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setViewingProofUrl(null)}>
           <button onClick={() => setViewingProofUrl(null)} className="absolute top-6 right-6 p-4 bg-malawi-red text-white rounded-full"><X size={24} /></button>
           <img src={viewingProofUrl} className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" alt="Proof" />
        </div>
      )}
      {inspectingUser && <UserInspectorModal user={inspectingUser} />}

      <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-5 bg-malawi-black text-white rounded-[2rem] border-b-8 border-malawi-red shadow-2xl">
            <ShieldCheck size={36} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-malawi-black">Admin HQ</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <Signal size={12} className={connStatus === 'SUCCESS' ? 'text-malawi-green' : 'text-gray-300'} /> System Operational
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
          { id: 'settings', label: 'Bandwidth Health', icon: Gauge }
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
                {/* STATUS CARDS */}
                <div className="lg:col-span-8 space-y-8">
                   <div className="bg-malawi-black text-white p-10 rounded-[3rem] border-b-8 border-malawi-red shadow-2xl relative overflow-hidden">
                      <div className="relative z-10">
                         <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-malawi-red text-white rounded-3xl"><Activity size={32} /></div>
                            <h2 className="text-3xl font-black uppercase tracking-tight">System Health Monitor</h2>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
                               <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Database Payload Size</p>
                               <div className="flex items-end gap-2">
                                  <p className={`text-4xl font-black ${payloadSize > 500 ? 'text-malawi-red' : 'text-malawi-green'}`}>{payloadSize.toFixed(1)} KB</p>
                                  <p className="text-[10px] font-bold text-gray-400 mb-2">/ 100,000 KB Limit</p>
                               </div>
                               <p className="text-[9px] text-gray-500 mt-4 uppercase font-bold tracking-widest">
                                  {payloadSize > 500 ? '⚠️ DANGER: Bloated Data detected' : '✅ SAFE: Optimized for Free Plan'}
                               </p>
                            </div>
                            
                            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
                               <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Site Connectivity</p>
                               <div className="flex items-center gap-4">
                                  <div className={`w-4 h-4 rounded-full ${connStatus === 'SUCCESS' ? 'bg-malawi-green animate-pulse' : 'bg-gray-500'}`} />
                                  <p className="text-xl font-black uppercase">{connStatus === 'SUCCESS' ? 'Linked' : 'Disconnected'}</p>
                               </div>
                               <button onClick={testSupabaseConnection} className="mt-4 text-[10px] font-black text-malawi-red uppercase tracking-widest hover:underline">Re-test Connection</button>
                            </div>
                         </div>
                      </div>
                      <div className="absolute bottom-0 right-0 p-10 opacity-5 pointer-events-none"><Database size={200} /></div>
                   </div>

                   <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-200">
                      <div className="flex items-center gap-4 mb-6">
                         <div className="p-3 bg-malawi-red/10 text-malawi-red rounded-2xl"><Zap size={24} /></div>
                         <h3 className="text-xl font-black uppercase">Emergency Recovery Checklist</h3>
                      </div>
                      <div className="space-y-4">
                         {[
                            "Rename Site Name in Netlify (Instant Unpause)",
                            "Click 'Purge Base64 Bloat' below to reset usage",
                            "Verify with 'System Health Monitor' above",
                            "Continue recruiting safely without billing blocks"
                         ].map((item, i) => (
                            <div key={i} className="flex gap-4 items-center p-4 bg-white rounded-2xl border border-gray-100">
                               <div className="w-8 h-8 rounded-lg bg-gray-50 border flex items-center justify-center text-[10px] font-black">{i+1}</div>
                               <p className="text-xs font-bold text-gray-600">{item}</p>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* NUCLEAR ACTION */}
                <div className="lg:col-span-4 space-y-8">
                   <div className="bg-white p-10 rounded-[3rem] border-2 border-malawi-red shadow-xl shadow-red-500/5">
                      <div className="flex items-center gap-4 mb-6">
                         <div className="p-3 bg-malawi-red text-white rounded-2xl shadow-lg"><Trash2 size={24} /></div>
                         <h3 className="text-xl font-black uppercase tracking-tight">Nuclear Scrubber</h3>
                      </div>
                      <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                         If Netlify demands billing, it's because your database payload is too large. This button **kills all heavy data** while keeping your users and balances safe.
                      </p>
                      <button 
                        onClick={handleDatabasePurge}
                        disabled={isChecking}
                        className="w-full py-6 bg-malawi-red text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                      >
                        {isChecking ? <Loader2 className="animate-spin" /> : <Database size={18} />}
                        Purge Base64 Bloat
                      </button>
                      <p className="text-[9px] text-gray-400 font-black uppercase text-center mt-6">Resets bandwidth usage to zero.</p>
                   </div>

                   <div className="bg-malawi-green/5 p-8 rounded-[2.5rem] border border-malawi-green/20">
                      <div className="flex items-center gap-3 mb-4">
                         <Info size={18} className="text-malawi-green" />
                         <p className="text-[10px] font-black text-malawi-green uppercase">Pro Tip</p>
                      </div>
                      <p className="text-[11px] font-bold text-gray-600 leading-relaxed uppercase italic">
                         "Netlify blocks URLs. If you rename your site, you get a fresh 100GB limit instantly. Use it wisely by keeping the database small."
                      </p>
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
                    <td className="px-10 py-8">
                      {w.status === 'PENDING' ? (
                        <label className="flex flex-col items-center justify-center w-32 h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 relative overflow-hidden transition-all">
                          {isUploading[w.id] ? (
                            <Loader2 className="animate-spin text-malawi-green" size={20} />
                          ) : payoutProof[w.id] ? (
                            <img src={payoutProof[w.id]} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-1 opacity-40">
                               <Upload size={16} />
                               <span className="text-[8px] font-black uppercase">Attach Shot</span>
                            </div>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={e => handlePayoutProofUpload(w.id, e)} />
                        </label>
                      ) : w.paymentProofUrl && !w.paymentProofUrl.includes("[") ? (
                        <button onClick={() => setViewingProofUrl(w.paymentProofUrl || null)} className="w-32 h-20 rounded-xl overflow-hidden border-2 border-malawi-green/20 shadow-sm hover:scale-105 transition-transform active:scale-95">
                           <img src={w.paymentProofUrl} className="w-full h-full object-cover" />
                        </button>
                      ) : <span className="text-[9px] font-black text-gray-300 uppercase italic">Cleaned</span>}
                    </td>
                    <td className="px-10 py-8 text-center">
                      {w.status === 'PENDING' ? (
                        <div className="flex flex-col gap-2 min-w-[150px]">
                           <input type="text" placeholder="Trans ID / Note" className="p-2 bg-gray-50 border rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-malawi-black transition-all" value={payoutNote[w.id] || ''} onChange={e => setPayoutNote(prev => ({ ...prev, [w.id]: e.target.value }))} />
                           <div className="flex gap-2">
                             <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} className="flex-grow bg-malawi-green text-white py-2 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all">Confirm Paid</button>
                             <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} className="flex-grow bg-malawi-red text-white py-2 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all">Refuse</button>
                           </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{w.status}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                <tr>
                  <th className="px-10 py-6">Affiliate</th>
                  <th className="px-10 py-6">Status</th>
                  <th className="px-10 py-6">Balance</th>
                  <th className="px-10 py-6 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-10 py-6">
                       <p className="font-black text-malawi-black">{u.fullName}</p>
                       <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5 font-bold">@{u.username}</p>
                    </td>
                    <td className="px-10 py-6">
                      {isUserOnline(u) ? <span className="text-green-600 font-black text-[9px] uppercase flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_green]" /> Live Now</span> : <span className="text-gray-400 font-black text-[9px] uppercase">Seen {getTimeSinceActive(u)}</span>}
                    </td>
                    <td className="px-10 py-6 font-black text-malawi-green text-lg">MWK {u.balance.toLocaleString()}</td>
                    <td className="px-10 py-6 text-center">
                       <button onClick={() => setInspectingUser(u)} className="p-3 bg-gray-50 hover:bg-malawi-black hover:text-white rounded-xl transition-all shadow-sm active:scale-95"><Eye size={18} /></button>
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
