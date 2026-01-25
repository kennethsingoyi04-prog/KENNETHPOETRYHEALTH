
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppState, User, MembershipTier, MembershipStatus } from '../types';
import Logo from '../components/Logo';
import { Lock, User as UserIcon, ChevronRight, AtSign, ArrowLeft, Loader2, AlertCircle, ShieldCheck, Key } from 'lucide-react';
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
  const [isAdminMode, setIsAdminMode] = useState(false);
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
    masterKey: ''
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
    
    setTimeout(() => {
      if (isLogin) {
        const identifier = formData.username || formData.email;
        const success = onLogin(identifier, formData.password);
        if (!success) {
          setError('Invalid credentials. Please verify your details.');
          setIsLoading(false);
        } else {
          navigate('/dashboard');
        }
      } else {
        if (isAdminMode && formData.masterKey !== state.systemSettings?.masterKey) {
          setError('Invalid Master Authorization Key.');
          setIsLoading(false);
          return;
        }

        const isUsernameTaken = state.users.some(u => u.username.toLowerCase() === formData.username.toLowerCase());
        if (isUsernameTaken) {
          setError('This username is already taken.');
          setIsLoading(false);
          return;
        }
        finishRegistration();
      }
    }, 1200);
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
      role: isAdminMode ? 'ADMIN' : 'USER',
      balance: 0, // No signup bonus, balance reflects real work only
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
      membershipTier: isAdminMode ? MembershipTier.GOLD : MembershipTier.NONE,
      membershipStatus: isAdminMode ? MembershipStatus.ACTIVE : MembershipStatus.INACTIVE,
      notificationPrefs: {
        emailWithdrawal: true,
        emailReferral: true,
        whatsappWithdrawal: true,
        whatsappReferral: true
      }
    };

    const updatedUsers = [...state.users, newUser];

    onStateUpdate({
      users: updatedUsers,
      currentUser: newUser
    });

    notifyNewRegistration(newUser.fullName, newUser.email, newUserReferralCode);
    setIsLoading(false);
    navigate(isAdminMode ? '/admin' : '/activate');
  };

  return (
    <div className="max-w-md mx-auto py-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-malawi-black font-black uppercase text-[10px] tracking-widest transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={() => setIsAdminMode(!isAdminMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isAdminMode ? 'bg-malawi-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
          <ShieldCheck size={14} />
          {isAdminMode ? 'Admin Headquarters' : 'Member Portal'}
        </button>
      </div>

      <div className={`bg-white p-10 rounded-[3rem] shadow-2xl border-t-8 ${isAdminMode ? 'border-malawi-black' : 'border-malawi-green'} relative overflow-hidden transition-all duration-500`}>
        <div className="flex flex-col items-center mb-8">
           <Logo size="lg" className="!text-malawi-black mb-4" />
           <h2 className="text-3xl font-black uppercase tracking-tight text-malawi-black text-center">
             {isLogin ? 'Member Login' : 'Create Account'}
           </h2>
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
                <input type="text" required placeholder="John Phiri" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Handle / Username</label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" required placeholder="johnphiri265" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Secret</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="password" required placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
              <input type="text" placeholder="REFCODE" className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all" value={formData.referralCode} onChange={e => setFormData({...formData, referralCode: e.target.value})} />
            </div>
          )}

          {isAdminMode && !isLogin && (
            <div className="space-y-1 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-malawi-red uppercase tracking-widest ml-1">Owner Authorization Key</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-malawi-red" size={18} />
                <input type="password" required placeholder="KPH-OWNER-XXXX" className="w-full pl-12 pr-4 py-4 bg-red-50 border border-red-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-red transition-all text-malawi-red placeholder:text-red-200" value={formData.masterKey} onChange={e => setFormData({...formData, masterKey: e.target.value})} />
              </div>
            </div>
          )}

          <button type="submit" disabled={isLoading} className={`w-full ${isAdminMode ? 'bg-malawi-black hover:bg-gray-800' : 'bg-malawi-green hover:bg-green-700'} text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm uppercase tracking-widest disabled:opacity-70`}>
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Grant Access' : 'Establish Record')}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-500 font-medium">
          {isLogin ? "No account?" : "Already a member?"}
          <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-black text-malawi-red hover:underline uppercase text-xs tracking-wider">
            {isLogin ? 'Join Now' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
