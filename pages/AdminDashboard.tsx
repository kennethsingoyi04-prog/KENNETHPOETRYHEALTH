
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, Complaint, User, WithdrawalRequest, Referral, MembershipTier } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, CloudStatus, syncAppStateToCloud } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Check, Search, 
  UserCheck, MessageSquare, Eye, X, Wallet, 
  ChevronRight, Users, TrendingUp, ArrowLeft, Target, Award,
  Activity, Zap, UserPlus, LogIn, Edit3, Save, Ban, ShieldAlert,
  Radio, FileImage, Upload, Image as ImageIcon
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
    return (now - lastActive) < 600000; // 10 minutes
  };

  const liveUsersCount = useMemo(() => {
    return state.users.filter(u => isUserOnline(u)).length;
  }, [state.users]);

  const allUsers = useMemo(() => {
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

  // --- SUB-COMPONENT: FULL USER INSPECTOR ---
  const UserInspector = ({ user }: { user: User }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<User>({ ...user });
    
    const directDownlines = state.users.filter(u => u.referredBy === user.id);
    const directIds = directDownlines.map(u => u.id);
    const indirectDownlines = state.users.filter(u => directIds.includes(u.referredBy || ''));
    const userReferrals = state.referrals.filter(r => r.referrerId === user.id);
    const isOnline = isUserOnline(user);

    const handleSave = () => {
      const updatedUsers = state.users.map(u => u.id === user.id ? editData : u);
      onStateUpdate({ users: updatedUsers });
      setInspectingUser(editData);
      setIsEditMode(false);
    };

    const toggleBan = () => {
      const confirmMsg = editData.isBanned ? "UNBAN this affiliate?" : "PERMANENTLY BAN this affiliate?";
      if (window.confirm(confirmMsg)) {
        const updated = { ...editData, isBanned: !editData.isBanned };
        const updatedUsers = state.users.map(u => u.id === user.id ? updated : u);
        onStateUpdate({ users: updatedUsers });
        setEditData(updated);
        setInspectingUser(updated);
      }
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setInspectingUser(null)}></div>
        <div className="relative bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 border-b flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-5">
              <button onClick={() => setInspectingUser(null)} className="p-3 border rounded-2xl bg-white hover:bg-gray-100 transition-all"><ArrowLeft size={20} /></button>
              <div>
                <div className="flex items-center gap-3">
                  {isEditMode ? (
                    <input className="text-2xl font-black bg-white border rounded px-2" value={editData.fullName} onChange={e => setEditData({...editData, fullName: e.target.value})} />
                  ) : (
                    <h2 className="text-2xl font-black uppercase tracking-tight">{user.fullName}</h2>
                  )}
                  {isOnline ? (
                    <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border border-green-200"><Radio size={12} className="animate-pulse" /> Live Now</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded-full text-[9px] font-black uppercase">Offline</span>
                  )}
                  {user.isBanned && <span className="px-2 py-1 bg-red-600 text-white rounded-full text-[9px] font-black uppercase">Banned</span>}
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">@{user.username} • Affiliate ID: {user.id}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {isEditMode ? (
                <button onClick={handleSave} className="bg-malawi-green text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg"><Save size={18} /> Save</button>
              ) : (
                <button onClick={() => setIsEditMode(true)} className="bg-malawi-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg"><Edit3 size={18} /> Edit</button>
              )}
              <button onClick={() => setInspectingUser(null)} className="p-2 text-gray-400 hover:text-malawi-red"><X size={28} /></button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-8 space-y-12 scrollbar-hide">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-malawi-green text-white p-6 rounded-[2rem] shadow-lg">
                <Wallet size={20} className="mb-2 opacity-60" />
                <p className="text-[10px] font-black uppercase opacity-80">Wallet Balance</p>
                {isEditMode ? (
                  <input type="number" className="w-full bg-white/20 rounded px-1 font-black" value={editData.balance} onChange={e => setEditData({...editData, balance: Number(e.target.value)})} />
                ) : (
                  <p className="text-2xl font-black">MWK {user.balance.toLocaleString()}</p>
                )}
              </div>
              <div className="bg-malawi-black text-white p-6 rounded-[2rem] shadow-lg border-b-4 border-malawi-red">
                <TrendingUp size={20} className="mb-2 opacity-60" />
                <p className="text-[10px] font-black uppercase opacity-80">Total Revenue</p>
                <p className="text-2xl font-black">MWK {user.totalEarnings.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 border p-6 rounded-[2rem]">
                <Target size={20} className="mb-2 text-blue-500" />
                <p className="text-[10px] font-black text-gray-400 uppercase">Team Size</p>
                <p className="text-2xl font-black">{directDownlines.length + indirectDownlines.length}</p>
              </div>
              {user.membershipProofUrl && (
                <button onClick={() => viewImage(user.membershipProofUrl)} className="bg-blue-600 text-white p-6 rounded-[2rem] shadow-lg flex flex-col items-start hover:bg-blue-700 transition-all">
                  <FileImage size={20} className="mb-2 opacity-60" />
                  <p className="text-[10px] font-black uppercase">Activation Receipt</p>
                  <p className="text-xs font-black mt-1">View Attachment</p>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Moderation Tools</h3>
                <div className="space-y-4">
                  <button onClick={toggleBan} className={`w-full py-5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all ${editData.isBanned ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100'}`}>
                    <ShieldAlert size={18} /> {editData.isBanned ? 'Unban Access' : 'Permanent Account Ban'}
                  </button>
                  {user.membershipStatus === MembershipStatus.PENDING && (
                    <button onClick={() => { handleMembershipAction(user.id, MembershipStatus.ACTIVE); setInspectingUser({...user, membershipStatus: MembershipStatus.ACTIVE}); }} className="w-full bg-malawi-green text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg">Approve Membership</button>
                  )}
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Network Tree</h3>
                <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 max-h-[300px] overflow-y-auto">
                   {directDownlines.length === 0 ? (
                     <p className="text-center text-xs text-gray-400 italic py-10">No direct affiliates.</p>
                   ) : (
                     <div className="space-y-3">
                       {directDownlines.map(d => (
                         <div key={d.id} className="bg-white p-4 rounded-xl flex items-center justify-between border">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black">{d.fullName.charAt(0)}</div>
                             <p className="text-xs font-black">{d.fullName}</p>
                           </div>
                           <button onClick={() => setInspectingUser(d)} className="text-[9px] font-black text-blue-600 uppercase">View</button>
                         </div>
                       ))}
                     </div>
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
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {inspectingUser && <UserInspector user={inspectingUser} />}

      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-malawi-black text-white rounded-3xl shadow-xl border-b-4 border-malawi-red">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-malawi-black">Admin HQ</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Search affiliates..." className="pl-12 pr-6 py-4 bg-white border rounded-2xl w-80 shadow-sm" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-4 bg-white border rounded-2xl hover:bg-gray-50"><RefreshCw size={20} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {[
          { id: 'activity', label: 'Feed', icon: Activity },
          { id: 'users', label: 'Affiliates', icon: Users, live: liveUsersCount },
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'memberships', label: 'Activation', icon: Award, count: state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING).length },
          { id: 'complaints', label: 'Inbox', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase border relative ${tab === t.id ? 'bg-malawi-black text-white' : 'bg-white text-gray-400'}`}>
            <t.icon size={16} /> {t.label}
            {t.count ? <span className="bg-malawi-red text-white px-2 py-0.5 rounded-full text-[9px]">{t.count}</span> : null}
            {t.live !== undefined && t.live > 0 && <span className="absolute -top-1 -right-1 bg-green-500 text-white px-2 py-0.5 rounded-full text-[8px] animate-bounce">{t.live} LIVE</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden min-h-[600px]">
        {tab === 'users' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                <tr>
                  <th className="px-8 py-5">Affiliate</th>
                  <th className="px-8 py-5">Presence</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Wallet</th>
                  <th className="px-8 py-5 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allUsers.map(u => {
                  const online = isUserOnline(u);
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.isBanned ? 'opacity-50 grayscale bg-red-50/10' : ''} ${online ? 'bg-green-50/5' : ''}`}>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${online ? 'border-green-500' : 'border-gray-100'}`}>
                             {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover rounded-full" /> : <UserCheck size={20} className="text-gray-300" />}
                           </div>
                           <div>
                              <p className="font-black">{u.fullName}</p>
                              <p className="text-[10px] text-gray-400">@{u.username}</p>
                           </div>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                        {online ? <span className="text-green-600 font-black text-[9px] uppercase tracking-widest flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" /> Online Now</span> : <span className="text-gray-400 font-black text-[9px] uppercase tracking-widest">Seen {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</span>}
                      </td>
                      <td className="px-8 py-5">
                         <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${u.membershipStatus === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{u.membershipStatus}</span>
                      </td>
                      <td className="px-8 py-5 font-black text-malawi-green">MWK {u.balance.toLocaleString()}</td>
                      <td className="px-8 py-5 text-center">
                         <button onClick={() => setInspectingUser(u)} className="p-3 bg-gray-50 hover:bg-malawi-black hover:text-white rounded-2xl transition-all shadow-sm"><Eye size={18} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'complaints' && (
          <div className="p-10 space-y-8">
            {state.complaints.length === 0 ? <p className="text-center py-20 text-gray-400 italic">Support inbox empty.</p> : state.complaints.map(c => (
              <div key={c.id} className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-black">{c.subject}</h4>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">From: {c.userName} • {new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${c.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{c.status}</span>
                </div>
                <div className="bg-white p-6 rounded-2xl text-sm italic text-gray-600 border">"{c.message}"</div>
                {c.imageUrl && (
                  <div className="pt-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2">User Attachment:</p>
                    <button onClick={() => viewImage(c.imageUrl)} className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-malawi-green transition-all">
                      <img src={c.imageUrl} className="w-full h-full object-cover" />
                    </button>
                  </div>
                )}
                {c.status === 'PENDING' ? (
                  <div className="space-y-4 pt-6 border-t border-gray-200">
                    <div className="flex gap-4">
                      <textarea className="flex-grow p-6 rounded-2xl border min-h-[120px]" placeholder="Official reply..." value={replyText[c.id] || ""} onChange={e => setReplyText(prev => ({ ...prev, [c.id]: e.target.value }))} />
                      <div className="w-48 h-[120px] relative border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white transition-all overflow-hidden bg-white/50">
                         <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" onChange={e => handleReplyImageUpload(c.id, e)} />
                         {replyImage[c.id] ? <img src={replyImage[c.id]} className="w-full h-full object-cover" /> : <div className="text-center opacity-40"><Upload size={24} className="mx-auto mb-1"/><p className="text-[8px] font-black uppercase">Add Photo</p></div>}
                      </div>
                    </div>
                    <button onClick={() => handleReplyComplaint(c.id)} className="bg-malawi-black text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest">Send Reply & Close Ticket</button>
                  </div>
                ) : (
                  <div className="bg-malawi-black text-white p-6 rounded-[2rem] border-l-8 border-malawi-red">
                    <p className="text-[9px] font-black text-malawi-red uppercase mb-2">Admin Verdict:</p>
                    <p className="text-sm italic leading-relaxed">"{c.reply}"</p>
                    {c.replyImageUrl && (
                      <button onClick={() => viewImage(c.replyImageUrl)} className="mt-4 w-20 h-20 rounded-xl overflow-hidden border border-white/20"><img src={c.replyImageUrl} className="w-full h-full object-cover" /></button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
