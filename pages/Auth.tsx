
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppState, User, MembershipTier, MembershipStatus } from '../types';
import Logo from '../components/Logo';
import { Lock, User as UserIcon, ChevronRight, AtSign, ArrowLeft, Loader2, AlertCircle, ShieldCheck, Key, Smartphone, Mail, Zap, CheckCircle2, XCircle } from 'lucide-react';
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
    password: '',
    referralCode: searchParams.get('ref') || '',
    masterKey: ''
  });

  const SYSTEM_MASTER_KEY = 'KPH-OWNER-2025';

  useEffect(() => {
    setIsLogin(typeParam !== 'signup');
    setError(null);
  }, [typeParam]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const identifier = (formData.username || formData.email || '').toLowerCase().trim();

    if (isLogin) {
      if (!identifier) {
        setError('Please enter your username or email.');
        setIsLoading(false);
        return;
      }

      // Check for Admin users first - they MUST use Master Key if user role is ADMIN
      const existingUser = state.users.find(u => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier);
      
      if (existingUser?.role === 'ADMIN') {
         if (formData.password !== SYSTEM_MASTER_KEY) {
            setError('Administrator access requires the verified Master Key.');
            setIsLoading(false);
            return;
         }
      }

      setTimeout(() => {
        const success = onLogin(identifier, formData.password);
        if (!success) {
          setError('Login failed. Please check your credentials.');
          setIsLoading(false);
        } else {
          const loggedInUser = state.users.find(u => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier);
          navigate(loggedInUser?.role === 'ADMIN' ? '/admin' : '/dashboard');
        }
      }, 1000);
    } else {
      // SIGNUP LOGIC
      if (adminMode && formData.masterKey !== SYSTEM_MASTER_KEY) {
        setError('Invalid Master Authorization Key. Admin creation is restricted.');
        setIsLoading(false);
        return;
      }

      // Verify Username
      const isUsernameTaken = state.users.some(u => u.username.toLowerCase() === identifier);
      if (isUsernameTaken) {
        setError(`Username "@${identifier}" is already in use.`);
        setIsLoading(false);
        return;
      }

      // Verify Referral Code if not in Admin Mode
      let referrerId: string | undefined = undefined;
      if (formData.referralCode && !adminMode) {
        const referrer = state.users.find(u => u.referralCode.toUpperCase() === formData.referralCode.toUpperCase());
        if (!referrer) {
          setError(`Invalid referral code: "${formData.referralCode}". Please verify with your sponsor.`);
          setIsLoading(false);
          return;
        }
        referrerId = referrer.id;
      }

      setTimeout(() => {
        const userId = `u-${Date.now()}`;
        const newUserReferralCode = (formData.username.slice(0, 4).toUpperCase() + Math.floor(1000 + Math.random() * 9000));
        
        const newUser: User = {
          id: userId,
          username: identifier,
          fullName: formData.fullName,
          email: formData.email || `${identifier}@kph.mw`,
          phone: '', 
          whatsapp: '', 
          password: formData.password,
          referralCode: newUserReferralCode,
          referredBy: referrerId,
          role: adminMode ? 'ADMIN' : 'USER',
          balance: 0,
          totalEarnings: 0,
          createdAt: new Date().toISOString(),
          membershipTier: adminMode ? MembershipTier.GOLD : MembershipTier.NONE,
          membershipStatus: adminMode ? MembershipStatus.ACTIVE : MembershipStatus.INACTIVE,
        };

        onStateUpdate({
          users: [...state.users, newUser],
          currentUser: newUser
        });

        notifyNewRegistration(newUser.fullName, newUser.email, newUserReferralCode);
        setIsLoading(false);
        navigate(adminMode ? '/admin' : '/activate');
      }, 1000);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-malawi-black font-black uppercase text-[10px] tracking-widest transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          onClick={() => setAdminMode(!adminMode)} 
          className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-full border-2 transition-all ${adminMode ? 'bg-malawi-red text-white border-malawi-red shadow-lg' : 'text-gray-400 border-gray-100 hover:bg-gray-50'}`}
        >
          {adminMode ? <ShieldCheck size={14} /> : <UserIcon size={14} />}
          {adminMode ? 'Admin Sign-up' : 'Member Sign-up'}
        </button>
      </div>

      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-t-[12px] border-malawi-black relative overflow-hidden">
        <div className="text-center mb-10">
           <Logo size="lg" variant="dark" className="mb-4" />
           <h2 className="text-4xl font-black uppercase tracking-tight text-malawi-black">
             {isLogin ? 'Log In' : 'Join'}
           </h2>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-in shake duration-300">
            <XCircle className="shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-bold leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Name</label>
              <input type="text" required placeholder="Full Name" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{isLogin ? 'Username / Email' : 'Choose Username'}</label>
            <input type="text" required placeholder="yourname" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password {isLogin && adminMode ? '(Master Key Required)' : ''}</label>
            <input type="password" required placeholder="••••••••" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          {!isLogin && adminMode && (
            <div className="space-y-1 pt-2 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-malawi-red uppercase tracking-widest ml-1">Master Authorization Key</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-malawi-red" size={18} />
                <input type="password" required placeholder="KPH-XXXX" className="w-full pl-12 pr-4 py-4 bg-red-50 border border-red-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-red text-malawi-red" value={formData.masterKey} onChange={e => setFormData({...formData, masterKey: e.target.value})} />
              </div>
            </div>
          )}

          {!isLogin && !adminMode && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
              <input type="text" placeholder="REF-XXXX" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none uppercase" value={formData.referralCode} onChange={e => setFormData({...formData, referralCode: e.target.value})} />
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full py-5 bg-malawi-black text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-[11px] uppercase tracking-widest disabled:opacity-70 mt-4">
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? 'Log In' : 'Join Network')}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
          {isLogin ? "Don't have an account?" : "Already a member?"}
          <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-black text-malawi-red hover:underline transition-colors">
            {isLogin ? 'Join' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
