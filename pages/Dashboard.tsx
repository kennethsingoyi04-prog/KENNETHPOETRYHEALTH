
import React, { useState } from 'react';
import { AppState, MembershipStatus } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { 
  Users, 
  TrendingUp, 
  Share2, 
  Copy, 
  DollarSign, 
  User as UserIcon, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  ExternalLink,
  Sparkles,
  Send,
  Loader2,
  ChevronRight
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const user = state.currentUser!;
  const myReferrals = state.referrals.filter(r => r.referrerId === user.id);
  const myDirectReferralsCount = state.users.filter(u => u.referredBy === user.id).length;
  
  const myDirectReferralIds = state.users.filter(u => u.referredBy === user.id).map(u => u.id);
  const myIndirectReferralsCount = state.users.filter(u => myDirectReferralIds.includes(u.referredBy || '')).length;

  const referralLink = `${window.location.origin}/#/auth?ref=${user.referralCode}`;
  const currentTier = MEMBERSHIP_TIERS.find(t => t.tier === user.membershipTier);

  // AI Marketing Assistant State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied to clipboard!');
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
        contents: `Act as an expert affiliate marketing mentor specializing in the Malawi market (Blantyre, Lilongwe, Mzuzu, etc.). A user is asking: "${aiPrompt}". Provide specific, actionable advice for the KENNETHPOETRYHEALTH platform. Mention local tactics like using WhatsApp statuses, community gatherings, or local market networking. Keep the response concise and encouraging.`,
      });
      
      setAiResponse(response.text);
    } catch (err) {
      console.error("AI Marketing Assistant failed", err);
      setAiResponse("I'm having a bit of trouble connecting to the network. Please try again later!");
    } finally {
      setIsAskingAI(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moni, {user.fullName.split(' ')[0]}! 👋</h1>
          <div className="flex items-center gap-2 mt-1">
            {user.membershipStatus === MembershipStatus.ACTIVE ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-malawi-green rounded-full border border-green-100 shadow-sm">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-tight">{currentTier?.name} Member</span>
              </div>
            ) : user.membershipStatus === MembershipStatus.PENDING ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-100 shadow-sm">
                <Clock size={14} />
                <span className="text-[10px] font-black uppercase tracking-tight">Pending Activation ({currentTier?.name})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-malawi-red rounded-full border border-red-100 shadow-sm">
                <AlertCircle size={14} />
                <span className="text-[10px] font-black uppercase tracking-tight">Inactive Account</span>
              </div>
            )}
          </div>
        </div>
        <div className="bg-malawi-green text-white px-6 py-4 rounded-xl shadow-md border-l-8 border-malawi-black">
          <p className="text-xs uppercase font-bold tracking-wider opacity-80">Current Balance</p>
          <p className="text-3xl font-black">MWK {user.balance.toLocaleString()}</p>
        </div>
      </header>

      {/* Activation Helper for Pending Users */}
      {user.membershipStatus === MembershipStatus.PENDING && (
        <div className="bg-white p-6 rounded-3xl border-2 border-yellow-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex items-start gap-4">
             <div className="bg-yellow-100 p-3 rounded-2xl text-yellow-700">
               <Clock size={24} />
             </div>
             <div>
               <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Membership Pending Approval</h3>
               <p className="text-sm text-gray-500 max-w-lg">
                 Our administrators are reviewing your payment proof.
               </p>
             </div>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a href="#" className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95">
                <MessageSquare size={16} /> WhatsApp Group
              </a>
              <a href="#" className="flex items-center justify-center gap-2 bg-malawi-black text-white py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95">
                <ExternalLink size={16} /> Official Website
              </a>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Stats & AI */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-xl"><Users size={24} /></div>
              <div>
                <p className="text-gray-500 text-sm">Direct (L1)</p>
                <p className="text-2xl font-bold">{myDirectReferralsCount}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-purple-50 text-purple-600 p-4 rounded-xl"><TrendingUp size={24} /></div>
              <div>
                <p className="text-gray-500 text-sm">Indirect (L2)</p>
                <p className="text-2xl font-bold">{myIndirectReferralsCount}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-green-50 text-green-600 p-4 rounded-xl"><DollarSign size={24} /></div>
              <div>
                <p className="text-gray-500 text-sm">Total Earned</p>
                <p className="text-2xl font-bold">MWK {user.totalEarnings.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Referral Link Box */}
          <div className="bg-malawi-black text-white p-8 rounded-3xl relative overflow-hidden shadow-xl">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 text-malawi-red font-bold uppercase tracking-widest text-sm">
                <Share2 size={16} />
                <span>Grow Your Network</span>
              </div>
              <h2 className="text-3xl font-bold leading-tight max-w-md">
                Invite friends and earn up to <span className="text-malawi-green">15% combined</span> commission!
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-4">
                <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl flex-grow font-mono text-sm w-full truncate text-gray-400">
                  {referralLink}
                </div>
                <button onClick={copyToClipboard} className="bg-malawi-green hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl flex items-center gap-2 transition-all w-full sm:w-auto justify-center shadow-lg">
                  <Copy size={20} /> Copy Link
                </button>
              </div>
            </div>
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-malawi-red/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-malawi-green/20 rounded-full blur-3xl"></div>
          </div>

          {/* AI Marketing Brainstormer */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden ring-1 ring-malawi-green/5">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-malawi-green/5 to-transparent">
              <div className="flex items-center gap-2">
                <Sparkles className="text-malawi-green" size={20} />
                <h3 className="font-black text-lg text-malawi-black uppercase tracking-tight">AI Marketing Brainstormer</h3>
              </div>
              <span className="text-[9px] font-black bg-malawi-green text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Active</span>
            </div>
            <div className="p-6 space-y-4">
              {!aiResponse ? (
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
                   <p className="text-sm text-gray-500 mb-4">Need help finding new affiliates in Malawi? Ask our AI for a local strategy!</p>
                   <div className="flex flex-wrap gap-2 justify-center">
                      {["How to use WhatsApp Status?", "Pitch for Blantyre markets", "How to explain commissions?"].map(hint => (
                        <button key={hint} onClick={() => setAiPrompt(hint)} className="text-[10px] font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-full hover:border-malawi-green hover:text-malawi-green transition-all">{hint}</button>
                      ))}
                   </div>
                </div>
              ) : (
                <div className="bg-malawi-green/5 p-6 rounded-2xl border border-malawi-green/10 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-2 text-malawi-green font-black text-[10px] uppercase tracking-widest">
                    <Sparkles size={14} /> Marketing Assistant:
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
                  <button onClick={() => {setAiResponse(null); setAiPrompt("");}} className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-malawi-red transition-colors flex items-center gap-1">
                    Clear Advice <ChevronRight size={10} />
                  </button>
                </div>
              )}

              <form onSubmit={askMarketingAssistant} className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-grow bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green transition-all text-sm font-medium"
                  placeholder="e.g. How do I recruit members in Mzuzu?"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={isAskingAI}
                />
                <button 
                  type="submit" 
                  disabled={isAskingAI || !aiPrompt.trim()}
                  className="bg-malawi-black text-white p-3 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 shadow-md active:scale-95"
                >
                  {isAskingAI ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column - Activity */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-full">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-malawi-black">Recent Activity</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">History</p>
            </div>
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {myReferrals.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users size={32} />
                  </div>
                  <p className="text-sm italic">No referrals yet. Share your link!</p>
                </div>
              ) : (
                myReferrals.map((ref) => {
                  const referredUser = state.users.find(u => u.id === ref.referredId);
                  return (
                    <div key={ref.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-malawi-green/10 text-malawi-green rounded-full flex items-center justify-center font-bold overflow-hidden border border-malawi-green/20">
                          {referredUser?.profilePic ? <img src={referredUser.profilePic} alt="" className="w-full h-full object-cover" /> : <UserIcon size={18} className="text-malawi-green/40" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-malawi-green transition-colors text-sm">{referredUser?.fullName}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-black">L{ref.level} • {new Date(ref.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-malawi-green text-sm">+MWK {ref.commission.toLocaleString()}</p>
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
