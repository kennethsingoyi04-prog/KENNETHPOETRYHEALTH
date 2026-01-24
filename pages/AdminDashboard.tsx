
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, Complaint, User, WithdrawalRequest, Referral, MembershipTier } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, CloudStatus, syncAppStateToCloud } from '../dataService';
import { 
  ShieldCheck, Loader2, AlertTriangle, 
  Cloud, CloudOff, Database, RefreshCw, Check, Search, Flame, Server,
  UserCheck, MessageSquare, Eye, X, CheckCircle2, Wallet, ExternalLink,
  ChevronRight, Users, TrendingUp, Calendar, Clock, ArrowLeft, Target, Award,
  Activity, Zap, UserPlus, LogIn, Filter, Edit3, Save, Ban, ShieldAlert,
  Trash2, Radio, FileImage, Upload, Image as ImageIcon
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
    return (now - lastActive) < 600000;
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

  const UserInspector = ({ user }: { user: User }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<User>({ ...user });
    const isOnline = isUserOnline(user);

    const handleSave = () => {
      const updatedUsers = state.users.map(u => u.id === user.id ? editData : u);
      onStateUpdate({ users: updatedUsers });
      setInspectingUser(editData);
      setIsEditMode(false);
    };

    const toggleBan = () => {
      if (window.confirm(`Are you sure you want to ${editData.isBanned ? 'UNBAN' : 'BAN'} this user?`)) {
        const updated = { ...editData, isBanned: !editData.isBanned };
        const updatedUsers = state.users.map(u => u.id === user.id ? updated : u);
        onStateUpdate({ users: updatedUsers });
        setEditData(updated);
        setInspectingUser(updated);
      }
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setInspectingUser(null)}></div>
        <div className="relative bg-white w-full max-w-5xl h-full max-h-[95vh] rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
          <div className="p-6 border-b flex items-center justify-between bg-gray-50/80">
            <div className="flex items-center gap-4">
              <button onClick={() => setInspectingUser(null)} className="p-2 border rounded-xl bg-white hover:bg-gray-100 transition-all"><ArrowLeft size={20} /></button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black uppercase">{user.fullName}</h2>
                  {isOnline ? (
                    <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><Radio size={10} className="animate-pulse" /> Live Now</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-[8px] font-black uppercase tracking-widest">Offline</span>
                  )}
                  {user.isBanned && <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[8px] font-black uppercase">Banned</span>}
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">@{user.username}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={toggleBan} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${user.isBanned ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                <Ban size={16} />
              </button>
              <button onClick={() => setInspectingUser(null)} className="p-2 text-gray-400 hover:text-malawi-red"><X size={24} /></button>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto p-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-malawi-green text-white p-5 rounded-3xl shadow-lg">
                <Wallet size={18} className="mb-2 opacity-60" />
                <p className="text-[9px] uppercase font-black">Balance</p>
                <p className="text-xl font-black">MWK {user.balance.toLocaleString()}</p>
              </div>
              {user.membershipProofUrl && (
                <button onClick={() => viewImage(user.membershipProofUrl)} className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg flex flex-col items-start transition-all hover:scale-[1.02]">
                  <ImageIcon size={18} className="mb-2 opacity-60" />
                  <p className="text-[9px] uppercase font-black">Membership Receipt</p>
                  <p className="text-xs font-black">View Proof</p>
                </button>
              )}
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
        <div className="flex items-center gap-3">
          <input type="text" placeholder="Search Affiliates..." className="pl-6 pr-6 py-4 bg-white border rounded-2xl w-full md:w-80 shadow-sm" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <button onClick={handleManualSync} className="p-4 bg-white border rounded-2xl hover:bg-gray-50"><RefreshCw size={20} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {[
          { id: 'activity', label: 'Feed', icon: Activity },
          { id: 'users', label: 'Affiliates', icon: Users, live: liveUsersCount },
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'complaints', label: 'Inbox', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase border relative ${tab === t.id ? 'bg-malawi-black text-white' : 'bg-white text-gray-400'}`}>
            <t.icon size={16} /> {t.label}
            {t.live !== undefined && t.live > 0 && <span className="absolute -top-1 -right-1 bg-green-500 text-white px-2 py-0.5 rounded-full text-[8px] animate-bounce">{t.live} LIVE</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden min-h-[600px]">
        {tab === 'users' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                <tr>
                  <th className="px-8 py-5">Affiliate</th>
                  <th className="px-8 py-5">Presence</th>
                  <th className="px-8 py-5">Earnings (MWK)</th>
                  <th className="px-8 py-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allUsers.map(u => {
                  const online = isUserOnline(u);
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.isBanned ? 'opacity-50 grayscale' : ''}`}>
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
                      <td className="px-8 py-5 font-black text-malawi-green">MWK {u.balance.toLocaleString()}</td>
                      <td className="px-8 py-5 text-center">
                         <button onClick={() => setInspectingUser(u)} className="p-3 bg-gray-50 hover:bg-malawi-black hover:text-white rounded-2xl transition-all"><Eye size={18} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'complaints' && (
          <div className="p-8 space-y-6">
            {state.complaints.map(c => (
              <div key={c.id} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black">{c.subject}</h4>
                    <p className="text-[10px] text-gray-400 uppercase font-black">From: {c.userName} • {new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${c.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{c.status}</span>
                </div>
                <p className="text-sm italic text-gray-600 bg-white p-4 rounded-xl border border-gray-200">"{c.message}"</p>
                {c.imageUrl && (
                  <button onClick={() => viewImage(c.imageUrl)} className="w-20 h-20 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-malawi-green transition-all">
                    <img src={c.imageUrl} className="w-full h-full object-cover" />
                  </button>
                )}
                {c.status === 'PENDING' ? (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex gap-4">
                      <textarea className="flex-grow p-4 rounded-xl border min-h-[100px]" placeholder="Type reply..." value={replyText[c.id] || ""} onChange={e => setReplyText(prev => ({ ...prev, [c.id]: e.target.value }))} />
                      <div className="w-40 h-[100px] relative border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-white transition-all overflow-hidden">
                         <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" onChange={e => handleReplyImageUpload(c.id, e)} />
                         {replyImage[c.id] ? <img src={replyImage[c.id]} className="w-full h-full object-cover" /> : <Upload size={20} className="text-gray-300" />}
                      </div>
                    </div>
                    <button onClick={() => handleReplyComplaint(c.id)} className="bg-malawi-black text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2">Send Reply & Resolve</button>
                  </div>
                ) : (
                  <div className="bg-malawi-black text-white p-5 rounded-2xl border-l-4 border-malawi-red">
                    <p className="text-[9px] font-black text-malawi-red uppercase mb-2">Admin Reply:</p>
                    <p className="text-sm italic">"{c.reply}"</p>
                    {c.replyImageUrl && (
                      <button onClick={() => viewImage(c.replyImageUrl)} className="mt-3 w-20 h-20 rounded-lg overflow-hidden border border-white/20"><img src={c.replyImageUrl} className="w-full h-full object-cover" /></button>
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
