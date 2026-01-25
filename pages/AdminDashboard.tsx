
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
    
    // Handle Commissions based on instructions (30-40% direct based on SPONSOR TIER, 5% fixed indirect)
    if (targetUser.referredBy) {
      const l1Referrer = updatedUsers.find(u => u.id === targetUser.referredBy);
      if (l1Referrer) {
        // L1 Sponsor gets their specific tier's direct commission (30%-40%)
        const l1TierConfig = MEMBERSHIP_TIERS.find(t => t.tier === l1Referrer.membershipTier) || MEMBERSHIP_TIERS[0];
        const directCommission = (tierBeingBought.price * l1TierConfig.directCommission) / 100;
        
        updatedReferrals.push({ 
          id: `ref-${Date.now()}-L1`, 
          referrerId: l1Referrer.id, 
          referredId: targetUser.id, 
          level: 1, 
          commission: directCommission, 
          timestamp: new Date().toISOString() 
        });
        
        updatedUsers = updatedUsers.map(u => u.id === l1Referrer.id ? { 
          ...u, 
          balance: u.balance + directCommission, 
          totalEarnings: u.totalEarnings + directCommission 
        } : u);

        // Indirect Commission (Level 2 Sponsor gets fixed 5%)
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
    alert("Membership Approved. Network profits distributed automatically.");
  };

  const handleBookSellerAction = (userId: string, status: BookSellerStatus) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { 
      ...u, 
      bookSellerStatus: status,
      membershipNote: status === BookSellerStatus.REJECTED ? "Distributor application was not approved. Check your details." : "Your book distributor status is now ACTIVE."
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

      {/* MUTUAL CONFIRMATION Modal */}
      {processingPayout && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-malawi-black/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="bg-malawi-black p-8 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Process Payout</h2>
                    <p className="text-[10px] font-black text-malawi-green uppercase tracking-widest mt-1">MWK {processingPayout.amount.toLocaleString()}</p>
                 </div>
                 <button onClick={() => setProcessingPayout(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Screenshot ID / Reference</label>
                    <textarea required rows={2} className="w-full p-4 bg-gray-50 border rounded-2xl text-sm outline-none font-bold" placeholder="Transaction ID" value={payoutNote} onChange={e => setPayoutNote(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Upload Receipt</label>
                    <div className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center relative ${payoutProofUrl ? 'bg-green-50 border-malawi-green' : 'border-gray-200'}`}>
                       <input type="file" required accept="image/*" onChange={handlePayoutProofUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                       {isChecking ? <Loader2 className="animate-spin text-malawi-green" /> : payoutProofUrl ? <CheckCircle2 className="text-malawi-green" size={24}/> : <ImageIcon className="text-gray-300" size={24}/>}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleProcessPayout(WithdrawalStatus.APPROVED)} className="py-4 bg-malawi-green text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Approve</button>
                    <button onClick={() => handleProcessPayout(WithdrawalStatus.REJECTED)} className="py-4 bg-malawi-red text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Reject</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {inspectingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-malawi-black/95 backdrop-blur-xl">
           <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-8 bg-malawi-black text-white flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight">Affiliate Network: {inspectingUser.fullName}</h2>
                 <button onClick={() => setInspectingUser(null)} className="p-4 hover:bg-white/10 rounded-full"><X size={32}/></button>
              </div>
              <div className="p-8 overflow-y-auto scrollbar-hide space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-6 rounded-3xl border text-center">
                       <p className="text-[10px] font-black text-gray-400 uppercase">Total Profit</p>
                       <p className="text-2xl font-black text-malawi-green">K{inspectingUser.totalEarnings.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-3xl border text-center">
                       <p className="text-[10px] font-black text-gray-400 uppercase">Network Size</p>
                       <p className="text-2xl font-black">{inspectingUserNetwork.length}</p>
                    </div>
                 </div>
                 <div className="bg-white border rounded-[2rem] overflow-hidden">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                          <tr><th className="px-6 py-4">Network Member</th><th className="px-6 py-4">Tier</th><th className="px-6 py-4 text-right">Profit Earned</th></tr>
                       </thead>
                       <tbody className="divide-y text-xs">
                          {inspectingUserNetwork.map(r => (
                             <tr key={r.id}>
                                <td className="px-6 py-4 font-black">{r.user?.fullName} <span className="text-[8px] opacity-40 ml-2">{r.level === 1 ? '(Direct)' : '(Team)'}</span></td>
                                <td className="px-6 py-4 uppercase font-bold text-gray-400">{r.user?.membershipTier}</td>
                                <td className="px-6 py-4 text-right font-black text-malawi-green">K{r.commission.toLocaleString()}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      )}

      <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Logo size="md" variant="dark" />
          <h1 className="text-4xl font-black uppercase tracking-tight">Control Center</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] shadow-sm hover:bg-gray-50 transition-all"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {['withdrawals', 'activations', 'books', 'users'].map(t => (
          <button key={t} onClick={() => setTab(t as any)} className={`px-10 py-4 rounded-[1.5rem] text-xs font-black uppercase border transition-all ${tab === t ? 'bg-malawi-black text-white shadow-xl' : 'bg-white text-gray-400 shadow-sm'}`}>{t}</button>
        ))}
      </div>

      <main className="bg-white rounded-[4rem] border shadow-2xl overflow-hidden min-h-[600px]">
        {tab === 'withdrawals' && (
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                 <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">Amount</th><th className="px-10 py-6">Phone</th><th className="px-10 py-6 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y">
                 {pendingWithdrawals.map(w => (
                    <tr key={w.id}>
                       <td className="px-10 py-8 font-black uppercase">{w.userName}</td>
                       <td className="px-10 py-8 font-black text-malawi-green text-xl">K{w.amount.toLocaleString()}</td>
                       <td className="px-10 py-8 font-bold">{w.phone}</td>
                       <td className="px-10 py-8 text-right"><button onClick={() => setProcessingPayout(w)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95">Confirm</button></td>
                    </tr>
                 ))}
              </tbody>
           </table>
        )}

        {tab === 'activations' && (
           <div className="divide-y">
              {pendingActivations.map(u => (
                 <div key={u.id} className="p-10 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-malawi-green/10 text-malawi-green rounded-2xl flex items-center justify-center font-black text-xl">{u.fullName.charAt(0)}</div>
                       <div>
                          <h4 className="font-black text-lg uppercase">{u.fullName}</h4>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Wants {u.membershipTier} Tier</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       {u.membershipProofUrl && <button onClick={() => setViewingProofUrl(u.membershipProofUrl!)} className="p-4 bg-gray-100 rounded-2xl text-gray-400"><ImageIcon size={20}/></button>}
                       <button onClick={() => approveMembership(u.id)} className="px-6 py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95">Approve & Distribute Profits</button>
                    </div>
                 </div>
              ))}
           </div>
        )}

        {tab === 'books' && (
           <div className="p-10 space-y-6">
              {pendingBookSellers.map(u => (
                 <div key={u.id} className="bg-gray-50 rounded-[3rem] p-8 border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div>
                       <h4 className="text-xl font-black uppercase">{u.bookSellerFullName || u.fullName}</h4>
                       <p className="text-[10px] font-black text-gray-400 uppercase mt-1">Distributor Application</p>
                       <div className="mt-4 flex gap-4 text-xs font-bold text-gray-600">
                          <span><Smartphone size={14} className="inline mr-2"/>{u.bookSellerWhatsapp || u.whatsapp}</span>
                          <span><MapPin size={14} className="inline mr-2"/>{u.bookSellerAddress}</span>
                       </div>
                    </div>
                    <div className="flex gap-3">
                       <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.APPROVED)} className="px-8 py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95">Approve</button>
                       <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.REJECTED)} className="px-8 py-4 bg-malawi-red text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95">Reject</button>
                    </div>
                 </div>
              ))}
           </div>
        )}

        {tab === 'users' && (
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                 <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">Tier</th><th className="px-10 py-6">Earnings</th><th className="px-10 py-6 text-right">History</th></tr>
              </thead>
              <tbody className="divide-y">
                 {filteredUsers.map(u => (
                    <tr key={u.id}>
                       <td className="px-10 py-8 font-black uppercase">{u.fullName}</td>
                       <td className="px-10 py-8 font-black text-[10px] uppercase text-gray-400">{u.membershipTier}</td>
                       <td className="px-10 py-8 font-black text-malawi-green">K{u.balance.toLocaleString()}</td>
                       <td className="px-10 py-8 text-right"><button onClick={() => setInspectingUser(u)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase shadow-md active:scale-95">Inspect Network</button></td>
                    </tr>
                 ))}
              </tbody>
           </table>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
