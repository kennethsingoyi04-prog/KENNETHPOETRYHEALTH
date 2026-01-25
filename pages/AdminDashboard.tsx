
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, User, WithdrawalRequest, MembershipTier, Complaint } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import Logo from '../components/Logo';
import { checkCloudHealth, syncAppStateToCloud, uploadImage } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Search, 
  X, Wallet, Users, Zap, Loader2, Monitor, MessageSquare, Check, XCircle, Gavel, Ban, ShieldAlert, AlertTriangle, UserCheck
} from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const [tab, setTab] = useState<'withdrawals' | 'users' | 'complaints' | 'settings'>('withdrawals');
  const [isChecking, setIsChecking] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  
  // Discipline & Support State
  const [disciplineReason, setDisciplineReason] = useState("");
  const [replyText, setReplyText] = useState("");
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);

  const handleManualSync = async () => {
    setIsChecking(true);
    try { await syncAppStateToCloud(state); alert("Backup successful."); } 
    catch (e: any) { alert(e.message); } 
    finally { setIsChecking(false); }
  };

  const handleResolveComplaint = () => {
    if (!activeComplaint || !replyText.trim()) return;
    const updatedComplaints = state.complaints.map(c => 
      c.id === activeComplaint.id ? { ...c, status: 'RESOLVED', reply: replyText, updatedAt: new Date().toISOString() } as Complaint : c
    );
    onStateUpdate({ complaints: updatedComplaints });
    setActiveComplaint(null);
    setReplyText("");
    alert("Ticket Resolved.");
  };

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
      u.username.toLowerCase().includes(searchText.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.users, searchText]);

  const getUserReferralNetwork = (userId: string) => {
    const l1 = state.users.filter(u => u.referredBy === userId);
    return { l1, l1Count: l1.length };
  };

  return (
    <div className="max-w-7xl mx-auto pb-32 animate-in fade-in duration-700">
      {/* USER INSPECTOR - WITH FULL NAMES */}
      {inspectingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-malawi-black/95 backdrop-blur-xl">
           <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="bg-malawi-black p-10 text-white flex items-center justify-between rounded-t-[4rem]">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-malawi-green rounded-2xl flex items-center justify-center text-2xl font-black">{inspectingUser.fullName.charAt(0)}</div>
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tight">{inspectingUser.fullName}</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-malawi-green opacity-80">@{inspectingUser.username}</p>
                    </div>
                 </div>
                 <button onClick={() => setInspectingUser(null)} className="p-4 hover:bg-white/10 rounded-full transition-all"><X size={32}/></button>
              </div>
              <div className="p-10 overflow-y-auto space-y-10 flex-grow">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-6 rounded-3xl border text-center">
                       <p className="text-[10px] font-black uppercase text-gray-400">Balance</p>
                       <p className="text-2xl font-black text-malawi-green">MWK {inspectingUser.balance.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-3xl border text-center">
                       <p className="text-[10px] font-black uppercase text-gray-400">Direct Network</p>
                       <p className="text-2xl font-black">{getUserReferralNetwork(inspectingUser.id).l1Count}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-3xl border text-center">
                       <p className="text-[10px] font-black uppercase text-gray-400">Tier</p>
                       <p className="text-sm font-black uppercase">{inspectingUser.membershipTier}</p>
                    </div>
                 </div>

                 <div className="bg-gray-50 p-8 rounded-[3rem] border space-y-6">
                    <h3 className="text-sm font-black uppercase text-malawi-green flex items-center gap-2">
                       <Users size={18} /> Network Directory (Full Legal Names)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {getUserReferralNetwork(inspectingUser.id).l1.map(u => (
                          <div key={u.id} className="p-4 bg-white rounded-2xl border flex flex-col gap-1 shadow-sm">
                             <span className="font-black text-xs uppercase tracking-tight">{u.fullName}</span>
                             <div className="flex items-center justify-between mt-1">
                                <span className="text-[8px] bg-gray-100 px-2 py-0.5 rounded font-black uppercase text-gray-500">{u.membershipTier}</span>
                                <span className="text-[8px] font-bold text-gray-300">@{u.username}</span>
                             </div>
                          </div>
                       ))}
                       {getUserReferralNetwork(inspectingUser.id).l1Count === 0 && <p className="text-gray-400 italic text-xs uppercase font-bold py-10 text-center col-span-full">This user has not invited anyone yet.</p>}
                    </div>
                 </div>
              </div>
              <div className="p-8 border-t bg-gray-50 flex justify-center">
                 <button onClick={() => setInspectingUser(null)} className="px-16 py-5 bg-malawi-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Exit Inspector</button>
              </div>
           </div>
        </div>
      )}

      {/* COMPLAINT MODAL */}
      {activeComplaint && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-malawi-black/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 space-y-6 animate-in zoom-in-95">
              <div className="flex justify-between items-start">
                 <h2 className="text-2xl font-black uppercase tracking-tight">{activeComplaint.subject}</h2>
                 <button onClick={() => setActiveComplaint(null)} className="text-gray-300 hover:text-malawi-red"><X size={24}/></button>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl border italic text-sm text-gray-600">"{activeComplaint.message}"</div>
              {activeComplaint.imageUrl && (
                 <a href={activeComplaint.imageUrl} target="_blank" className="block w-full h-32 rounded-2xl overflow-hidden border">
                    <img src={activeComplaint.imageUrl} className="w-full h-full object-cover" />
                 </a>
              )}
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Official Reply</label>
                 <textarea 
                   value={replyText} onChange={e => setReplyText(e.target.value)} 
                   placeholder="Reply to affiliate..." 
                   className="w-full p-5 bg-gray-50 border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-malawi-black h-40 resize-none"
                 />
              </div>
              <div className="flex gap-3">
                 <button onClick={handleResolveComplaint} className="flex-grow py-5 bg-malawi-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Send & Resolve</button>
                 <button onClick={() => setActiveComplaint(null)} className="px-10 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-xs tracking-widest">Cancel</button>
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
             <input type="text" placeholder="Search accounts..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64 shadow-sm outline-none focus:ring-2 focus:ring-malawi-black" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] shadow-sm active:scale-95 transition-all" title="Backup All Data"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'complaints', label: 'Support tickets', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length },
          { id: 'settings', label: 'System health', icon: Monitor }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border transition-all relative ${tab === t.id ? 'bg-malawi-black text-white shadow-xl' : 'bg-white text-gray-400'}`}>
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
                    <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">MWK Amount</th><th className="px-10 py-6">Wallet Details</th><th className="px-10 py-6 text-center">Status</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {state.withdrawals.map(w => (
                       <tr key={w.id} className="hover:bg-gray-50/50">
                          <td className="px-10 py-8"><p className="font-black uppercase text-xs">{w.userName}</p><p className="text-[9px] text-gray-400">ID: {w.id}</p></td>
                          <td className="px-10 py-8 font-black text-malawi-green">K{w.amount.toLocaleString()}</td>
                          <td className="px-10 py-8"><p className="text-[10px] font-black uppercase">{w.paymentMethod}</p><p className="text-xs font-bold text-gray-600">{w.phone}</p></td>
                          <td className="px-10 py-8 text-center"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${w.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{w.status}</span></td>
                       </tr>
                    ))}
                    {state.withdrawals.length === 0 && <tr><td colSpan={4} className="p-20 text-center uppercase italic font-black text-gray-300">No withdrawal records found</td></tr>}
                 </tbody>
              </table>
           </div>
        )}

        {tab === 'users' && (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                    <tr><th className="px-10 py-6">Affiliate Full Name</th><th className="px-10 py-6">Current Tier</th><th className="px-10 py-6">MWK Balance</th><th className="px-10 py-6 text-center">Control</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {filteredUsers.map(u => (
                       <tr key={u.id} className="hover:bg-gray-50/50">
                          <td className="px-10 py-8"><p className="font-black uppercase tracking-tight">{u.fullName}</p><p className="text-[10px] text-gray-400">@{u.username}</p></td>
                          <td className="px-10 py-8"><span className={`px-3 py-1 rounded text-[9px] font-black uppercase ${u.membershipStatus === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>{u.membershipTier}</span></td>
                          <td className="px-10 py-8 font-black text-malawi-green">K{u.balance.toLocaleString()}</td>
                          <td className="px-10 py-8 text-center"><button onClick={() => setInspectingUser(u)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95">Inspect Account</button></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}

        {tab === 'complaints' && (
           <div className="divide-y overflow-y-auto max-h-[800px]">
              {state.complaints.length === 0 ? (
                 <div className="p-20 text-center text-gray-300 italic uppercase font-black">No support tickets found</div>
              ) : (
                 state.complaints.sort((a,b) => a.status === 'PENDING' ? -1 : 1).map(c => (
                    <div key={c.id} className="p-8 flex items-center justify-between hover:bg-gray-50">
                       <div className="space-y-1">
                          <div className="flex items-center gap-3">
                             <h4 className="font-black text-sm uppercase tracking-tight">{c.subject}</h4>
                             <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${c.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{c.status}</span>
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Affiliate: {c.userName} ({new Date(c.createdAt).toLocaleDateString()})</p>
                          <p className="text-xs text-gray-500 line-clamp-1 italic">"{c.message}"</p>
                       </div>
                       {c.status === 'PENDING' && (
                          <button onClick={() => setActiveComplaint(c)} className="px-8 py-3 bg-malawi-red text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all">Resolve Now</button>
                       )}
                    </div>
                 ))
              )}
           </div>
        )}

        {tab === 'settings' && (
          <div className="p-20 text-center space-y-6">
             <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-malawi-green shadow-inner">
                <ShieldCheck size={48} />
             </div>
             <p className="uppercase italic font-black text-gray-300 text-sm">System integrity: Healthy • Cloud Sync: Active</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
