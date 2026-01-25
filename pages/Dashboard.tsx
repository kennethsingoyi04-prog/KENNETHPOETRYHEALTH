
import React, { useState } from 'react';
import { AppState, MembershipStatus } from '../types';
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
  RefreshCw
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onStateUpdate }) => {
  const user = state.currentUser!;
  const myReferrals = state.referrals.filter(r => r.referrerId === user.id);
  
  const referralLink = `${window.location.origin}/#/auth?ref=${user.referralCode}`;
  const currentTier = MEMBERSHIP_TIERS.find(t => t.tier === user.membershipTier);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied!');
  };

  const askMarketingAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsAskingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Expert affiliate mentor for Malawi. Advice for: "${aiPrompt}". Short, actionable tactics.`,
      });
      setAiResponse(response.text);
    } catch (err) {
      setAiResponse("Network error. Try again.");
    } finally {
      setIsAskingAI(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-malawi-black uppercase tracking-tight">Moni, {user.fullName}!</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-3 py-1 bg-malawi-green text-white rounded-full text-[9px] font-black uppercase tracking-widest">{currentTier?.name || 'FREE MEMBER'}</span>
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-gray-400">
              <RefreshCw size={10} className="animate-spin" /> Live Sync Active
            </span>
          </div>
        </div>
        <div className="bg-malawi-black text-white px-8 py-5 rounded-[2rem] border-b-4 border-malawi-green shadow-xl relative overflow-hidden group">
          <p className="text-[10px] uppercase font-black tracking-widest opacity-60">MWK Balance</p>
          <p className="text-3xl font-black">K{user.balance.toLocaleString()}</p>
          <Zap className="absolute top-[-20%] right-[-10%] text-white/5 w-24 h-24 rotate-12" />
        </div>
      </header>

      {/* Commission Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-malawi-green transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-malawi-green/10 text-malawi-green rounded-2xl group-hover:bg-malawi-green group-hover:text-white transition-all"><TrendingUp size={24}/></div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Direct Profit Rate</p>
              <p className="text-xl font-black text-malawi-green">{currentTier?.directCommission || 30}% Attached</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-malawi-red transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-malawi-red/10 text-malawi-red rounded-2xl group-hover:bg-malawi-red group-hover:text-white transition-all"><Users size={24}/></div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Indirect Bonus Rate</p>
              <p className="text-xl font-black text-malawi-red">{currentTier?.indirectCommission || 5}% Attached</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border shadow-sm text-center">
              <p className="text-[10px] font-black uppercase text-gray-400">Lifetime Profits</p>
              <p className="text-xl font-black text-malawi-green">K{user.totalEarnings.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border shadow-sm text-center">
              <p className="text-[10px] font-black uppercase text-gray-400">Direct Network</p>
              <p className="text-xl font-black">{state.users.filter(u => u.referredBy === user.id).length} People</p>
            </div>
          </div>

          <div className="bg-malawi-green p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">Affiliate Link</h2>
              <div className="flex gap-2">
                <div className="bg-black/20 p-4 rounded-2xl flex-grow font-mono text-xs truncate border border-white/10">{referralLink}</div>
                <button onClick={copyToClipboard} className="bg-white text-malawi-green p-4 rounded-2xl shadow-lg active:scale-95 transition-transform"><Copy size={20}/></button>
              </div>
            </div>
            <Award className="absolute top-[-20%] right-[-5%] text-white/10 w-48 h-48 -rotate-12" />
          </div>

          <div className="bg-white rounded-[2.5rem] border shadow-sm p-8 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Sparkles size={16} className="text-malawi-red"/> Growth Assistant</h3>
            {aiResponse && <div className="p-5 bg-gray-50 rounded-2xl text-xs font-medium border italic leading-relaxed animate-in slide-in-from-top-2">"{aiResponse}"</div>}
            <form onSubmit={askMarketingAssistant} className="flex gap-2">
              <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="How can I get more recruits?" className="flex-grow bg-gray-50 p-4 rounded-2xl border outline-none text-sm"/>
              <button disabled={isAskingAI} className="bg-malawi-black text-white p-4 rounded-2xl active:scale-95 transition-transform">{isAskingAI ? <Loader2 className="animate-spin"/> : <Send size={20}/>}</button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-[2.5rem] border shadow-sm h-full flex flex-col overflow-hidden max-h-[600px]">
            <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
               <h3 className="font-black text-xs uppercase tracking-widest">Network Directory</h3>
               <span className="text-[8px] font-black bg-malawi-green text-white px-2 py-0.5 rounded uppercase">Real-time</span>
            </div>
            <div className="flex-grow overflow-y-auto divide-y">
              {myReferrals.length === 0 ? (
                <div className="p-12 text-center text-gray-300 italic text-xs uppercase font-black">No network members found</div>
              ) : (
                myReferrals.map(ref => {
                  const target = state.users.find(u => u.id === ref.referredId);
                  return (
                    <div key={ref.id} className="p-5 hover:bg-gray-50 transition-colors group">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-malawi-black rounded-xl flex items-center justify-center text-white font-black uppercase group-hover:bg-malawi-green transition-colors">{target?.fullName.charAt(0)}</div>
                          <div className="flex-grow">
                             <p className="text-xs font-black uppercase tracking-tight">{target?.fullName}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${target?.membershipStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {target?.membershipTier} {target?.membershipStatus === 'PENDING' ? '(WAITING)' : ''}
                                </span>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black text-malawi-green">+K{ref.commission.toLocaleString()}</p>
                             <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Level {ref.level}</p>
                          </div>
                       </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
