
import React, { useMemo, useState } from 'react';
import { AppState, User, MembershipStatus, MembershipTier, Complaint, Referral, WithdrawalStatus } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import Logo from '../components/Logo';
import { syncAppStateToCloud } from '../dataService';
import { 
  ShieldCheck, RefreshCw, Search, 
  X, Wallet, Users, Zap, Loader2, Monitor, MessageSquare, Check, CheckCircle2, Gavel, ShieldAlert, ImageIcon, Eye
} from 'lucide-react';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const [tab, setTab] = useState<'withdrawals' | 'users' | 'activations' | 'complaints' | 'settings'>('withdrawals');
  const [isChecking, setIsChecking] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [replyText, setReplyText] = useState("");
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  const handleManualSync = async () => {
    setIsChecking(true);
    try { await syncAppStateToCloud(state); alert("Backup successful."); } 
    catch (e: any) { alert(e.message); } 
    finally { setIsChecking(false); }
  };

  const approveMembership = (targetId: string) => {
    const targetUser = state.users.find(u => u.id === targetId);
    if (!targetUser) return;

    const tierConfig = MEMBERSHIP_TIERS.find(t => t.tier === targetUser.membershipTier);
    if (!tierConfig) return;

    let updatedUsers = [...state.users];
    let updatedReferrals = [...state.referrals];

    // 1. Activate User
    updatedUsers = updatedUsers.map(u => u.id === targetId ? { ...u, membershipStatus: MembershipStatus.ACTIVE } : u);

    // 2. Direct Referral Commission
    if (targetUser.referredBy) {
      const l1Referrer = updatedUsers.find(u => u.id === targetUser.referredBy);
      if (l1Referrer) {
        const l1TierConfig = MEMBERSHIP_TIERS.find(t => t.tier === l1Referrer.membershipTier) || MEMBERSHIP_TIERS[0];
        const commission = (tierConfig.price * l1TierConfig.directCommission) / 100;
        
        updatedReferrals.push({
          id: `ref-${Date.now()}-L1`,
          referrerId: l1Referrer.id,
          referredId: targetUser.id,
          level: 1,
          commission: commission,
          timestamp: new Date().toISOString()
        });

        updatedUsers = updatedUsers.map(u => u.id === l1Referrer.id ? {
          ...u,
          balance: u.balance + commission,
          totalEarnings: u.totalEarnings + commission
        } : u);

        // 3. Indirect Referral Commission (Fixed 5%)
        if (l1Referrer.referredBy) {
          const l2Referrer = updatedUsers.find(u => u.id === l1Referrer.referredBy);
          if (l2Referrer) {
            const l2Commission = (tierConfig.price * 5) / 100;
            
            updatedReferrals.push({
              id: `ref-${Date.now()}-L2`,
              referrerId: l2Referrer.id,
              referredId: targetUser.id,
              level: 2,
              commission: l2Commission,
              timestamp: new Date().toISOString()
            });

            updatedUsers = updatedUsers.map(u => u.id === l2Referrer.id ? {
              ...u,
              balance: u.balance + l2Commission,
              totalEarnings: u.totalEarnings + l2Commission
            } : u);
          }
        }
      }
    }

    onStateUpdate({ users: updatedUsers, referrals: updatedReferrals });
    alert(`Account for ${targetUser.fullName} is now ACTIVE. Commissions distributed.`);
  };

  const pendingActivations = useMemo(() => {
    return state.users.filter(u => u.membershipStatus === MembershipStatus.PENDING);
  }, [state.users]);

  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(searchText.toLowerCase()) || 
      u.username.toLowerCase().includes(searchText.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.users, searchText]);

  return (
    <div className="max-w-7xl mx-auto pb-32 animate-in fade-in duration-700">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-8" onClick={() => setViewingProofUrl(null)}>
           <img src={viewingProofUrl} className="max-w-full max-h-full rounded-2xl shadow-2xl" />
           <button className="absolute top-10 right-10 text-white"><X size={48}/></button>
        </div>
      )}

      {inspectingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-malawi-black/95 backdrop-blur-xl">
           <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="bg-malawi-black p-10 text-white flex items-center justify-between rounded-t-[4rem]">
                 <h2 className="text-3xl font-black uppercase tracking-tight">{inspectingUser.fullName}</h2>
                 <button onClick={() => setInspectingUser(null)} className="p-4 hover:bg-white/10 rounded-full transition-all"><X size={32}/></button>
              </div>
              <div className="p-10 overflow-y-auto space-y-6">
                 <div className="bg-gray-50 p-8 rounded-[3rem] border grid grid-cols-2 gap-4">
                    <div>
                       <p className="text-[10px] font-black uppercase text-gray-400">Balance</p>
                       <p className="text-2xl font-black text-malawi-green">K{inspectingUser.balance.toLocaleString()}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase text-gray-400">Status</p>
                       <p className="text-sm font-black uppercase">{inspectingUser.membershipStatus}</p>
                    </div>
                 </div>
              </div>
              <div className="p-8 border-t bg-gray-50 flex justify-center">
                 <button onClick={() => setInspectingUser(null)} className="px-16 py-5 bg-malawi-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Close</button>
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
             <input type="text" placeholder="Search..." className="pl-14 pr-8 py-5 bg-white border rounded-[2rem] w-64 shadow-sm" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>
          <button onClick={handleManualSync} className="p-5 bg-white border rounded-[1.5rem] shadow-sm active:scale-95 transition-all"><RefreshCw size={24} className={isChecking ? 'animate-spin' : ''} /></button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {[
          { id: 'withdrawals', label: 'Payouts', icon: Wallet, count: state.withdrawals.filter(w => w.status === WithdrawalStatus.PENDING).length },
          { id: 'activations', label: 'Activations', icon: ShieldAlert, count: pendingActivations.length },
          { id: 'users', label: 'Affiliates', icon: Users },
          { id: 'complaints', label: 'Support', icon: MessageSquare, count: state.complaints.filter(c => c.status === 'PENDING').length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase border transition-all relative ${tab === t.id ? 'bg-malawi-black text-white shadow-xl' : 'bg-white text-gray-400'}`}>
            <t.icon size={18} /> {t.label}
            {t.count !== undefined && t.count > 0 && <span className="absolute -top-2 -right-2 bg-malawi-red text-white px-2 py-0.5 rounded-full text-[10px] border-2 border-white">{t.count}</span>}
          </button>
        ))}
      </div>

      <main className="bg-white rounded-[4rem] border shadow-2xl overflow-hidden min-h-[600px]">
        {tab === 'activations' && (
           <div className="divide-y">
              {pendingActivations.length === 0 ? (
                 <div className="p-20 text-center text-gray-300 italic uppercase font-black">No pending activations</div>
              ) : (
                 pendingActivations.map(u => (
                    <div key={u.id} className="p-10 flex items-center justify-between hover:bg-gray-50">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-malawi-green text-white rounded-2xl flex items-center justify-center font-black text-xl">{u.fullName.charAt(0)}</div>
                          <div>
                             <h4 className="font-black text-lg uppercase tracking-tight">{u.fullName}</h4>
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Requested Tier: {u.membershipTier}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          {u.membershipProofUrl && (
                             <button onClick={() => setViewingProofUrl(u.membershipProofUrl!)} className="p-4 bg-gray-100 rounded-xl text-gray-400 hover:text-malawi-black transition-colors"><ImageIcon size={20}/></button>
                          )}
                          <button onClick={() => approveMembership(u.id)} className="px-8 py-4 bg-malawi-green text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2"><CheckCircle2 size={16}/> Approve & Credit</button>
                       </div>
                    </div>
                 ))
              )}
           </div>
        )}

        {tab === 'users' && (
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b">
                    <tr><th className="px-10 py-6">Affiliate</th><th className="px-10 py-6">Tier</th><th className="px-10 py-6">Balance</th><th className="px-10 py-6 text-center">Control</th></tr>
                 </thead>
                 <tbody className="divide-y">
                    {filteredUsers.map(u => (
                       <tr key={u.id} className="hover:bg-gray-50/50">
                          <td className="px-10 py-8"><p className="font-black uppercase tracking-tight">{u.fullName}</p><p className="text-[10px] text-gray-400">@{u.username}</p></td>
                          <td className="px-10 py-8"><span className="px-3 py-1 bg-gray-100 rounded text-[9px] font-black uppercase">{u.membershipTier}</span></td>
                          <td className="px-10 py-8 font-black text-malawi-green">K{u.balance.toLocaleString()}</td>
                          <td className="px-10 py-8 text-center"><button onClick={() => setInspectingUser(u)} className="px-8 py-3 bg-malawi-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md">Inspect</button></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}

        {tab === 'withdrawals' && (
           <div className="p-20 text-center uppercase italic font-black text-gray-300">Payout Ledger Active</div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
