
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, WithdrawalStatus, MembershipStatus, Complaint, User, WithdrawalRequest } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { checkCloudHealth, CloudStatus, syncAppStateToCloud } from '../dataService';
import { 
  ShieldCheck, Loader2, AlertTriangle, 
  Cloud, CloudOff, Database, RefreshCw, Check, Search, Flame, Server,
  UserCheck, MessageSquare, Eye, X, CheckCircle2, Wallet, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'withdrawals' | 'memberships' | 'complaints' | 'users'>('withdrawals');
  const [cloudInfo, setCloudInfo] = useState<CloudStatus>({ ok: false, isCloud: true });
  const [isChecking, setIsChecking] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

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

  // --- Filtered Lists ---
  const filteredWithdrawals = useMemo(() => {
    return state.withdrawals.filter(w => 
      w.userName.toLowerCase().includes(searchText.toLowerCase()) || 
      w.phone.includes(searchText)
    );
  }, [state.withdrawals, searchText]);

  const pendingMemberships = useMemo(() => {
    return state.users.filter(u => 
      u.membershipStatus === MembershipStatus.PENDING &&
      (u.fullName.toLowerCase().includes(searchText.toLowerCase()) || u.username.toLowerCase().includes(searchText.toLowerCase()))
    );
  }, [state.users, searchText]);

  const pendingComplaints = useMemo(() => {
    return state.complaints.filter(c => 
      c.status === 'PENDING' &&
      (c.userName.toLowerCase().includes(searchText.toLowerCase()) || c.subject.toLowerCase().includes(searchText.toLowerCase()))
    );
  }, [state.complaints, searchText]);

  const allUsers = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
      u.username.toLowerCase().includes(searchText.toLowerCase()) ||
      u.phone.includes(searchText)
    );
  }, [state.users, searchText]);

  // --- Actions ---
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

  const handleReplyComplaint = (id: string) => {
    const reply = replyText[id];
    if (!reply?.trim()) return;

    const updatedComplaints = state.complaints.map(c => 
      c.id === id ? { ...c, reply, status: 'RESOLVED' as const, updatedAt: new Date().toISOString() } : c
    );
    onStateUpdate({ complaints: updatedComplaints });
    setReplyText(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const viewProof = (url?: string) => {
    if (!url) return;
    navigate(`/admin/proof-preview?url=${encodeURIComponent(url)}`);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Supabase Setup Guide */}
      {!cloudInfo.ok && !isChecking && (
        <div className="bg-blue-50 border-2 border-blue-100 p-8 rounded-[2.5rem] space-y-6 shadow-xl">
           <div className="flex items-center gap-4 text-blue-600">
             <Server size={40} className="shrink-0" />
             <div>
               <h2 className="text-xl font-black uppercase tracking-tight">Database Connectivity Error</h2>
               <p className="text-sm font-bold opacity-80">Connected to Client, but Table or Permissions missing.</p>
             </div>
           </div>
           
           <div className="bg-white p-6 rounded-3xl space-y-4 shadow-inner border border-blue-100">
             <h3 className="font-black text-xs uppercase text-gray-400">Run this in your Supabase SQL Editor:</h3>
             <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-[10px] font-mono overflow-x-auto select-all">
{`CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crucial: This allows your app to read/write without complex setup
ALTER TABLE app_state DISABLE ROW LEVEL SECURITY;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE app_state;`}
             </pre>
           </div>
           
           <button onClick={runHealthCheck} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
             <RefreshCw size={16} /> Re-Check Database Status
           </button>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-malawi-black text-white shadow-lg"><ShieldCheck size={24} /></div>
          <div>
            <h1 className="text-2xl font-black text-malawi-black uppercase tracking-tight">Admin Center</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                cloudInfo.ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                <Database size={12} />
                {cloudInfo.ok ? 'Supabase Online' : 'Database Offline'}
              </div>
              <button onClick={handleManualSync} className="text-[9px] font-black uppercase text-gray-400 hover:text-malawi-black flex items-center gap-1">
                <RefreshCw size={10} className={isChecking ? 'animate-spin' : ''} /> Force Sync
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Filter by name, phone or username..." 
              className="w-full pl-9 pr-4 py-3 bg-gray-50 border rounded-xl text-xs outline-none focus:ring-1 focus:ring-malawi-green" 
              value={searchText} 
              onChange={(e) => setSearchText(e.target.value)} 
            />
          </div>
      </div>

      <div className="flex border-b border-gray-200 gap-8 overflow-x-auto pb-px scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Withdrawals', count: state.withdrawals.filter(w => w.status === 'PENDING').length },
          { id: 'memberships', label: 'Pending Tiers', count: state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING).length },
          { id: 'complaints', label: 'Support', count: state.complaints.filter(c => c.status === 'PENDING').length },
          { id: 'users', label: 'All Affiliates', count: state.users.length }
        ].map((item) => (
          <button 
            key={item.id} 
            onClick={() => setTab(item.id as any)} 
            className={`pb-4 font-black uppercase tracking-widest text-xs border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              tab === item.id ? 'border-malawi-red text-malawi-red' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {item.label}
            {item.count > 0 && <span className="bg-malawi-red text-white text-[8px] px-1.5 py-0.5 rounded-full">{item.count}</span>}
          </button>
        ))}
      </div>

      <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {tab === 'withdrawals' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Gateway</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredWithdrawals.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic">No withdrawals found.</td></tr>
                ) : filteredWithdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold">
                      {w.userName}
                      <p className="text-[10px] text-gray-400 font-medium">{w.phone}</p>
                    </td>
                    <td className="px-6 py-4 font-black text-malawi-red">MWK {w.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-[10px] font-black uppercase text-gray-500">{w.paymentMethod}</td>
                    <td className="px-6 py-4 text-[10px] font-black uppercase">
                      <span className={w.status === 'PENDING' ? 'text-orange-500' : w.status === 'APPROVED' ? 'text-green-500' : 'text-red-500'}>
                        {w.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        {w.proofUrl && (
                          <button onClick={() => viewProof(w.proofUrl)} className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition-colors" title="View ID Proof"><Eye size={16} /></button>
                        )}
                        {w.status === WithdrawalStatus.PENDING && (
                          <>
                            <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)} className="bg-malawi-green text-white p-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"><Check size={16} /></button>
                            <button onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)} className="bg-malawi-red text-white p-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm"><X size={16} /></button>
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

        {tab === 'memberships' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4">Applicant</th>
                  <th className="px-6 py-4">Tier</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingMemberships.length === 0 ? (
                  <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic">No pending activation requests.</td></tr>
                ) : pendingMemberships.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold">{u.fullName}<p className="text-[10px] text-gray-400 font-medium">@{u.username}</p></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MEMBERSHIP_TIERS.find(t => t.tier === u.membershipTier)?.color || '#ccc' }}></div>
                        <span className="font-black text-[10px] uppercase">{u.membershipTier}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-[10px]">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => viewProof(u.membershipProofUrl)} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors" title="View Receipt"><ExternalLink size={16} /></button>
                        <button onClick={() => handleMembershipAction(u.id, MembershipStatus.ACTIVE)} className="bg-malawi-green text-white p-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm" title="Approve"><Check size={16} /></button>
                        <button onClick={() => handleMembershipAction(u.id, MembershipStatus.INACTIVE)} className="bg-malawi-red text-white p-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm" title="Reject"><X size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'complaints' && (
          <div className="p-6 space-y-6">
            {pendingComplaints.length === 0 ? (
              <div className="p-12 text-center text-gray-400 italic">No unresolved support tickets.</div>
            ) : pendingComplaints.map(c => (
              <div key={c.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-malawi-black uppercase tracking-tight">{c.subject}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">From: {c.userName} (@{state.users.find(u => u.id === c.userId)?.username})</p>
                  </div>
                  <span className="text-[9px] font-black text-gray-300 uppercase">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="bg-white p-4 rounded-xl text-sm italic border text-gray-600">"{c.message}"</div>
                <div className="space-y-2">
                  <textarea 
                    className="w-full p-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-malawi-red resize-none"
                    placeholder="Type your official response..."
                    rows={3}
                    value={replyText[c.id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [c.id]: e.target.value })}
                  />
                  <button 
                    onClick={() => handleReplyComplaint(c.id)}
                    disabled={!replyText[c.id]?.trim()}
                    className="bg-malawi-black text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-30"
                  >
                    <MessageSquare size={14} /> Send Official Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {tab === 'users' && (
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Tier</th>
                  <th className="px-6 py-4">Wallet</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden">
                            {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" /> : <UserCheck size={20} />}
                         </div>
                         <div>
                            <p className="font-bold">{u.fullName}</p>
                            <p className="text-[10px] text-gray-400">@{u.username} • {u.phone}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-[10px] font-black uppercase" style={{ color: MEMBERSHIP_TIERS.find(t => t.tier === u.membershipTier)?.color }}>
                         {u.membershipTier}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                         <span className="font-black text-malawi-green">MWK {u.balance.toLocaleString()}</span>
                         <span className="text-[9px] text-gray-400 uppercase font-bold">Earned: {u.totalEarnings.toLocaleString()}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                         u.membershipStatus === MembershipStatus.ACTIVE ? 'bg-green-50 text-green-600' : 
                         u.membershipStatus === MembershipStatus.PENDING ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'
                       }`}>
                         {u.membershipStatus}
                       </span>
                    </td>
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
