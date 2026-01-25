
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, MembershipStatus, BookSellerStatus, User, WithdrawalStatus } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { 
  Users, 
  Copy, 
  Sparkles,
  Send,
  Loader2,
  Zap,
  Award,
  TrendingUp,
  CheckCircle,
  RefreshCw,
  TrendingDown,
  BookOpen,
  ArrowRight,
  MapPin,
  ChevronDown,
  User as UserIcon,
  Search,
  Network,
  AlertCircle,
  Bell,
  MessageSquare,
  Info,
  Clock,
  XCircle,
  Calculator,
  Target,
  ImageIcon,
  X,
  ExternalLink,
  UsersRound,
  Coins
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onStateUpdate }) => {
  const navigate = useNavigate();
  const user = state.currentUser!;
  
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  // Filter referrals related to current user
  const myReferrals = useMemo(() => 
    state.referrals.filter(r => r.referrerId === user.id),
    [state.referrals, user.id]
  );

  const directInvitesTotal = useMemo(() => 
    myReferrals.filter(r => r.level === 1).reduce((acc, curr) => acc + curr.commission, 0),
    [myReferrals]
  );

  const indirectInvitesTotal = useMemo(() => 
    myReferrals.filter(r => r.level === 2).reduce((acc, curr) => acc + curr.commission, 0),
    [myReferrals]
  );

  const referralLink = `${window.location.origin}/#/auth?ref=${user.referralCode}`;
  const currentTier = MEMBERSHIP_TIERS.find(t => t.tier === user.membershipTier);
  const isActiveMember = user.membershipStatus === MembershipStatus.ACTIVE;

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  // Notifications for mutual interaction
  const notifications = useMemo(() => {
    const list: { id: string, type: 'info' | 'success' | 'warning' | 'error', title: string, body: string, date: string, icon: any, action?: () => void, proof?: string }[] = [];
    
    if (user.membershipNote) {
      list.push({
        id: 'activ-note',
        type: user.membershipStatus === MembershipStatus.ACTIVE ? 'success' : 'warning',
        title: 'System Alert',
        body: user.membershipNote,
        date: user.createdAt,
        icon: user.membershipStatus === MembershipStatus.ACTIVE ? CheckCircle : AlertCircle
      });
    }

    state.withdrawals.filter(w => w.userId === user.id && w.status !== WithdrawalStatus.PENDING).forEach(w => {
      list.push({
        id: w.id,
        type: w.status === WithdrawalStatus.APPROVED ? 'success' : 'error',
        title: `Payout Result`,
        body: w.adminNote || (w.status === WithdrawalStatus.APPROVED ? 'Your funds were transferred successfully.' : 'Payout request rejected.'),
        date: w.createdAt,
        icon: w.status === WithdrawalStatus.APPROVED ? CheckCircle : XCircle,
        proof: w.paymentProofUrl
      });
    });

    // Support responses sync
    state.complaints.filter(c => c.userId === user.id && c.reply).forEach(c => {
       list.push({
          id: c.id,
          type: 'info',
          title: 'New Support Message',
          body: `Admin replied to: ${c.subject}`,
          date: c.updatedAt,
          icon: MessageSquare,
          action: () => navigate('/profile?tab=support')
       });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [user, state.withdrawals, state.complaints, navigate]);

  const latestAlert = notifications[0];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied!');
  };

  const askMarketingAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsAskingAI(true);
    setAiResponse(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a professional affiliate mentor for KPH TRANSFORM MALAWI. Advise on: "${aiPrompt}".`,
      });
      setAiResponse(response.text);
    } catch (err) {
      setAiResponse("Network busy. Try again.");
    } finally {
      setIsAskingAI(false);
    }
  };

  const showBookSellingCTA = !user.bookSellerStatus || user.bookSellerStatus === BookSellerStatus.NONE || user.bookSellerStatus === BookSellerStatus.REJECTED;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-md flex items-center justify-center p-8" onClick={() => setViewingProofUrl(null)}>
           <img src={viewingProofUrl} className="max-w-full max-h-full rounded-2xl shadow-2xl" />
           <button className="absolute top-10 right-10 text-white p-4 bg-malawi-red rounded-full hover:scale-110 transition-all"><X size={32}/></button>
        </div>
      )}

      {/* MUTUAL INTERACTION: Real-time System Alert */}
      {latestAlert && (
        <div className={`p-1 rounded-[2.5rem] shadow-xl animate-in slide-in-from-top-4 duration-500 ring-4 ${latestAlert.type === 'success' ? 'bg-malawi-green ring-malawi-green/10' : 'bg-malawi-red ring-malawi-red/10'}`}>
           <div className="bg-white px-8 py-4 rounded-[2.2rem] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-left">
                 <div className={`p-3 rounded-2xl ${latestAlert.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                   <latestAlert.icon size={20} />
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Incoming Update</p>
                   <p className="text-xs font-black uppercase text-malawi-black">{latestAlert.title}</p>
                 </div>
              </div>
              {latestAlert.proof && (
                 <button onClick={() => setViewingProofUrl(latestAlert.proof!)} className="px-6 py-3 bg-malawi-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-all">View Proof</button>
              )}
              {latestAlert.action && (
                 <button onClick={latestAlert.action} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Open Details</button>
              )}
           </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-black text-malawi-black uppercase tracking-tight">Moni, {user.fullName}!</h1>
             <div className="flex gap-1">
                <div className="w-4 h-1 bg-black rounded-full"></div>
                <div className="w-4 h-1 bg-malawi-red rounded-full"></div>
                <div className="w-4 h-1 bg-malawi-green rounded-full"></div>
             </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-3 py-1 bg-malawi-green text-white rounded-full text-[9px] font-black uppercase tracking-widest">{currentTier?.name || 'GUEST AFFILIATE'}</span>
            {user.bookSellerStatus === BookSellerStatus.APPROVED && <span className="flex items-center gap-1 px-3 py-1 bg-malawi-red text-white rounded-full text-[9px] font-black uppercase tracking-widest"><BookOpen size={10}/> Verified Distributor</span>}
          </div>
        </div>
        <div className="bg-malawi-black text-white px-10 py-6 rounded-[2.5rem] border-b-4 border-malawi-green shadow-xl flex flex-col items-center md:items-start">
          <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Account Balance</p>
          <p className="text-3xl font-black">K{user.balance.toLocaleString()}</p>
        </div>
      </header>

      {/* Main Profits Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Direct Earnings - Auto-detect and sync % visibility */}
        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-malawi-green transition-all overflow-hidden relative">
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-malawi-green/10 text-malawi-green rounded-3xl group-hover:bg-malawi-green group-hover:text-white transition-all duration-500"><TrendingUp size={32}/></div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Direct Invites Earning</p>
              <p className="text-3xl font-black text-malawi-green">K{directInvitesTotal.toLocaleString()}</p>
            </div>
          </div>
          {isActiveMember && currentTier ? (
            <div className="bg-malawi-green/10 text-malawi-green px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest relative z-10">
              {currentTier.directCommission}% Profit
            </div>
          ) : (
            <div className="bg-gray-100 text-gray-300 px-4 py-2 rounded-2xl font-black text-[8px] uppercase tracking-widest relative z-10">
              Locked
            </div>
          )}
        </div>

        {/* Indirect Earnings - Fixed 5% Team Bonus */}
        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-malawi-red transition-all overflow-hidden relative">
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-malawi-red/10 text-malawi-red rounded-3xl group-hover:bg-malawi-red group-hover:text-white transition-all duration-500"><UsersRound size={32}/></div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Indirect Invites Earning</p>
              <p className="text-3xl font-black text-malawi-red">K{indirectInvitesTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-malawi-red/10 text-malawi-red px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest relative z-10">
            5% Bonus
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Recruitment Tool */}
          <div className="bg-malawi-black p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border-t-8 border-malawi-green">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2"><Network size={24} className="text-malawi-green"/> Growth Network Link</h2>
                <p className="text-[10px] font-bold uppercase text-white/40 mt-1">Start your team to earn direct and team bonuses automatically.</p>
              </div>
              <button onClick={copyToClipboard} className="bg-malawi-green text-white px-10 py-5 rounded-2xl shadow-lg active:scale-95 transition-transform font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <Copy size={16} /> Copy Referral
              </button>
            </div>
            <div className="mt-6 bg-white/5 p-4 rounded-2xl font-mono text-[10px] truncate border border-white/5 text-white/60">
              {referralLink}
            </div>
          </div>

          {/* Mutual Team Activity Log */}
          <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-malawi-black flex items-center gap-2">
                <Clock size={16} className="text-malawi-red" /> Team Earnings Log
              </h3>
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Network Verified</p>
            </div>
            <div className="space-y-3">
              {myReferrals.length === 0 ? (
                <div className="py-20 text-center text-gray-300 italic text-xs font-black uppercase tracking-widest opacity-40">
                  Build your team to see live earnings here...
                </div>
              ) : (
                myReferrals.slice(0, 5).map(r => {
                  const refUser = state.users.find(u => u.id === r.referredId);
                  return (
                    <div key={r.id} className="p-5 bg-gray-50 rounded-[2rem] border flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-inner ${r.level === 1 ? 'bg-malawi-green' : 'bg-malawi-red'}`}>
                          {r.level === 1 ? 'L1' : 'L2'}
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase text-malawi-black">{refUser?.fullName || 'Active Member'}</p>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{r.level === 1 ? 'Direct Profit' : 'Team Indirect 5%'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${r.level === 1 ? 'text-malawi-green' : 'text-malawi-red'}`}>+K{r.commission.toLocaleString()}</p>
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Commission</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           {/* Book Selling Action */}
           {showBookSellingCTA ? (
             <div className="bg-malawi-red p-1 rounded-[2.5rem] shadow-xl overflow-hidden group">
                <div className="bg-white p-8 rounded-[2.2rem] space-y-6 relative overflow-hidden">
                   <div className="bg-malawi-red/5 p-4 rounded-2xl w-fit text-malawi-red"><BookOpen size={32} /></div>
                   <div>
                     <h3 className="text-xl font-black uppercase tracking-tight text-malawi-black">Distributor Hub</h3>
                     <p className="text-[10px] font-bold uppercase text-gray-400 leading-tight mt-1">Register your distribution address to start advertising Poetry & Health books.</p>
                   </div>
                   <button onClick={() => navigate('/profile?tab=bookselling')} className="w-full py-5 bg-malawi-red text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 group-hover:scale-[1.02] transition-all">
                      Register Details <ArrowRight size={16} />
                   </button>
                </div>
             </div>
           ) : (
             <div className="bg-malawi-green p-1 rounded-[2.5rem] shadow-xl overflow-hidden">
                <div className="bg-white p-8 rounded-[2.2rem] flex flex-col items-center text-center space-y-3">
                   <CheckCircle className="text-malawi-green" size={40} />
                   <h3 className="text-xl font-black uppercase tracking-tight text-malawi-black">Verified Distributor</h3>
                   <p className="text-[9px] font-bold uppercase text-gray-400">Authorized KPH Physical Agent</p>
                </div>
             </div>
           )}

           <div className="bg-white rounded-[2.5rem] border shadow-sm p-8 space-y-6 h-full flex flex-col">
             <div className="flex items-center gap-3">
               <Sparkles className="text-malawi-red" size={24}/>
               <h3 className="text-sm font-black uppercase tracking-widest text-malawi-black">Growth Mentor</h3>
             </div>
             <div className="flex-grow p-5 bg-gray-50 rounded-3xl text-[11px] font-medium border italic leading-relaxed text-gray-600 relative overflow-hidden">
               {aiResponse ? `"${aiResponse}"` : "Ask your AI assistant for tips on building the largest affiliate team in Malawi."}
             </div>
             <form onSubmit={askMarketingAssistant} className="flex gap-2">
               <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="How to recruit?" className="flex-grow bg-gray-50 px-5 py-4 rounded-2xl border outline-none text-xs font-bold focus:ring-2 focus:ring-malawi-green transition-all" />
               <button disabled={isAskingAI} className="bg-malawi-black text-white p-4 rounded-2xl active:scale-95 shrink-0 shadow-lg">
                 {isAskingAI ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
               </button>
             </form>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
