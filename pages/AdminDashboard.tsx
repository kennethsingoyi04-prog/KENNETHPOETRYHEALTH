
import React, { useMemo, useState } from 'react';
import { AppState, User, MembershipStatus, MembershipTier, Complaint, Referral, WithdrawalStatus, BookSellerStatus, PaymentMethod } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import Logo from '../components/Logo';
import { syncAppStateToCloud, uploadImage } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Search, 
  X, Wallet, Users, Zap, Loader2, Monitor, MessageSquare, Check, CheckCircle2, Gavel, ShieldAlert, ImageIcon, Eye, BookOpen, UserCheck, UserX, MapPin, Smartphone, Clock, Calendar, Ban, UserCog, Award, Circle, ExternalLink, MessageCircle
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

  // Complaint reply state
  const [replyingTo, setReplyingTo] = useState<Complaint | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");

  // Membership rejection state
  const [rejectingActivation, setRejectingActivation] = useState<User | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  const [banReason, setBanReason] = useState("");
  const [banType, setBanType] = useState<'PERMANENT' | 'TEMPORARY'>('TEMPORARY');
  const [banDuration, setBanDuration] = useState("7"); 

  const handleManualSync = async () => {
    setIsChecking(true);
    try { await syncAppStateToCloud(state); alert("Cloud Backup Successful."); } 
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
    if (status === WithdrawalStatus.APPROVED && !payoutProofUrl) {
      alert("Please upload the payout receipt screenshot first.");
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
    alert(`Payout ${status}. User notified.`);
  };

  const approveMembership = (targetId: string) => {
    const targetUser = state.users.find(u => u.id === targetId);
    if (!targetUser) return;
    const tierBeingBought = MEMBERSHIP_TIERS.find(t => t.tier === targetUser.membershipTier);
    if (!tierBeingBought) return;
    
    let updatedUsers = [...state.users];
    let updatedReferrals = [...state.referrals];
    
    updatedUsers = updatedUsers.map(u => u.id === targetId ? { ...u, membershipStatus: MembershipStatus.ACTIVE, membershipNote: "Membership activated successfully." } : u);
    
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
    alert("User Activated & Commission Distributed.");
  };

  const rejectMembership = () => {
    if (!rejectingActivation) return;
    const updatedUsers = state.users.map(u => u.id === rejectingActivation.id ? { 
      ...u, 
      membershipStatus: MembershipStatus.INACTIVE, 
      membershipNote: rejectionNote || "Activation proof was invalid or rejected." 
    } : u);
    onStateUpdate({ users: updatedUsers });
    setRejectingActivation(null);
    setRejectionNote("");
    alert("Membership Activation Rejected. User has been notified.");
  };

  const handleBookSellerAction = (userId: string, status: BookSellerStatus) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { ...u, bookSellerStatus: status } : u);
    onStateUpdate({ users: updatedUsers });
    alert(`Book Distributor Request ${status === BookSellerStatus.APPROVED ? 'Approved' : 'Rejected'}. User notified.`);
  };

  const handleUpdateRole = (role: 'USER' | 'ADMIN') => {
    if (!inspectingUser) return;
    const updatedUsers = state.users.map(u => u.id === inspectingUser.id ? { ...u, role } : u);
    onStateUpdate({ users: updatedUsers });
    setInspectingUser({ ...inspectingUser, role });
    alert(`Role updated to ${role}.`);
  };

  const handleBanUser = () => {
    if (!inspectingUser || !banReason.trim()) return;
    const expiry = banType === 'TEMPORARY' ? new Date(Date.now() + parseInt(banDuration) * 24 * 60 * 60 * 1000).toISOString() : undefined;
    const updatedUsers = state.users.map(u => u.id === inspectingUser.id ? { ...u, isBanned: true, banReason, banType, banExpiresAt: expiry } : u);
    onStateUpdate({ users: updatedUsers });
    setInspectingUser({ ...inspectingUser, isBanned: true, banReason, banType, banExpiresAt: expiry });
    setBanReason("");
  };

  const handleUnbanUser = () => {
    if (!inspectingUser) return;
    const updatedUsers = state.users.map(u => u.id === inspectingUser.id ? { ...u, isBanned: false, banReason: undefined, banType: undefined, banExpiresAt: undefined } : u);
    onStateUpdate({ users: updatedUsers });
    setInspectingUser({ ...inspectingUser, isBanned: false });
  };

  const handleComplaintReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingTo || !adminReplyText.trim()) return;
    const updatedComplaints = state.complaints.map(c => c.id === replyingTo.id ? { 
      ...c, 
      reply: adminReplyText, 
      status: 'RESOLVED' as const,
      updatedAt: new Date().toISOString()
    } : c);
    onStateUpdate({ complaints: updatedComplaints });
    setReplyingTo(null);
    setAdminReplyText("");
    alert("Response sent to member.");
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

  const isOnline = (user: User) => {
    if (!user.lastLoginAt) return false;
    return (new Date().getTime() - new Date(user.lastLoginAt).getTime()) < 5 * 60 * 1000;
  };

  return (
    <div className="max-w-7xl mx-auto pb-32 animate-in fade-in duration-700">
      {/* Overlays */}
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-8" onClick={() => setViewingProofUrl(null)}>
           <img src={viewingProofUrl} className="max-w-full max-h-full rounded-2xl shadow-2xl" />
           <button className="absolute top-10 right-10 text-white p-4 bg-malawi-red rounded-full"><X size={32}/></button>
        </div>
      )}

      {/* Complaint Reply Modal */}
      {replyingTo && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-malawi-black/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="bg-malawi-black p-8 text-white flex justify-between items-center">
                 <h2 className="text-xl font-black uppercase tracking-tight">Reply to Support Ticket</h2>
                 <button onClick={() => setReplyingTo(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
              </div>
              <form onSubmit={handleComplaintReply} className="p-8 space-y-6">
                 <div className="bg-gray-50 p-6 rounded-2xl border italic text-xs text-gray-600">
                    "{replyingTo.message}"
                 </div>
                 <textarea required rows={4} className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-medium" placeholder="Type your official response..." value={adminReplyText} onChange={e => setAdminReplyText(e.target.value)} />
                 <button type="submit" className="w-full py-4 bg-malawi-green text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Send Response</button>
              </form>
           </div>
        </div>
      )}

      {/* Activation Reject Modal */}
      {rejectingActivation && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-malawi-black/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="bg-malawi-red p-8 text-white flex justify-between items-center">
                 <h2 className="text-xl font-black uppercase tracking-tight">Reject Activation</h2>
                 <button onClick={() => setRejectingActivation(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <p className="text-xs font-bold text-gray-500 uppercase">Provide reason for rejection (this will be shown to the user):</p>
                 <textarea required rows={3} className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-medium" placeholder="e.g. Transaction ID not found on receipt..." value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} />
                 <button onClick={rejectMembership} className="w-full py-4 bg-malawi-red text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Confirm Rejection</button>
              </div>
           </div>
        </div>
      )}

      {processingPayout && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-malawi-black/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden">
              <div className="bg-malawi-black p-8 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Process Payout</h2>
                    <p className="text-[10px] font-black text-malawi-green uppercase tracking-widest mt-1">K{processingPayout.amount.toLocaleString()} • {processingPayout.paymentMethod}</p>
                 </div>
                 <button onClick={() => setProcessingPayout(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="bg-gray-50 p-6 rounded-2xl border">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Recipient Phone</p>
                    <div className="flex items-center justify-between">
                       <span className="font-black text-lg text-malawi-black">{processingPayout.phone}</span>
                       <a href={`https://wa.me/${processingPayout.whatsapp.replace(/\+/g, '')}`} target="_blank" className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg">
                          <MessageCircle size={14}/> Chat
                       </a>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Upload Payout Screenshot</label>
                    <div className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center relative ${payoutProofUrl ? 'bg-green-50 border-malawi-green' : 'border-gray-200'}`}>
                       <input type="file" required accept="image/*" onChange={handlePayoutProofUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                       {payoutProofUrl ? <CheckCircle2 className="text-malawi-green" size={24}/> : <ImageIcon className="text-gray-300" size={24}/>}
                       <p className="text-[9px] font-black uppercase text-gray-400 mt-2">{payoutProofUrl ? 'Receipt Attached' : 'Tap to Upload Receipt'}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleProcessPayout(WithdrawalStatus.APPROVED)} className="py-4 bg-malawi-green text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Approve</button>
                    <button onClick={() => handleProcessPayout(WithdrawalStatus.REJECTED)} className="py-4 bg-malawi-red text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Reject</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {inspectingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-malawi-black/95 backdrop-blur-xl">
           <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className={`p-10 text-white flex items-center justify-between ${inspectingUser.isBanned ? 'bg-malawi-red' : 'bg-malawi-black'}`}>
                 <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white font-black text-2xl border border-white/20">
                        {inspectingUser.fullName.charAt(0)}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${isOnline(inspectingUser) ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    </div>
                    <div>
                       <h2 className="text-3xl font-black uppercase tracking-tight">{inspectingUser.fullName}</h2>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">@{inspectingUser.username} • Affiliate Since {new Date(inspectingUser.createdAt).toLocaleDateString()}</p>
                    </div>
                 </div>
                 <button onClick={() => setInspectingUser(null)} className="p-4 hover:bg-white/10 rounded-full"><X size={32}/></button>
              </div>
              
              <div className="p-10 overflow-y-auto space-y-8">
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
                       <p className="text-[10px] font-black uppercase text-gray-400">Sponsor</p>
                       <p className="text-sm font-black uppercase">{state.users.find(u => u.id === inspectingUser.referredBy)?.username || 'System'}</p>
                    </div>
                 </div>

                 <div className="bg-white rounded-[3rem] border p-8 space-y-6">
                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><Smartphone className="text-malawi-green" size={20}/> Contact Information</h3>
                    <div className="grid grid-cols-2 gap-8">
                       <div><p className="text-[10px] font-black uppercase text-gray-400 mb-1">Phone</p><p className="font-bold">{inspectingUser.phone || 'N/A'}</p></div>
                       <div className="flex items-center justify-between">
                          <div><p className="text-[10px] font-black uppercase text-gray-400 mb-1">WhatsApp</p><p className="font-bold">{inspectingUser.whatsapp || 'N/A'}</p></div>
                          {inspectingUser.whatsapp && <a href={`https://wa.me/${inspectingUser.whatsapp.replace(/\+/g, '')}`} target="_blank" className="p-3 bg-green-500 text-white rounded-xl shadow-lg"><ExternalLink size={16}/></a>}
                       </div>
                    </div>
                 </div>

                 <div className="bg-white rounded-[3rem] border p-8 space-y-6">
                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><Gavel className="text-malawi-red" size={20}/> Discipline & Roles</h3>
                    <div className="flex items-center justify-between">
                       <div className={`px-5 py-2 rounded-2xl font-black text-xs uppercase tracking-widest ${inspectingUser.role === 'ADMIN' ? 'bg-malawi-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {inspectingUser.role} ACCESS
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => handleUpdateRole(inspectingUser.role === 'ADMIN' ? 'USER' : 'ADMIN')} className="px-6 py-3 bg-malawi-black text-white rounded-xl text-[10px] font-black uppercase">Toggle Role</button>
                          {inspectingUser.isBanned ? (
                             <button onClick={handleUnbanUser} className="px-6 py-3 bg-malawi-green text-white rounded-xl text-[10px] font-black uppercase">Unban User</button>
                          ) : (
                             <button onClick={() => setInspectingUser({...inspectingUser, isBanned: true})} className="px-6 py-3 bg-malawi-red text-white rounded-xl text-[10px] font-black uppercase">Start Ban Process</button>
                          )}
                       </div>
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
          <h1 className="text-4xl font-black uppercase tracking-tight">System Control</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search affiliates..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64 shadow-sm" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] shadow-sm active:scale-95 transition-all"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: pendingWithdrawals.length },
          { id: 'activations', label: 'Activations', icon: ShieldAlert, count: pendingActivations.length },
          { id: 'books', label: 'Distributors', icon: BookOpen, count: pendingBookSellers.length },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'complaints', label: 'Complaints', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border transition-all relative ${tab === t.id ? 'bg-malawi-black text-white shadow-xl' : 'bg-white text-gray-400 shadow-sm'}`}>
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
                    <tr>
                       <th className="px-10 py-6">Affiliate</th>
                       <th className="px-10 py-6">Amount/Method</th>
                       <th className="px-10 py-6">Target Number</th>
                       <th className="px-10 py-6 text-center">Verification</th>
                       <th className="px-10 py-6 text-right">Action</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                    {pendingWithdrawals.length === 0 ? <tr><td colSpan={5} className="p-20 text-center text-gray-300 italic uppercase font-black">No pending payouts</td></tr> : 
                       pendingWithdrawals.map(w => (
                          <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                             <td className="px-10 py-8">
                                <p className="font-black uppercase tracking-tight text-malawi-black">{w.userName}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">{new Date(w.createdAt).toLocaleDateString()}</p>
                             </td>
                             <td className="px-10 py-8">
                                <p className="text-xl font-black text-malawi-green">K{w.amount.toLocaleString()}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase">{w.paymentMethod}</p>
                             </td>
                             <td className="px-10 py-8">
                                <div className="flex items-center gap-3">
                                   <p className="font-bold text-sm">{w.phone}</p>
                                   <a href={`https://wa.me/${w.whatsapp.replace(/\+/g, '')}`} target="_blank" className="p-2 bg-green-100 text-green-600 rounded-lg"><ExternalLink size={14}/></a>
                                </div>
                             </td>
                             <td className="px-10 py-8 text-center">
                                {w.proofUrl && <button onClick={() => setViewingProofUrl(w.proofUrl!)} className="p-3 bg-gray-100 text-gray-400 rounded-xl hover:text-malawi-black transition-colors"><ImageIcon size={18}/></button>}
                             </td>
                             <td className="px-10 py-8 text-right">
                                <button onClick={() => setProcessingPayout(w)} className="px-6 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">Process Payout</button>
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
                    <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">Membership</th><th className="px-10 py-6">Balance</th><th className="px-10 py-6 text-center">Control</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {filteredUsers.map(u => (
                       <tr key={u.id} className={`hover:bg-gray-50/50 ${u.isBanned ? 'bg-red-50' : ''}`}>
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-malawi-black flex items-center justify-center text-white font-black uppercase">{u.fullName.charAt(0)}</div>
                                <div><p className="font-black uppercase tracking-tight">{u.fullName}</p><p className="text-[10px] text-gray-400">@{u.username}</p></div>
                             </div>
                          </td>
                          <td className="px-10 py-8"><span className="px-3 py-1 bg-gray-100 rounded text-[9px] font-black uppercase">{u.membershipTier}</span></td>
                          <td className="px-10 py-8 font-black text-malawi-green">K{u.balance.toLocaleString()}</td>
                          <td className="px-10 py-8 text-center"><button onClick={() => setInspectingUser(u)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all">Inspect Account</button></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}

        {tab === 'activations' && (
           <div className="divide-y">
              {pendingActivations.length === 0 ? <div className="p-20 text-center text-gray-300 italic uppercase font-black">No pending activations</div> : 
                 pendingActivations.map(u => (
                    <div key={u.id} className="p-10 flex items-center justify-between hover:bg-gray-50 transition-colors">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-malawi-green text-white rounded-2xl flex items-center justify-center font-black text-xl">{u.fullName.charAt(0)}</div>
                          <div><h4 className="font-black text-lg uppercase tracking-tight">{u.fullName}</h4><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Applying: {u.membershipTier}</p></div>
                       </div>
                       <div className="flex items-center gap-4">
                          {u.membershipProofUrl && <button onClick={() => setViewingProofUrl(u.membershipProofUrl!)} className="p-4 bg-gray-100 rounded-xl text-gray-400 hover:text-malawi-black transition-colors"><ImageIcon size={20}/></button>}
                          <div className="flex gap-2">
                             <button onClick={() => approveMembership(u.id)} className="px-6 py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95"><CheckCircle2 size={16}/> Approve</button>
                             <button onClick={() => setRejectingActivation(u)} className="px-6 py-4 bg-malawi-red text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95"><X size={16}/> Reject</button>
                          </div>
                       </div>
                    </div>
                 ))
              }
           </div>
        )}

        {tab === 'books' && (
           <div className="divide-y">
              {pendingBookSellers.length === 0 ? <div className="p-20 text-center text-gray-300 italic uppercase font-black">No distributor requests</div> : 
                 pendingBookSellers.map(u => (
                    <div key={u.id} className="p-10 flex flex-col hover:bg-gray-50 transition-colors">
                       <div className="flex items-center justify-between w-full mb-6">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-malawi-red text-white rounded-2xl flex items-center justify-center font-black text-xl">{u.fullName.charAt(0)}</div>
                            <div><h4 className="font-black text-lg uppercase tracking-tight">{u.bookSellerFullName || u.fullName}</h4><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Book Distribution Request</p></div>
                          </div>
                          <div className="flex items-center gap-3">
                             <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.APPROVED)} className="px-6 py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95"><UserCheck size={16}/> Approve</button>
                             <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.REJECTED)} className="px-6 py-4 bg-malawi-red text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95"><UserX size={16}/> Reject</button>
                          </div>
                       </div>
                       <div className="bg-gray-50 p-6 rounded-3xl grid grid-cols-2 gap-4 border border-gray-100 ml-20 mr-10">
                          <div className="flex items-center gap-3"><Smartphone className="text-malawi-red" size={16}/><div><p className="text-[9px] font-black uppercase text-gray-400">Contact</p><p className="text-xs font-bold">{u.bookSellerWhatsapp || u.whatsapp}</p></div></div>
                          <div className="flex items-center gap-3"><MapPin className="text-malawi-red" size={16}/><div><p className="text-[9px] font-black uppercase text-gray-400">Mailing Address</p><p className="text-xs font-bold">{u.bookSellerAddress}</p></div></div>
                       </div>
                    </div>
                 ))
              }
           </div>
        )}

        {tab === 'complaints' && (
           <div className="divide-y">
              {state.complaints.filter(c => c.status === 'PENDING').length === 0 ? <div className="p-20 text-center text-gray-300 italic uppercase font-black">No open complaints</div> : 
                 state.complaints.filter(c => c.status === 'PENDING').map(c => (
                    <div key={c.id} className="p-10 flex flex-col hover:bg-gray-50 transition-colors">
                       <div className="flex items-center justify-between w-full mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-malawi-black rounded-xl flex items-center justify-center text-white font-black text-sm">{c.userName.charAt(0)}</div>
                            <div>
                               <h4 className="font-black text-sm uppercase">{c.subject}</h4>
                               <p className="text-[9px] font-bold text-gray-400 uppercase">From: {c.userName} • {new Date(c.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button onClick={() => setReplyingTo(c)} className="px-6 py-3 bg-malawi-black text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 flex items-center gap-2"><MessageCircle size={14}/> Respond</button>
                       </div>
                       <div className="ml-16 bg-gray-50 p-5 rounded-2xl border text-sm italic text-gray-600">
                          "{c.message}"
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
