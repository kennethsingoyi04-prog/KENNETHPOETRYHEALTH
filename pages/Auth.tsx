
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppState, User, Referral, MembershipTier, MembershipStatus } from '../types';
import { LEVEL_1_COMMISSION_PERCENT, LEVEL_2_COMMISSION_PERCENT, SIGNUP_BONUS } from '../constants';
import { Mail, Lock, User as UserIcon, Phone, Smartphone, ChevronRight, AtSign } from 'lucide-react';
import { notifyNewRegistration } from '../services/NotificationService';

interface AuthProps {
  state: AppState;
  onLogin: (identifier: string, password?: string) => boolean;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Auth: React.FC<AuthProps> = ({ state, onLogin, onStateUpdate }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    whatsapp: '',
    password: '',
    referralCode: searchParams.get('ref') || '',
  });

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      const success = onLogin(formData.email || formData.username, formData.password);
      if (!success) {
        alert('Invalid credentials. Check your username/email and password!');
      } else {
        navigate('/dashboard');
      }
    } else {
      // Basic Registration Validation
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
      finishRegistration();
    }
  };

  const finishRegistration = () => {
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

    // Handle Signup Commissions for Referrer
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
    navigate('/activate');
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[80vh] bg-white rounded-3xl shadow-2xl overflow-hidden mt-8 max-w-5xl mx-auto border border-gray-100">
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
            Unlock exclusive earnings and multi-level commissions in Malawi's most trusted affiliate ecosystem.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-malawi-red/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-malawi-green/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="lg:w-1/2 p-12 flex flex-col justify-center overflow-y-auto">
        <div className="max-w-md mx-auto w-full py-8">
          <h2 className="text-3xl font-black mb-2 uppercase tracking-tight">
            {isLogin ? 'Welcome Back!' : 'Get Started'}
          </h2>
          <p className="text-gray-500 mb-8 font-medium">
            {isLogin ? 'Sign in to access your earnings dashboard' : 'Create your free account to start earning'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" required placeholder="John Phiri"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green transition-all"
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username / ID</label>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" required placeholder="johnphiri265"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green transition-all"
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input 
                    type="tel" required placeholder="+265..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green transition-all"
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                  <input 
                    type="tel" required placeholder="+265..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green transition-all"
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Access Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" required placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green transition-all"
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
                <input 
                  type="text" placeholder="REF123"
                  value={formData.referralCode}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green transition-all"
                  onChange={e => setFormData({...formData, referralCode: e.target.value})}
                />
              </div>
            )}

            <button className="w-full bg-malawi-black hover:bg-gray-800 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
              {isLogin ? 'Sign In' : 'Create Account'}
              <ChevronRight size={20} />
            </button>
          </form>

          <p className="mt-8 text-center text-gray-500 font-medium">
            {isLogin ? "Don't have an account yet?" : "Already a member?"}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 font-black text-malawi-red hover:underline uppercase text-xs tracking-wider"
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
