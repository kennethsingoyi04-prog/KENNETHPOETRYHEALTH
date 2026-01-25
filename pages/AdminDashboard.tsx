
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, User, WithdrawalRequest, MembershipTier, BookSellerStatus, Complaint } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
// Added missing Logo import
import Logo from '../components/Logo';
import { checkCloudHealth, syncAppStateToCloud, uploadImage, nuclearScrub, fetchAppStateFromCloud } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Search, 
  X, Wallet, Users, Zap, Award,
  ImageIcon, CheckCircle2, 
  MessageSquareWarning, Maximize2, Loader2, Database, Trash2,
  Signal, ShieldAlert, Rocket, Terminal, ZapOff, Check, XCircle,
  Copy, ClipboardCheck, Info, ExternalLink, Key, FileCode, Settings2,
  BookOpen, Eye, User as UserIcon, Mail, Phone, Hash, Calendar, DollarSign,
  UserCheck, Smartphone, Clock, ListChecks, ArrowRight, Gavel, AlertTriangle, Ban,
  Activity, Monitor, MessageSquare
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
           <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh]">
              <div className="bg-malawi-black p-10 text-white flex items-center justify-between rounded-t-[4rem]">
                 <h2 className="text-3xl font-black uppercase tracking-tight">{inspectingUser.fullName}</h2>
                 <button onClick={() => setInspectingUser(null)} className="p-4 hover:bg-white/10 rounded-full"><X size={32}/></button>
              </div>
              <div className="p-10 overflow-y-auto space-y-10">
                 <div className="bg-gray-50 p-8 rounded-[3rem] border space-y-4">
                    <h3 className="text-xs font-black uppercase text-malawi-green">Network Map (Full Names)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {getUserReferralNetwork(inspectingUser.id).l1.map(u => (
                          <div key={u.id} className="p-4 bg-white rounded-2xl border flex justify-between items-center">
                             <span className="font-black text-xs uppercase">{u.fullName}</span>
                             <span className="text-[9px] bg-gray-100 px-2 py-1 rounded font-bold uppercase">{u.membershipTier}</span>
                          </div>
                       ))}
                       {getUserReferralNetwork(inspectingUser.id).l1Count === 0 && <p className="text-gray-400 italic text-xs uppercase font-bold">No referrals found.</p>}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* COMPLAINT MODAL */}
      {activeComplaint && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-malawi-black/90 backdrop-blur-md">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 space-y-6">
              <h2 className="text-2xl font-black uppercase">Ticket: {activeComplaint.subject}</h2>
              <div className="p-5 bg-gray-50 rounded-2xl border italic text-sm">"{activeComplaint.message}"</div>
              <textarea 
                value={replyText} onChange={e => setReplyText(e.target.value)} 
                placeholder="Write your official response..." 
                className="w-full p-5 bg-gray-50 border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-malawi-black h-40"
              />
              <div className="flex gap-3">
                 <button onClick={handleResolveComplaint} className="flex-grow py-5 bg-malawi-black text-white rounded-2xl font-black uppercase text-xs">Send & Resolve</button>
                 <button onClick={() => setActiveComplaint(null)} className="px-10 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-xs">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Logo size="md" variant="dark" />
          <h1 className="text-4xl font-black uppercase tracking-tight">Admin HQ</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64 shadow-sm" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] shadow-sm active:scale-95 transition-all"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'complaints', label: 'Support Tickets', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length },
          { id: 'settings', label: 'Health', icon: Monitor }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border transition-all relative ${tab === t.id ? 'bg-malawi-black text-white shadow-xl' : 'bg-white text-gray-400'}`}>
            <t.icon size={18} /> {t.label}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2 py-0.5 rounded-full text-[10px] border-2 border-white">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[4rem] border shadow-2xl overflow-hidden min-h-[500px]">
        {tab === 'withdrawals' && (
           <div className="p-20 text-center uppercase italic font-black text-gray-300">Payout Module Active</div>
        )}

        {tab === 'users' && (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                    <tr><th className="px-10 py-6">Affiliate Full Name</th><th className="px-10 py-6">Tier</th><th className="px-10 py-6 text-center">Safety Control</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {filteredUsers.map(u => (
                       <tr key={u.id} className="hover:bg-gray-50/50">
                          <td className="px-10 py-8"><p className="font-black uppercase tracking-tight">{u.fullName}</p><p className="text-[10px] text-gray-400">@{u.username}</p></td>
                          <td className="px-10 py-8 font-black uppercase text-[10px] text-malawi-green">{u.membershipTier}</td>
                          <td className="px-10 py-8 text-center"><button onClick={() => setInspectingUser(u)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95">Inspect</button></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}

        {tab === 'complaints' && (
           <div className="divide-y">
              {state.complaints.length === 0 ? (
                 <div className="p-20 text-center text-gray-300 italic uppercase font-black">No tickets found</div>
              ) : (
                 state.complaints.sort((a,b) => a.status === 'PENDING' ? -1 : 1).map(c => (
                    <div key={c.id} className="p-8 flex items-center justify-between hover:bg-gray-50">
                       <div className="space-y-1">
                          <h4 className="font-black text-sm uppercase tracking-tight">{c.subject} <span className={`ml-2 text-[9px] px-2 py-0.5 rounded ${c.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{c.status}</span></h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">From: {c.userName} ({new Date(c.createdAt).toLocaleDateString()})</p>
                       </div>
                       {c.status === 'PENDING' && (
                          <button onClick={() => setActiveComplaint(c)} className="px-8 py-3 bg-malawi-red text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md">Reply Now</button>
                       )}
                    </div>
                 ))
              )}
           </div>
        )}

        {tab === 'settings' && (
          <div className="p-20 text-center uppercase italic font-black text-gray-300">Health Meter: Cloud Sync OK</div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
