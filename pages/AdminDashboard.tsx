
import React, { useMemo, useState } from 'react';
import { AppState, User, MembershipStatus, MembershipTier, Complaint, Referral, WithdrawalStatus, BookSellerStatus, PaymentMethod } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import Logo from '../components/Logo';
import { syncAppStateToCloud, uploadImage } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Search, 
  X, Wallet, Users, Zap, Loader2, Monitor, MessageSquare, Check, CheckCircle2, Gavel, ShieldAlert, ImageIcon, Eye, BookOpen, UserCheck, UserX, MapPin, Smartphone, Clock, Calendar, Ban, UserCog, Award, Circle, ExternalLink, MessageCircle, Network, ArrowUpRight, Reply, Send
} from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const [tab, setTab] = useState<'withdrawals' | 'users' | 'activations' | 'complaints' | 'books'>('withdrawals');
  const [isChecking, setIsChecking] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  
  const [processingPayout, setProcessingPayout] = useState<any | null>(null);
  const [payoutProofUrl, setPayoutProofUrl] = useState<string | null>(null);
  const [payoutNote, setPayoutNote] = useState("");
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const [replyingTo, setReplyingTo] = useState<Complaint | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");

  const handleManualSync = async () => {
    setIsChecking(true);
    try { await syncAppStateToCloud(state); alert("System Backup Complete."); } 
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
      alert("Please upload the payout receipt and transaction ID for the affiliate's record.");
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
  };

  const approveMembership = (targetId: string) => {
    const targetUser = state.users.find(u => u.id === targetId);
    if (!targetUser) return;
    const tierBeingBought = MEMBERSHIP_TIERS.find(t => t.tier === targetUser.membershipTier);
    if (!tierBeingBought) return;
    
    let updatedUsers = [...state.users];
    let updatedReferrals = [...state.referrals];
    
    // Activate target user
    updatedUsers = updatedUsers.map(u => u.id === targetId ? { ...u, membershipStatus: MembershipStatus.ACTIVE, membershipNote: "Account activated! Profits shared with your sponsor and their team." } : u);
    
    // Automatic Profit Distribution
    if (targetUser.referredBy) {
      const l1Referrer = updatedUsers.find(u => u.id === targetUser.referredBy);
      if (l1Referrer) {
        // L1 gets 30-40% based on THEIR tier
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

        // L2 gets fixed 5% bonus from the team building interaction
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
    alert("Activation successful. Network commissions paid.");
  };

  const handleBookSellerAction = (userId: string, status: BookSellerStatus) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { 
      ...u, 
      bookSellerStatus: status,
      membershipNote: status === BookSellerStatus.REJECTED ? "Your distributor application was declined. Please update your details." : "Congratulations! You are now a verified KPH Book Distributor."
    } : u);
    onStateUpdate({ users: updatedUsers });
    alert(`Distributor status updated to ${status}.`);
  };

  const handleSupportReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !adminReplyText.trim()) return;

    const updatedComplaints = state.complaints.map(c => 
      c.id === replyingTo.id ? { 
        ...c, 
        reply: adminReplyText, 
        status: 'RESOLVED' as const, 
        updatedAt: new Date().toISOString() 
      } : c
    );

    onStateUpdate({ complaints: updatedComplaints });
    setReplyingTo(null);
    setAdminReplyText("");
    alert("Support ticket answered.");
  };

  const pendingWithdrawals = useMemo(() => state.withdrawals.filter(w => w.status === WithdrawalStatus.PENDING).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [state.withdrawals]);
  const pendingActivations = useMemo(() => state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING), [state.users]);
  const pendingBookSellers = useMemo(() => state.users.filter(u => u.bookSellerStatus === BookSellerStatus.PENDING), [state.users]);
  const pendingComplaints = useMemo(() => state.complaints.filter(c => c.status === 'PENDING'), [state.complaints]);

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
           <button className="absolute top-10 right-10 text-white p-4 bg-malawi-red rounded-full shadow-xl"><X size={32}/></button>
        </div>
      )}

      {/* Reply Modal */}
      {replyingTo && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-malawi-black/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="bg-malawi-black p-8 text-white flex justify-between items-center">
                 <h2 className="text-xl font-black uppercase tracking-tight">Answer Ticket</h2>
                 <button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="bg-gray-50 p-6 rounded-2xl border">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Member's Issue</p>
                    <p className="text-sm font-medium italic text-gray-700">"{replyingTo.message}"</p>
                 </div>
                 <form onSubmit={handleSupportReply} className="space-y-4">
                    <textarea required rows={4} className="w-full p-5 bg-gray-50 border rounded-2xl text-sm outline-none font-bold" placeholder="Write your response here..." value={adminReplyText} onChange={e => setAdminReplyText(e.target.value)} />
                    <button type="submit" className="w-full py-5 bg-malawi-green text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                       <Send size={16}/> Send Response
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* Payout Processing Modal */}
      {processingPayout && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-malawi-black/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="bg-malawi-black p-8 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Mutual Payout Confirmation</h2>
                    <p className="text-[10px] font-black text-malawi-green uppercase tracking-widest mt-1">K{processingPayout.amount.toLocaleString()}</p>
                 </div>
                 <button onClick={() => setProcessingPayout(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Screenshot Reference / Note</label>
                    <textarea required rows={2} className="w-full p-4 bg-gray-50 border rounded-2xl text-sm outline-none font-bold" placeholder="Transaction Reference" value={payoutNote} onChange={e => setPayoutNote(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Upload Receipt Image</label>
                    <div className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center relative ${payoutProofUrl ? 'bg-green-50 border-malawi-green' : 'border-gray-200'}`}>
                       <input type="file" required accept="image/*" onChange={handlePayoutProofUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                       {isChecking ? <Loader2 className="animate-spin text-malawi-green" /> : payoutProofUrl ? <CheckCircle2 className="text-malawi-green" size={24}/> : <ImageIcon className="text-gray-300" size={24}/>}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleProcessPayout(WithdrawalStatus.APPROVED)} className="py-4 bg-malawi-green text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Confirm Pay</button>
                    <button onClick={() => handleProcessPayout(WithdrawalStatus.REJECTED)} className="py-4 bg-malawi-red text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Reject</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Network Inspection Modal */}
      {inspectingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-malawi-black/95 backdrop-blur-xl">
           <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-8 bg-malawi-black text-white flex items-center justify-between">
                 <h2 className="text-2xl font-black uppercase tracking-tight">Network Analysis: {inspectingUser.fullName}</h2>
                 <button onClick={() => setInspectingUser(null)} className="p-4 hover:bg-white/10 rounded-full"><X size={32}/></button>
              </div>
              <div className="p-8 overflow-y-auto scrollbar-hide space-y-6">
                 <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-6 rounded-3xl border text-center">
                       <p className="text-[10px] font-black text-gray-400 uppercase">Current Balance</p>
                       <p className="text-xl font-black text-malawi-green">K{inspectingUser.balance.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-3xl border text-center">
                       <p className="text-[10px] font-black text-gray-400 uppercase">Total Profit</p>
                       <p className="text-xl font-black">K{inspectingUser.totalEarnings.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-3xl border text-center">
                       <p className="text-[10px] font-black text-gray-400 uppercase">Team Size</p>
                       <p className="text-xl font-black">{inspectingUserNetwork.length}</p>
                    </div>
                 </div>
                 <div className="bg-white border rounded-[2rem] overflow-hidden shadow-inner">
                    <table className="w-full text-left">
                       <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                          <tr><th className="px-8 py-4">Referred Member</th><th className="px-8 py-4">Tier</th><th className="px-8 py-4 text-right">Profit Generated</th></tr>
                       </thead>
                       <tbody className="divide-y text-xs">
                          {inspectingUserNetwork.map(r => (
                             <tr key={r.id}>
                                <td className="px-8 py-5 font-black uppercase">{r.user?.fullName} <span className="text-[8px] opacity-40 ml-2">{r.level === 1 ? '(Direct)' : '(Team Bonus)'}</span></td>
                                <td className="px-8 py-5 font-bold text-gray-400 uppercase">{r.user?.membershipTier}</td>
                                <td className="px-8 py-5 text-right font-black text-malawi-green">K{r.commission.toLocaleString()}</td>
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
          <h1 className="text-4xl font-black uppercase tracking-tight">Admin Control</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search system..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64 shadow-sm" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] shadow-sm hover:bg-gray-50 transition-all"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: pendingWithdrawals.length },
          { id: 'activations', label: 'Memberships', icon: ShieldAlert, count: pendingActivations.length },
          { id: 'books', label: 'Distributors', icon: BookOpen, count: pendingBookSellers.length },
          { id: 'complaints', label: 'Complaints', icon: MessageSquare, count: pendingComplaints.length },
          { id: 'users', label: 'Directory', icon: Users },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-10 py-4 rounded-[1.5rem] text-xs font-black uppercase border transition-all relative whitespace-nowrap ${tab === t.id ? 'bg-malawi-black text-white shadow-xl' : 'bg-white text-gray-400 shadow-sm'}`}>
            <t.icon size={18} /> {t.label}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2 py-0.5 rounded-full text-[10px] border-2 border-white shadow-md">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[4rem] border shadow-2xl overflow-hidden min-h-[600px]">
        {tab === 'withdrawals' && (
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                 <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">Requested</th><th className="px-10 py-6">Phone</th><th className="px-10 py-6 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y">
                 {pendingWithdrawals.length === 0 ? <tr><td colSpan={4} className="p-20 text-center text-gray-300 italic font-black uppercase">No pending payouts</td></tr> :
                   pendingWithdrawals.map(w => (
                      <tr key={w.id} className="hover:bg-gray-50">
                         <td className="px-10 py-8 font-black uppercase text-malawi-black">{w.userName}</td>
                         <td className="px-10 py-8 font-black text-malawi-green text-xl">K{w.amount.toLocaleString()}</td>
                         <td className="px-10 py-8 font-bold text-gray-600">{w.phone}</td>
                         <td className="px-10 py-8 text-right"><button onClick={() => setProcessingPayout(w)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">Review & Pay</button></td>
                      </tr>
                   ))
                 }
              </tbody>
           </table>
        )}

        {tab === 'activations' && (
           <div className="divide-y">
              {pendingActivations.length === 0 ? <div className="p-20 text-center text-gray-300 font-black uppercase italic">No pending memberships</div> : 
                 pendingActivations.map(u => (
                    <div key={u.id} className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-gray-50">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-malawi-green/10 text-malawi-green rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">{u.fullName.charAt(0)}</div>
                          <div>
                             <h4 className="font-black text-lg uppercase text-malawi-black">{u.fullName}</h4>
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Requested Tier: <span className="text-malawi-red">{u.membershipTier}</span></p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          {u.membershipProofUrl && <button onClick={() => setViewingProofUrl(u.membershipProofUrl!)} className="p-4 bg-gray-100 rounded-2xl text-gray-400 hover:text-malawi-black transition-colors"><ImageIcon size={20}/></button>}
                          <button onClick={() => approveMembership(u.id)} className="px-8 py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Approve & Share Profits</button>
                       </div>
                    </div>
                 ))
              }
           </div>
        )}

        {tab === 'books' && (
           <div className="p-10 space-y-8">
              {pendingBookSellers.length === 0 ? <div className="p-20 text-center text-gray-300 font-black uppercase italic">No distributor applications</div> : 
                 pendingBookSellers.map(u => (
                    <div key={u.id} className="bg-gray-50 rounded-[3rem] p-10 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                       <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                          <div className="space-y-4">
                             <div className="flex items-center gap-4">
                                <div className="p-4 bg-malawi-red rounded-2xl text-white shadow-lg"><BookOpen size={32}/></div>
                                <div>
                                   <h4 className="text-2xl font-black uppercase tracking-tight text-malawi-black">{u.bookSellerFullName || u.fullName}</h4>
                                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Distributor Registration</p>
                                </div>
                             </div>
                             <div className="flex flex-wrap gap-4 pt-2">
                                <a href={`https://wa.me/${(u.bookSellerWhatsapp || u.whatsapp || '').replace(/\+/g, '')}`} target="_blank" className="flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg"><MessageCircle size={16}/> {u.bookSellerWhatsapp || u.whatsapp}</a>
                                <div className="flex items-center gap-2 bg-white border px-5 py-2.5 rounded-xl text-[10px] font-black uppercase"><Smartphone size={16}/> {u.phone || 'N/A'}</div>
                             </div>
                          </div>
                          <div className="flex-grow max-w-md bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                             <p className="text-[9px] font-black uppercase text-gray-400 mb-2 flex items-center gap-2"><MapPin size={12}/> Registered Home Address</p>
                             <p className="text-xs font-bold text-gray-700 leading-relaxed italic">"{u.bookSellerAddress || 'Address not provided'}"</p>
                          </div>
                          <div className="flex flex-col gap-3 shrink-0">
                             <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.APPROVED)} className="px-10 py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Approve Distributor</button>
                             <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.REJECTED)} className="px-10 py-4 bg-white border-2 border-malawi-red text-malawi-red rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Reject</button>
                          </div>
                       </div>
                    </div>
                 ))
              }
           </div>
        )}

        {tab === 'complaints' && (
           <div className="divide-y">
              {pendingComplaints.length === 0 ? <div className="p-20 text-center text-gray-300 font-black uppercase italic">No pending complaints</div> : 
                 pendingComplaints.map(c => (
                    <div key={c.id} className="p-10 flex items-center justify-between hover:bg-gray-50">
                       <div className="space-y-1">
                          <h4 className="font-black text-malawi-black uppercase text-sm">{c.subject}</h4>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From: {c.userName}</p>
                          <p className="text-xs text-gray-600 mt-2 italic">"{c.message}"</p>
                       </div>
                       <button onClick={() => setReplyingTo(c)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 active:scale-95 transition-all"><Reply size={16}/> Reply</button>
                    </div>
                 ))
              }
           </div>
        )}

        {tab === 'users' && (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                    <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">Tier</th><th className="px-10 py-6">Earnings</th><th className="px-10 py-6 text-right">Action</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {filteredUsers.map(u => (
                       <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-10 py-8 font-black uppercase text-malawi-black">{u.fullName}</td>
                          <td className="px-10 py-8"><span className="px-3 py-1 bg-gray-100 rounded text-[9px] font-black uppercase tracking-widest">{u.membershipTier}</span></td>
                          <td className="px-10 py-8 font-black text-malawi-green">K{u.balance.toLocaleString()}</td>
                          <td className="px-10 py-8 text-right"><button onClick={() => setInspectingUser(u)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all">Inspect Network</button></td>
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
