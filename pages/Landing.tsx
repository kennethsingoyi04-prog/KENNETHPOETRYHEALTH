
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Users, 
  Wallet, 
  Zap, 
  ShieldCheck, 
  Smartphone, 
  TrendingUp, 
  CheckCircle, 
  MessageCircle,
  Award,
  ArrowRight
} from 'lucide-react';
import { MEMBERSHIP_TIERS } from '../constants';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen -mt-6 -mx-4 font-sans text-malawi-black selection:bg-malawi-green selection:text-white">
      {/* Dynamic Hero Section */}
      <section className="bg-malawi-black text-white pt-24 pb-32 px-6 relative overflow-hidden border-b-8 border-malawi-red">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="flex flex-col gap-6">
              <img src="/logo.png" alt="KPH Logo" className="w-32 h-32 md:w-48 md:h-48 object-contain drop-shadow-2xl animate-in zoom-in duration-1000" />
              <div className="inline-flex items-center w-fit gap-2 bg-malawi-green/20 text-malawi-green px-5 py-2.5 rounded-full border border-malawi-green/30 text-xs font-black uppercase tracking-[0.2em]">
                <Zap size={16} className="animate-pulse" /> Malawi's #1 Affiliate System
              </div>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black leading-[0.9] uppercase tracking-tighter">
              Earn <span className="text-malawi-green">MWK</span> For Every Person You <span className="text-malawi-red relative">Invite.<span className="absolute bottom-0 left-0 w-full h-2 bg-malawi-red/30 -z-10"></span></span>
            </h1>
            
            <div className="space-y-4 max-w-xl">
              <p className="text-xl md:text-2xl text-gray-300 font-bold leading-tight">
                Join the Network. Unlock exclusive earnings and multi-level commissions.
              </p>
              <p className="text-gray-400 text-lg leading-relaxed">
                Invite friends and earn up to <span className="text-white font-black">15% combined commission!</span> We support instant withdrawals to <span className="text-malawi-red font-bold">Airtel Money</span> and <span className="text-malawi-green font-bold">TNM Mpamba</span>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-5">
              <button 
                onClick={() => navigate('/auth?type=signup')}
                className="group bg-malawi-green hover:bg-green-700 text-white font-black py-6 px-12 rounded-3xl flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(17,129,49,0.3)] transition-all active:scale-95 text-xl"
              >
                Start Earning Now <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => navigate('/auth?type=login')}
                className="bg-white/10 hover:bg-white/20 text-white font-black py-6 px-12 rounded-3xl border border-white/10 transition-all flex items-center justify-center gap-2 text-xl backdrop-blur-md"
              >
                Member Login
              </button>
            </div>

            <div className="flex items-center gap-8 pt-8 border-t border-white/5">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`w-12 h-12 rounded-full border-4 border-malawi-black flex items-center justify-center text-xs font-black shadow-xl bg-gradient-to-br ${i % 2 === 0 ? 'from-malawi-red to-red-900' : 'from-malawi-green to-green-900'}`}>
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
                <div className="w-12 h-12 rounded-full border-4 border-malawi-black bg-white text-malawi-black flex items-center justify-center text-xs font-black shadow-xl">
                  +12k
                </div>
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-white">Active Members</p>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Across all 28 districts of Malawi</p>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block relative animate-in zoom-in duration-1000 delay-200">
            {/* Abstract Background Element */}
            <div className="absolute inset-0 bg-gradient-to-br from-malawi-green/20 via-transparent to-malawi-red/20 rounded-[5rem] rotate-6 blur-3xl"></div>
            
            <div className="relative bg-neutral-900/80 backdrop-blur-2xl border border-white/10 p-10 rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] space-y-8 transform hover:scale-[1.02] transition-transform duration-500">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">Platform Activity</h3>
                  <p className="text-2xl font-black text-white">Live Commissions</p>
                </div>
                <div className="w-12 h-12 bg-malawi-green/20 rounded-2xl flex items-center justify-center text-malawi-green">
                  <TrendingUp size={24} />
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { name: 'Chisomo Phiri', amount: 45000, time: '2m ago', type: 'Level 1' },
                  { name: 'Kondwani Moyo', amount: 12500, time: '5m ago', type: 'Level 2' },
                  { name: 'Tiwonge Kaunda', amount: 82000, time: '12m ago', type: 'Level 1' }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${i % 2 === 0 ? 'bg-malawi-green/20 text-malawi-green' : 'bg-malawi-red/20 text-malawi-red'}`}>
                        {item.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-white">{item.name}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{item.type} Bonus</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-malawi-green">MWK {item.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Withdrawal status:</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-malawi-green rounded-full animate-pulse"></span>
                  <p className="text-[10px] font-black text-malawi-green uppercase tracking-widest">All Gateways Active</p>
                </div>
              </div>
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -bottom-6 -right-6 bg-malawi-red p-8 rounded-full shadow-2xl border-4 border-malawi-black transform -rotate-12 animate-bounce">
              <p className="text-white font-black text-center leading-none">
                <span className="text-xs uppercase tracking-widest block mb-1">Signup Bonus</span>
                <span className="text-2xl">MWK 1,000</span>
              </p>
            </div>
          </div>
        </div>

        {/* Ambient Lights */}
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-malawi-green/5 rounded-full blur-[150px] -mr-80 -mt-80"></div>
        <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-malawi-red/5 rounded-full blur-[150px] -ml-80 -mb-80"></div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-6 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-24">
            <p className="text-malawi-green font-black uppercase tracking-[0.3em] text-xs">How it works</p>
            <h2 className="text-5xl md:text-6xl font-black text-malawi-black uppercase tracking-tight">Your Journey to <span className="text-malawi-red">Profit</span></h2>
            <p className="text-gray-500 max-w-2xl mx-auto font-bold text-lg leading-relaxed">Simple, transparent, and officially recognized. Start earning in 3 minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <Users size={40} />,
                title: "1. Create Account",
                desc: "Sign up for free and get your unique affiliate link. You immediately receive a MWK 1,000 welcome bonus.",
                color: "malawi-black"
              },
              {
                icon: <MessageCircle size={40} />,
                title: "2. Share & Promote",
                desc: "Share your link on WhatsApp Status, Facebook, and with friends. Build your Level 1 and Level 2 network.",
                color: "malawi-red"
              },
              {
                icon: <Wallet size={40} />,
                title: "3. Cash Out Daily",
                desc: "Activate a tier to unlock withdrawals. Transfer your earnings directly to Airtel Money or TNM Mpamba.",
                color: "malawi-green"
              }
            ].map((feature, i) => (
              <div key={i} className="group p-12 bg-gray-50 rounded-[3rem] border border-gray-100 hover:bg-white hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] transition-all duration-500 relative">
                <div className={`w-20 h-20 mb-8 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-3 duration-500 bg-${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black mb-4 uppercase tracking-tight text-malawi-black">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed font-bold text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Tiers Preview Section */}
      <section className="py-32 px-6 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-end justify-between gap-8 mb-20">
            <div className="space-y-4 text-left lg:max-w-xl">
              <p className="text-malawi-red font-black uppercase tracking-[0.3em] text-xs">Unlock tiers</p>
              <h2 className="text-5xl font-black text-malawi-black uppercase tracking-tighter leading-[0.9]">Professional <span className="text-malawi-green">Earning</span> Levels</h2>
            </div>
            <p className="text-gray-500 font-bold max-w-sm text-right lg:pb-2">
              Each tier unlocks higher trust levels and priority verification for your payout requests.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MEMBERSHIP_TIERS.map((tier) => (
              <div key={tier.tier} className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity mr-[-1rem] mt-[-1rem]">
                   <Award size={100} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: tier.color }}>{tier.name} Membership</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-sm font-black text-gray-400">MWK</span>
                  <span className="text-4xl font-black text-malawi-black">{tier.price.toLocaleString()}</span>
                </div>
                <div className="space-y-3 mb-8">
                  {["10% L1 Commission", "5% L2 Commission", "Daily Withdrawals", "Official Dashboard"].map(benefit => (
                    <div key={benefit} className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <CheckCircle size={14} className="text-malawi-green" />
                      {benefit}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 font-medium italic border-t border-gray-100 pt-4">
                  {tier.description}
                </p>
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
             <button 
               onClick={() => navigate('/auth?type=signup')}
               className="inline-flex items-center gap-2 text-malawi-black font-black uppercase tracking-widest hover:text-malawi-green transition-colors border-b-4 border-malawi-green pb-1 group"
             >
                See full benefits & Register <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
             </button>
          </div>
        </div>
      </section>

      {/* Commission Deep Dive */}
      <section className="bg-malawi-black py-32 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-[4rem] p-12 md:p-20 text-center space-y-12 border border-white/10 shadow-[0_100px_150px_rgba(0,0,0,0.4)]">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">15% Combined Commissions</h2>
              <p className="text-gray-400 font-bold text-lg max-w-2xl mx-auto leading-relaxed">
                Build a sustainable passive income stream by leveraging your social connections. We pay you for two generations of invites.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="p-10 bg-white/5 rounded-[3rem] border border-white/5 backdrop-blur-md group hover:bg-white/10 transition-all">
                <p className="text-7xl font-black text-malawi-green mb-4">10%</p>
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white">Level 1: Direct</h4>
                <p className="text-xs text-gray-500 mt-4 leading-relaxed font-medium">Earn from everyone who signs up using your direct referral link.</p>
              </div>
              <div className="p-10 bg-white/5 rounded-[3rem] border border-white/5 backdrop-blur-md group hover:bg-white/10 transition-all">
                <p className="text-7xl font-black text-malawi-red mb-4">5%</p>
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white">Level 2: Indirect</h4>
                <p className="text-xs text-gray-500 mt-4 leading-relaxed font-medium">Earn from friends invited by your direct referrals. Passive income at its best.</p>
              </div>
            </div>

            <button 
              onClick={() => navigate('/auth?type=signup')}
              className="bg-white text-malawi-black font-black py-6 px-16 rounded-3xl text-xl shadow-2xl hover:bg-malawi-green hover:text-white transition-all active:scale-95 uppercase tracking-widest"
            >
              Get Started Now
            </button>
          </div>
        </div>
        
        {/* Abstract shapes for visual pop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-malawi-green/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-malawi-red/10 rounded-full blur-[120px]"></div>
      </section>

      {/* FAQ / Trust Signals Section */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-20">
             <h2 className="text-4xl font-black text-malawi-black uppercase tracking-tight">Common Questions</h2>
             <p className="text-gray-500 font-bold">Everything you need to know before joining.</p>
          </div>

          <div className="space-y-6">
            {[
              { q: "Is registration really free?", a: "Yes! You can register and start sharing your link immediately without paying anything. You even get a MWK 1,000 bonus." },
              { q: "When can I withdraw my money?", a: "Once your balance reaches MWK 5,000 and you have an active membership tier, you can request a withdrawal at any time." },
              { q: "Which networks are supported?", a: "We officially support Airtel Money and TNM Mpamba. All transactions are handled securely by our Malawian administrators." },
              { q: "What is the membership tier for?", a: "Tiers act as account verification. They ensure the platform remains secure and provide higher priority for your payout requests." }
            ].map((faq, idx) => (
              <div key={idx} className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                <h4 className="font-black text-lg text-malawi-black mb-3">{faq.q}</h4>
                <p className="text-gray-500 text-sm font-bold leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-malawi-black py-20 px-6 text-white border-t-4 border-malawi-green">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 pb-16 border-b border-white/5">
            <div className="space-y-4">
              <div className="flex items-center gap-3 font-black text-3xl">
                <img src="/logo.png" alt="KPH Logo" className="w-12 h-12 object-contain" />
                <span>KENNETH<span className="text-malawi-red">POETRYHEALTH</span></span>
              </div>
              <p className="text-gray-500 max-w-xs font-bold text-sm">
                Empowering Malawian youth and entrepreneurs through accessible affiliate marketing and daily mobile money payouts.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Company</p>
                <ul className="space-y-2 text-sm font-bold text-gray-500">
                  <li className="hover:text-white transition-colors cursor-pointer">About Us</li>
                  <li className="hover:text-white transition-colors cursor-pointer">Official Website</li>
                  <li className="hover:text-white transition-colors cursor-pointer">Contact</li>
                </ul>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Support</p>
                <ul className="space-y-2 text-sm font-bold text-gray-500">
                  <li className="hover:text-white transition-colors cursor-pointer">WhatsApp Group</li>
                  <li className="hover:text-white transition-colors cursor-pointer">Payout Status</li>
                  <li className="hover:text-white transition-colors cursor-pointer">FAQ</li>
                </ul>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Legal</p>
                <ul className="space-y-2 text-sm font-bold text-gray-500">
                  <li className="hover:text-white transition-colors cursor-pointer">Terms of Service</li>
                  <li className="hover:text-white transition-colors cursor-pointer">Privacy Policy</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-12 flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
              © 2025 KENNETHPOETRYHEALTH Malawi. Registered in Lilongwe, Malawi.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-black text-malawi-red uppercase">
                <ShieldCheck size={14} /> Certified Secure
              </div>
              <div className="w-[1px] h-4 bg-white/10"></div>
              <div className="flex items-center gap-2 text-[10px] font-black text-malawi-green uppercase">
                <CheckCircle size={14} /> Daily Payouts Guaranteed
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
