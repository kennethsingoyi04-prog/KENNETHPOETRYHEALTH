
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
  ExternalLink
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onStateUpdate }) => {
  const navigate = useNavigate();
  const user = state.currentUser!;
  
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

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

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  // Notifications logic
  const notifications = useMemo(() => {
    const list: { id: string, type: 'info' | 'success' | 'warning' | 'error', title: string, body: string, date: string, icon: any, action?: () => void, proof?: string }[] = [];
    
    if (user.membershipNote) {
      list.push({
        id: 'activ-note',
        type: user.membershipStatus === MembershipStatus.ACTIVE ? 'success' : 'warning',
        title: 'Membership Update',
        body: user.membershipNote,
        date: user.createdAt,
        icon: user.membershipStatus === MembershipStatus.ACTIVE ? CheckCircle : AlertCircle
      });
    }

    state.complaints.filter(c => c.userId === user.id && c.reply).forEach(c => {
      list.push({
        id: c.id,
        type: 'info',
        title: `Support Response`,
        body: `Regarding: ${c.subject}. Click to view.`,
        date: c.updatedAt,
        icon: MessageSquare,
        action: () => navigate('/profile?tab=support')
      });
    });

    state.withdrawals.filter(w => w.userId === user.id && w.status !== WithdrawalStatus.PENDING).forEach(w => {
      list.push({
        id: w.id,
        type: w.status === WithdrawalStatus.APPROVED ? 'success' : 'error',
        title: `Payout ${w.status}`,
        body: w.adminNote || (w.status === WithdrawalStatus.APPROVED ? 'Payment receipt received from Admin.' : 'Payout was rejected.'),
        date: w.createdAt,
        icon: w.status === WithdrawalStatus.APPROVED ? CheckCircle : XCircle,
        proof: w.paymentProofUrl
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [user, state.complaints, state.withdrawals, navigate]);

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
        contents: `You are an expert affiliate mentor for the 'KENNETHPOETRYHEALTH' platform in Malawi. Provide actionable advice for: "${aiPrompt}".`,
      });
      setAiResponse(response.text);
    } catch (err) {
      setAiResponse("Connectivity issue. Try again later.");
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
           <button className="absolute top-10 right-10 text-white p-4 bg-malawi-red rounded-full hover:bg-red-800 transition-colors"><X size={32}/></button>
        </div>
      )}

      {/* Global Prominent Notification Bar */}
      {latestAlert && (
        <div className={`p-1 rounded-[2.5rem] shadow-lg animate-in slide-in-from-top-4 duration-500 ring-4 ${latestAlert.type === 'success' ? 'bg-malawi-green ring-malawi-green/10' : 'bg-malawi-red ring-malawi-red/10'}`}>
           <div className="bg-white px-8 py-4 rounded-[2.2rem] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                 <div className={`p-3 rounded-2xl ${latestAlert.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                   <latestAlert.icon size={20} />
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Notification Alert</p>
                   <p className="text-xs font-black uppercase text-malawi-black">{latestAlert.title}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 {latestAlert.proof && (
                    <button 
                      onClick={() => setViewingProofUrl(latestAlert.proof!)}
                      className="flex items-center gap-2 px-6 py-3 bg-malawi-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-all"
                    >
                      <ImageIcon size={14} /> View Admin Receipt
                    </button>
                 )}
                 {latestAlert.action && (
                    <button onClick={latestAlert.action} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Open Details</button>
                 )}
              </div>
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
            <span className="px-3 py-1 bg-malawi-green text-white rounded-full text-[9px] font-black uppercase tracking-widest">{currentTier?.name || 'FREE MEMBER'}</span>
            {user.bookSellerStatus === BookSellerStatus.APPROVED && <span className="flex items-center gap-1 px-3 py-1 bg-malawi-red text-white rounded-full text-[9px] font-black uppercase tracking-widest"><BookOpen size={10}/> Verified Seller</span>}
          </div>
        </div>
        <div className="bg-malawi-black text-white px-8 py-5 rounded-[2rem] border-b-4 border-malawi-green shadow-xl">
          <p className="text-[10px] uppercase font-black tracking-widest opacity-60">Total Balance</p>
          <p className="text-3xl font-black">K{user.balance.toLocaleString()}</p>
        </div>
      </header>

      {/* Book Selling CTA Update */}
      {showBookSellingCTA && (
        <div className="bg-malawi-red p-1 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="bg-white p-8 rounded-[2.2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className="bg-malawi-red/10 p-5 rounded-3xl text-malawi-red">
                <BookOpen size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-malawi-black tracking-tight">Book Distributor Program</h3>
                <p className="text-gray-500 text-xs font-bold uppercase mt-1">Register your details below and include your Home Address to start advertising.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/profile?tab=bookselling')}
              className="px-10 py-5 bg-malawi-red text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg flex items-center gap-2 active:scale-95 transition-all"
            >
              Register Now <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-malawi-green transition-all">
          <div className="p-3 bg-malawi-green/10 text-malawi-green rounded-2xl"><TrendingUp size={24}/></div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">DIRECT EARNINGS</p>
            <p className="text-2xl font-black text-malawi-green">K{directInvitesTotal.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 group hover:border-malawi-red transition-all">
          <div className="p-3 bg-malawi-red/10 text-malawi-red rounded-2xl"><Users size={24}/></div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">NETWORK BONUS</p>
            <p className="text-2xl font-black text-malawi-red">K{indirectInvitesTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-malawi-green p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl font-black uppercase tracking-tight relative z-10">Recruitment Link</h2>
            <p className="text-[10px] font-bold uppercase text-white/60 relative z-10 mb-4">Earn up to {currentTier?.directCommission}% per active referral.</p>
            <div className="flex gap-2 relative z-10">
              <div className="bg-black/20 p-4 rounded-2xl flex-grow font-mono text-xs truncate border border-white/10">{referralLink}</div>
              <button onClick={copyToClipboard} className="bg-white text-malawi-green p-4 rounded-2xl shadow-lg active:scale-95 transition-transform"><Copy size={20}/></button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-[2.5rem] border shadow-sm p-8 space-y-4">
             <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-malawi-red"><Sparkles size={16}/> Growth Mentor</h3>
             <div className="p-4 bg-gray-50 rounded-2xl text-[11px] font-medium border italic min-h-[80px]">
               {aiResponse ? `"${aiResponse}"` : "Ask AI for recruitment advice..."}
             </div>
             <form onSubmit={askMarketingAssistant} className="flex gap-2">
               <input 
                 value={aiPrompt} 
                 onChange={e => setAiPrompt(e.target.value)} 
                 placeholder="How to recruit?" 
                 className="flex-grow bg-gray-50 p-4 rounded-2xl border outline-none text-xs font-bold"
               />
               <button disabled={isAskingAI} className="bg-malawi-black text-white p-4 rounded-2xl active:scale-95 shrink-0">
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
