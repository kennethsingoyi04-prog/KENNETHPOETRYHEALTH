
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
  ExternalLink
} from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const exportToCSV = (users: any[], filename: string) => {
  if (!users || users.length === 0) return;
  const headers = ["ID", "Full Name", "Username", "Email", "Phone", "WhatsApp", "Referral Code", "Role", "Balance", "Total Earnings", "Tier", "Status", "Created At"];
  const rows = users.map(u => [
    u.id,
    u.fullName,
    u.username,
    u.email,
    u.phone,
    u.whatsapp,
    u.referralCode,
    u.role,
    u.balance,
    u.totalEarnings,
    u.membershipTier,
    u.membershipStatus,
    u.createdAt
  ].map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const [userSearch, setUserSearch] = useState("");
  const [queueSearch, setQueueSearch] = useState("");
  const [tab, setTab] = useState<'withdrawals' | 'memberships' | 'complaints'>('withdrawals');
  const [userSortOrder, setUserSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Reply Modal State
  const [replyTicket, setReplyTicket] = useState<Complaint | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    fullName: '',
    username: '',
    phone: '',
    whatsapp: '',
    role: 'USER' as UserRole
  });

  const totalUsers = state.users.length;
  const totalBalance = state.users.reduce((acc, u) => acc + u.balance, 0);
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

  const filteredUsers = useMemo(() => {
    const searchFiltered = state.users.filter(u => 
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.referralCode.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase())
    );
    return [...searchFiltered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return userSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [state.users, userSearch, userSortOrder]);

  const filteredWithdrawals = useMemo(() => {
    return pendingWithdrawals.filter(w => 
      w.userName.toLowerCase().includes(queueSearch.toLowerCase()) ||
      w.phone.includes(queueSearch) ||
      w.id.includes(queueSearch)
    );
  }, [pendingWithdrawals, queueSearch]);

  const filteredMemberships = useMemo(() => {
    return pendingMemberships.filter(m => 
      m.fullName.toLowerCase().includes(queueSearch.toLowerCase()) ||
      m.username.toLowerCase().includes(queueSearch.toLowerCase())
    );
  }, [pendingMemberships, queueSearch]);

  const filteredComplaints = useMemo(() => {
    return pendingComplaints.filter(c => 
      c.userName.toLowerCase().includes(queueSearch.toLowerCase()) ||
      c.subject.toLowerCase().includes(queueSearch.toLowerCase()) ||
      c.id.includes(queueSearch)
    );
  }, [pendingComplaints, queueSearch]);

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

        // 1. Direct Referrer (L1)
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

            // 2. Indirect Referrer (L2) - 5% Fixed
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
    alert(`Membership activation ${status === MembershipStatus.ACTIVE ? 'approved' : 'rejected'}.`);
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

  return (
    <div className="space-y-8 pb-12">
      {replyTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-malawi-black p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black uppercase">Resolve Support Ticket</h2>
                <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Replying to {replyTicket.userName}</p>
              </div>
              <button onClick={() => setReplyTicket(null)}><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User Message:</p>
                 <div className="bg-gray-50 p-4 rounded-2xl text-sm italic border border-gray-100">"{replyTicket.message}"</div>
               </div>
               <form onSubmit={handleSendReply} className="space-y-4">
                 <textarea required rows={4} className="w-full p-4 bg-gray-50 border rounded-2xl text-sm" placeholder="Type your answer here..." value={adminReply} onChange={(e) => setAdminReply(e.target.value)} />
                 <button type="submit" disabled={isSendingReply} className="w-full bg-malawi-green text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2">
                    {isSendingReply ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {isSendingReply ? 'Sending Answer...' : 'Send Response & Resolve'}
                 </button>
               </form>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-malawi-black uppercase tracking-tight">Admin Control Center</h1>
          <p className="text-gray-500">Security & Financial Oversight</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <Search size={18} className="text-gray-400" />
            <input type="text" placeholder="Search affiliates..." className="outline-none text-sm w-48" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total Users</p>
            <p className="text-2xl font-black">{totalUsers}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total Balance</p>
            <p className="text-2xl font-black text-malawi-red">MWK {totalBalance.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Lifetime Payouts</p>
            <p className="text-2xl font-black text-malawi-green">MWK {totalPayouts.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Pending Actions</p>
            <p className="text-2xl font-black">{pendingWithdrawals.length + pendingMemberships.length + pendingComplaints.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col min-h-[300px]">
           <div className="flex items-center gap-2 mb-4">
             <PieIcon size={18} className="text-malawi-green" />
             <h3 className="text-xs font-black uppercase tracking-widest text-malawi-black">Payout Methods</h3>
           </div>
           <div className="flex-grow w-full h-[200px]">
             {withdrawalMethodData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={withdrawalMethodData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                     {withdrawalMethodData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[entry.name as PaymentMethod] || '#8884d8'} />
                     ))}
                   </Pie>
                   <Tooltip />
                   <Legend verticalAlign="bottom" align="center" iconType="circle" />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                 <Activity size={32} strokeWidth={1} />
                 <p className="text-[10px] font-bold uppercase tracking-widest">No payout data</p>
               </div>
             )}
           </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 gap-8 overflow-x-auto">
        {['withdrawals', 'memberships', 'complaints'].map((t) => (
          <button 
            key={t}
            onClick={() => setTab(t as any)}
            className={`pb-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 whitespace-nowrap ${tab === t ? 'border-malawi-red text-malawi-red' : 'border-transparent text-gray-400'}`}
          >
            {t} ({t === 'withdrawals' ? pendingWithdrawals.length : t === 'memberships' ? pendingMemberships.length : pendingComplaints.length})
          </button>
        ))}
      </div>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'withdrawals' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Method</th><th className="px-6 py-4">Proof</th><th className="px-6 py-4 text-center">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredWithdrawals.map(w => (
                  <tr key={w.id}>
                    <td className="px-6 py-4"><p className="font-bold">{w.userName}</p><p className="text-[10px] text-gray-400">ID: {w.userId}</p></td>
                    <td className="px-6 py-4 font-black text-malawi-red">MWK {w.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 uppercase font-bold text-[10px]">{w.paymentMethod}</td>
                    <td className="px-6 py-4">{w.proofUrl ? <Link to={`/admin/proof-preview?url=${encodeURIComponent(w.proofUrl)}`} target="_blank" className="text-blue-600 font-bold underline">View</Link> : '-'}</td>
                    <td className="px-6 py-4 flex gap-2 justify-center">
                      <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} className="bg-malawi-green text-white p-2 rounded-lg"><Check size={16} /></button>
                      <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} className="bg-malawi-red text-white p-2 rounded-lg"><X size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'memberships' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr><th className="px-6 py-4">Affiliate</th><th className="px-6 py-4">Tier</th><th className="px-6 py-4">Payment Proof</th><th className="px-6 py-4 text-center">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredMemberships.map(m => (
                  <tr key={m.id}>
                    <td className="px-6 py-4"><p className="font-bold">{m.fullName}</p><p className="text-[10px] text-gray-400">@{m.username}</p></td>
                    <td className="px-6 py-4 font-black">{m.membershipTier}</td>
                    <td className="px-6 py-4">
                      {m.membershipProofUrl ? (
                        <Link 
                          to={`/admin/proof-preview?url=${encodeURIComponent(m.membershipProofUrl)}`} 
                          target="_blank" 
                          className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all shadow-sm"
                        >
                          <ExternalLink size={14} />
                          View Receipt
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-2 bg-gray-50 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-gray-200 cursor-not-allowed">
                          No Receipt
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 flex gap-2 justify-center">
                      <button onClick={() => handleMembershipAction(m.id, MembershipStatus.ACTIVE)} className="bg-malawi-green text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-green-700 active:scale-95 transition-all"><Check size={14} className="inline mr-1" /> Approve</button>
                      <button onClick={() => handleMembershipAction(m.id, MembershipStatus.INACTIVE)} className="bg-malawi-red text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-red-700 active:scale-95 transition-all"><X size={14} className="inline mr-1" /> Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'complaints' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Subject</th><th className="px-6 py-4">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredComplaints.map(c => (
                  <tr key={c.id}>
                    <td className="px-6 py-4"><p className="font-bold">{c.userName}</p></td>
                    <td className="px-6 py-4">{c.subject}</td>
                    <td className="px-6 py-4"><button onClick={() => setReplyTicket(c)} className="bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase">Answer</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
