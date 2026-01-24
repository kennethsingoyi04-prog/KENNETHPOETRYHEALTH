
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, Complaint, User, WithdrawalRequest, Referral, MembershipTier } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, CloudStatus, syncAppStateToCloud } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Check, Search, 
  UserCheck, MessageSquare, Eye, X, Wallet, 
  ChevronRight, Users, TrendingUp, ArrowLeft, Target, Award,
  Activity, Zap, UserPlus, LogIn, Edit3, Save, Ban, ShieldAlert,
  Radio, FileImage, Upload, Image as ImageIcon, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'activity' | 'withdrawals' | 'memberships' | 'users' | 'complaints'>('activity');
  const [cloudInfo, setCloudInfo] = useState<CloudStatus>({ ok: false, isCloud: true });
  const [isChecking, setIsChecking] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [replyImage, setReplyImage] = useState<{ [key: string]: string }>({});
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);

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
    // Use a strict 5-minute window for "Live" status
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
      // Priority 1: Live Users
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      // Priority 2: Recency
      const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [state.users, searchText]);

  const handleReplyImageUpload = (complaintId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReplyImage(prev => ({ ...prev, [complaintId]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReplyComplaint = (id: string) => {
    const reply = replyText[id];
    const image = replyImage[id];
    if (!reply?.trim() && !image) return;
    const updatedComplaints = state.complaints.map(c => 
      c.id === id ? { ...c, reply, replyImageUrl: image, status: 'RESOLVED' as const, updatedAt: new Date().toISOString() } : c
    );
    onStateUpdate({ complaints: updatedComplaints });
    setReplyText(prev => ({ ...prev, [id]: '' }));
    setReplyImage(prev => ({ ...prev, [id]: '' }));
  };

  const viewImage = (url?: string) => {
    if (!url) return;
    navigate(`/admin/proof-preview?url=${encodeURIComponent(url)}`);
  };

  const handleWithdrawalAction = (id: string, status: WithdrawalStatus) => {
    const updatedWithdrawals = state.withdrawals.map(w => w.id === id ? { ...w, status } : w);
    onStateUpdate({ withdrawals: updatedWithdrawals });
  };

  const handleMembershipAction = (userId: string, status: MembershipStatus) => {
    const updatedUsers = state.users.map(u => 
      u.id === userId ? { ...u, membershipStatus: status } : u
    );
    onStateUpdate({ users: updatedUsers });
  };

  // --- SUB-COMPONENT: FULL USER INSPECTOR MODAL ---
  const UserInspector = ({ user }: { user: User }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<User>({ ...user });
    
    const directDownlines = state.users.filter(u => u.referredBy === user.id);
    const directIds = directDownlines.map(u => u.id);
    const indirectDownlines = state.users.filter(u => directIds.includes(u.referredBy || ''));
    const isOnline = isUserOnline(user);

    const handleSave = () => {
      const updatedUsers = state.users.map(u => u.id === user.id ? editData : u);
      onStateUpdate({ users: updatedUsers });
      setInspectingUser(editData);
      setIsEditMode(false);
    };

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4">
              <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-200 space-y-6">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                   <ShieldCheck size={16} /> Affiliate Security
                 </h3>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border">
                       <span className="text-xs font-bold text-gray-500 uppercase">Membership</span>
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.membershipStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.membershipStatus}</span>
                    </div>
                    {user.membershipStatus === 'PENDING' && (
                      <button onClick={() => handleMembershipAction(user.id, MembershipStatus.ACTIVE)} className="w-full bg-malawi-green text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:shadow-green-500/20 transition-all">Approve Activation</button>
                    )}
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border">
                       <span className="text-xs font-bold text-gray-500 uppercase">Last Presence</span>
                       <span className="text-xs font-black text-malawi-black uppercase tracking-tight">{getTimeSinceActive(user)}</span>
                    </div>
                 </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 space-y-6">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                   <Users size={16} /> Direct Network
                 </h3>
                 <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {directDownlines.length === 0 ? (
                      <p className="text-center py-12 text-gray-400 text-xs italic">No direct referrals yet.</p>
                    ) : (
                      directDownlines.map(d => (
                        <div key={d.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-malawi-black text-white flex items-center justify-center text-[10px] font-black">{d.fullName.charAt(0)}</div>
                              <p className="text-xs font-black">{d.fullName}</p>
                           </div>
                           <button onClick={() => setInspectingUser(d)} className="text-[10px] font-black text-blue-600 uppercase hover:underline">Inspect</button>
                        </div>
                      ))
                    )}
                 </div>
              </div>
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
             <input type="text" placeholder="Search affiliates by name or ID..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-80 lg:w-[400px] shadow-sm font-medium focus:ring-2 focus:ring-malawi-black outline-none transition-all" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] hover:bg-gray-50 shadow-sm transition-all active:scale-95"><RefreshCw size={24} className={isChecking ? 'animate-spin text-malawi-green' : 'text-gray-400'} /></button>
        </div>
      </header>

      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'activity', label: 'Feed', icon: Activity },
          { id: 'users', label: 'Affiliates', icon: Users, live: liveUsersCount },
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'memberships', label: 'Activation', icon: Award, count: state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING).length },
          { id: 'complaints', label: 'Inbox', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border relative transition-all ${tab === t.id ? 'bg-malawi-black text-white shadow-xl scale-105 z-10' : 'bg-white text-gray-400 hover:text-gray-600'}`}>
            <t.icon size={18} /> {t.label}
            {t.live !== undefined && t.live > 0 && <span className="absolute -top-2 -right-2 bg-green-500 text-white px-2.5 py-1 rounded-full text-[9px] font-black border-2 border-white animate-bounce shadow-lg">{t.live} LIVE</span>}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2.5 py-1 rounded-full text-[9px] font-black border-2 border-white shadow-lg">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[3rem] border shadow-2xl overflow-hidden min-h-[650px] transition-all">
        {tab === 'users' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                <tr>
                  <th className="px-10 py-6">Affiliate Profile</th>
                  <th className="px-10 py-6">Live Status</th>
                  <th className="px-10 py-6">Membership</th>
                  <th className="px-10 py-6">Wallet Balance</th>
                  <th className="px-10 py-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allUsersSorted.length === 0 ? (
                  <tr><td colSpan={5} className="py-20 text-center text-gray-400 italic font-medium uppercase tracking-widest">No matching affiliates found.</td></tr>
                ) : allUsersSorted.map(u => {
                  const online = isUserOnline(u);
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors group ${online ? 'bg-green-50/10' : ''} ${u.isBanned ? 'opacity-50 grayscale bg-red-50/10' : ''}`}>
                      <td className="px-10 py-6">
                         <div className="flex items-center gap-5">
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all group-hover:scale-110 ${online ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-gray-100'}`}>
                             {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover rounded-2xl" /> : <UserCheck size={24} className="text-gray-300" />}
                           </div>
                           <div>
                              <p className="font-black text-malawi-black">{u.fullName}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">@{u.username}</p>
                           </div>
                         </div>
                      </td>
                      <td className="px-10 py-6">
                        {online ? (
                          <div className="flex flex-col">
                            <span className="text-green-600 font-black text-[10px] uppercase flex items-center gap-2">
                              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-md shadow-green-500" /> 
                              Live Now
                            </span>
                            <span className="text-[8px] text-green-400 uppercase font-black ml-4.5">Active Browsing</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400">
                             <Clock size={12} />
                             <span className="font-black text-[10px] uppercase tracking-tighter">Seen {getTimeSinceActive(u)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-10 py-6">
                         <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${u.membershipStatus === 'ACTIVE' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{u.membershipStatus}</span>
                      </td>
                      <td className="px-10 py-6">
                         <p className="font-black text-malawi-green text-lg">MWK {u.balance.toLocaleString()}</p>
                         <p className="text-[8px] text-gray-400 uppercase font-bold">Total: MWK {u.totalEarnings.toLocaleString()}</p>
                      </td>
                      <td className="px-10 py-6 text-center">
                         <button onClick={() => setInspectingUser(u)} className="p-4 bg-white border border-gray-200 hover:bg-malawi-black hover:text-white rounded-[1.2rem] transition-all shadow-sm hover:shadow-xl active:scale-90 group">
                           <Eye size={20} className="group-hover:scale-110 transition-transform" />
                         </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'activity' && (
           <div className="p-10 text-center py-40">
             <Activity size={48} className="mx-auto text-gray-200 mb-4" />
             <h3 className="text-xl font-black uppercase text-gray-400">System Activity Feed</h3>
             <p className="text-gray-300 text-sm mt-2">Real-time event streaming coming soon.</p>
           </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
