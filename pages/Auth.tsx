
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppState, User, MembershipTier, MembershipStatus } from '../types';
import Logo from '../components/Logo';
import { Lock, User as UserIcon, ChevronRight, AtSign, ArrowLeft, Loader2, AlertCircle, ShieldCheck, Key, Smartphone, Mail } from 'lucide-react';
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
  const [adminMode, setAdminMode] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    whatsapp: '',
    password: '',
    referralCode: searchParams.get('ref') || '',
    masterKey: ''
  });

  useEffect(() => {
    setIsLogin(typeParam !== 'signup');
    setError(null);
  }, [typeParam]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    setTimeout(() => {
      if (isLogin) {
        const identifier = formData.username || formData.email;
        if (!identifier) {
          setError('Please enter your username or email.');
          setIsLoading(false);
          return;
        }
        const success = onLogin(identifier, formData.password);
        if (!success) {
          setError('Invalid login details. Try again.');
          setIsLoading(false);
        } else {
          navigate('/dashboard');
        }
      } else {
        // Validation for Signup
        if (adminMode && formData.masterKey !== state.systemSettings?.masterKey) {
          setError('Invalid Master Authorization Key.');
          setIsLoading(false);
          return;
        }

        const isUsernameTaken = state.users.some(u => u.username.toLowerCase() === formData.username.toLowerCase());
        if (isUsernameTaken) {
          setError('Username already in use.');
          setIsLoading(false);
          return;
        }
        
        finishRegistration();
      }
    }, 1000);
  };

  const finishRegistration = () => {
    const userId = `u-${Date.now()}`;
    const newUserReferralCode = formData.username.toUpperCase() + Math.floor(Math.random() * 100);
    const referrer = state.users.find(u => u.referralCode === formData.referralCode);
    
    const newUser: User = {
      id: userId,
      username: formData.username.toLowerCase().trim(),
      fullName: formData.fullName,
      email: formData.email || `${formData.username.toLowerCase()}@kph.mw`,
      phone: formData.phone,
      whatsapp: formData.whatsapp,
      password: formData.password,
      referralCode: newUserReferralCode,
      referredBy: referrer?.id,
      role: adminMode ? 'ADMIN' : 'USER',
      balance: 0,
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
      membershipTier: adminMode ? MembershipTier.GOLD : MembershipTier.NONE,
      membershipStatus: adminMode ? MembershipStatus.ACTIVE : MembershipStatus.INACTIVE,
      notificationPrefs: {
        emailWithdrawal: true,
        emailReferral: true,
        whatsappWithdrawal: true,
        whatsappReferral: true
      }
    };

    onStateUpdate({
      users: [...state.users, newUser],
      currentUser: newUser
    });

    notifyNewRegistration(newUser.fullName, newUser.email, newUserReferralCode);
    setIsLoading(false);
    navigate(adminMode ? '/admin' : '/activate');
  };

  return (
    <div className="max-w-md mx-auto py-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-malawi-black font-black uppercase text-[10px] tracking-widest transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          onClick={() => setAdminMode(!adminMode)} 
          className={`flex items-center gap-2 px-3 py-1 text-[9px] font-black uppercase rounded-full border transition-all ${adminMode ? 'bg-malawi-black text-white border-malawi-black' : 'text-gray-300 border-gray-100 hover:bg-gray-50'}`}
        >
          <ShieldCheck size={12} /> Admin Portal
        </button>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-t-8 border-malawi-green">
        <div className="text-center mb-10">
           <Logo size="lg" variant="dark" className="mb-4" />
           <h2 className="text-3xl font-black uppercase tracking-tight text-malawi-black">
             {isLogin ? 'Member Login' : 'Create Account'}
           </h2>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-in shake duration-300">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-bold leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="text" required placeholder="John Phiri" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{isLogin ? 'Username or Email' : 'Username'}</label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input type="text" required placeholder="username" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input type="password" required placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone</label>
                  <input type="tel" required placeholder="088xxxx" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                  <input type="tel" required placeholder="099xxxx" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
                <input type="text" placeholder="CODE" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green" value={formData.referralCode} onChange={e => setFormData({...formData, referralCode: e.target.value})} />
              </div>
            </>
          )}

          {adminMode && !isLogin && (
            <div className="space-y-1 pt-2 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-malawi-red uppercase tracking-widest ml-1">Master Authorization Key</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-malawi-red" size={18} />
                <input type="password" required placeholder="KPH-XXXX" className="w-full pl-12 pr-4 py-4 bg-red-50 border border-red-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-red text-malawi-red" value={formData.masterKey} onChange={e => setFormData({...formData, masterKey: e.target.value})} />
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full py-5 bg-malawi-green text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-[11px] uppercase tracking-widest disabled:opacity-70 mt-4">
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? 'Grant Access' : 'Create Record')}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
          {isLogin ? "New to KPH?" : "Already a member?"}
          <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-black text-malawi-red hover:underline">
            {isLogin ? 'Join Now' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
