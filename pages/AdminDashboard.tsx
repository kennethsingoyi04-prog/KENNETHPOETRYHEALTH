
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AppState, WithdrawalStatus, WithdrawalRequest, PaymentMethod, User, UserRole, MembershipStatus, Complaint, Referral } from '../types';
import { MALAWI_COLORS, MEMBERSHIP_TIERS } from '../constants';
import { 
  Users, 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Search, 
  PieChart as PieIcon,
  MessageSquare,
  Check,
  Activity,
  FileSpreadsheet,
  Filter,
  Edit2,
  Image as ImageIcon,
  ShieldCheck,
  Send,
  Loader2,
  ArrowUpDown,
  X,
  ExternalLink,
  Crown,
  UserPlus,
  Settings,
  AlertTriangle
} from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const currentUser = state.currentUser!;
  const isOwner = currentUser.isOwner === true;
  
  const [userSearch, setUserSearch] = useState("");
  const [queueSearch, setQueueSearch] = useState("");
  const [tab, setTab] = useState<'withdrawals' | 'memberships' | 'complaints' | 'team' | 'users'>('withdrawals');
  
  // Modals
  const [replyTicket, setReplyTicket] = useState<Complaint | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Stats
  const totalUsers = state.users.filter(u => u.role === 'USER').length;
  const staffAdmins = state.users.filter(u => u.role === 'ADMIN' && !u.isOwner);
  const totalBalance = state.users.filter(u => u.role === 'USER').reduce((acc, u) => acc + u.balance, 0);
  const pendingWithdrawals = state.withdrawals.filter(w => w.status === WithdrawalStatus.PENDING);
  const pendingMemberships = state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING);
  const pendingComplaints = state.complaints.filter(c => c.status === 'PENDING');
  
  const totalPayouts = state.withdrawals
    .filter(w => w.status === WithdrawalStatus.APPROVED)
    .reduce((acc, w) => acc + w.amount, 0);

  const withdrawalMethodData = useMemo(() => {
    const stats: Record<string, number> = state.withdrawals.reduce((acc, w) => {
      acc[w.paymentMethod] = (acc[w.paymentMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = (Object.values(stats) as number[]).reduce((sum: number, val: number) => sum + val, 0);
    
    return Object.entries(stats).map(([name, value]) => ({
      name,
      value: value as number,
      percentage: (total as number) > 0 ? (((value as number) / (total as number)) * 100).toFixed(1) : "0"
    }));
  }, [state.withdrawals]);

  const COLORS = {
    [PaymentMethod.AIRTEL_MONEY]: MALAWI_COLORS.red,
    [PaymentMethod.TNM_MPAMBA]: MALAWI_COLORS.green
  };

  const handleWithdrawalAction = (id: string, status: WithdrawalStatus) => {
    const updatedWithdrawals = state.withdrawals.map(w => 
      w.id === id ? { ...w, status } : w
    );
    onStateUpdate({ withdrawals: updatedWithdrawals });
    alert(`Withdrawal ${status.toLowerCase()} successfully.`);
  };

  const handleMembershipAction = (userId: string, status: MembershipStatus) => {
    if (status === MembershipStatus.ACTIVE) {
      const userToActivate = state.users.find(u => u.id === userId);
      if (userToActivate) {
        const tierPrice = MEMBERSHIP_TIERS.find(t => t.tier === userToActivate.membershipTier)?.price || 0;
        let updatedUsers = [...state.users];
        let newReferrals = [...state.referrals];

        // Direct Referrer (L1)
        if (userToActivate.referredBy) {
          const l1Referrer = updatedUsers.find(u => u.id === userToActivate.referredBy);
          if (l1Referrer) {
            const l1TierConfig = MEMBERSHIP_TIERS.find(t => t.tier === l1Referrer.membershipTier);
            const l1Rate = l1TierConfig ? l1TierConfig.directCommission : 30;
            const l1Commission = (tierPrice * l1Rate) / 100;

            updatedUsers = updatedUsers.map(u => u.id === l1Referrer.id ? {
              ...u,
              balance: u.balance + l1Commission,
              totalEarnings: u.totalEarnings + l1Commission
            } : u);

            newReferrals.push({
              id: `ref-${Date.now()}-L1`,
              referrerId: l1Referrer.id,
              referredId: userId,
              level: 1,
              commission: l1Commission,
              timestamp: new Date().toISOString()
            });

            // Indirect Referrer (L2) - 5% Fixed
            if (l1Referrer.referredBy) {
              const l2Referrer = updatedUsers.find(u => u.id === l1Referrer.referredBy);
              if (l2Referrer) {
                const l2Commission = (tierPrice * 5) / 100;
                updatedUsers = updatedUsers.map(u => u.id === l2Referrer.id ? {
                  ...u,
                  balance: u.balance + l2Commission,
                  totalEarnings: u.totalEarnings + l2Commission
                } : u);

                newReferrals.push({
                  id: `ref-${Date.now()}-L2`,
                  referrerId: l2Referrer.id,
                  referredId: userId,
                  level: 2,
                  commission: l2Commission,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        }

        updatedUsers = updatedUsers.map(u => u.id === userId ? { ...u, membershipStatus: status } : u);
        onStateUpdate({ users: updatedUsers, referrals: newReferrals });
      }
    } else {
      const updatedUsers = state.users.map(u => u.id === userId ? { ...u, membershipStatus: status } : u);
      onStateUpdate({ users: updatedUsers });
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTicket || !adminReply.trim()) return;
    setIsSendingReply(true);
    const updatedComplaints = state.complaints.map(c => 
      c.id === replyTicket.id ? { 
        ...c, 
        reply: adminReply.trim(), 
        status: 'RESOLVED' as const, 
        updatedAt: new Date().toISOString() 
      } : c
    );
    setTimeout(() => {
      onStateUpdate({ complaints: updatedComplaints });
      setIsSendingReply(false);
      setReplyTicket(null);
      setAdminReply('');
    }, 1000);
  };

  const handleRemoveStaff = (id: string) => {
    if (!window.confirm("Are you sure you want to revoke this staff member's administrative privileges?")) return;
    const updatedUsers = state.users.map(u => u.id === id ? { ...u, role: 'USER' as UserRole } : u);
    onStateUpdate({ users: updatedUsers });
  };

  const promoteToAdmin = (id: string) => {
    if (!isOwner) return;
    const updatedUsers = state.users.map(u => u.id === id ? { ...u, role: 'ADMIN' as UserRole } : u);
    onStateUpdate({ users: updatedUsers });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Reply Modal */}
      {replyTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-malawi-black p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Support Verdict</h2>
                <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Replying to {replyTicket.userName}</p>
              </div>
              <button onClick={() => setReplyTicket(null)}><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User Inquiry:</p>
                 <div className="bg-gray-50 p-4 rounded-2xl text-sm italic border border-gray-100">"{replyTicket.message}"</div>
               </div>
               <form onSubmit={handleSendReply} className="space-y-4">
                 <textarea required rows={4} className="w-full p-4 bg-gray-50 border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-malawi-green transition-all" placeholder="Enter administrative response..." value={adminReply} onChange={(e) => setAdminReply(e.target.value)} />
                 <button type="submit" disabled={isSendingReply} className="w-full bg-malawi-green text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-xl shadow-green-500/10 active:scale-95 transition-all">
                    {isSendingReply ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {isSendingReply ? 'Sending Response...' : 'Authorize & Resolve'}
                 </button>
               </form>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isOwner ? 'bg-malawi-red text-white' : 'bg-malawi-black text-white'} shadow-lg`}>
            {isOwner ? <Crown size={24} /> : <ShieldCheck size={24} />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-malawi-black uppercase tracking-tight">
              {isOwner ? 'Owner Dashboard' : 'Admin Control Center'}
            </h1>
            <p className="text-gray-500 text-sm font-medium">Managing KENNETHPOETRYHEALTH System</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <Search size={18} className="text-gray-400" />
            <input type="text" placeholder="Lookup affiliate..." className="outline-none text-sm w-48" value={queueSearch} onChange={(e) => setQueueSearch(e.target.value)} />
          </div>
          {isOwner && (
            <button className="bg-malawi-black text-white p-3 rounded-xl shadow-md hover:bg-gray-800 transition-all">
              <Settings size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group hover:shadow-xl transition-all">
          <div className="flex justify-between items-start mb-4">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} /></div>
             {isOwner && <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Platform-wide</span>}
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total Members</p>
          <p className="text-3xl font-black text-malawi-black">{totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group hover:shadow-xl transition-all">
          <div className="flex justify-between items-start mb-4">
             <div className="p-2 bg-red-50 text-malawi-red rounded-lg"><Wallet size={20} /></div>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">User Escrow</p>
          <p className="text-3xl font-black text-malawi-red">MWK {totalBalance.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group hover:shadow-xl transition-all">
          <div className="flex justify-between items-start mb-4">
             <div className="p-2 bg-green-50 text-malawi-green rounded-lg"><Activity size={20} /></div>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total Payouts</p>
          <p className="text-3xl font-black text-malawi-green">MWK {totalPayouts.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group hover:shadow-xl transition-all">
          <div className="flex justify-between items-start mb-4">
             <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><AlertTriangle size={20} /></div>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Action Needed</p>
          <p className="text-3xl font-black text-malawi-black">{pendingWithdrawals.length + pendingMemberships.length + pendingComplaints.length}</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 gap-8 overflow-x-auto pb-px">
        {[
          { id: 'withdrawals', label: 'Payouts', count: pendingWithdrawals.length },
          { id: 'memberships', label: 'Memberships', count: pendingMemberships.length },
          { id: 'complaints', label: 'Tickets', count: pendingComplaints.length },
          { id: 'users', label: 'User Directory', count: 0 },
          { id: 'team', label: 'Staff Team', count: staffAdmins.length, restricted: !isOwner }
        ].filter(t => !t.restricted).map((t) => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`pb-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${tab === t.id ? 'border-malawi-red text-malawi-red' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            {t.label} {t.count > 0 && <span className={`px-2 py-0.5 rounded-full text-[9px] ${tab === t.id ? 'bg-malawi-red text-white' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {tab === 'withdrawals' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr><th className="px-6 py-4">User Details</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Method</th><th className="px-6 py-4">ID Verification</th><th className="px-6 py-4 text-center">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4"><p className="font-bold">{w.userName}</p><p className="text-[10px] text-gray-400">@{w.phone}</p></td>
                    <td className="px-6 py-4 font-black text-malawi-red">MWK {w.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 uppercase font-bold text-[10px]">{w.paymentMethod}</td>
                    <td className="px-6 py-4">
                      {w.proofUrl ? (
                        <Link to={`/admin/proof-preview?url=${encodeURIComponent(w.proofUrl)}`} target="_blank" className="text-blue-600 font-bold flex items-center gap-1 hover:underline">
                           <ImageIcon size={14} /> Preview
                        </Link>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 flex gap-2 justify-center">
                      <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} className="bg-malawi-green text-white p-2 rounded-lg hover:bg-green-700 transition-all"><Check size={16} /></button>
                      <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} className="bg-malawi-red text-white p-2 rounded-lg hover:bg-red-700 transition-all"><X size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'team' && isOwner && (
          <div className="p-8 space-y-8 animate-in slide-in-from-right-4">
             <div className="flex justify-between items-center">
               <div>
                 <h3 className="text-xl font-black uppercase tracking-tight">Staff Governance</h3>
                 <p className="text-sm text-gray-500">Manage administrative roles and monitoring</p>
               </div>
               <button className="bg-malawi-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all">
                  <UserPlus size={16} /> Appoint Staff
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-malawi-black text-white p-6 rounded-[2rem] border-b-4 border-malawi-red shadow-xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-malawi-red">
                       <Crown size={24} />
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-tight">{currentUser.fullName}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Platform Owner</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-medium text-gray-400 leading-relaxed italic">
                    "You have absolute system authority. Your actions override all staff decisions."
                  </div>
                </div>

                {staffAdmins.map(admin => (
                  <div key={admin.id} className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all relative group">
                    <button 
                      onClick={() => handleRemoveStaff(admin.id)}
                      className="absolute top-4 right-4 text-gray-300 hover:text-malawi-red transition-colors"
                    >
                      <X size={18} />
                    </button>
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                          <ShieldCheck size={24} />
                       </div>
                       <div>
                          <p className="font-black uppercase tracking-tight">{admin.fullName}</p>
                          <p className="text-[9px] font-bold text-malawi-green uppercase tracking-widest">Active Staff</p>
                       </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Access Key</span>
                          <span className="text-xs font-mono font-bold">STAFF-{admin.id.slice(-4).toUpperCase()}</span>
                       </div>
                       <button className="text-[9px] font-black uppercase text-blue-600 hover:underline">Monitor Logs</button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr><th className="px-6 py-4">Affiliate</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Referrals</th><th className="px-6 py-4">Balance</th><th className="px-6 py-4">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {state.users.filter(u => u.role === 'USER').map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                          {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover rounded-full" /> : <Users size={14} />}
                        </div>
                        <div>
                          <p className="font-bold">{u.fullName}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.membershipStatus === MembershipStatus.ACTIVE ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {u.membershipStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">
                       {state.referrals.filter(r => r.referrerId === u.id).length} Active
                    </td>
                    <td className="px-6 py-4 font-black">MWK {u.balance.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {isOwner && (
                        <button 
                          onClick={() => promoteToAdmin(u.id)}
                          className="bg-gray-100 hover:bg-malawi-black hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          Promote to Staff
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Memberships and Complaints list logic remains similar but with updated styling for Admin access */}
        {tab === 'memberships' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr><th className="px-6 py-4">Affiliate</th><th className="px-6 py-4">Target Tier</th><th className="px-6 py-4">Payment Proof</th><th className="px-6 py-4 text-center">Authorization</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingMemberships.map(m => (
                  <tr key={m.id}>
                    <td className="px-6 py-4"><p className="font-bold">{m.fullName}</p><p className="text-[10px] text-gray-400">@{m.username}</p></td>
                    <td className="px-6 py-4 font-black tracking-tight">{m.membershipTier}</td>
                    <td className="px-6 py-4">
                      {m.membershipProofUrl ? (
                        <Link 
                          to={`/admin/proof-preview?url=${encodeURIComponent(m.membershipProofUrl)}`} 
                          target="_blank" 
                          className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all shadow-sm"
                        >
                          <ExternalLink size={14} /> View Slip
                        </Link>
                      ) : <span className="text-gray-300 italic text-xs">No receipt</span>}
                    </td>
                    <td className="px-6 py-4 flex gap-2 justify-center">
                      <button onClick={() => handleMembershipAction(m.id, MembershipStatus.ACTIVE)} className="bg-malawi-green text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-green-700 active:scale-95 transition-all">Verify & Active</button>
                      <button onClick={() => handleMembershipAction(m.id, MembershipStatus.INACTIVE)} className="bg-malawi-red text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-red-700 active:scale-95 transition-all">Decline</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'complaints' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
             {pendingComplaints.map(c => (
               <div key={c.id} className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-malawi-red/10 text-malawi-red flex items-center justify-center font-bold text-xs">?</div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{c.userName}</span>
                      </div>
                      <span className="text-[9px] text-gray-300 font-bold">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-black text-malawi-black uppercase tracking-tight mb-2 group-hover:text-malawi-red transition-colors">{c.subject}</h4>
                    <p className="text-xs text-gray-500 italic mb-6 leading-relaxed">"{c.message}"</p>
                  </div>
                  <button onClick={() => setReplyTicket(c)} className="w-full bg-malawi-black text-white p-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-all">Prepare Solution</button>
               </div>
             ))}
             {pendingComplaints.length === 0 && <div className="col-span-2 p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No pending inquiries</div>}
          </div>
        )}
      </section>

      {/* Backend Monitoring View for Admins */}
      <div className="bg-malawi-black text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-malawi-green font-black uppercase tracking-[0.2em] text-xs">
                 <ShieldCheck size={16} /> Backend System Health
               </div>
               <h3 className="text-3xl font-black uppercase leading-none">Database & Network Monitoring</h3>
               <p className="text-gray-400 text-sm max-w-md">Real-time oversight of transactions, database integrity, and server uptime for the Malawi network.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
               <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-malawi-green text-xl font-black">99.9%</p>
                  <p className="text-[9px] uppercase font-bold text-gray-500">Uptime</p>
               </div>
               <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                  <p className="text-white text-xl font-black">Active</p>
                  <p className="text-[9px] uppercase font-bold text-gray-500">Node Status</p>
               </div>
            </div>
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-malawi-green/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
      </div>
    </div>
  );
};

export default AdminDashboard;
