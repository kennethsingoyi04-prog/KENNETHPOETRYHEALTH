
import React, { useMemo, useState } from 'react';
import { AppState, User, MembershipStatus, MembershipTier, Complaint, Referral, WithdrawalStatus, BookSellerStatus } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import Logo from '../components/Logo';
import { syncAppStateToCloud } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Search, 
  X, Wallet, Users, Zap, Loader2, Monitor, MessageSquare, Check, CheckCircle2, Gavel, ShieldAlert, ImageIcon, Eye, BookOpen, UserCheck, UserX, MapPin, Smartphone, Clock, Calendar, Ban
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

  // Discipline State
  const [banReason, setBanReason] = useState("");
  const [banType, setBanType] = useState<'PERMANENT' | 'TEMPORARY'>('TEMPORARY');
  const [banDuration, setBanDuration] = useState("7"); // days

  const handleManualSync = async () => {
    setIsChecking(true);
    try { await syncAppStateToCloud(state); alert("Backup successful."); } 
    catch (e: any) { alert(e.message); } 
    finally { setIsChecking(false); }
  };

  const approveMembership = (targetId: string) => {
    const targetUser = state.users.find(u => u.id === targetId);
    if (!targetUser) return;
    const tierBeingBought = MEMBERSHIP_TIERS.find(t => t.tier === targetUser.membershipTier);
    if (!tierBeingBought) return;
    let updatedUsers = [...state.users];
    let updatedReferrals = [...state.referrals];
    updatedUsers = updatedUsers.map(u => u.id === targetId ? { ...u, membershipStatus: MembershipStatus.ACTIVE } : u);
    if (targetUser.referredBy) {
      const l1Referrer = updatedUsers.find(u => u.id === targetUser.referredBy);
      if (l1Referrer) {
        const l1TierConfig = MEMBERSHIP_TIERS.find(t => t.tier === l1Referrer.membershipTier) || MEMBERSHIP_TIERS[0];
        const commission = (tierBeingBought.price * l1TierConfig.directCommission) / 100;
        updatedReferrals.push({ id: `ref-${Date.now()}-L1`, referrerId: l1Referrer.id, referredId: targetUser.id, level: 1, commission: commission, timestamp: new Date().toISOString() });
        updatedUsers = updatedUsers.map(u => u.id === l1Referrer.id ? { ...u, balance: u.balance + commission, totalEarnings: u.totalEarnings + commission } : u);
        if (l1Referrer.referredBy) {
          const l2Referrer = updatedUsers.find(u => u.id === l1Referrer.referredBy);
          if (l2Referrer) {
            const l2Commission = (tierBeingBought.price * 5) / 100;
            updatedReferrals.push({ id: `ref-${Date.now()}-L2`, referrerId: l2Referrer.id, referredId: targetUser.id, level: 2, commission: l2Commission, timestamp: new Date().toISOString() });
            updatedUsers = updatedUsers.map(u => u.id === l2Referrer.id ? { ...u, balance: u.balance + l2Commission, totalEarnings: u.totalEarnings + l2Commission } : u);
          }
        }
      }
    }
    onStateUpdate({ users: updatedUsers, referrals: updatedReferrals });
    alert(`Activation Successful: Commission distributed.`);
  };

  const handleBookSellerAction = (userId: string, status: BookSellerStatus) => {
    const updatedUsers = state.users.map(u => u.id === userId ? { ...u, bookSellerStatus: status } : u);
    onStateUpdate({ users: updatedUsers });
    alert(`Book seller request ${status === BookSellerStatus.APPROVED ? 'Approved' : 'Rejected'}.`);
  };

  const handleBanUser = () => {
    if (!inspectingUser) return;
    if (!banReason.trim()) {
      alert("Please provide a reason for the disciplinary action.");
      return;
    }

    const expiry = banType === 'TEMPORARY' 
      ? new Date(Date.now() + parseInt(banDuration) * 24 * 60 * 60 * 1000).toISOString() 
      : undefined;

    const updatedUsers = state.users.map(u => u.id === inspectingUser.id ? {
      ...u,
      isBanned: true,
      banReason: banReason,
      banType: banType,
      banExpiresAt: expiry
    } : u);

    onStateUpdate({ users: updatedUsers });
    setInspectingUser({ ...inspectingUser, isBanned: true, banReason, banType, banExpiresAt: expiry });
    setBanReason("");
    alert(`${inspectingUser.fullName} has been ${banType === 'PERMANENT' ? 'permanently banned' : 'suspended'}.`);
  };

  const handleUnbanUser = () => {
    if (!inspectingUser) return;
    const updatedUsers = state.users.map(u => u.id === inspectingUser.id ? {
      ...u,
      isBanned: false,
      banReason: undefined,
      banType: undefined,
      banExpiresAt: undefined
    } : u);

    onStateUpdate({ users: updatedUsers });
    setInspectingUser({ ...inspectingUser, isBanned: false, banReason: undefined, banType: undefined, banExpiresAt: undefined });
    alert(`${inspectingUser.fullName} has been reinstated.`);
  };

  const pendingActivations = useMemo(() => state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING), [state.users]);
  const pendingBookSellers = useMemo(() => state.users.filter(u => u.bookSellerStatus === BookSellerStatus.PENDING), [state.users]);

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
      u.username.toLowerCase().includes(searchText.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.users, searchText]);

  return (
    <div className="max-w-7xl mx-auto pb-32 animate-in fade-in duration-700">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-8" onClick={() => setViewingProofUrl(null)}>
           <img src={viewingProofUrl} className="max-w-full max-h-full rounded-2xl shadow-2xl" />
           <button className="absolute top-10 right-10 text-white"><X size={48}/></button>
        </div>
      )}

      {inspectingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-malawi-black/95 backdrop-blur-xl">
           <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
              <div className={`p-10 text-white flex items-center justify-between rounded-t-[4rem] ${inspectingUser.isBanned ? 'bg-malawi-red' : 'bg-malawi-black'}`}>
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white font-black text-2xl border border-white/20">
                      {inspectingUser.fullName.charAt(0)}
                    </div>
                    <div>
                       <h2 className="text-3xl font-black uppercase tracking-tight">{inspectingUser.fullName}</h2>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">@{inspectingUser.username} • {inspectingUser.membershipTier}</p>
                    </div>
                 </div>
                 <button onClick={() => setInspectingUser(null)} className="p-4 hover:bg-white/10 rounded-full transition-all"><X size={32}/></button>
              </div>
              
              <div className="p-10 overflow-y-auto space-y-8">
                 {/* Stats Section */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border">
                       <p className="text-[10px] font-black uppercase text-gray-400 mb-1">MWK Balance</p>
                       <p className="text-2xl font-black text-malawi-green">K{inspectingUser.balance.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border">
                       <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Total Earned</p>
                       <p className="text-2xl font-black">K{inspectingUser.totalEarnings.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border">
                       <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Account Status</p>
                       <p className={`text-xs font-black uppercase px-3 py-1 rounded-full inline-block ${inspectingUser.isBanned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {inspectingUser.isBanned ? 'Banned / Suspended' : 'Active'}
                       </p>
                    </div>
                 </div>

                 {/* Disciplinary Section */}
                 <div className="bg-white rounded-[3rem] border border-gray-200 p-8 space-y-6">
                    <div className="flex items-center gap-3 border-b pb-4">
                       <Gavel className="text-malawi-red" size={24} />
                       <h3 className="text-lg font-black uppercase tracking-tight">Disciplinary Controls</h3>
                    </div>

                    {inspectingUser.isBanned ? (
                       <div className="space-y-6">
                          <div className="bg-red-50 p-8 rounded-3xl border border-red-100 space-y-4">
                             <div className="flex items-center gap-3 text-malawi-red">
                                <ShieldAlert size={20} />
                                <p className="text-[10px] font-black uppercase tracking-widest">Active Violation Report</p>
                             </div>
                             <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Reason for Ban:</p>
                                <p className="text-lg font-black italic">"{inspectingUser.banReason}"</p>
                             </div>
                             {inspectingUser.banType === 'TEMPORARY' && inspectingUser.banExpiresAt && (
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                                   <Clock size={14} /> Suspended until {new Date(inspectingUser.banExpiresAt).toLocaleDateString()}
                                </div>
                             )}
                          </div>
                          <button onClick={handleUnbanUser} className="w-full py-5 bg-malawi-green text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                             Lift All Restrictions (Reinstatement)
                          </button>
                       </div>
                    ) : (
                       <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Action Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                   <button 
                                      onClick={() => setBanType('TEMPORARY')}
                                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${banType === 'TEMPORARY' ? 'bg-malawi-black text-white' : 'bg-gray-50 text-gray-400'}`}
                                   >
                                      Suspend (Temp)
                                   </button>
                                   <button 
                                      onClick={() => setBanType('PERMANENT')}
                                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${banType === 'PERMANENT' ? 'bg-malawi-red text-white' : 'bg-gray-50 text-gray-400'}`}
                                   >
                                      Permanent Ban
                                   </button>
                                </div>
                             </div>
                             {banType === 'TEMPORARY' && (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                   <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Suspension Duration (Days)</label>
                                   <select 
                                      className="w-full p-3 bg-gray-50 border rounded-xl font-black text-xs uppercase outline-none"
                                      value={banDuration}
                                      onChange={(e) => setBanDuration(e.target.value)}
                                   >
                                      <option value="1">1 Day</option>
                                      <option value="3">3 Days</option>
                                      <option value="7">7 Days</option>
                                      <option value="14">14 Days</option>
                                      <option value="30">30 Days</option>
                                      <option value="90">90 Days</option>
                                   </select>
                                </div>
                             )}
                          </div>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Official Violation Reason</label>
                             <textarea 
                                rows={3}
                                className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-red resize-none"
                                placeholder="State exactly why this user is being disciplined..."
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                             />
                          </div>

                          <button 
                             onClick={handleBanUser}
                             className={`w-full py-5 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${banType === 'PERMANENT' ? 'bg-malawi-red' : 'bg-malawi-black'}`}
                          >
                             <Ban size={18} /> {banType === 'PERMANENT' ? 'Issue Permanent Ban' : `Suspend User for ${banDuration} Days`}
                          </button>
                       </div>
                    )}
                 </div>
              </div>
              <div className="p-8 border-t bg-gray-50 flex justify-center">
                 <button onClick={() => setInspectingUser(null)} className="px-16 py-5 bg-malawi-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Close Inspector</button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Logo size="md" variant="dark" />
          <h1 className="text-4xl font-black uppercase tracking-tight">Admin Console</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Find user..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64 shadow-sm" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] shadow-sm active:scale-95 transition-all"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === WithdrawalStatus.PENDING).length },
          { id: 'activations', label: 'Activations', icon: ShieldAlert, count: pendingActivations.length },
          { id: 'books', label: 'Book Sellers', icon: BookOpen, count: pendingBookSellers.length },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'complaints', label: 'Support', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border transition-all relative ${tab === t.id ? 'bg-malawi-black text-white shadow-xl' : 'bg-white text-gray-400'}`}>
            <t.icon size={18} /> {t.label}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2 py-0.5 rounded-full text-[10px] border-2 border-white">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[4rem] border shadow-2xl overflow-hidden min-h-[600px]">
        {tab === 'activations' && (
           <div className="divide-y">
              {pendingActivations.length === 0 ? <div className="p-20 text-center text-gray-300 italic uppercase font-black">No pending activations</div> : 
                 pendingActivations.map(u => (
                    <div key={u.id} className="p-10 flex items-center justify-between hover:bg-gray-50">
                       <div className="flex items-center gap-6"><div className="w-16 h-16 bg-malawi-green text-white rounded-2xl flex items-center justify-center font-black text-xl">{u.fullName.charAt(0)}</div>
                       <div><h4 className="font-black text-lg uppercase tracking-tight">{u.fullName}</h4><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Applying: {u.membershipTier}</p></div></div>
                       <div className="flex items-center gap-4">
                          {u.membershipProofUrl && <button onClick={() => setViewingProofUrl(u.membershipProofUrl!)} className="p-4 bg-gray-100 rounded-xl text-gray-400 hover:text-malawi-black transition-colors"><ImageIcon size={20}/></button>}
                          <button onClick={() => approveMembership(u.id)} className="px-8 py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95"><CheckCircle2 size={16}/> Approve Membership</button>
                       </div>
                    </div>
                 ))
              }
           </div>
        )}

        {tab === 'books' && (
           <div className="divide-y">
              {pendingBookSellers.length === 0 ? <div className="p-20 text-center text-gray-300 italic uppercase font-black">No pending seller requests</div> : 
                 pendingBookSellers.map(u => (
                    <div key={u.id} className="p-10 flex flex-col hover:bg-gray-50 transition-colors">
                       <div className="flex items-center justify-between w-full mb-6">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-malawi-red text-white rounded-2xl flex items-center justify-center font-black text-xl">{u.fullName.charAt(0)}</div>
                            <div>
                               <h4 className="font-black text-lg uppercase tracking-tight">{u.bookSellerFullName || u.fullName}</h4>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seller Application Request</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.APPROVED)} className="px-6 py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 active:scale-95"><UserCheck size={16}/> Approve</button>
                             <button onClick={() => handleBookSellerAction(u.id, BookSellerStatus.REJECTED)} className="px-6 py-4 bg-malawi-red text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 active:scale-95"><UserX size={16}/> Reject</button>
                          </div>
                       </div>
                       <div className="bg-gray-50 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-100 mb-4 ml-20 mr-10">
                          <div className="flex items-center gap-3">
                             <Smartphone className="text-malawi-red" size={16}/>
                             <div>
                                <p className="text-[9px] font-black uppercase text-gray-400">WhatsApp</p>
                                <p className="text-xs font-bold">{u.bookSellerWhatsapp || u.whatsapp}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <MapPin className="text-malawi-red" size={16}/>
                             <div>
                                <p className="text-[9px] font-black uppercase text-gray-400">Home Address</p>
                                <p className="text-xs font-bold">{u.bookSellerAddress || 'No address provided'}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 ))
              }
           </div>
        )}

        {tab === 'users' && (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                    <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">Tier</th><th className="px-10 py-6">Balance</th><th className="px-10 py-6 text-center">Control</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {filteredUsers.map(u => (
                       <tr key={u.id} className={`hover:bg-gray-50/50 ${u.isBanned ? 'bg-red-50/30' : ''}`}>
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-3">
                                {u.isBanned && <Ban size={14} className="text-malawi-red" />}
                                <div>
                                   <p className={`font-black uppercase tracking-tight ${u.isBanned ? 'text-malawi-red' : ''}`}>{u.fullName}</p>
                                   <p className="text-[10px] text-gray-400">@{u.username}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-10 py-8"><span className="px-3 py-1 bg-gray-100 rounded text-[9px] font-black uppercase">{u.membershipTier}</span></td>
                          <td className="px-10 py-8 font-black text-malawi-green">K{u.balance.toLocaleString()}</td>
                          <td className="px-10 py-8 text-center"><button onClick={() => setInspectingUser(u)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md">Inspect Account</button></td>
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
