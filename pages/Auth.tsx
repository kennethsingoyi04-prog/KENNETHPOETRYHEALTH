
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppState, User, Referral, MembershipTier, MembershipStatus } from '../types';
import { LEVEL_1_COMMISSION_PERCENT, LEVEL_2_COMMISSION_PERCENT, SIGNUP_BONUS, MEMBERSHIP_TIERS } from '../constants';
import { Mail, Lock, User as UserIcon, Phone, Smartphone, ChevronRight, AtSign, Upload, CheckCircle2, Info, MessageSquare, ExternalLink } from 'lucide-react';
import { notifyNewRegistration } from '../services/NotificationService';

interface AuthProps {
  state: AppState;
  onLogin: (identifier: string, password?: string) => boolean;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Auth: React.FC<AuthProps> = ({ state, onLogin, onStateUpdate }) => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1: Details, 2: Membership
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    whatsapp: '',
    password: '',
    referralCode: searchParams.get('ref') || '',
  });

  const [selectedTier, setSelectedTier] = useState<MembershipTier>(MembershipTier.BRONZE);
  const [membershipProof, setMembershipProof] = useState<string | null>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      const success = onLogin(formData.email || formData.username, formData.password);
      if (!success) alert('Invalid credentials. Check your username/email and password!');
    } else {
      if (step === 1) {
        // Validation for step 1
        const isUsernameTaken = state.users.some(u => u.username.toLowerCase() === formData.username.toLowerCase());
        if (isUsernameTaken) {
          alert('This username is already taken. Please choose another one.');
          return;
        }
        const isEmailTaken = state.users.some(u => u.email.toLowerCase() === formData.email.toLowerCase());
        if (isEmailTaken) {
          alert('This email address is already registered.');
          return;
        }
        setStep(2);
      } else {
        if (!membershipProof) {
          alert("Please upload proof of payment to proceed.");
          return;
        }
        finishRegistration();
      }
    }
  };

  const finishRegistration = () => {
    // Register New User
    const userId = `u-${Date.now()}`;
    const newUserReferralCode = formData.username.toUpperCase() + Math.floor(Math.random() * 100);
    
    const referrer = state.users.find(u => u.referralCode === formData.referralCode);
    
    const newUser: User = {
      id: userId,
      username: formData.username.toLowerCase().trim(),
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      whatsapp: formData.whatsapp,
      password: formData.password,
      referralCode: newUserReferralCode,
      referredBy: referrer?.id,
      role: 'USER',
      balance: SIGNUP_BONUS,
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
      membershipTier: selectedTier,
      membershipStatus: MembershipStatus.PENDING,
      membershipProofUrl: membershipProof || undefined
    };

    let updatedUsers = [...state.users, newUser];
    let updatedReferrals = [...state.referrals];

    // Handle Commissions
    if (referrer) {
      const l1Commission = (SIGNUP_BONUS * LEVEL_1_COMMISSION_PERCENT) / 100;
      const l1Referral: Referral = {
        id: `r-${Date.now()}-1`,
        referrerId: referrer.id,
        referredId: userId,
        level: 1,
        commission: l1Commission,
        timestamp: new Date().toISOString()
      };
      updatedReferrals.push(l1Referral);
      
      updatedUsers = updatedUsers.map(u => u.id === referrer.id ? {
        ...u,
        balance: u.balance + l1Commission,
        totalEarnings: u.totalEarnings + l1Commission
      } : u);

      if (referrer.referredBy) {
        const l2Referrer = state.users.find(u => u.id === referrer.referredBy);
        if (l2Referrer) {
          const l2Commission = (SIGNUP_BONUS * LEVEL_2_COMMISSION_PERCENT) / 100;
          const l2Referral: Referral = {
            id: `r-${Date.now()}-2`,
            referrerId: l2Referrer.id,
            referredId: userId,
            level: 2,
            commission: l2Commission,
            timestamp: new Date().toISOString()
          };
          updatedReferrals.push(l2Referral);

          updatedUsers = updatedUsers.map(u => u.id === l2Referrer.id ? {
            ...u,
            balance: u.balance + l2Commission,
            totalEarnings: u.totalEarnings + l2Commission
          } : u);
        }
      }
    }

    onStateUpdate({
      users: updatedUsers,
      referrals: updatedReferrals,
      currentUser: newUser
    });

    notifyNewRegistration(newUser.fullName, newUser.email, newUserReferralCode);
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setMembershipProof(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[80vh] bg-white rounded-3xl shadow-2xl overflow-hidden mt-8 max-w-5xl mx-auto border border-gray-100">
      {/* Visual Side */}
      <div className="lg:w-1/2 bg-malawi-black p-12 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <span className="bg-malawi-green text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xl">KP</span>
            <span className="text-2xl font-black">KENNETH<span className="text-malawi-red">POETRYHEALTH</span></span>
          </div>
          <h1 className="text-5xl font-black leading-tight mb-6">
            Join the <span className="text-malawi-green underline">Network</span>.
          </h1>
          <p className="text-gray-400 text-lg max-w-sm">
            Unlock exclusive earnings and multi-level commissions by activating your preferred membership tier.
          </p>
        </div>

        <div className="relative z-10 mt-12 space-y-4">
           {MEMBERSHIP_TIERS.slice(0, 3).map(tier => (
             <div key={tier.tier} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
               <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black" style={{ backgroundColor: tier.color + '20', color: tier.color }}>
                 {tier.name[0]}
               </div>
               <div>
                 <p className="text-sm font-bold">{tier.name}</p>
                 <p className="text-[10px] text-gray-500 uppercase tracking-widest">Activation: MWK {tier.price.toLocaleString()}</p>
               </div>
             </div>
           ))}
        </div>

        <div className="absolute top-0 right-0 w-64 h-64 bg-malawi-red/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-malawi-green/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Form Side */}
      <div className="lg:w-1/2 p-12 flex flex-col justify-center overflow-y-auto">
        <div className="max-w-md mx-auto w-full py-8">
          <div className="flex items-center gap-2 mb-6">
             {step === 1 && !isLogin && (
               <div className="flex items-center gap-2 w-full">
                 <div className="h-1 flex-1 bg-malawi-green rounded-full"></div>
                 <div className="h-1 flex-1 bg-gray-100 rounded-full"></div>
               </div>
             )}
             {step === 2 && (
               <div className="flex items-center gap-2 w-full">
                 <div className="h-1 flex-1 bg-malawi-green rounded-full"></div>
                 <div className="h-1 flex-1 bg-malawi-green rounded-full"></div>
               </div>
             )}
          </div>

          <h2 className="text-3xl font-bold mb-2">
            {isLogin ? 'Welcome Back!' : (step === 1 ? 'Create Account' : 'Membership')}
          </h2>
          <p className="text-gray-500 mb-8">
            {isLogin ? 'Sign in to access your dashboard' : (step === 1 ? 'Start your journey today' : 'Choose your tier & activate')}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {isLogin || step === 1 ? (
              <>
                {!isLogin && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" required placeholder="John Phiri"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green"
                        onChange={e => setFormData({...formData, fullName: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" required placeholder="johnphiri265"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green"
                      onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                </div>

                {!isLogin && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="email" required placeholder="john@example.mw"
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green"
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                        <input 
                          type="tel" required placeholder="+265..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green"
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp</label>
                        <input 
                          type="tel" required placeholder="+265..."
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green"
                          onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="password" required placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green"
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Referral Code (Optional)</label>
                    <input 
                      type="text" placeholder="REF123"
                      value={formData.referralCode}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green"
                      onChange={e => setFormData({...formData, referralCode: e.target.value})}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {MEMBERSHIP_TIERS.map((tier) => (
                    <button
                      key={tier.tier}
                      type="button"
                      onClick={() => setSelectedTier(tier.tier)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all ${
                        selectedTier === tier.tier ? 'border-malawi-green bg-green-50 ring-4 ring-green-500/5' : 'border-gray-100 bg-gray-50/50 grayscale opacity-60'
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-tighter" style={{ color: tier.color }}>{tier.name}</p>
                      <p className="text-sm font-black">MWK {tier.price.toLocaleString()}</p>
                    </button>
                  ))}
                </div>

                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 space-y-4">
                  <div className="flex gap-3 text-xs text-blue-800 leading-relaxed">
                    <Info className="shrink-0 text-blue-600" size={18} />
                    <p>
                      To activate your <span className="font-bold">{selectedTier}</span> membership, please request current payment details from our official sources:
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a 
                      href="https://wa.me/265888123456" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1ebd59] transition-all shadow-md active:scale-95"
                    >
                       <MessageSquare size={16} /> Official WhatsApp
                    </a>
                    <a 
                      href="https://kennethpoetryhealth.mw/payments" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-malawi-black text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md active:scale-95"
                    >
                       <ExternalLink size={16} /> Official Website
                    </a>
                  </div>
                  
                  <p className="text-[9px] text-blue-500 font-medium text-center uppercase tracking-tight">
                    * Beware of scammers. only use the above official links.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Upload Payment Receipt</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-50 transition-colors">
                    <input type="file" required accept="image/*" onChange={handleProofUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {membershipProof ? (
                      <div className="flex flex-col items-center gap-2">
                         <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md">
                           <img src={membershipProof} alt="Proof" className="w-full h-full object-cover" />
                         </div>
                         <p className="text-[10px] font-black text-malawi-green uppercase">Receipt Uploaded!</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="text-gray-300 mb-2" size={32} />
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Click to Select Screenshot</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button className="w-full bg-malawi-black hover:bg-gray-800 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all">
              {isLogin ? 'Sign In' : (step === 1 ? 'Next Step' : 'Activate Account')}
              <ChevronRight size={20} />
            </button>
            
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} className="w-full text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-malawi-black transition-colors">
                Back to details
              </button>
            )}
          </form>

          <p className="mt-8 text-center text-gray-500">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => { setIsLogin(!isLogin); setStep(1); }}
              className="ml-2 font-bold text-malawi-red hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
