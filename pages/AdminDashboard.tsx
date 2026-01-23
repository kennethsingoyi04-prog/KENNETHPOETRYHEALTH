
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AppState, WithdrawalStatus, WithdrawalRequest, PaymentMethod, User, UserRole, MembershipStatus, Complaint, Referral } from '../types';
import { MALAWI_COLORS, MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth } from '../dataService';
import { 
  Users, Wallet, CheckCircle, XCircle, Search, PieChart as PieIcon, MessageSquare, Check, Activity, FileSpreadsheet,
  Filter, Edit2, Image as ImageIcon, ShieldCheck, Send, Loader2, ArrowUpDown, X, ExternalLink, Crown, UserPlus,
  Settings, AlertTriangle, Calendar, RotateCcw, DollarSign, Cloud, CloudOff
} from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const currentUser = state.currentUser!;
  const isOwner = currentUser.isOwner === true;
  const [tab, setTab] = useState<'withdrawals' | 'memberships' | 'complaints' | 'team' | 'users'>('withdrawals');
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'online' | 'error'>('checking');
  
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

  useEffect(() => {
    const check = async () => {
      const ok = await checkCloudHealth();
      setCloudStatus(ok ? 'online' : 'error');
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const resetFilters = () => {
    setSearchText(""); setStartDate(""); setEndDate(""); setStatusFilter("ALL"); setMinAmount(""); setMaxAmount("");
  };

  const [replyTicket, setReplyTicket] = useState<Complaint | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const staffAdmins = state.users.filter(u => u.role === 'ADMIN' && !u.isOwner);

  const dateInRange = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    const date = new Date(dateStr).getTime();
    const start = startDate ? new Date(startDate).getTime() : -Infinity;
    const end = endDate ? new Date(endDate).getTime() : Infinity;
    return date >= start && date <= end;
  };

  const filteredWithdrawals = useMemo(() => {
    return state.withdrawals.filter(w => {
      const matchesSearch = w.userName.toLowerCase().includes(searchText.toLowerCase()) || w.phone.includes(searchText);
      const matchesStatus = statusFilter === "ALL" || w.status === statusFilter;
      const matchesMin = minAmount === "" || w.amount >= parseFloat(minAmount);
      const matchesMax = maxAmount === "" || w.amount <= parseFloat(maxAmount);
      return matchesSearch && matchesStatus && matchesMin && matchesMax && dateInRange(w.createdAt);
    });
  }, [state.withdrawals, searchText, statusFilter, minAmount, maxAmount, startDate, endDate]);

  const filteredMemberships = useMemo(() => {
    return state.users.filter(u => {
      const isPending = u.membershipStatus === MembershipStatus.PENDING;
      const matchesSearch = u.fullName.toLowerCase().includes(searchText.toLowerCase()) || u.username.toLowerCase().includes(searchText.toLowerCase());
      return isPending && matchesSearch && dateInRange(u.createdAt);
    });
  }, [state.users, searchText, startDate, endDate]);

  const filteredComplaints = useMemo(() => {
    return state.complaints.filter(c => {
      const matchesSearch = c.userName.toLowerCase().includes(searchText.toLowerCase()) || c.subject.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchesSearch && matchesStatus && dateInRange(c.createdAt);
    });
  }, [state.complaints, searchText, statusFilter, startDate, endDate]);

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => {
      if (u.role !== 'USER') return false;
      const matchesSearch = u.fullName.toLowerCase().includes(searchText.toLowerCase()) || u.username.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || u.membershipStatus === statusFilter;
      return matchesSearch && matchesStatus && dateInRange(u.createdAt);
    });
  }, [state.users, searchText, statusFilter, startDate, endDate]);

  const filteredStaff = useMemo(() => staffAdmins.filter(u => u.fullName.toLowerCase().includes(searchText.toLowerCase())), [staffAdmins, searchText]);

  const handleWithdrawalAction = (id: string, status: WithdrawalStatus) => {
    const updatedWithdrawals = state.withdrawals.map(w => w.id === id ? { ...w, status } : w);
    onStateUpdate({ withdrawals: updatedWithdrawals });
  };

  const handleMembershipAction = (userId: string, status: MembershipStatus) => {
    if (status === MembershipStatus.ACTIVE) {
      const userToActivate = state.users.find(u => u.id === userId);
      if (userToActivate) {
        const tierPrice = MEMBERSHIP_TIERS.find(t => t.tier === userToActivate.membershipTier)?.price || 0;
        let updatedUsers = [...state.users];
        let newReferrals = [...state.referrals];
        if (userToActivate.referredBy) {
          const l1Referrer = updatedUsers.find(u => u.id === userToActivate.referredBy);
          if (l1Referrer) {
            const l1TierConfig = MEMBERSHIP_TIERS.find(t => t.tier === l1Referrer.membershipTier);
            const l1Rate = l1TierConfig ? l1TierConfig.directCommission : 30;
            const l1Commission = (tierPrice * l1Rate) / 100;
            updatedUsers = updatedUsers.map(u => u.id === l1Referrer.id ? { ...u, balance: u.balance + l1Commission, totalEarnings: u.totalEarnings + l1Commission } : u);
            newReferrals.push({ id: `ref-${Date.now()}-L1`, referrerId: l1Referrer.id, referredId: userId, level: 1, commission: l1Commission, timestamp: new Date().toISOString() });
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
    const updatedComplaints = state.complaints.map(c => c.id === replyTicket.id ? { ...c, reply: adminReply.trim(), status: 'RESOLVED' as const, updatedAt: new Date().toISOString() } : c);
    setTimeout(() => { onStateUpdate({ complaints: updatedComplaints }); setIsSendingReply(false); setReplyTicket(null); setAdminReply(''); }, 1000);
  };

  return (
    <div className="space-y-6 pb-12">
      {replyTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-malawi-black p-6 text-white flex justify-between items-center">
              <div><h2 className="text-xl font-black uppercase">Support Verdict</h2><p className="text-[10px] text-gray-400">Replying to {replyTicket.userName}</p></div>
              <button onClick={() => setReplyTicket(null)}><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="bg-gray-50 p-4 rounded-2xl text-sm italic border border-gray-100">"{replyTicket.message}"</div>
               <form onSubmit={handleSendReply} className="space-y-4">
                 <textarea required rows={4} className="w-full p-4 bg-gray-50 border rounded-2xl outline-none" placeholder="Enter response..." value={adminReply} onChange={(e) => setAdminReply(e.target.value)} />
                 <button type="submit" className="w-full bg-malawi-green text-white p-4 rounded-2xl font-black uppercase shadow-xl active:scale-95 transition-all">Authorize & Resolve</button>
               </form>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl bg-malawi-black text-white shadow-lg`}><ShieldCheck size={24} /></div>
          <div>
            <h1 className="text-2xl font-black text-malawi-black uppercase tracking-tight">Admin Control Center</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                cloudStatus === 'online' ? 'bg-green-50 text-green-600' : cloudStatus === 'error' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
              }`}>
                {cloudStatus === 'online' ? <Cloud size={12} /> : cloudStatus === 'error' ? <CloudOff size={12} /> : <Loader2 size={12} className="animate-spin" />}
                {cloudStatus === 'online' ? 'Sync Active' : cloudStatus === 'error' ? 'Database Error' : 'Checking...'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {cloudStatus === 'error' && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-700 animate-in shake">
           <AlertTriangle className="shrink-0 mt-0.5" size={18} />
           <div>
             <p className="text-xs font-black uppercase">Database Table Missing</p>
             <p className="text-[10px] opacity-80 mt-1">The 'system_data' table could not be found. Please check Step 1 of the instructions.</p>
           </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-malawi-black font-black uppercase tracking-widest text-xs"><Filter size={16} className="text-malawi-red" /> System Filters</div>
          <button onClick={resetFilters} className="text-[10px] font-black uppercase tracking-widest text-gray-400">Clear All</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-3 bg-gray-50 border rounded-xl text-xs" value={searchText} onChange={(e) => setSearchText(e.target.value)} /></div>
          <select className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-[10px] font-black uppercase" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            {tab === 'withdrawals' && <><option value={WithdrawalStatus.PENDING}>Pending</option><option value={WithdrawalStatus.APPROVED}>Approved</option></>}
          </select>
        </div>
      </div>

      <div className="flex border-b border-gray-200 gap-8 overflow-x-auto pb-px">
        {['withdrawals', 'memberships', 'complaints', 'users', 'team'].map((id) => (
          <button key={id} onClick={() => setTab(id as any)} className={`pb-4 font-black uppercase tracking-widest text-xs border-b-2 ${tab === id ? 'border-malawi-red text-malawi-red' : 'border-transparent text-gray-400'}`}>{id}</button>
        ))}
      </div>

      <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {tab === 'withdrawals' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]"><tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-center">Actions</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filteredWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold">{w.userName}<p className="text-[10px] text-gray-400">{w.phone}</p></td>
                    <td className="px-6 py-4 font-black text-malawi-red">MWK {w.amount.toLocaleString()}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-[10px] font-black rounded-full">{w.status}</span></td>
                    <td className="px-6 py-4 flex gap-2 justify-center">
                      {w.status === WithdrawalStatus.PENDING && (
                        <><button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} className="bg-malawi-green text-white p-2 rounded-lg"><Check size={16} /></button><button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} className="bg-malawi-red text-white p-2 rounded-lg"><X size={16} /></button></>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'memberships' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-gray-50">
                {filteredMemberships.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4"><p className="font-bold">{m.fullName}</p><p className="text-[10px] text-gray-400">@{m.username}</p></td>
                    <td className="px-6 py-4 font-black uppercase">{m.membershipTier}</td>
                    <td className="px-6 py-4 flex gap-2 justify-center"><button onClick={() => handleMembershipAction(m.id, MembershipStatus.ACTIVE)} className="bg-malawi-green text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Approve</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
