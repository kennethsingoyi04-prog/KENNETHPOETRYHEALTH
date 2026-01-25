
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
    try { await syncAppStateToCloud(state); alert("Cloud Sync Successful."); } 
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
      alert("Please upload the payout receipt and include a reference note for the member.");
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
    alert(`Withdrawal processed successfully. User has been notified.`);
  };

  const approveMembership = (targetId: string) => {
    const targetUser = state.users.find(u => u.id === targetId);
    if (!targetUser) return;
    const tierBeingBought = MEMBERSHIP_TIERS.find(t => t.tier === targetUser.membershipTier);
    if (!tierBeingBought) return;
    
    let updatedUsers = [...state.users];
    let updatedReferrals = [...state.referrals];
    
    updatedUsers = updatedUsers.map(u => u.id === targetId ? { ...u, membershipStatus: MembershipStatus.ACTIVE, membershipNote: "Account activated. Start earning!" } : u);
    
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
      }
    }
    onStateUpdate({ users: updatedUsers, referrals: updatedReferrals });
    alert("Activation Confirmed.");
  };

  const handleBookSellerAction = (userId: string, status: BookSellerStatus) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { 
      ...u, 
      bookSellerStatus: status,
      membershipNote: status === BookSellerStatus.REJECTED ? "Distributor application rejected." : "Distributor application approved."
    } : u);
    onStateUpdate({ users: updatedUsers });
    alert(`Distributor status updated.`);
  };

  const pendingWithdrawals = useMemo(() => state.withdrawals.filter(w => w.status === WithdrawalStatus.PENDING).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [state.withdrawals]);
  const pendingActivations = useMemo(() => state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING), [state.users]);
  const pendingBookSellers = useMemo(() => state.users.filter(u => u.bookSellerStatus === BookSellerStatus.PENDING), [state.users]);

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
      u.username.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [state.users, searchText]);

  // Inspection Referral Network logic
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
           <button className="absolute top-10 right-10 text-white p-4 bg-malawi-red rounded-full"><X size={32}/></button>
        </div>
      )}

      {/* Process Payout Modal */}
      {processingPayout && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-malawi-black/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="bg-malawi-black p-8 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Confirm Payout</h2>
                    <p className="text-[10px] font-black text-malawi-green uppercase tracking-widest mt-1">K{processingPayout.amount.toLocaleString()} • {processingPayout.paymentMethod}</p>
                 </div>
                 <button onClick={() => setProcessingPayout(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="bg-gray-50 p-6 rounded-2xl border">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Target Phone</p>
                    <div className="flex items-center justify-between">
                       <span className="font-black text-lg text-malawi-black">{processingPayout.phone}</span>
                       <a href={`https://wa.me/${processingPayout.whatsapp.replace(/\+/g, '')}`} target="_blank" className="p-2 bg-green-500 text-white rounded-lg"><MessageCircle size={16}/></a>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Reference Note (Required)</label>
                    <textarea required rows={2} className="w-full p-4 bg-gray-50 border rounded-2xl text-sm outline-none" placeholder="e.g. Airtel Ref: X882..." value={payoutNote} onChange={e => setPayoutNote(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Payment Proof Image (Required)</label>
                    <div className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center relative ${payoutProofUrl ? 'bg-green-50 border-malawi-green' : 'border-gray-200'}`}>
                       <input type="file" required accept="image/*" onChange={handlePayoutProofUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                       {isChecking ? <Loader2 className="animate-spin text-malawi-green" /> : payoutProofUrl ? <CheckCircle2 className="text-malawi-green" size={24}/> : <ImageIcon className="text-gray-300" size={24}/>}
                       <p className="text-[9px] font-black uppercase text-gray-400 mt-2">{payoutProofUrl ? 'Proof Ready' : 'Upload Transaction Screenshot'}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleProcessPayout(WithdrawalStatus.APPROVED)} className="py-4 bg-malawi-green text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Approve & Notify</button>
                    <button onClick={() => handleProcessPayout(WithdrawalStatus.REJECTED)} className="py-4 bg-malawi-red text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Reject Request</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Inspect User Modal */}
      {inspectingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-malawi-black/95 backdrop-blur-xl">
           <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-10 bg-malawi-black text-white flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white font-black text-2xl uppercase">{inspectingUser.fullName.charAt(0)}</div>
                    <div>
                       <h2 className="text-3xl font-black uppercase tracking-tight">{inspectingUser.fullName}</h2>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">@{inspectingUser.username}</p>
                    </div>
                 </div>
                 <button onClick={() => setInspectingUser(null)} className="p-4 hover:bg-white/10 rounded-full"><X size={32}/></button>
              </div>
              <div className="p-10 overflow-y-auto space-y-10 flex-grow scrollbar-hide">
                 <div className="grid grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border">
                       <p className="text-[10px] font-black uppercase text-gray-400">Current Balance</p>
                       <p className="text-2xl font-black text-malawi-green">K{inspectingUser.balance.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border">
                       <p className="text-[10px] font-black uppercase text-gray-400">Total Profit</p>
                       <p className="text-2xl font-black">K{inspectingUser.totalEarnings.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border">
                       <p className="text-[10px] font-black uppercase text-gray-400">Direct Referrals</p>
                       <p className="text-2xl font-black">{inspectingUserNetwork.length}</p>
                    </div>
                 </div>

                 <div className="bg-white rounded-[3rem] border p-8 space-y-6">
                    <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3"><Network className="text-malawi-green" size={24}/> Paid Referral Network</h3>
                    <div className="overflow-x-auto border rounded-3xl">
                       <table className="w-full text-left">
                          <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b">
                             <tr><th className="px-6 py-4">Referred Member</th><th className="px-6 py-4">Level</th><th className="px-6 py-4 text-right">Commission</th></tr>
                          </thead>
                          <tbody className="divide-y">
                             {inspectingUserNetwork.length === 0 ? <tr><td colSpan={3} className="p-10 text-center text-xs italic text-gray-400">No network history</td></tr> : inspectingUserNetwork.map(r => (
                                <tr key={r.id}>
                                   <td className="px-6 py-4 font-black text-xs uppercase">{r.user?.fullName}</td>
                                   <td className="px-6 py-4 font-bold text-xs">Level {r.level}</td>
                                   <td className="px-6 py-4 text-right font-black text-malawi-green">K{r.commission.toLocaleString()}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Logo size="md" variant="dark" />
          <h1 className="text-4xl font-black uppercase tracking-tight">KPH Control</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search members..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64 shadow-sm" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] shadow-sm hover:bg-gray-50"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payout Requests', icon: Wallet, count: pendingWithdrawals.length },
          { id: 'activations', label: 'Membership Activations', icon: ShieldAlert, count: pendingActivations.length },
          { id: 'books', label: 'Book Distributors', icon: BookOpen, count: pendingBookSellers.length },
          { id: 'users', label: 'Affiliate Directory', icon: Users },
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
                    <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">Amount</th><th className="px-10 py-6">Phone</th><th className="px-10 py-6 text-right">Action</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {pendingWithdrawals.length === 0 ? <tr><td colSpan={4} className="p-20 text-center text-gray-300 italic uppercase font-black">No requests found</td></tr> : 
                       pendingWithdrawals.map(w => (
                          <tr key={w.id} className="hover:bg-gray-50">
                             <td className="px-10 py-8 font-black uppercase text-malawi-black">{w.userName}</td>
                             <td className="px-10 py-8 font-black text-malawi-green text-xl">K{w.amount.toLocaleString()}</td>
                             <td className="px-10 py-8 font-bold">{w.phone}</td>
                             <td className="px-10 py-8 text-right">
                                <button onClick={() => setProcessingPayout(w)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">Process Payout</button>
                             </td>
                          </tr>
                       ))
                    }
                 </tbody>
              </table>
           </div>
        )}

        {tab === 'users' && (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                    <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">Tier</th><th className="px-10 py-6">Balance</th><th className="px-10 py-6 text-right">View</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {filteredUsers.map(u => (
                       <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-10 py-8 font-black uppercase text-malawi-black">{u.fullName}</td>
                          <td className="px-10 py-8 text-[10px] font-black text-gray-400">{u.membershipTier}</td>
                          <td className="px-10 py-8 font-black text-malawi-green">K{u.balance.toLocaleString()}</td>
                          <td className="px-10 py-8 text-right">
                             <button onClick={() => setInspectingUser(u)} className="px-6 py-2 bg-gray-100 rounded-xl text-[10px] font-black uppercase">Inspect</button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}

        {tab === 'books' && (
           <div className="divide-y">
              {pendingBookSellers.length === 0 ? <div className="p-20 text-center text-gray-300 italic uppercase font-black">No requests found</div> : 
                 pendingBookSellers.map(u => (
                    <div key={u.id} className="p-10 flex flex-col hover:bg-gray-50 transition-colors">
                       <div className="flex items-center justify-between mb-4">
                          <h4 className="font-black text-lg uppercase">{u.bookSellerFullName || u.fullName}</h4>
                          <div className="flex gap-2">
                             <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.APPROVED)} className="px-6 py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95">Approve</button>
                             <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.REJECTED)} className="px-6 py-4 bg-malawi-red text-white rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95">Reject</button>
                          </div>
                       </div>
                       <div className="bg-gray-50 p-6 rounded-3xl border text-xs grid grid-cols-2 gap-4">
                          <p><span className="text-gray-400 uppercase font-black">Contact:</span> {u.bookSellerWhatsapp || u.whatsapp}</p>
                          <p><span className="text-gray-400 uppercase font-black">Home Address:</span> {u.bookSellerAddress}</p>
                       </div>
                    </div>
                 ))
              }
           </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
