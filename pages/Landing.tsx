import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
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
    <div className="min-h-screen -mt-6 -mx-4 font-sans text-malawi-black selection:bg-malawi-green selection:text-white bg-white">
      {/* Dynamic Hero Section */}
      <section className="bg-malawi-black text-white pt-24 pb-32 px-6 relative overflow-hidden border-b-8 border-malawi-red">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-malawi-green/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-malawi-red/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="flex flex-col gap-8 items-start">
              <Logo size="xl" variant="light" showText={false} />
              <div className="inline-flex items-center w-fit gap-2 bg-malawi-green/20 text-malawi-green px-5 py-2.5 rounded-full border border-malawi-green/30 text-xs font-black uppercase tracking-[0.2em] shadow-xl">
                <Zap size={16} className="animate-pulse" /> Transforming Lives Across Malawi
              </div>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-black leading-[0.9] uppercase tracking-tighter">
              Empowerment <span className="text-malawi-green">Through</span> <span className="text-malawi-red relative inline-block">Affiliation.<span className="absolute bottom-1 left-0 w-full h-3 bg-malawi-red/40 -z-10"></span></span>
            </h1>
            
            <div className="space-y-4 max-w-xl">
              <p className="text-xl md:text-2xl text-gray-300 font-bold leading-tight italic">
                "Malawi's most trusted affiliate network for growth."
              </p>
              <p className="text-gray-400 text-lg leading-relaxed">
                Join <span className="text-white font-black">KENNETHPOETRYHEALTH</span> today. We are a community-driven movement dedicated to <span className="text-malawi-green font-bold">Transforming Lives</span> through secure digital earnings and local payout support via Airtel Money and TNM Mpamba.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 pt-4">
              <button 
                onClick={() => navigate('/auth?type=signup')}
                className="group bg-malawi-green hover:bg-green-700 text-white font-black py-6 px-12 rounded-[2rem] flex items-center justify-center gap-4 shadow-[0_20px_60px_rgba(17,129,49,0.4)] transition-all active:scale-95 text-xl uppercase tracking-wider"
              >
                Join Now <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => navigate('/auth?type=login')}
                className="bg-white/5 hover:bg-white/10 text-white font-black py-6 px-12 rounded-[2rem] border border-white/10 transition-all flex items-center justify-center gap-2 text-xl backdrop-blur-md uppercase tracking-wider"
              >
                Member Portal
              </button>
            </div>
          </div>
          
          <div className="hidden lg:block relative animate-in zoom-in duration-1000 delay-300">
            <div className="relative bg-neutral-900/60 backdrop-blur-3xl border border-white/10 p-12 rounded-[5rem] shadow-2xl">
               <div className="space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="space-y-2">
                       <div className="h-2 w-24 bg-malawi-green/40 rounded-full"></div>
                       <div className="h-6 w-48 bg-white/20 rounded-lg"></div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-malawi-green/20 border border-malawi-green/30 flex items-center justify-center text-malawi-green">
                       <TrendingUp size={24} />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-3">
                      <div className="h-2 w-16 bg-gray-500/30 rounded-full"></div>
                      <div className="h-8 w-24 bg-malawi-green rounded-lg"></div>
                   </div>
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-3">
                      <div className="h-2 w-16 bg-gray-500/30 rounded-full"></div>
                      <div className="h-8 w-24 bg-malawi-red rounded-lg"></div>
                   </div>
                 </div>
                 <div className="h-32 bg-white/5 rounded-[2rem] border border-white/5 flex items-center justify-center italic text-gray-500 text-sm">
                    Interactive Dashboard Preview
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-malawi-green font-black uppercase tracking-[0.4em] text-[10px] mb-2">Our Foundation</p>
            <h2 className="text-4xl font-black uppercase tracking-tight text-malawi-black">Why KPH <span className="text-malawi-red">Transform</span>?</h2>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto font-medium">Providing the most reliable affiliate experience in Malawi with local payment integrations.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-12 rounded-[3.5rem] bg-gray-50 border border-gray-100 space-y-6 hover:shadow-xl transition-all hover:bg-white group">
              <div className="w-16 h-16 bg-malawi-green/10 text-malawi-green rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Fast Payouts</h3>
              <p className="text-gray-500 leading-relaxed">Withdraw your earnings directly to your mobile wallet within hours. We prioritize your financial liquidity.</p>
            </div>
            <div className="p-12 rounded-[3.5rem] bg-gray-50 border border-gray-100 space-y-6 hover:shadow-xl transition-all hover:bg-white group">
              <div className="w-16 h-16 bg-malawi-red/10 text-malawi-red rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Multi-Level</h3>
              <p className="text-gray-500 leading-relaxed">Earn up to 15% combined commission from your direct and indirect network. Build a legacy of passive income.</p>
            </div>
            <div className="p-12 rounded-[3.5rem] bg-gray-50 border border-gray-100 space-y-6 hover:shadow-xl transition-all hover:bg-white group">
              <div className="w-16 h-16 bg-malawi-black/10 text-malawi-black rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Malawi Standard</h3>
              <p className="text-gray-500 leading-relaxed">A robust platform built by local experts, ensuring security and cultural relevance in every transaction.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Tiers Preview Section */}
      <section className="py-24 px-6 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black uppercase tracking-tight">Flexible Membership</h2>
            <p className="text-gray-500 mt-4 font-medium">Unlock your potential. Choose a tier that fits your ambition.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {MEMBERSHIP_TIERS.map(tier => (
              <div key={tier.tier} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col h-full">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4" style={{ color: tier.color }}>{tier.name} ACCESS</p>
                <h4 className="text-4xl font-black mb-4 text-malawi-black">MWK {tier.price.toLocaleString()}</h4>
                <p className="text-sm text-gray-500 mb-8 flex-grow leading-relaxed">{tier.description}</p>
                <div className="flex items-center gap-3 text-malawi-green font-black text-[10px] uppercase tracking-widest pt-6 border-t border-gray-50">
                  <CheckCircle size={18} /> Lifetime Platform Access
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-malawi-black text-white text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto relative z-10 space-y-10">
           <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none">Ready to start <span className="text-malawi-green">transforming</span> your life?</h2>
           <p className="text-gray-400 text-xl">Join thousands of Malawian affiliates today.</p>
           <button 
             onClick={() => navigate('/auth?type=signup')}
             className="bg-malawi-red hover:bg-red-700 text-white font-black py-6 px-16 rounded-full text-xl uppercase tracking-widest transition-all shadow-[0_20px_60px_rgba(210,16,52,0.3)] hover:scale-105"
           >
              Create Free Account
           </button>
        </div>
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white rounded-full"></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white rounded-full"></div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-malawi-black text-white py-16 border-t-8 border-malawi-green">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <Logo size="md" variant="light" className="mb-8" />
          <div className="flex gap-8 mb-10 text-gray-500 font-black uppercase text-[10px] tracking-widest">
             <span className="hover:text-white cursor-pointer">Terms</span>
             <span className="hover:text-white cursor-pointer">Privacy</span>
             <span className="hover:text-white cursor-pointer">Support</span>
          </div>
          <p className="text-gray-600 text-xs font-bold">© {new Date().getFullYear()} KENNETHPOETRYHEALTH Malawi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;