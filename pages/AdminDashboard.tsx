
import React, { useMemo, useState } from 'react';
import { AppState, User, MembershipStatus, MembershipTier, Complaint, Referral, WithdrawalStatus, BookSellerStatus, PaymentMethod } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import Logo from '../components/Logo';
import { syncAppStateToCloud, uploadImage } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Search, 
  X, Wallet, Users, Zap, Loader2, Monitor, MessageSquare, Check, CheckCircle2, Gavel, ShieldAlert, ImageIcon, Eye, BookOpen, UserCheck, UserX, MapPin, Smartphone, Clock, Calendar, Ban, UserCog, Award, Circle, ExternalLink, MessageCircle, Network, ArrowUpRight
} from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const [tab, setTab] = useState<'withdrawals' | 'users' | 'activations' | 'complaints' | 'books' | 'settings'>('withdrawals');
  const [isChecking, setIsChecking] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  
  const [processingPayout, setProcessingPayout] = useState<any | null>(null);
  const [payoutProofUrl, setPayoutProofUrl] = useState<string | null>(null);
  const [payoutNote, setPayoutNote] = useState("");
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const handleManualSync = async () => {
    setIsChecking(true);
    try { await syncAppStateToCloud(state); alert("Cloud Backup Success."); } 
    catch (e: any) { alert(e.message); } 
    finally { setIsChecking(false); }
  };

  const handlePayoutProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsChecking(true);
    const url = await uploadImage(file, 'payout_confirmations');
    if (url) setPayoutProofUrl(url);
    setIsChecking(false);
  };

  const handleProcessPayout = (status: WithdrawalStatus) => {
    if (!processingPayout) return;
    if (status === WithdrawalStatus.APPROVED && (!payoutProofUrl || !payoutNote.trim())) {
      alert("Instructions: You must upload the payment confirmation screenshot and provide a reference note for the member.");
      return;
    }

    setIsSubmittingPayout(true);
    const updatedWithdrawals = state.withdrawals.map(w => 
      w.id === processingPayout.id ? { 
        ...w, 
        status, 
        adminNote: payoutNote, 
        paymentProofUrl: payoutProofUrl || undefined 
      } : w
    );

    let updatedUsers = [...state.users];
    if (status === WithdrawalStatus.REJECTED) {
      updatedUsers = updatedUsers.map(u => 
        u.id === processingPayout.userId ? { ...u, balance: u.balance + processingPayout.amount } : u
      );
    }

    onStateUpdate({ withdrawals: updatedWithdrawals, users: updatedUsers });
    setIsSubmittingPayout(false);
    setProcessingPayout(null);
    setPayoutProofUrl(null);
    setPayoutNote("");
    alert(`Payout processed. Screenshot sent to affiliate.`);
  };

  const approveMembership = (targetId: string) => {
    const targetUser = state.users.find(u => u.id === targetId);
    if (!targetUser) return;
    const tierBeingBought = MEMBERSHIP_TIERS.find(t => t.tier === targetUser.membershipTier);
    if (!tierBeingBought) return;
    
    let updatedUsers = [...state.users];
    let updatedReferrals = [...state.referrals];
    
    // Activate target user
    updatedUsers = updatedUsers.map(u => u.id === targetId ? { ...u, membershipStatus: MembershipStatus.ACTIVE, membershipNote: "Account activated! You can now start earning commissions." } : u);
    
    // Handle Commissions based on instructions (30-40% direct, 5% indirect)
    if (targetUser.referredBy) {
      const l1Referrer = updatedUsers.find(u => u.id === targetUser.referredBy);
      if (l1Referrer) {
        const l1TierConfig = MEMBERSHIP_TIERS.find(t => t.tier === l1Referrer.membershipTier) || MEMBERSHIP_TIERS[0];
        const commission = (tierBeingBought.price * l1TierConfig.directCommission) / 100;
        
        updatedReferrals.push({ 
          id: `ref-${Date.now()}-L1`, 
          referrerId: l1Referrer.id, 
          referredId: targetUser.id, 
          level: 1, 
          commission: commission, 
          timestamp: new Date().toISOString() 
        });
        
        updatedUsers = updatedUsers.map(u => u.id === l1Referrer.id ? { 
          ...u, 
          balance: u.balance + commission, 
          totalEarnings: u.totalEarnings + commission 
        } : u);

        // Indirect Commission (Level 2 - 5% bonus as requested)
        if (l1Referrer.referredBy) {
          const l2Referrer = updatedUsers.find(u => u.id === l1Referrer.referredBy);
          if (l2Referrer) {
            const l2Commission = (tierBeingBought.price * 5) / 100;
            updatedReferrals.push({ 
              id: `ref-${Date.now()}-L2`, 
              referrerId: l2Referrer.id, 
              referredId: targetUser.id, 
              level: 2, 
              commission: l2Commission, 
              timestamp: new Date().toISOString() 
            });
            updatedUsers = updatedUsers.map(u => u.id === l2Referrer.id ? { 
              ...u, 
              balance: u.balance + l2Commission, 
              totalEarnings: u.totalEarnings + l2Commission 
            } : u);
          }
        }
      }
    }
    onStateUpdate({ users: updatedUsers, referrals: updatedReferrals });
    alert("Membership Activated. Network profits distributed.");
  };

  const handleBookSellerAction = (userId: string, status: BookSellerStatus) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { 
      ...u, 
      bookSellerStatus: status,
      membershipNote: status === BookSellerStatus.REJECTED ? "Distributor application was not approved. Check your home address details." : "Your book distributor status is now ACTIVE."
    } : u);
    onStateUpdate({ users: updatedUsers });
    alert(`Distributor application ${status === BookSellerStatus.APPROVED ? 'Approved' : 'Rejected'}. Affiliate notified.`);
  };

  const pendingWithdrawals = useMemo(() => state.withdrawals.filter(w => w.status === WithdrawalStatus.PENDING).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [state.withdrawals]);
  const pendingActivations = useMemo(() => state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING), [state.users]);
  const pendingBookSellers = useMemo(() => state.users.filter(u => u.bookSellerStatus === BookSellerStatus.PENDING), [state.users]);

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
      u.username.toLowerCase().includes(searchText.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.users, searchText]);

  // Network Inspection
  const inspectingUserNetwork = useMemo(() => {
    if (!inspectingUser) return [];
    return state.referrals.filter(r => r.referrerId === inspectingUser.id).map(r => ({
      ...r,
      user: state.users.find(u => u.id === r.referredId)
    }));
  }, [inspectingUser, state.referrals, state.users]);

  return (
    <div className="max-w-7xl mx-auto pb-32 animate-in fade-in duration-700">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-8" onClick={() => setViewingProofUrl(null)}>
           <img src={viewingProofUrl} className="max-w-full max-h-full rounded-2xl shadow-2xl" />
           <button className="absolute top-10 right-10 text-white p-4 bg-malawi-red rounded-full hover:bg-red-800 transition-colors"><X size={32}/></button>
        </div>
      )}

      {/* MUTUAL CONFIRMATION: Process Payout Modal */}
      {processingPayout && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-malawi-black/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="bg-malawi-black p-8 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Mutual Payout Proof</h2>
                    <p className="text-[10px] font-black text-malawi-green uppercase tracking-widest mt-1">K{processingPayout.amount.toLocaleString()} • {processingPayout.paymentMethod}</p>
                 </div>
                 <button onClick={() => setProcessingPayout(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="bg-gray-50 p-6 rounded-2xl border">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Affiliate Account Number</p>
                    <div className="flex items-center justify-between">
                       <span className="font-black text-lg text-malawi-black">{processingPayout.phone}</span>
                       <a href={`https://wa.me/${processingPayout.whatsapp.replace(/\+/g, '')}`} target="_blank" className="p-2 bg-green-500 text-white rounded-lg"><MessageCircle size={16}/></a>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Reference/Transaction ID (Mandatory)</label>
                    <textarea required rows={2} className="w-full p-4 bg-gray-50 border rounded-2xl text-sm outline-none font-bold" placeholder="e.g. Airtel Ref: X92A-18..." value={payoutNote} onChange={e => setPayoutNote(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Upload Payout Receipt Image (Mandatory)</label>
                    <div className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center relative ${payoutProofUrl ? 'bg-green-50 border-malawi-green' : 'border-gray-200'}`}>
                       <input type="file" required accept="image/*" onChange={handlePayoutProofUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                       {isChecking ? <Loader2 className="animate-spin text-malawi-green" /> : payoutProofUrl ? <CheckCircle2 className="text-malawi-green" size={24}/> : <ImageIcon className="text-gray-300" size={24}/>}
                       <p className="text-[9px] font-black uppercase text-gray-400 mt-2">{payoutProofUrl ? 'Screenshot Attached' : 'Tap to Upload Confirmation'}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleProcessPayout(WithdrawalStatus.APPROVED)} className="py-4 bg-malawi-green text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Approve & Send Proof</button>
                    <button onClick={() => handleProcessPayout(WithdrawalStatus.REJECTED)} className="py-4 bg-malawi-red text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Reject Request</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* INSTRUCTED: Detailed Affiliate Inspection Modal */}
      {inspectingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-malawi-black/95 backdrop-blur-xl">
           <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
              <div className="p-10 bg-malawi-black text-white flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center text-white font-black text-3xl uppercase border border-white/20">{inspectingUser.fullName.charAt(0)}</div>
                    <div>
                       <h2 className="text-3xl font-black uppercase tracking-tight">{inspectingUser.fullName}</h2>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">@{inspectingUser.username} • Affiliate ID: {inspectingUser.referralCode}</p>
                    </div>
                 </div>
                 <button onClick={() => setInspectingUser(null)} className="p-4 hover:bg-white/10 rounded-full"><X size={32}/></button>
              </div>
              <div className="p-10 overflow-y-auto space-y-10 flex-grow scrollbar-hide">
                 <div className="grid grid-cols-4 gap-6">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border">
                       <p className="text-[10px] font-black uppercase text-gray-400">Current Balance</p>
                       <p className="text-2xl font-black text-malawi-green">K{inspectingUser.balance.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border">
                       <p className="text-[10px] font-black uppercase text-gray-400">Total Profit</p>
                       <p className="text-2xl font-black">K{inspectingUser.totalEarnings.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border">
                       <p className="text-[10px] font-black uppercase text-gray-400">Paid Direct (L1)</p>
                       <p className="text-2xl font-black">{inspectingUserNetwork.filter(r => r.level === 1).length}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border">
                       <p className="text-[10px] font-black uppercase text-gray-400">Network (L2)</p>
                       <p className="text-2xl font-black">{inspectingUserNetwork.filter(r => r.level === 2).length}</p>
                    </div>
                 </div>

                 {/* INSTRUCTED: Network View for Transactions */}
                 <div className="bg-white rounded-[3rem] border p-8 space-y-6">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3"><Network className="text-malawi-green" size={24}/> Paid Referral History</h3>
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tracking network profit flows</p>
                    </div>
                    <div className="overflow-x-auto border rounded-3xl">
                       <table className="w-full text-left">
                          <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                             <tr>
                                <th className="px-6 py-4">Referred Member</th>
                                <th className="px-6 py-4">Network Depth</th>
                                <th className="px-6 py-4">Membership Tier</th>
                                <th className="px-6 py-4 text-right">Commission Earned</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y">
                             {inspectingUserNetwork.length === 0 ? (
                                <tr><td colSpan={4} className="p-16 text-center text-xs font-black uppercase text-gray-300 italic">No network earnings recorded yet</td></tr>
                             ) : inspectingUserNetwork.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                   <td className="px-6 py-4 font-black text-xs uppercase text-malawi-black">{r.user?.fullName}</td>
                                   <td className="px-6 py-4">
                                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${r.level === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Level {r.level} {r.level === 1 ? '(Direct)' : '(Bonus)'}</span>
                                   </td>
                                   <td className="px-6 py-4 font-bold text-[10px] text-gray-400 uppercase">{r.user?.membershipTier}</td>
                                   <td className="px-6 py-4 text-right font-black text-malawi-green">K{r.commission.toLocaleString()}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 {/* INSTRUCTED: Contact & Distributor Info */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[3rem] border p-8 space-y-4">
                       <h3 className="text-sm font-black uppercase text-malawi-black tracking-widest flex items-center gap-2"><Smartphone size={16}/> Basic Contact</h3>
                       <p className="text-[10px] font-black text-gray-400 uppercase">Phone: <span className="text-malawi-black">{inspectingUser.phone || 'N/A'}</span></p>
                       <p className="text-[10px] font-black text-gray-400 uppercase">WhatsApp: <span className="text-malawi-black">{inspectingUser.whatsapp || 'N/A'}</span></p>
                    </div>
                    {inspectingUser.bookSellerStatus === BookSellerStatus.APPROVED && (
                       <div className="bg-red-50/30 rounded-[3rem] border border-malawi-red/10 p-8 space-y-4">
                          <h3 className="text-sm font-black uppercase text-malawi-red tracking-widest flex items-center gap-2"><MapPin size={16}/> Home Address (Distributor)</h3>
                          <p className="text-xs font-bold leading-relaxed">{inspectingUser.bookSellerAddress || 'No address provided'}</p>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Logo size="md" variant="dark" />
          <h1 className="text-4xl font-black uppercase tracking-tight">System Control</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search affiliates..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64 shadow-sm" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] shadow-sm hover:bg-gray-50 active:scale-95 transition-all"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payout Requests', icon: Wallet, count: pendingWithdrawals.length },
          { id: 'activations', label: 'Memberships', icon: ShieldAlert, count: pendingActivations.length },
          { id: 'books', label: 'Distributor Apps', icon: BookOpen, count: pendingBookSellers.length },
          { id: 'users', label: 'All Affiliates', icon: Users },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border transition-all relative whitespace-nowrap ${tab === t.id ? 'bg-malawi-black text-white shadow-xl' : 'bg-white text-gray-400 shadow-sm'}`}>
            <t.icon size={18} /> {t.label}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2 py-0.5 rounded-full text-[10px] border-2 border-white">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[4rem] border shadow-2xl overflow-hidden min-h-[600px]">
        {tab === 'withdrawals' && (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                    <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">Requested MWK</th><th className="px-10 py-6">Phone</th><th className="px-10 py-6 text-right">Mutual Control</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {pendingWithdrawals.length === 0 ? <tr><td colSpan={4} className="p-20 text-center text-gray-300 italic uppercase font-black">No pending requests found</td></tr> : 
                       pendingWithdrawals.map(w => (
                          <tr key={w.id} className="hover:bg-gray-50 group">
                             <td className="px-10 py-8 font-black uppercase text-malawi-black">{w.userName}</td>
                             <td className="px-10 py-8 font-black text-malawi-green text-xl">K{w.amount.toLocaleString()}</td>
                             <td className="px-10 py-8 font-bold">{w.phone}</td>
                             <td className="px-10 py-8 text-right">
                                <button onClick={() => setProcessingPayout(w)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase shadow-lg group-hover:bg-malawi-green transition-all active:scale-95">Send Confirmation</button>
                             </td>
                          </tr>
                       ))
                    }
                 </tbody>
              </table>
           </div>
        )}

        {tab === 'activations' && (
           <div className="divide-y">
              {pendingActivations.length === 0 ? <div className="p-20 text-center text-gray-300 italic uppercase font-black">No pending activations</div> : 
                 pendingActivations.map(u => (
                    <div key={u.id} className="p-10 flex items-center justify-between hover:bg-gray-50 transition-all">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-malawi-green/10 text-malawi-green rounded-2xl flex items-center justify-center font-black text-xl">{u.fullName.charAt(0)}</div>
                          <div>
                             <h4 className="font-black text-lg uppercase tracking-tight text-malawi-black">{u.fullName}</h4>
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Applying for {u.membershipTier} Tier</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          {u.membershipProofUrl && <button onClick={() => setViewingProofUrl(u.membershipProofUrl!)} className="p-4 bg-gray-100 rounded-2xl text-gray-400 hover:text-malawi-black"><ImageIcon size={20}/></button>}
                          <div className="flex gap-2">
                             <button onClick={() => approveMembership(u.id)} className="px-6 py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all"><CheckCircle2 size={16}/> Approve</button>
                             <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.REJECTED)} className="px-6 py-4 bg-malawi-red text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all"><X size={16}/> Reject</button>
                          </div>
                       </div>
                    </div>
                 ))
              }
           </div>
        )}

        {tab === 'books' && (
           <div className="divide-y p-10 space-y-6">
              {pendingBookSellers.length === 0 ? (
                <div className="p-20 text-center text-gray-300 italic uppercase font-black">No pending distributor applications found</div>
              ) : (
                 pendingBookSellers.map(u => (
                    <div key={u.id} className="bg-gray-50 rounded-[3rem] p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                       <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                          <div className="flex items-center gap-6">
                             <div className="w-20 h-20 bg-malawi-red rounded-3xl flex items-center justify-center text-white shadow-lg shrink-0">
                                <BookOpen size={32} />
                             </div>
                             <div>
                                <h4 className="text-xl font-black uppercase text-malawi-black tracking-tight">{u.bookSellerFullName || u.fullName}</h4>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Applying as Local Distributor</p>
                                <div className="flex items-center gap-3 mt-4">
                                   <a href={`https://wa.me/${(u.bookSellerWhatsapp || u.whatsapp || '').replace(/\+/g, '')}`} target="_blank" className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg">
                                      <MessageCircle size={14}/> {u.bookSellerWhatsapp || u.whatsapp}
                                   </a>
                                   <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold">
                                      <Smartphone size={14}/> {u.phone || 'No phone'}
                                   </div>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex flex-col gap-4 max-w-md w-full">
                             <div className="bg-white p-5 rounded-2xl border border-gray-200">
                                <p className="text-[9px] font-black uppercase text-gray-400 mb-2 flex items-center gap-2"><MapPin size={12}/> Verified Home Address</p>
                                <p className="text-xs font-bold text-gray-800 leading-relaxed">{u.bookSellerAddress || 'No address provided'}</p>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.APPROVED)} className="py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95"><CheckCircle2 size={16}/> Approve</button>
                                <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.REJECTED)} className="py-4 bg-malawi-red text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95"><X size={16}/> Reject</button>
                             </div>
                          </div>
                       </div>
                    </div>
                 ))
              )}
           </div>
        )}

        {tab === 'users' && (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                    <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">Tier</th><th className="px-10 py-6">Direct Earner</th><th className="px-10 py-6 text-right">View History</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {filteredUsers.map(u => (
                       <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-10 py-8 font-black uppercase text-malawi-black">{u.fullName}</td>
                          <td className="px-10 py-8">
                             <span className="px-3 py-1 bg-gray-100 rounded text-[9px] font-black uppercase tracking-widest">{u.membershipTier}</span>
                          </td>
                          <td className="px-10 py-8 font-black text-malawi-green">K{u.balance.toLocaleString()}</td>
                          <td className="px-10 py-8 text-right">
                             <button onClick={() => setInspectingUser(u)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase shadow-md hover:bg-malawi-green transition-colors active:scale-95">Inspect Network</button>
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
