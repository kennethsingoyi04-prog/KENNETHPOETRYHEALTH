
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppState, User, Referral } from '../types';
import { LEVEL_1_COMMISSION_PERCENT, LEVEL_2_COMMISSION_PERCENT, SIGNUP_BONUS } from '../constants';
import { Mail, Lock, User as UserIcon, Phone, Smartphone, ChevronRight } from 'lucide-react';
import { notifyNewRegistration } from '../services/NotificationService';

interface AuthProps {
  state: AppState;
  onLogin: (email: string, password?: string) => boolean;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Auth: React.FC<AuthProps> = ({ state, onLogin, onStateUpdate }) => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    whatsapp: '',
    password: '',
    referralCode: searchParams.get('ref') || '',
  });

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      const success = onLogin(formData.email, formData.password);
      if (!success) alert('Invalid credentials. Check your email and password!');
    } else {
      // Register New User
      const userId = `u-${Date.now()}`;
      const newUserReferralCode = formData.fullName.split(' ')[0].toUpperCase() + Math.floor(Math.random() * 1000);
      
      const referrer = state.users.find(u => u.referralCode === formData.referralCode);
      
      const newUser: User = {
        id: userId,
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
        createdAt: new Date().toISOString()
      };

      let updatedUsers = [...state.users, newUser];
      let updatedReferrals = [...state.referrals];

      // Handle Commissions
      if (referrer) {
        // Level 1 Commission (Direct)
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

        // Level 2 Commission (Indirect)
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

      // Notify admin about the new registration
      notifyNewRegistration(newUser.fullName, newUser.email, newUserReferralCode);
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
            Grow your wealth with <span className="text-malawi-green underline">KP HEALTH</span>.
          </h1>
          <p className="text-gray-400 text-lg max-w-sm">
            Join the most trusted affiliate network in Malawi. Earn MWK for every friend you invite. Multi-level commissions paid instantly.
          </p>
        </div>

        <div className="relative z-10 mt-12 bg-gray-900/50 p-6 rounded-2xl backdrop-blur-sm border border-gray-800">
          <p className="text-sm font-bold text-malawi-red uppercase tracking-wider mb-2">Platform Stats</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-bold">{state.users.length}</p>
              <p className="text-xs text-gray-400">Active Affiliates</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-malawi-green">{Math.floor(state.withdrawals.filter(w => w.status === 'APPROVED').reduce((acc, w) => acc + w.amount, 0) / 1000)}K</p>
              <p className="text-xs text-gray-400">MWK Paid Out</p>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-malawi-red/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-malawi-green/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Form Side */}
      <div className="lg:w-1/2 p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <h2 className="text-3xl font-bold mb-2">{isLogin ? 'Welcome Back!' : 'Create Account'}</h2>
          <p className="text-gray-500 mb-8">
            {isLogin ? 'Sign in to access your dashboard' : 'Fill in the details to start earning'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
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

            {!isLogin && (
              <>
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Referral Code (Optional)</label>
                  <input 
                    type="text" placeholder="REF123"
                    value={formData.referralCode}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-malawi-green"
                    onChange={e => setFormData({...formData, referralCode: e.target.value})}
                  />
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

            <button className="w-full bg-malawi-black hover:bg-gray-800 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all">
              {isLogin ? 'Sign In' : 'Create Free Account'}
              <ChevronRight size={20} />
            </button>
          </form>

          <p className="mt-8 text-center text-gray-500">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => setIsLogin(!isLogin)}
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
