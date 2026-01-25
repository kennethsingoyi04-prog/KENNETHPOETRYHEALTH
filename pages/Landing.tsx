
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { 
  ChevronRight, 
  Wallet, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  CheckCircle
} from 'lucide-react';
import { MEMBERSHIP_TIERS } from '../constants';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen -mt-6 -mx-4 font-sans text-malawi-black selection:bg-malawi-green selection:text-white bg-white">
      {/* Dynamic Hero Section */}
      <section className="bg-malawi-black text-white pt-24 pb-32 px-6 relative overflow-hidden border-b-8 border-malawi-red">
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

      {/* Membership Tiers Preview Section */}
      <section className="py-24 px-6 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black uppercase tracking-tight text-malawi-black">Membership Tiers</h2>
            <p className="text-gray-500 mt-4 font-medium italic">High commissions attached to every level of participation.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {MEMBERSHIP_TIERS.map(tier => (
              <div key={tier.tier} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 opacity-5" style={{ backgroundColor: tier.color }}></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: tier.color }}>{tier.name} ACCESS</p>
                <h4 className="text-4xl font-black mb-1 text-malawi-black">K{tier.price.toLocaleString()}</h4>
                <div className="flex flex-col gap-2 mt-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="bg-malawi-green text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{tier.directCommission}% Direct</span>
                    <span className="bg-malawi-red text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{tier.indirectCommission}% Indirect</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-8 flex-grow leading-relaxed">{tier.description}</p>
                <button 
                  onClick={() => navigate('/auth?type=signup')}
                  className="w-full py-4 bg-malawi-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-malawi-green transition-all"
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
