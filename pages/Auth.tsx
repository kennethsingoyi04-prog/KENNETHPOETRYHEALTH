
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppState, User, Referral, MembershipTier, MembershipStatus } from '../types';
import { LEVEL_1_COMMISSION_PERCENT, LEVEL_2_COMMISSION_PERCENT, SIGNUP_BONUS } from '../constants';
import Logo from '../components/Logo';
import { Lock, User as UserIcon, Phone, Smartphone, ChevronRight, AtSign, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { notifyNewRegistration } from '../services/NotificationService';

interface AuthProps {
  state: AppState;
  onLogin: (identifier: string, password?: string) => boolean;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Auth: React.FC<AuthProps> = ({ state, onLogin, onStateUpdate }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const typeParam = searchParams.get('type');
  
  const [isLogin, setIsLogin] = useState(typeParam !== 'signup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    whatsapp: '',
    password: '',
    referralCode: searchParams.get('ref') || '',
  });

  useEffect(() => {
    if (typeParam === 'signup') setIsLogin(false);
    if (typeParam === 'login') setIsLogin(true);
    setError(null);
  }, [typeParam]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Simulate network delay for a more realistic feel
    setTimeout(() => {
      if (isLogin) {
        const identifier = formData.username || formData.email;
        const success = onLogin(identifier, formData.password);
        if (!success) {
          setError('Invalid login credentials. Please check your username/email and password.');
          setIsLoading(false);
        } else {
          navigate('/dashboard');
        }
      } else {
        const isUsernameTaken = state.users.some(u => u.username.toLowerCase() === formData.username.toLowerCase());
        if (isUsernameTaken) {
          setError('This username is already taken. Please choose another one.');
          setIsLoading(false);
          return;
        }
        finishRegistration();
      }
    }, 1500);
  };

  const finishRegistration = () => {
    const userId = `u-${Date.now()}`;
    const newUserReferralCode = formData.username.toUpperCase() + Math.floor(Math.random() * 100);
    const referrer = state.users.find(u => u.referralCode === formData.referralCode);
    
    const newUser: User = {
      id: userId,
      username: formData.username.toLowerCase().trim(),
      fullName: formData.fullName,
      email: formData.email || `${formData.username.toLowerCase()}@example.mw`,
      phone: formData.phone,
      whatsapp: formData.whatsapp,
      password: formData.password,
      referralCode: newUserReferralCode,
      referredBy: referrer?.id,
      role: 'USER',
      balance: SIGNUP_BONUS,
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
      membershipTier: MembershipTier.NONE,
      membershipStatus: MembershipStatus.INACTIVE,
      notificationPrefs: {
        emailWithdrawal: true,
        emailReferral: true,
        whatsappWithdrawal: true,
        whatsappReferral: true
      }
    };

    let updatedUsers = [...state.users, newUser];
    let updatedReferrals = [...state.referrals];

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
    setIsLoading(false);
    navigate('/activate');
  };

  return (
    <div className="max-w-md mx-auto py-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <button 
        onClick={() => navigate('/')} 
        disabled={isLoading}
        className="mb-8 flex items-center gap-2 text-gray-400 hover:text-malawi-black font-black uppercase text-[10px] tracking-widest transition-colors disabled:opacity-50"
      >
        <ArrowLeft size={16} /> Back to Home
      </button>

      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-malawi-green/5 rounded-full -mr-16 -mt-16"></div>
        
        <div className="flex flex-col items-center mb-8">
           <Logo size="lg" className="!text-malawi-black mb-4" />
           <h2 className="text-3xl font-black uppercase tracking-tight text-malawi-black text-center">
             {isLogin ? 'Member Login' : 'Create Account'}
           </h2>
           <p className="text-gray-500 font-medium text-center text-sm mt-2">
             {isLogin ? 'Sign in to access your dashboard' : 'Join and earn MWK 1,000 bonus on signup'}
           </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-in shake duration-300">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-bold leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" required placeholder="John Phiri"
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all disabled:opacity-60"
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{isLogin ? 'Username or Email' : 'Desired Username'}</label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" required placeholder="johnphiri265"
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all disabled:opacity-60"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="tel" required placeholder="+265..."
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all disabled:opacity-60"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Verification</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="tel" required placeholder="+265..."
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all disabled:opacity-60"
                    value={formData.whatsapp}
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password" required placeholder="••••••••"
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all disabled:opacity-60"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-malawi-black hover:bg-gray-800 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-500 font-medium">
          {isLogin ? "Don't have an account yet?" : "Already a member?"}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            disabled={isLoading}
            className="ml-2 font-black text-malawi-red hover:underline uppercase text-xs tracking-wider disabled:opacity-50"
          >
            {isLogin ? 'Join Now' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
