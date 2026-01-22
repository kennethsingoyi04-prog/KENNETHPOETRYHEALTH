
import React from 'react';
import { AppState, Referral } from '../types';
import { Users, TrendingUp, Share2, Copy, CheckCircle2, DollarSign } from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const user = state.currentUser!;
  const myReferrals = state.referrals.filter(r => r.referrerId === user.id);
  const myDirectReferralsCount = state.users.filter(u => u.referredBy === user.id).length;
  
  // Calculate Level 2 referrals (referrals of my referrals)
  const myDirectReferralIds = state.users.filter(u => u.referredBy === user.id).map(u => u.id);
  const myIndirectReferralsCount = state.users.filter(u => myDirectReferralIds.includes(u.referredBy || '')).length;

  const referralLink = `${window.location.origin}/#/auth?ref=${user.referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moni, {user.fullName.split(' ')[0]}! 👋</h1>
          <p className="text-gray-500">Welcome to your affiliate portal.</p>
        </div>
        <div className="bg-malawi-green text-white px-6 py-4 rounded-xl shadow-md border-l-8 border-malawi-black">
          <p className="text-xs uppercase font-bold tracking-wider opacity-80">Current Balance</p>
          <p className="text-3xl font-black">MWK {user.balance.toLocaleString()}</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 p-4 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Direct Referrals (L1)</p>
            <p className="text-2xl font-bold">{myDirectReferralsCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-purple-50 text-purple-600 p-4 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Indirect Referrals (L2)</p>
            <p className="text-2xl font-bold">{myIndirectReferralsCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-50 text-green-600 p-4 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">Total Earned</p>
            <p className="text-2xl font-bold">MWK {user.totalEarnings.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Referral Link Box */}
      <div className="bg-malawi-black text-white p-8 rounded-3xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-malawi-red font-bold uppercase tracking-widest text-sm">
            <Share2 size={16} />
            <span>Grow Your Network</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight max-w-md">
            Invite friends and earn up to <span className="text-malawi-green">15% combined</span> commission!
          </h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-4">
            <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl flex-grow font-mono text-sm w-full truncate">
              {referralLink}
            </div>
            <button 
              onClick={copyToClipboard}
              className="bg-malawi-green hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
            >
              <Copy size={20} />
              Copy Link
            </button>
          </div>
        </div>
        
        {/* Background Decorative Circles */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-malawi-red/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-malawi-green/20 rounded-full blur-3xl"></div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg">Recent Referrals</h3>
          <button className="text-sm text-blue-600 font-medium">View All</button>
        </div>
        <div className="divide-y divide-gray-50">
          {myReferrals.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} />
              </div>
              <p>No referrals yet. Share your link to start earning!</p>
            </div>
          ) : (
            myReferrals.slice(0, 5).map((ref) => {
              const referredUser = state.users.find(u => u.id === ref.referredId);
              return (
                <div key={ref.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-malawi-green/10 text-malawi-green rounded-full flex items-center justify-center font-bold">
                      {referredUser?.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{referredUser?.fullName}</p>
                      <p className="text-xs text-gray-400">Level {ref.level} • {new Date(ref.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-malawi-green">+MWK {ref.commission.toLocaleString()}</p>
                    <p className="text-[10px] uppercase text-gray-400">Commission</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
