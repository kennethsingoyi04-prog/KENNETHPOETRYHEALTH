
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const activityLog = useMemo(() => {
    const events: { type: 'signup' | 'login', user: User, date: Date }[] = [];
    state.users.forEach(u => {
      events.push({ type: 'signup', user: u, date: new Date(u.createdAt) });
      if (u.lastLoginAt) {
        events.push({ type: 'login', user: u, date: new Date(u.lastLoginAt) });
      }
    });
    return events.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 50);
  }, [state.users]);

  const isUserOnline = (user: User) => {
    if (!user.lastLoginAt) return false;
    const lastActive = new Date(user.lastLoginAt).getTime();
    const now = new Date().getTime();
    return (now - lastActive) < 600000;
  };

  const liveUsersCount = useMemo(() => {
    return state.users.filter(u => isUserOnline(u)).length;
  }, [state.users]);

  const filteredWithdrawals = useMemo(() => {
    return state.withdrawals.filter(w => 
      w.userName.toLowerCase().includes(searchText.toLowerCase()) || 
      w.phone.includes(searchText)
    );
  }, [state.withdrawals, searchText]);

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

  const handleWithdrawalAction = (id: string, status: WithdrawalStatus) => {
    const updatedWithdrawals = state.withdrawals.map(w => w.id === id ? { ...w, status } : w);
    onStateUpdate({ withdrawals: updatedWithdrawals });
  };

  const handleMembershipAction = (userId: string, status: MembershipStatus) => {
    const updatedUsers = state.users.map(u => 
      u.id === userId ? { ...u, membershipStatus: status } : u
    );
    onStateUpdate({ users: updatedUsers });
    if (inspectingUser?.id === userId) {
      setInspectingUser(prev => prev ? { ...prev, membershipStatus: status } : null);
    }
  };

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
    
    const directDownlines = state.users.filter(u => u.referredBy === user.id);
    const userReferrals = state.referrals.filter(r => r.referrerId === user.id);
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
          <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
            <div className="flex items-center gap-4">
              <button onClick={() => setInspectingUser(null)} className="p-3 bg-white border hover:bg-gray-100 rounded-2xl transition-all shadow-sm">
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  {isEditMode ? (
                    <input className="text-xl sm:text-2xl font-black uppercase tracking-tight bg-white border rounded-lg px-2" value={editData.fullName} onChange={e => setEditData({...editData, fullName: e.target.value})} />
                  ) : (
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">{user.fullName}</h2>
                  )}
                  {isOnline ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[8px] font-black uppercase tracking-widest">Live Now</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full border border-gray-200">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <span className="text-[8px] font-black uppercase tracking-widest">Offline</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditMode ? (
                <button onClick={handleSave} className="bg-malawi-green text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg"><Save size={16} /></button>
              ) : (
                <button onClick={() => setIsEditMode(true)} className="bg-malawi-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg"><Edit3 size={16} /></button>
              )}
              <button onClick={() => setInspectingUser(null)} className="p-2 text-gray-400 hover:text-malawi-red"><X size={24} /></button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-10 scrollbar-hide">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-malawi-green text-white p-5 rounded-3xl shadow-lg">
                <Wallet size={18} className="mb-2 opacity-60" />
                <p className="text-[9px] uppercase font-black">Wallet</p>
                <p className="text-xl font-black">MWK {user.balance.toLocaleString()}</p>
              </div>
              {/* Membership Proof Button */}
              {user.membershipProofUrl && (
                <button onClick={() => viewImage(user.membershipProofUrl)} className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg flex flex-col items-start transition-transform active:scale-95">
                  <FileImage size={18} className="mb-2 opacity-60" />
                  <p className="text-[9px] uppercase font-black">Activation Proof</p>
                  <p className="text-xs font-black">Click to View</p>
                </button>
              )}
            </div>
            {/* Rest of the User Inspector components... */}
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
          <input 
            type="text" 
            placeholder="Search Affiliates..." 
            className="pl-6 pr-6 py-4 bg-white border border-gray-100 rounded-2xl w-full md:w-80 shadow-sm"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button onClick={handleManualSync} className="p-4 bg-white border rounded-2xl"><RefreshCw size={20} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {[
          { id: 'activity', label: 'Live Stream', icon: Activity },
          { id: 'users', label: 'Affiliates', icon: Users, live: liveUsersCount },
          { id: 'withdrawals', label: 'Payout Hub', icon: Wallet, count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'complaints', label: 'Tickets', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase border relative ${tab === t.id ? 'bg-malawi-black text-white' : 'bg-white text-gray-400'}`}>
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden min-h-[600px]">
        {tab === 'withdrawals' && (
          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                <tr>
                  <th className="px-8 py-5">Affiliate</th>
                  <th className="px-8 py-5">ID Proof</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-center">Process</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-8 py-5">
                      <p className="font-black">{w.userName}</p>
                      <p className="text-[10px] text-gray-400">{w.phone}</p>
                    </td>
                    <td className="px-8 py-5">
                      {w.proofUrl ? (
                        <button onClick={() => viewImage(w.proofUrl)} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg text-blue-600 font-black text-[9px] uppercase hover:bg-blue-600 hover:text-white transition-all">
                          <ImageIcon size={14} /> View Document
                        </button>
                      ) : <span className="text-gray-300 italic text-[10px]">No ID Attached</span>}
                    </td>
                    <td className="px-8 py-5 font-black text-malawi-red">MWK {w.amount.toLocaleString()}</td>
                    <td className="px-8 py-5 text-[9px] font-black uppercase">{w.status}</td>
                    <td className="px-8 py-5 text-center">
                       <div className="flex gap-2 justify-center">
                         {w.status === 'PENDING' && (
                           <>
                             <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} className="p-3 bg-malawi-green text-white rounded-xl"><Check size={16} /></button>
                             <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} className="p-3 bg-malawi-red text-white rounded-xl"><X size={16} /></button>
                           </>
                         )}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'complaints' && (
          <div className="p-8 space-y-6">
            <h2 className="text-xl font-black uppercase">Support Inbox</h2>
            <div className="space-y-4">
              {state.complaints.length === 0 ? (
                <p className="text-center py-10 text-gray-400 italic">No tickets found.</p>
              ) : state.complaints.map(c => (
                <div key={c.id} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[9px] font-black text-malawi-green uppercase tracking-widest">{c.status} • {new Date(c.createdAt).toLocaleString()}</p>
                      <h4 className="font-black text-gray-900">{c.subject}</h4>
                      <p className="text-xs text-gray-400 font-bold">From: {c.userName} (@{state.users.find(u => u.id === c.userId)?.username})</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl text-sm italic text-gray-600 border border-gray-100">
                    "{c.message}"
                  </div>
                  {/* User's Attachment */}
                  {c.imageUrl && (
                    <div className="mt-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase mb-2">User Attachment:</p>
                      <button onClick={() => viewImage(c.imageUrl)} className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center hover:border-malawi-green group transition-all">
                        <img src={c.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  )}

                  {c.status === 'PENDING' ? (
                    <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                      <div className="flex gap-4">
                        <textarea 
                          className="flex-grow p-4 bg-white border rounded-2xl text-sm min-h-[100px]"
                          placeholder="Type your official response..."
                          value={replyText[c.id] || ""}
                          onChange={e => setReplyText(prev => ({ ...prev, [c.id]: e.target.value }))}
                        />
                        <div className="w-48 space-y-2">
                          <label className="text-[9px] font-black text-gray-400 uppercase block ml-1">Attach Visual</label>
                          <div className={`h-[100px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center relative cursor-pointer group ${replyImage[c.id] ? 'border-malawi-green bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => handleReplyImageUpload(c.id, e)} />
                            {replyImage[c.id] ? (
                              <img src={replyImage[c.id]} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                              <div className="text-center flex flex-col items-center gap-1 opacity-40 group-hover:opacity-100">
                                <Upload size={20} />
                                <span className="text-[8px] font-black uppercase">Upload</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleReplyComplaint(c.id)} className="bg-malawi-black text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <ShieldCheck size={16} /> Mark as Resolved & Notify User
                      </button>
                    </div>
                  ) : (
                    <div className="bg-malawi-black text-white p-6 rounded-2xl mt-2 border-l-4 border-malawi-red">
                      <p className="text-[9px] font-black text-malawi-red uppercase mb-2">Admin Reply:</p>
                      <p className="text-sm italic mb-4">"{c.reply}"</p>
                      {c.replyImageUrl && (
                        <div>
                           <p className="text-[9px] font-black text-gray-500 uppercase mb-2">Admin Attachment:</p>
                           <button onClick={() => viewImage(c.replyImageUrl)} className="w-20 h-20 rounded-lg overflow-hidden border border-white/20">
                             <img src={c.replyImageUrl} className="w-full h-full object-cover" />
                           </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
