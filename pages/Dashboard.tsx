
import React, { useState } from 'react';
import { AppState, MembershipStatus, BookSellerStatus } from '../types';
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
  ChevronRight,
  ShieldAlert,
  BookOpen,
  Phone,
  CheckCircle,
  X,
  // Added Zap icon to resolve the reported error
  Zap
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onStateUpdate }) => {
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

  // Book Selling Application State
  const [showBookForm, setShowBookForm] = useState(false);
  const [bookPhone, setBookPhone] = useState(user.phone);
  const [bookWhatsapp, setBookWhatsapp] = useState(user.whatsapp);
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied to clipboard!');
  };

  const askMarketingAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    
    // Removed explicit API_KEY check and error message to comply with guidelines
    setIsAskingAI(true);
    setAiResponse(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as an expert affiliate marketing mentor specializing in the Malawi market (Blantyre, Lilongwe, Mzuzu, etc.). A user is asking: "${aiPrompt}". Provide specific, actionable advice for the KENNETHPOETRYHEALTH platform. Mention local tactics like using WhatsApp statuses, community gatherings, or local market networking. Keep the response concise and encouraging.`,
      });
      
      setAiResponse(response.text || "I'm sorry, I couldn't generate a response at this time.");
    } catch (err) {
      console.error("AI Marketing Assistant failed", err);
      setAiResponse("I'm having a bit of trouble connecting to the network. Please try again later!");
    } finally {
      setIsAskingAI(false);
    }
  };

  const handleBookApplication = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBook(true);
    
    setTimeout(() => {
      const updatedUser = { 
        ...user, 
        bookSellerStatus: BookSellerStatus.PENDING,
        bookSellerPhone: bookPhone,
        bookSellerWhatsapp: bookWhatsapp
      };
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      onStateUpdate({ users: updatedUsers, currentUser: updatedUser });
      setIsSubmittingBook(false);
      setShowBookForm(false);
    }, 1000);
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
            {user.bookSellerStatus === BookSellerStatus.APPROVED && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 shadow-sm">
                <BookOpen size={14} />
                <span className="text-[10px] font-black uppercase tracking-tight">Certified Book Seller</span>
              </div>
            )}
          </div>
        </div>
        <div className="bg-malawi-green text-white px-6 py-4 rounded-xl shadow-md border-l-8 border-malawi-black">
          <p className="text-xs uppercase font-bold tracking-wider opacity-80">Current Balance</p>
          <p className="text-3xl font-black">MWK {user.balance.toLocaleString()}</p>
        </div>
      </header>

      {/* Book Seller Application Overlay */}
      {showBookForm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="bg-malawi-black p-8 text-white relative">
                <button onClick={() => setShowBookForm(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                <div className="bg-malawi-red w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-500/20">
                   <BookOpen size={32} />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Book Selling Permit</h2>
                <p className="text-gray-400 text-xs font-bold uppercase mt-1">Enroll as an official KPH Bookstore Affiliate</p>
             </div>
             <form onSubmit={handleBookApplication} className="p-8 space-y-6">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Verified Name</label>
                   <p className="p-4 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-500">{user.fullName}</p>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                   <input type="tel" required className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-malawi-red" value={bookPhone} onChange={e => setBookPhone(e.target.value)} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Number</label>
                   <input type="tel" required className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-malawi-red" value={bookWhatsapp} onChange={e => setBookWhatsapp(e.target.value)} />
                </div>
                <button type="submit" disabled={isSubmittingBook} className="w-full py-5 bg-malawi-red text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/10 transition-all active:scale-95 flex items-center justify-center gap-2">
                   {isSubmittingBook ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                   {isSubmittingBook ? 'Processing...' : 'Submit Application'}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Book Seller Banner */}
      {!user.bookSellerStatus || user.bookSellerStatus === BookSellerStatus.NONE || user.bookSellerStatus === BookSellerStatus.REJECTED ? (
        <div className="bg-gradient-to-r from-malawi-red to-[#b90e2d] p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
           <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] opacity-80">
                 <Zap size={14} className="fill-white" /> New Opportunity
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight">Enroll as a <span className="text-black">Book Seller</span></h2>
              <p className="text-white/70 font-medium max-w-md">Earn additional commissions by distributing our premium health and poetry collections across Malawi.</p>
           </div>
           <button onClick={() => setShowBookForm(true)} className="bg-white text-malawi-red font-black px-10 py-5 rounded-2xl uppercase text-xs tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all z-10">
              Apply to Sell
           </button>
           <div className="absolute right-[-5%] bottom-[-10%] opacity-10">
              <BookOpen size={200} />
           </div>
        </div>
      ) : user.bookSellerStatus === BookSellerStatus.PENDING ? (
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center justify-between animate-pulse">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Clock size={24} /></div>
              <div>
                 <p className="text-xs font-black uppercase text-blue-600">Book Seller Application Pending</p>
                 <p className="text-sm font-medium text-blue-800">Your request is being reviewed by the bookstore administrator.</p>
              </div>
           </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden ring-1 ring-malawi-green/5">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-malawi-green/5 to-transparent">
              <div className="flex items-center gap-2">
                <Sparkles className="text-malawi-green" size={20} />
                <h3 className="font-black text-lg text-malawi-black uppercase tracking-tight">AI Marketing Brainstormer</h3>
              </div>
              {/* Removed prohibited API key status badge */}
            </div>
            <div className="p-6 space-y-4">
              {!aiResponse ? (
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center">
                   <p className="text-sm text-gray-500 mb-4">Need help finding new affiliates in Malawi? Ask our AI for a local strategy!</p>
                   {/* Removed prohibited API key missing alert */}
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
                    <div key={ref.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
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
