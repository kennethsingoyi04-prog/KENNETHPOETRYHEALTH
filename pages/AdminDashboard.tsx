
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, Complaint, User, WithdrawalRequest, Referral, MembershipTier } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, CloudStatus, syncAppStateToCloud } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Check, Search, 
  UserCheck, MessageSquare, Eye, X, Wallet, 
  ChevronRight, Users, TrendingUp, ArrowLeft, Target, Award,
  Activity, Zap, UserPlus, LogIn, Edit3, Save, Ban, ShieldAlert,
  Radio, FileImage, Upload, Image as ImageIcon, Clock, CheckCircle2, XCircle, Phone, MessageCircle,
  // Added missing imports for Payout UI
  Smartphone, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'activity' | 'withdrawals' | 'memberships' | 'users' | 'complaints'>('withdrawals');
  const [cloudInfo, setCloudInfo] = useState<CloudStatus>({ ok: false, isCloud: true });
  const [isChecking, setIsChecking] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [replyImage, setReplyImage] = useState<{ [key: string]: string }>({});
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  
  // Payout processing state
  const [payoutNote, setPayoutNote] = useState<{ [key: string]: string }>({});

  const runHealthCheck = async () => {
    setIsChecking(true);
    const info = await checkCloudHealth();
    setCloudInfo(info);
    setIsChecking(false);
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const handleManualSync = async () => {
    setIsChecking(true);
    await syncAppStateToCloud(state);
    await runHealthCheck();
  };

  const isUserOnline = (user: User) => {
    if (!user.lastLoginAt) return false;
    const lastActive = new Date(user.lastLoginAt).getTime();
    const now = new Date().getTime();
    return (now - lastActive) < 300000; 
  };

  const getTimeSinceActive = (user: User) => {
    if (!user.lastLoginAt) return "Never";
    const lastActive = new Date(user.lastLoginAt).getTime();
    const now = new Date().getTime();
    const diffMins = Math.floor((now - lastActive) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(user.lastLoginAt).toLocaleDateString();
  };

  const liveUsersCount = useMemo(() => {
    return state.users.filter(u => isUserOnline(u)).length;
  }, [state.users]);

  const allUsersSorted = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
      u.username.toLowerCase().includes(searchText.toLowerCase()) ||
      u.phone.includes(searchText)
    ).sort((a, b) => {
      const aOnline = isUserOnline(a);
      const bOnline = isUserOnline(b);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [state.users, searchText]);

  const viewImage = (url?: string) => {
    if (!url) return;
    navigate(`/admin/proof-preview?url=${encodeURIComponent(url)}`);
  };

  const handleWithdrawalAction = (id: string, status: WithdrawalStatus) => {
    const request = state.withdrawals.find(w => w.id === id);
    if (!request) return;

    let updatedUsers = [...state.users];
    
    // If rejected, refund the balance back to the user
    if (status === WithdrawalStatus.REJECTED) {
      updatedUsers = state.users.map(u => 
        u.id === request.userId ? { ...u, balance: u.balance + request.amount } : u
      );
    }

    const updatedWithdrawals = state.withdrawals.map(w => 
      w.id === id ? { ...w, status, adminNote: payoutNote[id] || '' } : w
    );

    onStateUpdate({ 
      withdrawals: updatedWithdrawals,
      users: updatedUsers 
    });
    
    setPayoutNote(prev => ({ ...prev, [id]: '' }));
  };

  const handleMembershipAction = (userId: string, status: MembershipStatus) => {
    const updatedUsers = state.users.map(u => 
      u.id === userId ? { ...u, membershipStatus: status } : u
    );
    onStateUpdate({ users: updatedUsers });
  };

  const UserInspector = ({ user }: { user: User }) => {
    const [editData, setEditData] = useState<User>({ ...user });
    const directDownlines = state.users.filter(u => u.referredBy === user.id);
    const directIds = directDownlines.map(u => u.id);
    const indirectDownlines = state.users.filter(u => directIds.includes(u.referredBy || ''));
    const isOnline = isUserOnline(user);

    const toggleBan = () => {
      if (window.confirm(editData.isBanned ? "Lift ban on this affiliate?" : "Ban this affiliate from the platform?")) {
        const updated = { ...editData, isBanned: !editData.isBanned };
        const updatedUsers = state.users.map(u => u.id === user.id ? updated : u);
        onStateUpdate({ users: updatedUsers });
        setEditData(updated);
        setInspectingUser(updated);
      }
    };

    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setInspectingUser(null)}></div>
        <div className="relative bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 border-b flex items-center justify-between bg-gray-50/80">
            <div className="flex items-center gap-5">
              <button onClick={() => setInspectingUser(null)} className="p-3 border rounded-2xl bg-white hover:bg-gray-100 transition-all shadow-sm"><ArrowLeft size={20} /></button>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black uppercase text-malawi-black">{user.fullName}</h2>
                  {isOnline ? (
                    <span className="px-3 py-1 bg-green-500 text-white rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 shadow-lg shadow-green-500/30">
                      <Radio size={12} className="animate-pulse" /> Live Now
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-200 text-gray-500 rounded-full text-[9px] font-black uppercase">Offline</span>
                  )}
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">@{user.username} • ID: {user.id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={toggleBan} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95 ${editData.isBanned ? 'bg-malawi-green text-white' : 'bg-malawi-red text-white'}`}>
                 {editData.isBanned ? 'Unban Affiliate' : 'Ban Affiliate'}
              </button>
              <button onClick={() => setInspectingUser(null)} className="p-3 text-gray-400 hover:text-malawi-red transition-colors"><X size={28} /></button>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto p-10 space-y-12 scrollbar-hide">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-malawi-green text-white p-6 rounded-[2.5rem] shadow-xl border-b-8 border-green-900/20">
                <Wallet size={24} className="mb-2 opacity-60" />
                <p className="text-[10px] font-black uppercase opacity-80">Wallet Balance</p>
                <p className="text-3xl font-black">MWK {user.balance.toLocaleString()}</p>
              </div>
              <div className="bg-malawi-black text-white p-6 rounded-[2.5rem] shadow-xl border-b-8 border-malawi-red/20">
                <TrendingUp size={24} className="mb-2 opacity-60" />
                <p className="text-[10px] font-black uppercase opacity-80">Total Revenue</p>
                <p className="text-3xl font-black">MWK {user.totalEarnings.toLocaleString()}</p>
              </div>
              <div className="bg-gray-100 p-6 rounded-[2.5rem] border border-gray-200 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                   <Target size={18} className="text-blue-500" />
                   <p className="text-[10px] font-black uppercase text-gray-400">Team</p>
                </div>
                <p className="text-3xl font-black text-malawi-black">{directDownlines.length + indirectDownlines.length}</p>
              </div>
              {user.membershipProofUrl && (
                <button onClick={() => viewImage(user.membershipProofUrl)} className="bg-blue-600 text-white p-6 rounded-[2.5rem] flex flex-col items-center justify-center shadow-xl hover:bg-blue-700 transition-all border-b-8 border-blue-900/20">
                  <ImageIcon size={28} className="mb-2" />
                  <p className="text-[10px] font-black uppercase">View Receipt</p>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-700">
      {inspectingUser && <UserInspector user={inspectingUser} />}

      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-5 bg-malawi-black text-white rounded-[2rem] border-b-8 border-malawi-red shadow-2xl">
            <ShieldCheck size={36} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-malawi-black">Admin HQ</h1>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em] mt-1">Platform Control Center</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Filter platform data..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-80 lg:w-[400px] shadow-sm font-medium focus:ring-2 focus:ring-malawi-black outline-none" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] hover:bg-gray-50 transition-all"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'users', label: 'Affiliates', icon: Users, live: liveUsersCount },
          { id: 'memberships', label: 'Activation', icon: Award, count: state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING).length },
          { id: 'complaints', label: 'Support', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border relative transition-all ${tab === t.id ? 'bg-malawi-black text-white shadow-xl scale-105 z-10' : 'bg-white text-gray-400'}`}>
            <t.icon size={18} /> {t.label}
            {t.live !== undefined && t.live > 0 && <span className="absolute -top-2 -right-2 bg-green-500 text-white px-2.5 py-1 rounded-full text-[9px] font-black border-2 border-white animate-bounce shadow-lg">{t.live}</span>}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2.5 py-1 rounded-full text-[9px] font-black border-2 border-white shadow-lg">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[3rem] border shadow-2xl overflow-hidden min-h-[650px]">
        {tab === 'withdrawals' && (
          <div className="p-8 space-y-6">
             <h2 className="text-xl font-black uppercase px-2">Payout Requests</h2>
             <div className="grid grid-cols-1 gap-6">
                {state.withdrawals.length === 0 ? (
                  <div className="text-center py-24 text-gray-300 italic">No payout requests found.</div>
                ) : state.withdrawals.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(w => (
                  <div key={w.id} className={`p-8 rounded-[2.5rem] border-2 transition-all ${w.status === 'PENDING' ? 'border-yellow-100 bg-yellow-50/20' : w.status === 'APPROVED' ? 'border-green-100 bg-green-50/10' : 'border-red-100 bg-red-50/10 opacity-70'}`}>
                    <div className="flex flex-col lg:flex-row justify-between gap-8">
                       <div className="space-y-4 flex-grow">
                          <div className="flex items-center gap-4">
                             <div className="p-4 bg-white rounded-2xl shadow-sm border"><Wallet className="text-malawi-green" size={24} /></div>
                             <div>
                                <p className="text-2xl font-black text-malawi-green">MWK {w.amount.toLocaleString()}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase">Request by {w.userName} • {new Date(w.createdAt).toLocaleString()}</p>
                             </div>
                             <div className="ml-auto">
                               <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${w.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{w.status}</span>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="bg-white p-4 rounded-2xl border flex items-center gap-3">
                                <div className="p-2 bg-malawi-black/5 rounded-lg text-malawi-black"><Smartphone size={16} /></div>
                                <div>
                                   <p className="text-[8px] font-black text-gray-400 uppercase">{w.paymentMethod}</p>
                                   <p className="text-xs font-black">{w.phone}</p>
                                </div>
                                <a href={`tel:${w.phone}`} className="ml-auto p-2 hover:bg-gray-100 rounded-xl transition-all"><Phone size={14} /></a>
                             </div>
                             <div className="bg-white p-4 rounded-2xl border flex items-center gap-3">
                                <div className="p-2 bg-malawi-black/5 rounded-lg text-malawi-black"><MessageCircle size={16} /></div>
                                <div>
                                   <p className="text-[8px] font-black text-gray-400 uppercase">Whatsapp</p>
                                   <p className="text-xs font-black">{w.whatsapp}</p>
                                </div>
                                <a href={`https://wa.me/${w.whatsapp}`} target="_blank" className="ml-auto p-2 hover:bg-gray-100 rounded-xl transition-all"><ExternalLink size={14} /></a>
                             </div>
                          </div>

                          {w.status === 'PENDING' && (
                            <div className="space-y-3 pt-2">
                               <input type="text" placeholder="Add payment reference or rejection reason..." className="w-full p-4 bg-white border rounded-2xl text-xs font-medium" value={payoutNote[w.id] || ''} onChange={e => setPayoutNote(prev => ({ ...prev, [w.id]: e.target.value }))} />
                               <div className="flex gap-3">
                                  <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} className="flex-grow bg-malawi-green text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"><CheckCircle2 size={16} /> Mark as Paid</button>
                                  <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} className="flex-grow bg-malawi-red text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"><XCircle size={16} /> Reject & Refund</button>
                               </div>
                            </div>
                          )}

                          {w.adminNote && (
                            <div className="bg-white/50 p-4 rounded-2xl border italic text-xs text-gray-600">
                               " {w.adminNote} "
                            </div>
                          )}
                       </div>

                       {w.proofUrl && (
                         <div className="shrink-0">
                           <button onClick={() => viewImage(w.proofUrl)} className="group relative w-48 h-64 rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl transition-all hover:scale-105 active:scale-95">
                              <img src={w.proofUrl} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white flex-col gap-2">
                                 <Eye size={24} />
                                 <span className="text-[9px] font-black uppercase">Inspect Identity</span>
                              </div>
                           </button>
                         </div>
                       )}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                <tr>
                  <th className="px-10 py-6">Affiliate</th>
                  <th className="px-10 py-6">Status</th>
                  <th className="px-10 py-6">Membership</th>
                  <th className="px-10 py-6">Balance</th>
                  <th className="px-10 py-6 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allUsersSorted.map(u => {
                  const online = isUserOnline(u);
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${online ? 'bg-green-50/5' : ''}`}>
                      <td className="px-10 py-6">
                         <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${online ? 'border-green-500' : 'border-gray-100'}`}>
                             {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover rounded-2xl" /> : <UserCheck size={20} className="text-gray-300" />}
                           </div>
                           <div>
                              <p className="font-black">{u.fullName}</p>
                              <p className="text-[10px] text-gray-400 uppercase">@{u.username}</p>
                           </div>
                         </div>
                      </td>
                      <td className="px-10 py-6">
                        {online ? (
                          <span className="text-green-600 font-black text-[9px] uppercase flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live Now</span>
                        ) : (
                          <span className="text-gray-400 font-black text-[9px] uppercase">Seen {getTimeSinceActive(u)}</span>
                        )}
                      </td>
                      <td className="px-10 py-6">
                         <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${u.membershipStatus === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{u.membershipStatus}</span>
                      </td>
                      <td className="px-10 py-6 font-black text-malawi-green">MWK {u.balance.toLocaleString()}</td>
                      <td className="px-10 py-6 text-center">
                         <button onClick={() => setInspectingUser(u)} className="p-3 bg-gray-50 hover:bg-malawi-black hover:text-white rounded-xl transition-all shadow-sm"><Eye size={18} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
