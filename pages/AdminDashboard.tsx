
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppState, WithdrawalStatus, WithdrawalRequest, PaymentMethod, User, UserRole, MembershipStatus, Complaint } from '../types';
import { 
  Users, 
  Wallet, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Search,
  TrendingUp,
  PieChart as PieChartIcon,
  Calendar,
  X,
  Maximize2,
  Clock,
  LayoutGrid,
  ZoomIn,
  Minimize2,
  PieChart as PieIcon,
  MessageSquare,
  Save,
  Check,
  Activity,
  FileSpreadsheet,
  Filter,
  ArrowUpRight,
  Edit2,
  Image as ImageIcon,
  ShieldCheck,
  Smartphone,
  AtSign,
  User as UserIcon,
  Eye,
  CreditCard,
  UserPlus,
  MessageSquareWarning,
  Send,
  Loader2,
  ArrowUpDown
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

  // --- Search & Filter Logic ---
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
    const updatedUsers = state.users.map(u => 
      u.id === userId ? { ...u, membershipStatus: status } : u
    );
    onStateUpdate({ users: updatedUsers });
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
      {/* Reply Ticket Modal */}
      {replyTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-malawi-black p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black uppercase">Resolve Support Ticket</h2>
                <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Replying to {replyTicket.userName}</p>
              </div>
              <button onClick={() => setReplyTicket(null)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User Message:</p>
                 <div className="bg-gray-50 p-4 rounded-2xl text-sm italic border border-gray-100">
                   "{replyTicket.message}"
                 </div>
               </div>
               <form onSubmit={handleSendReply} className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Your Response</label>
                   <textarea 
                     rows={4} 
                     required
                     className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green text-sm" 
                     placeholder="Type your answer here..."
                     value={adminReply}
                     onChange={(e) => setAdminReply(e.target.value)}
                   />
                 </div>
                 <button type="submit" disabled={isSendingReply} className="w-full bg-malawi-green text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50">
                    {isSendingReply ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {isSendingReply ? 'Sending Answer...' : 'Send Response & Resolve'}
                 </button>
               </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="bg-malawi-black p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-black uppercase">Edit Affiliate</h2>
              <button onClick={() => setEditingUser(null)}><X size={20} /></button>
            </div>
            <form className="p-8 space-y-6">
               <input type="text" className="w-full p-4 bg-gray-50 border rounded-xl" value={editUserForm.fullName} onChange={e => setEditUserForm({...editUserForm, fullName: e.target.value})} />
               <button type="button" className="w-full bg-malawi-black text-white p-4 rounded-xl font-bold uppercase">Save Changes (Simulated)</button>
            </form>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-8 overflow-x-auto">
        <button 
          onClick={() => setTab('withdrawals')}
          className={`pb-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 whitespace-nowrap ${tab === 'withdrawals' ? 'border-malawi-red text-malawi-red' : 'border-transparent text-gray-400'}`}
        >
          Withdrawals ({pendingWithdrawals.length})
        </button>
        <button 
          onClick={() => setTab('memberships')}
          className={`pb-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 whitespace-nowrap ${tab === 'memberships' ? 'border-malawi-green text-malawi-green' : 'border-transparent text-gray-400'}`}
        >
          Activations ({pendingMemberships.length})
        </button>
        <button 
          onClick={() => setTab('complaints')}
          className={`pb-4 font-black uppercase tracking-widest text-xs transition-all border-b-2 whitespace-nowrap ${tab === 'complaints' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400'}`}
        >
          Tickets ({pendingComplaints.length})
        </button>
      </div>

      {/* Tables Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-lg text-gray-800 uppercase tracking-tighter">
            {tab === 'withdrawals' ? 'Pending Payouts' : tab === 'memberships' ? 'Activation Requests' : 'Support Tickets'}
          </h3>
          <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center gap-2">
             <Filter size={14} className="text-gray-400" />
             <input type="text" placeholder="Filter queue..." className="outline-none text-xs w-40" value={queueSearch} onChange={(e) => setQueueSearch(e.target.value)} />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {tab === 'withdrawals' && (
            filteredWithdrawals.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No pending withdrawals.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Proof</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredWithdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4"><p className="font-bold">{w.userName}</p><p className="text-[10px] text-gray-400">ID: {w.userId}</p></td>
                      <td className="px-6 py-4 font-black text-malawi-red">MWK {w.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 uppercase font-bold text-[10px]">{w.paymentMethod}</td>
                      <td className="px-6 py-4">
                        {w.proofUrl ? (
                          <Link to={`/admin/proof-preview?url=${encodeURIComponent(w.proofUrl)}`} target="_blank" className="text-blue-600 font-bold underline">View Proof</Link>
                        ) : <span className="text-gray-300 italic">No proof</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} className="bg-malawi-green text-white p-2 rounded-lg"><Check size={16} /></button>
                          <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} className="bg-malawi-red text-white p-2 rounded-lg"><X size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === 'memberships' && (
            filteredMemberships.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No pending activations.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-6 py-4">Affiliate</th>
                    <th className="px-6 py-4">Requested Tier</th>
                    <th className="px-6 py-4">Proof of Payment</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredMemberships.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4"><p className="font-bold">{m.fullName}</p><p className="text-[10px] text-gray-400">@{m.username}</p></td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-black uppercase">{m.membershipTier}</span></td>
                      <td className="px-6 py-4">
                        {m.membershipProofUrl ? (
                          <Link to={`/admin/proof-preview?url=${encodeURIComponent(m.membershipProofUrl)}`} target="_blank" className="flex items-center gap-2 text-blue-600 font-bold underline">
                            <ImageIcon size={14} /> View Receipt
                          </Link>
                        ) : <span className="text-gray-300 italic">No receipt</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => handleMembershipAction(m.id, MembershipStatus.ACTIVE)} className="bg-malawi-green text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"><CheckCircle size={14} /> Approve</button>
                          <button onClick={() => handleMembershipAction(m.id, MembershipStatus.INACTIVE)} className="bg-malawi-red text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"><XCircle size={14} /> Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === 'complaints' && (
            filteredComplaints.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No pending support tickets.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredComplaints.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4"><p className="font-bold">{c.userName}</p><p className="text-[10px] text-gray-400">ID: {c.userId}</p></td>
                      <td className="px-6 py-4 font-medium">{c.subject}</td>
                      <td className="px-6 py-4 text-[10px] text-gray-400 uppercase font-black">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                         <button 
                           onClick={() => setReplyTicket(c)}
                           className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 mx-auto transition-all active:scale-95 shadow-sm"
                         >
                            <MessageSquare size={14} /> Answer
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </section>

      {/* Affiliate Directory */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="font-bold text-lg text-gray-800 uppercase tracking-tighter">Affiliate Directory</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setUserSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              className="bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs font-bold hover:border-malawi-black flex items-center gap-2 transition-colors"
            >
              <ArrowUpDown size={14} className="text-gray-400" />
              {userSortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
            </button>
            <button onClick={() => exportToCSV(state.users, "User_List")} className="bg-malawi-black text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-800 flex items-center gap-2">
              <FileSpreadsheet size={16} /> Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4">Affiliate Info</th>
                <th className="px-6 py-4">Tier</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <p className="font-bold">{u.fullName}</p>
                    <p className="text-[10px] text-gray-400">@{u.username} • {u.referralCode}</p>
                  </td>
                  <td className="px-6 py-4"><span className="text-[10px] font-black uppercase text-gray-500">{u.membershipTier}</span></td>
                  <td className="px-6 py-4 font-bold text-malawi-green">MWK {u.balance.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      u.membershipStatus === MembershipStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.membershipStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-black uppercase text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => { setEditingUser(u); setEditUserForm({ fullName: u.fullName, username: u.username, phone: u.phone, whatsapp: u.whatsapp, role: u.role }); }} className="p-2 bg-gray-50 text-gray-400 hover:text-malawi-black rounded-lg">
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
