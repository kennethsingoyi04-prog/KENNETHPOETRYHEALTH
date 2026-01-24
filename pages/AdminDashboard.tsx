
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, Complaint, User, WithdrawalRequest, Referral, MembershipTier } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, CloudStatus, syncAppStateToCloud } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Check, Search, 
  UserCheck, MessageSquare, Eye, X, Wallet, 
  ChevronRight, Users, TrendingUp, ArrowLeft, Target, Award,
  Activity, Zap, UserPlus, LogIn, Edit3, Save, Ban, ShieldAlert,
  Radio, FileImage, Upload, Image as ImageIcon, Clock, CheckCircle2, XCircle, Phone, MessageCircle,
  Smartphone, ExternalLink, MessageSquareWarning, CreditCard, Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'withdrawals' | 'users' | 'memberships' | 'complaints' | 'activity'>('withdrawals');
  const [cloudInfo, setCloudInfo] = useState<CloudStatus>({ ok: false, isCloud: true });
  const [isChecking, setIsChecking] = useState(true);
  const [searchText, setSearchText] = useState("");
  
  // States for handling responses
  const [payoutNote, setPayoutNote] = useState<{ [key: string]: string }>({});
  const [payoutProof, setPayoutProof] = useState<{ [key: string]: string }>({});
  const [ticketReply, setTicketReply] = useState<{ [key: string]: string }>({});
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

  const liveUsersCount = useMemo(() => {
    return state.users.filter(u => isUserOnline(u)).length;
  }, [state.users]);

  // --- ACTIONS ---

  const handlePayoutProofUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPayoutProof(prev => ({ ...prev, [id]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
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

  const handleComplaintReply = (id: string) => {
    const reply = ticketReply[id];
    if (!reply?.trim()) return;
    const updatedComplaints = state.complaints.map(c => 
      c.id === id ? { ...c, reply, status: 'RESOLVED' as const, updatedAt: new Date().toISOString() } : c
    );
    onStateUpdate({ complaints: updatedComplaints });
    setTicketReply(prev => ({ ...prev, [id]: '' }));
  };

  const viewImage = (url?: string) => {
    if (!url) return;
    navigate(`/admin/proof-preview?url=${encodeURIComponent(url)}`);
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

  const pendingActivations = useMemo(() => {
    return state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING);
  }, [state.users]);

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-700">
      <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-5 bg-malawi-black text-white rounded-[2rem] border-b-8 border-malawi-red shadow-2xl">
            <ShieldCheck size={36} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-malawi-black">Admin HQ</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <Zap size={14} className="text-malawi-green" /> Platform Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input 
              type="text" 
              placeholder="Filter names, phones, IDs..." 
              className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-80 lg:w-[400px] shadow-sm outline-none focus:ring-2 focus:ring-malawi-black" 
              value={searchText} 
              onChange={(e) => setSearchText(e.target.value)} 
             />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] hover:bg-gray-50 transition-all">
            <RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'users', label: 'Affiliates', icon: Users, live: liveUsersCount },
          { id: 'memberships', label: 'Activation', icon: Award, count: pendingActivations.length },
          { id: 'complaints', label: 'Support', icon: MessageSquareWarning, count: state.complaints.filter(c => c.status === 'PENDING').length }
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id as any)} 
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border relative transition-all ${
              tab === t.id ? 'bg-malawi-black text-white shadow-xl scale-105 z-10' : 'bg-white text-gray-400 hover:text-gray-600'
            }`}
          >
            <t.icon size={18} /> {t.label}
            {t.live !== undefined && t.live > 0 && <span className="absolute -top-2 -right-2 bg-green-500 text-white px-2.5 py-1 rounded-full text-[9px] font-black border-2 border-white animate-bounce shadow-lg">{t.live} LIVE</span>}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2.5 py-1 rounded-full text-[9px] font-black border-2 border-white shadow-lg">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[3rem] border shadow-2xl overflow-hidden min-h-[650px]">
        
        {/* PAYOUTS TAB */}
        {tab === 'withdrawals' && (
          <div className="p-0">
             <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-xl font-black uppercase">Payout Management</h2>
                <span className="text-[10px] font-black bg-white border px-3 py-1 rounded-full uppercase tracking-widest text-gray-400">Transaction Receipts Enabled</span>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                   <tr>
                     <th className="px-10 py-6">Affiliate</th>
                     <th className="px-10 py-6">ID Verification</th>
                     <th className="px-10 py-6">Payment Method</th>
                     <th className="px-10 py-6">Admin Receipt</th>
                     <th className="px-10 py-6 text-center">Processing</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {filteredWithdrawals.length === 0 ? (
                     <tr><td colSpan={5} className="py-20 text-center text-gray-300 italic">No payout requests found.</td></tr>
                   ) : filteredWithdrawals.map(w => (
                     <tr key={w.id} className={`hover:bg-gray-50/50 transition-colors ${w.status === 'PENDING' ? 'bg-yellow-50/5' : ''}`}>
                       <td className="px-10 py-8">
                         <p className="font-black text-malawi-black">{w.userName}</p>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mt-1">{new Date(w.createdAt).toLocaleString()}</p>
                       </td>
                       <td className="px-10 py-8">
                         {w.proofUrl ? (
                           <button onClick={() => viewImage(w.proofUrl)} className="group relative w-32 h-20 rounded-xl overflow-hidden border-2 border-white shadow-lg transition-transform hover:scale-105">
                              <img src={w.proofUrl} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-black uppercase">Inspect ID</div>
                           </button>
                         ) : <span className="text-[9px] font-black text-gray-300 uppercase italic">No Proof</span>}
                       </td>
                       <td className="px-10 py-8">
                         <div className="flex items-center gap-3 mb-1">
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase text-white ${w.paymentMethod.includes('Airtel') ? 'bg-red-600' : 'bg-green-600'}`}>{w.paymentMethod}</span>
                            <span className="text-xs font-black text-gray-500">{w.phone}</span>
                         </div>
                         <p className="text-2xl font-black text-malawi-green">MWK {w.amount.toLocaleString()}</p>
                         <div className="flex gap-2 mt-2">
                            <a href={`tel:${w.phone}`} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"><Phone size={12} /></a>
                            <a href={`https://wa.me/${w.whatsapp}`} target="_blank" className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"><MessageCircle size={12} /></a>
                         </div>
                       </td>
                       <td className="px-10 py-8">
                         {w.status === 'PENDING' ? (
                           <div className="space-y-3">
                              <label className="flex flex-col items-center justify-center w-32 h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-all relative overflow-hidden">
                                {payoutProof[w.id] ? (
                                  <img src={payoutProof[w.id]} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center gap-1">
                                    <Upload size={16} className="text-gray-400" />
                                    <span className="text-[8px] font-black text-gray-400 uppercase">Attach Receipt</span>
                                  </div>
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePayoutProofUpload(w.id, e)} />
                              </label>
                           </div>
                         ) : w.paymentProofUrl ? (
                            <button onClick={() => viewImage(w.paymentProofUrl)} className="group relative w-32 h-20 rounded-xl overflow-hidden border-2 border-malawi-green/20 shadow-lg">
                               <img src={w.paymentProofUrl} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-black uppercase">View Receipt</div>
                            </button>
                         ) : <span className="text-[9px] font-black text-gray-300 uppercase italic">No Receipt Attached</span>}
                       </td>
                       <td className="px-10 py-8">
                         {w.status === 'PENDING' ? (
                           <div className="flex flex-col gap-2">
                             <input 
                               type="text" 
                               placeholder="Transaction Reference..." 
                               className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-[10px] outline-none focus:ring-1 focus:ring-malawi-black"
                               value={payoutNote[w.id] || ''}
                               onChange={e => setPayoutNote(prev => ({ ...prev, [w.id]: e.target.value }))}
                             />
                             <div className="flex gap-2">
                               <button 
                                onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} 
                                className="flex-grow bg-malawi-green text-white py-2 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 active:scale-95 transition-all"
                               >
                                 <Check size={12} /> Confirm Paid
                               </button>
                               <button 
                                onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} 
                                className="flex-grow bg-malawi-red text-white py-2 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 active:scale-95 transition-all"
                               >
                                 <X size={12} /> Refuse
                               </button>
                             </div>
                           </div>
                         ) : (
                           <div className="text-center">
                             <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                               {w.status}
                             </span>
                             {w.adminNote && <p className="text-[9px] text-gray-400 mt-2 italic">Ref: {w.adminNote}</p>}
                           </div>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {/* AFFILIATES TAB */}
        {tab === 'users' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                <tr>
                  <th className="px-10 py-6">Affiliate</th>
                  <th className="px-10 py-6">Status</th>
                  <th className="px-10 py-6">Membership</th>
                  <th className="px-10 py-6">Balance</th>
                  <th className="px-10 py-6 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUsers.map(u => {
                  const online = isUserOnline(u);
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${online ? 'bg-green-50/5' : ''}`}>
                      <td className="px-10 py-6">
                         <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${online ? 'border-green-500 shadow-sm' : 'border-gray-100'}`}>
                             {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover rounded-2xl" /> : <UserCheck size={20} className="text-gray-300" />}
                           </div>
                           <div>
                              <p className="font-black">{u.fullName}</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">@{u.username}</p>
                           </div>
                         </div>
                      </td>
                      <td className="px-10 py-6">
                        {online ? (
                          <span className="text-green-600 font-black text-[9px] uppercase flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live Now</span>
                        ) : (
                          <span className="text-gray-400 font-black text-[9px] uppercase">Seen {getTimeSinceActive(u)}</span>
                        )}
                      </td>
                      <td className="px-10 py-6">
                         <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${u.membershipStatus === 'ACTIVE' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{u.membershipStatus}</span>
                      </td>
                      <td className="px-10 py-6">
                         <p className="font-black text-malawi-green text-lg">MWK {u.balance.toLocaleString()}</p>
                         <p className="text-[8px] text-gray-400 uppercase font-bold">Total: MWK {u.totalEarnings.toLocaleString()}</p>
                      </td>
                      <td className="px-10 py-6 text-center">
                         <button onClick={() => setInspectingUser(u)} className="p-3 bg-gray-50 hover:bg-malawi-black hover:text-white rounded-xl transition-all shadow-sm"><Eye size={18} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ACTIVATIONS TAB */}
        {tab === 'memberships' && (
          <div className="p-8 space-y-8">
             <div className="flex justify-between items-center border-b pb-6">
                <h2 className="text-xl font-black uppercase">Pending Activations</h2>
                <span className="bg-malawi-black text-white px-3 py-1 rounded-full text-[10px] font-black">{pendingActivations.length} WAITING</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {pendingActivations.length === 0 ? (
                 <div className="col-span-full py-24 text-center text-gray-300 italic">No pending memberships to approve.</div>
               ) : pendingActivations.map(u => (
                 <div key={u.id} className="bg-gray-50 p-8 rounded-[2.5rem] border space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-malawi-black text-white rounded-2xl flex items-center justify-center font-black">{u.fullName.charAt(0)}</div>
                       <div>
                          <p className="font-black uppercase text-sm">{u.fullName}</p>
                          <p className="text-[9px] font-black text-malawi-red uppercase">{u.membershipTier} Tier Requested</p>
                       </div>
                    </div>
                    {u.membershipProofUrl && (
                      <button onClick={() => viewImage(u.membershipProofUrl)} className="w-full h-48 rounded-2xl overflow-hidden border-4 border-white shadow-xl relative group">
                         <img src={u.membershipProofUrl} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-black uppercase">Inspect Receipt</div>
                      </button>
                    )}
                    <button 
                      onClick={() => handleMembershipAction(u.id, MembershipStatus.ACTIVE)}
                      className="w-full bg-malawi-green text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-green-500/10 active:scale-95 transition-all"
                    >
                      Approve & Activate
                    </button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* SUPPORT TICKETS TAB */}
        {tab === 'complaints' && (
          <div className="p-8 space-y-6">
             <h2 className="text-xl font-black uppercase px-2">Support Tickets</h2>
             <div className="space-y-4">
               {state.complaints.length === 0 ? (
                 <div className="text-center py-24 text-gray-300 italic">No tickets in the inbox.</div>
               ) : state.complaints.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(c => (
                 <div key={c.id} className={`p-6 rounded-3xl border ${c.status === 'PENDING' ? 'bg-yellow-50/20 border-yellow-100' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">@{c.userName} • {new Date(c.createdAt).toLocaleString()}</p>
                          <h4 className="text-lg font-black uppercase">{c.subject}</h4>
                       </div>
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${c.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{c.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-6 italic">"{c.message}"</p>
                    
                    {c.status === 'PENDING' ? (
                      <div className="space-y-3">
                         <textarea 
                           placeholder="Type official response..." 
                           className="w-full p-4 bg-white border rounded-2xl text-xs"
                           rows={3}
                           value={ticketReply[c.id] || ''}
                           onChange={e => setTicketReply(prev => ({ ...prev, [c.id]: e.target.value }))}
                         />
                         <button onClick={() => handleComplaintReply(c.id)} className="bg-malawi-black text-white px-8 py-3 rounded-xl font-black uppercase text-[10px]">Send Reply</button>
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-2xl border text-xs text-gray-500">
                         <span className="font-black text-malawi-red uppercase mr-2">Admin:</span> {c.reply}
                      </div>
                    )}
                 </div>
               ))}
             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
