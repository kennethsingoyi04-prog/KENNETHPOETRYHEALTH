
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

  useEffect(() => {
    setIsLogin(typeParam !== 'signup');
    setError(null);
  }, [typeParam]);

  // Password Strength Logic
  const passwordStrength = useMemo(() => {
    const p = formData.password;
    if (!p) return 0;
    let score = 0;
    if (p.length > 6) score++;
    if (p.length > 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p) || /[^A-Za-z0-9]/.test(p)) score++;
    return score; // 0-4
  }, [formData.password]);

  const strengthColor = ['bg-gray-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'][passwordStrength];
  const strengthText = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength];

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const SYSTEM_MASTER_KEY = 'KPH-OWNER-2025';
    const identifier = (formData.username || formData.email || '').toLowerCase().trim();

    // Admin shortcut check
    const isOwnerIdentifier = ['admin', 'owner', 'kenneth'].includes(identifier);
    const existingAdmin = state.users.find(u => u.role === 'ADMIN' && (u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier));

    if (isLogin && (isOwnerIdentifier || existingAdmin) && formData.password === SYSTEM_MASTER_KEY) {
      let rootAdmin = existingAdmin;
      
      if (!rootAdmin) {
         rootAdmin = {
           id: 'root-admin',
           username: identifier || 'admin',
           fullName: 'Kenneth - Main Owner',
           email: 'owner@kph.mw',
           phone: '', 
           whatsapp: '',
           password: SYSTEM_MASTER_KEY,
           referralCode: 'OWNER-KPH',
           role: 'ADMIN',
           isOwner: true,
           balance: 0,
           totalEarnings: 0,
           createdAt: new Date().toISOString(),
           membershipTier: MembershipTier.GOLD,
           membershipStatus: MembershipStatus.ACTIVE,
         };
         
         const filteredUsers = state.users.filter(u => u.username !== rootAdmin!.username);
         onStateUpdate({ 
           users: [...filteredUsers, rootAdmin],
           currentUser: rootAdmin 
         });
      } else {
         onStateUpdate({ currentUser: rootAdmin });
      }
      
      localStorage.setItem('kph_session_uid', rootAdmin.id);
      navigate('/admin');
      setIsLoading(false);
      return;
    }

    setTimeout(() => {
      if (isLogin) {
        if (!identifier) {
          setError('Please enter your username or email address.');
          setIsLoading(false);
          return;
        }
        const success = onLogin(identifier, formData.password);
        if (!success) {
          const userExists = state.users.some(u => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier);
          if (!userExists) {
            setError(`The account "${identifier}" was not found. Please check the spelling or join now.`);
          } else {
            setError('The password you entered is incorrect. Please try again or contact support if you forgot it.');
          }
          setIsLoading(false);
        } else {
          const loggedInUser = state.users.find(u => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier);
          navigate(loggedInUser?.role === 'ADMIN' ? '/admin' : '/dashboard');
        }
      } else {
        // Signup Flow
        if (adminMode && formData.masterKey !== SYSTEM_MASTER_KEY) {
          setError('Invalid Master Authorization Key. Admin accounts require verified system credentials.');
          setIsLoading(false);
          return;
        }

        // 1. Username Taken Check
        const isUsernameTaken = state.users.some(u => u.username.toLowerCase() === identifier);
        if (isUsernameTaken) {
          setError(`The username "@${identifier}" is already registered. Please try another unique username.`);
          setIsLoading(false);
          return;
        }

        // 2. Referral Code Check
        if (formData.referralCode && !adminMode) {
          const referrer = state.users.find(u => u.referralCode.toUpperCase() === formData.referralCode.toUpperCase());
          if (!referrer) {
            setError(`The referral code "${formData.referralCode}" is invalid. Please double-check it or leave it blank.`);
            setIsLoading(false);
            return;
          }
        }

        // 3. Password Strength Requirement
        if (formData.password.length < 6) {
          setError('Your password is too short. Please use at least 6 characters for better security.');
          setIsLoading(false);
          return;
        }
        
        finishRegistration(SYSTEM_MASTER_KEY);
      }
    }, 1000);
  };

  const finishRegistration = (masterKey: string) => {
    const userId = `u-${Date.now()}`;
    const newUserReferralCode = formData.username.toUpperCase() + Math.floor(Math.random() * 100);
    const referrer = state.users.find(u => u.referralCode.toUpperCase() === formData.referralCode.toUpperCase());
    
    const newUser: User = {
      id: userId,
      username: formData.username.toLowerCase().trim(),
      fullName: formData.fullName,
      email: formData.email || `${formData.username.toLowerCase()}@kph.mw`,
      phone: '', 
      whatsapp: '', 
      password: formData.password,
      referralCode: newUserReferralCode,
      referredBy: referrer?.id,
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
          {adminMode ? 'Admin Portal' : 'Member Portal'}
        </button>
      </div>

      <div className="bg-white p-10 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] border-t-[12px] border-malawi-black relative overflow-hidden">
        {adminMode && <div className="absolute top-0 right-0 p-4"><Zap size={24} className="text-malawi-red animate-pulse" /></div>}
        
        <div className="text-center mb-10">
           <Logo size="lg" variant="dark" className="mb-4" />
           <h2 className="text-4xl font-black uppercase tracking-tight text-malawi-black">
             {isLogin ? 'Log In' : 'Join'}
           </h2>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
             {isLogin ? 'Enter your credentials to access your account' : 'Join Malawi\'s #1 affiliate network today'}
           </p>
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
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="text" required placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{isLogin ? 'Username / Email' : 'Choose Username'}</label>
            <div className="relative">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input type="text" required placeholder="yourname" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{adminMode && isLogin ? 'Master Key' : 'Password'}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input type="password" required placeholder="••••••••" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            
            {!isLogin && formData.password && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Security: <span className={passwordStrength > 2 ? 'text-malawi-green' : 'text-malawi-red'}>{strengthText}</span></span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-gray-300">{formData.password.length} chars</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${strengthColor}`} 
                    style={{ width: `${(passwordStrength / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email (Optional)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input type="email" placeholder="email@kph.mw" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              {!adminMode && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
                  <div className="relative">
                    <ChevronRight className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input type="text" placeholder="REF-CODE" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all uppercase" value={formData.referralCode} onChange={e => setFormData({...formData, referralCode: e.target.value})} />
                  </div>
                </div>
              )}
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
