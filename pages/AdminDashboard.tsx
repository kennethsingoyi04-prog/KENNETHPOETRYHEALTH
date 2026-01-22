
import React, { useMemo } from 'react';
import { AppState, WithdrawalStatus, WithdrawalRequest } from '../types';
import { 
  Users, 
  Wallet, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Search,
  TrendingUp,
  PieChart as PieChartIcon,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface AdminDashboardProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onStateUpdate }) => {
  const totalUsers = state.users.length;
  const totalBalance = state.users.reduce((acc, u) => acc + u.balance, 0);
  const pendingWithdrawals = state.withdrawals.filter(w => w.status === WithdrawalStatus.PENDING);
  const totalPayouts = state.withdrawals
    .filter(w => w.status === WithdrawalStatus.APPROVED)
    .reduce((acc, w) => acc + w.amount, 0);

  // --- Data Calculations for Charts ---

  // 1. User Growth Over Time (Cumulative)
  const userGrowthData = useMemo(() => {
    const sortedUsers = [...state.users].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const growthMap = new Map<string, number>();
    let cumulative = 0;
    
    sortedUsers.forEach(u => {
      const date = new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      cumulative++;
      growthMap.set(date, cumulative);
    });

    return Array.from(growthMap.entries()).map(([date, count]) => ({ date, count }));
  }, [state.users]);

  // 2. Daily Earnings (from Referrals)
  const dailyEarningsData = useMemo(() => {
    const earningsMap = new Map<string, number>();
    state.referrals.forEach(ref => {
      const date = new Date(ref.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      earningsMap.set(date, (earningsMap.get(date) || 0) + ref.commission);
    });

    // Fill in last 7 days if empty for better visuals
    const data = Array.from(earningsMap.entries()).map(([date, amount]) => ({ date, amount }));
    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [state.referrals]);

  // 3. Withdrawal Status Breakdown
  const withdrawalStatusData = useMemo(() => {
    const counts = state.withdrawals.reduce((acc, w) => {
      acc[w.status] = (acc[w.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Pending', value: counts[WithdrawalStatus.PENDING] || 0, color: '#f59e0b' },
      { name: 'Approved', value: counts[WithdrawalStatus.APPROVED] || 0, color: '#118131' },
      { name: 'Rejected', value: counts[WithdrawalStatus.REJECTED] || 0, color: '#D21034' },
    ];
  }, [state.withdrawals]);

  // 4. Payout Method Breakdown
  const methodData = useMemo(() => {
    const counts = state.withdrawals.reduce((acc, w) => {
      acc[w.paymentMethod] = (acc[w.paymentMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: name.includes('Airtel') ? '#D21034' : '#118131'
    }));
  }, [state.withdrawals]);

  const handleWithdrawalAction = (id: string, status: WithdrawalStatus) => {
    const withdrawal = state.withdrawals.find(w => w.id === id);
    if (!withdrawal) return;

    const updatedWithdrawals = state.withdrawals.map(w => 
      w.id === id ? { ...w, status } : w
    );

    let updatedUsers = [...state.users];
    if (status === WithdrawalStatus.REJECTED) {
      updatedUsers = state.users.map(u => u.id === withdrawal.userId ? {
        ...u,
        balance: u.balance + withdrawal.amount
      } : u);
    }

    onStateUpdate({ withdrawals: updatedWithdrawals, users: updatedUsers });

    if (status === WithdrawalStatus.APPROVED) {
      alert(`Withdrawal Approved! Simulating WhatsApp message to ${withdrawal.userName}...`);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-malawi-black">Admin Panel</h1>
          <p className="text-gray-500">Real-time system health & financial analytics</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-lg text-gray-600"><Search size={18} /></div>
            <input type="text" placeholder="Search accounts..." className="outline-none text-sm w-32 md:w-48" />
          </div>
        </div>
      </header>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-malawi-green transition-colors">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total Users</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black">{totalUsers}</p>
            <div className="bg-blue-50 p-2 rounded-lg text-blue-500"><Users size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-malawi-red transition-colors">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total Balance</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black text-malawi-red">MWK {totalBalance.toLocaleString()}</p>
            <div className="bg-red-50 p-2 rounded-lg text-malawi-red"><Wallet size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-malawi-green transition-colors">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Lifetime Payouts</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black text-malawi-green">MWK {totalPayouts.toLocaleString()}</p>
            <div className="bg-green-50 p-2 rounded-lg text-malawi-green"><BarChart3 size={20} /></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-yellow-500 transition-colors">
          <p className="text-gray-500 text-xs font-bold uppercase mb-1">Active Requests</p>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-black">{pendingWithdrawals.length}</p>
            <div className="bg-yellow-50 p-2 rounded-lg text-yellow-600"><Clock size={20} /></div>
          </div>
        </div>
      </div>

      {/* Primary Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2"><TrendingUp size={18} className="text-blue-500" /> User Growth</h3>
            <span className="text-xs text-gray-400 font-medium">LIFETIME</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Withdrawal Status Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2"><PieChartIcon size={18} className="text-malawi-red" /> Request Status</h3>
            <span className="text-xs text-gray-400 font-medium">OVERALL</span>
          </div>
          <div className="h-[250px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={withdrawalStatusData} 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {withdrawalStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-xs text-gray-400 font-bold uppercase">Total</span>
              <span className="text-xl font-black">{state.withdrawals.length}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-4">
            {withdrawalStatusData.map(d => (
              <div key={d.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                  <span className="text-sm font-medium text-gray-600">{d.name}</span>
                </div>
                <span className="text-sm font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Earnings Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2"><Calendar size={18} className="text-malawi-green" /> Daily Commissions</h3>
            <span className="text-xs text-gray-400 font-medium">ACTIVITY TREND</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyEarningsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                   cursor={{fill: '#f8fafc'}}
                   formatter={(value: number) => [`MWK ${value.toLocaleString()}`, 'Earnings']}
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#118131" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payout Methods Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2"><Wallet size={18} className="text-gray-700" /> Payout Channels</h3>
          </div>
          <div className="space-y-4">
            {methodData.length > 0 ? methodData.map(method => (
              <div key={method.name} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                  <span>{method.name}</span>
                  <span>{method.value} Requests</span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ 
                      backgroundColor: method.color, 
                      width: `${(method.value / (state.withdrawals.length || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-center text-gray-400 py-8 text-sm italic">No payout data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Approval Table */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-lg">Queue: Pending Withdrawals</h3>
          <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-bold">
            {pendingWithdrawals.length} Action Needed
          </span>
        </div>
        <div className="overflow-x-auto">
          {pendingWithdrawals.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
              <CheckCircle className="text-malawi-green" size={32} />
              <p>Great work! All withdrawal requests have been processed.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment Contacts</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Proof</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{w.userName}</p>
                      <p className="text-[10px] text-gray-400">ID: {w.userId}</p>
                    </td>
                    <td className="px-6 py-4 font-black text-malawi-red text-lg">MWK {w.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-gray-700">{w.phone}</p>
                      <p className="text-xs text-green-600 font-bold">WA: {w.whatsapp}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        w.paymentMethod === 'Airtel Money' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
                      }`}>
                        {w.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {w.proofUrl ? (
                        <a href={w.proofUrl} target="_blank" className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-xs font-bold underline">
                          <ExternalLink size={12} /> View Proof
                        </a>
                      ) : <span className="text-gray-300 text-xs italic">No screenshot</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)}
                          className="bg-malawi-green text-white p-2 rounded-lg hover:shadow-lg hover:scale-110 transition-all"
                          title="Approve & Notify User"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)}
                          className="bg-malawi-red text-white p-2 rounded-lg hover:shadow-lg hover:scale-110 transition-all"
                          title="Reject & Refund Balance"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* User Management List */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <h3 className="font-bold text-lg">User Directory</h3>
          <p className="text-xs text-gray-400">{state.users.length} registered accounts</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4">Affiliate Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Wallet Balance</th>
                <th className="px-6 py-4">Total Earnings</th>
                <th className="px-6 py-4">Join Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {state.users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{u.fullName}</p>
                    <p className="text-[10px] text-gray-400 font-mono uppercase">{u.referralCode}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tighter ${
                      u.role === 'ADMIN' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-malawi-green">MWK {u.balance.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-600">MWK {u.totalEarnings.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// Simple Clock Icon for Pending
const Clock = ({ className, size }: { className?: string, size: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

export default AdminDashboard;
