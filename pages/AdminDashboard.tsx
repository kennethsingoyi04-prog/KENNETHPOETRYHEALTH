
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, Complaint, User, WithdrawalRequest, Referral, MembershipTier } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, CloudStatus, syncAppStateToCloud, uploadImage } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Check, Search, 
  UserCheck, Eye, X, Wallet, 
  Users, Zap, Award,
  Upload, Image as ImageIcon, CheckCircle2, Phone, MessageCircle,
  MessageSquareWarning, Maximize2, Download, Loader2
} from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const [tab, setTab] = useState<'withdrawals' | 'users' | 'memberships' | 'complaints'>('withdrawals');
  const [isChecking, setIsChecking] = useState(false);
  const [searchText, setSearchText] = useState("");
  
  // Modal States
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  
  // Payout processing state
  const [payoutNote, setPayoutNote] = useState<{ [key: string]: string }>({});
  const [payoutProof, setPayoutProof] = useState<{ [key: string]: string }>({});
  const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({});

  const handleManualSync = async () => {
    setIsChecking(true);
    await syncAppStateToCloud(state);
    setIsChecking(false);
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
    if (url) {
      setPayoutProof(prev => ({ ...prev, [id]: url }));
    }
    setIsUploading(prev => ({ ...prev, [id]: false }));
  };

  const handleWithdrawalAction = (id: string, status: WithdrawalStatus) => {
    const request = state.withdrawals.find(w => w.id === id);
    if (!request) return;

    let updatedUsers = [...state.users];
    if (status === WithdrawalStatus.REJECTED) {
      updatedUsers = state.users.map(u => 
        u.id === request.userId ? { ...u, balance: u.balance + request.amount } : u
      );
    }

    const updatedWithdrawals = state.withdrawals.map(w => 
      w.id === id ? { 
        ...w, 
        status, 
        adminNote: payoutNote[id] || '',
        paymentProofUrl: payoutProof[id] || w.paymentProofUrl
      } : w
    );

    onStateUpdate({ 
      withdrawals: updatedWithdrawals,
      users: updatedUsers 
    });
    
    setPayoutNote(prev => ({ ...prev, [id]: '' }));
    setPayoutProof(prev => ({ ...prev, [id]: '' }));
  };

  const handleMembershipAction = (userId: string, status: MembershipStatus) => {
    const updatedUsers = state.users.map(u => 
      u.id === userId ? { ...u, membershipStatus: status } : u
    );
    onStateUpdate({ users: updatedUsers });
  };

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
      u.username.toLowerCase().includes(searchText.toLowerCase())
    ).sort((a, b) => {
      const aOn = isUserOnline(a);
      const bOn = isUserOnline(b);
      if (aOn && !bOn) return -1;
      if (!aOn && bOn) return 1;
      return new Date(b.lastLoginAt || 0).getTime() - new Date(a.lastLoginAt || 0).getTime();
    });
  }, [state.users, searchText]);

  const filteredWithdrawals = useMemo(() => {
    return state.withdrawals.filter(w => 
      w.userName.toLowerCase().includes(searchText.toLowerCase()) ||
      w.phone.includes(searchText)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.withdrawals, searchText]);

  // Modals
  const ProofInspector = ({ url, onClose }: { url: string, onClose: () => void }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="absolute top-6 right-6 flex gap-3" onClick={e => e.stopPropagation()}>
        <a href={url} target="_blank" rel="noopener noreferrer" className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"><Maximize2 size={24} /></a>
        <button onClick={onClose} className="p-4 bg-malawi-red text-white rounded-full shadow-xl active:scale-95 transition-all"><X size={24} /></button>
      </div>
      <img src={url} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain ring-4 ring-white/10" alt="HD Proof" onClick={e => e.stopPropagation()} />
    </div>
  );

  const UserInspectorModal = ({ user }: { user: User }) => {
    const isOnline = isUserOnline(user);
    const directDownlines = state.users.filter(u => u.referredBy === user.id);
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setInspectingUser(null)}></div>
        <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
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
          <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-malawi-green text-white p-6 rounded-3xl shadow-lg shadow-green-500/10">
              <p className="text-[10px] font-black uppercase opacity-60">Wallet Balance</p>
              <p className="text-3xl font-black">MWK {user.balance.toLocaleString()}</p>
            </div>
            <div className="bg-malawi-black text-white p-6 rounded-3xl shadow-lg shadow-black/10">
              <p className="text-[10px] font-black uppercase opacity-60">Total Earnings</p>
              <p className="text-3xl font-black">MWK {user.totalEarnings.toLocaleString()}</p>
            </div>
            <div className="bg-gray-100 p-6 rounded-3xl border">
              <p className="text-[10px] font-black uppercase text-gray-400">Network Size</p>
              <p className="text-3xl font-black">{directDownlines.length} Direct</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-700">
      {viewingProofUrl && <ProofInspector url={viewingProofUrl} onClose={() => setViewingProofUrl(null)} />}
      {inspectingUser && <UserInspectorModal user={inspectingUser} />}

      <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-5 bg-malawi-black text-white rounded-[2rem] border-b-8 border-malawi-red shadow-2xl">
            <ShieldCheck size={36} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-malawi-black">Admin HQ</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em] mt-1 flex items-center gap-2"><Zap size={12} className="text-malawi-green" /> Storage Optimized</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Filter records..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-80 shadow-sm outline-none focus:ring-2 focus:ring-malawi-black transition-all" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] hover:bg-gray-50 transition-all shadow-sm active:scale-95"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'memberships', label: 'Activation', icon: Award, count: state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING).length },
          { id: 'complaints', label: 'Support', icon: MessageSquareWarning, count: state.complaints.filter(c => c.status === 'PENDING').length }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border relative transition-all ${tab === t.id ? 'bg-malawi-black text-white shadow-xl scale-105 z-10' : 'bg-white text-gray-400 hover:text-gray-600 shadow-sm'}`}>
            <t.icon size={18} /> {t.label}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2.5 py-1 rounded-full text-[9px] font-black border-2 border-white">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[3rem] border shadow-2xl overflow-hidden min-h-[600px]">
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
                      {w.proofUrl ? (
                        <button onClick={() => setViewingProofUrl(w.proofUrl || null)} className="w-32 h-20 rounded-xl overflow-hidden border-2 border-white shadow-md relative group transition-transform hover:scale-105 active:scale-95">
                           <img src={w.proofUrl} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><Maximize2 size={16} /></div>
                        </button>
                      ) : <span className="text-[9px] font-black text-gray-300 uppercase italic">No Proof</span>}
                    </td>
                    <td className="px-10 py-8">
                       <p className="text-2xl font-black text-malawi-green">MWK {w.amount.toLocaleString()}</p>
                       <p className="text-[10px] font-black text-gray-400 uppercase mt-1">{w.paymentMethod} • {w.phone}</p>
                       <div className="flex gap-2 mt-2">
                          <a href={`tel:${w.phone}`} className="p-1.5 bg-gray-100 rounded-lg hover:bg-malawi-green hover:text-white transition-all"><Phone size={12} /></a>
                          <a href={`https://wa.me/${w.whatsapp}`} target="_blank" className="p-1.5 bg-gray-100 rounded-lg hover:bg-green-500 hover:text-white transition-all"><MessageCircle size={12} /></a>
                       </div>
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
                      ) : w.paymentProofUrl ? (
                        <button onClick={() => setViewingProofUrl(w.paymentProofUrl || null)} className="w-32 h-20 rounded-xl overflow-hidden border-2 border-malawi-green/20 shadow-sm hover:scale-105 transition-transform active:scale-95">
                           <img src={w.paymentProofUrl} className="w-full h-full object-cover" />
                        </button>
                      ) : <span className="text-[9px] font-black text-gray-300 uppercase">None</span>}
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
                          {w.adminNote && <p className="text-[9px] text-gray-400 italic">"{w.adminNote}"</p>}
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

        {tab === 'memberships' && (
          <div className="p-10 space-y-8">
             <div className="flex justify-between items-center border-b pb-6">
                <h2 className="text-xl font-black uppercase tracking-tight">Pending Activations</h2>
                <span className="bg-malawi-black text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase">{state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING).length} Waiting</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING).map(u => (
                 <div key={u.id} className="bg-gray-50 rounded-[2.5rem] p-8 border hover:shadow-xl transition-all group">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-14 h-14 bg-malawi-black text-white rounded-2xl flex items-center justify-center font-black text-xl">{u.fullName.charAt(0)}</div>
                       <div>
                          <p className="font-black text-malawi-black uppercase text-sm">{u.fullName}</p>
                          <p className="text-[10px] font-black text-malawi-red uppercase">{u.membershipTier} Plan Requested</p>
                       </div>
                    </div>
                    {u.membershipProofUrl && (
                      <button onClick={() => setViewingProofUrl(u.membershipProofUrl || null)} className="w-full h-48 rounded-2xl overflow-hidden border-4 border-white shadow-xl relative group mb-6">
                         <img src={u.membershipProofUrl} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest">Verify Screenshot</div>
                      </button>
                    )}
                    <button onClick={() => handleMembershipAction(u.id, MembershipStatus.ACTIVE)} className="w-full bg-malawi-green text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-green-500/10 active:scale-95 transition-all">Approve & Activate</button>
                 </div>
               ))}
               {state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING).length === 0 && (
                 <div className="col-span-full py-20 text-center text-gray-300 italic">No pending memberships at this moment.</div>
               )}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
