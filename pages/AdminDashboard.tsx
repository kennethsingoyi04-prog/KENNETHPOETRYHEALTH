
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Calendar,
  X,
  Maximize2,
  Clock,
  LayoutGrid,
  ZoomIn,
  Minimize2,
  PieChart as PieIcon,
  MessageSquare,
  Save,
  Check,
  Activity,
  FileSpreadsheet,
  Filter,
  ArrowUpRight
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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");
  const [noteSavedId, setNoteSavedId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [queueSearch, setQueueSearch] = useState("");

  const totalUsers = state.users.length;
  const totalBalance = state.users.reduce((acc, u) => acc + u.balance, 0);
  const pendingWithdrawals = state.withdrawals.filter(w => w.status === WithdrawalStatus.PENDING);
  const totalPayouts = state.withdrawals
    .filter(w => w.status === WithdrawalStatus.APPROVED)
    .reduce((acc, w) => acc + w.amount, 0);

  // --- Search & Filter Logic ---
  const filteredUsers = useMemo(() => {
    return state.users.filter(u => 
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.referralCode.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [state.users, userSearch]);

  const filteredQueue = useMemo(() => {
    return pendingWithdrawals.filter(w => 
      w.userName.toLowerCase().includes(queueSearch.toLowerCase()) ||
      w.phone.includes(queueSearch) ||
      w.id.includes(queueSearch)
    );
  }, [pendingWithdrawals, queueSearch]);

  // --- Export Logic ---
  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => 
      Object.values(obj).map(val => `"${val}"`).join(',')
    ).join('\n');
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Data Calculations for Charts ---

  // Cumulative Growth
  const userGrowthData = useMemo(() => {
    const sortedUsers = [...state.users].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    const growthMap = new Map<string, number>();
    let cumulative = 0;
    
    sortedUsers.forEach(u => {
      const date = new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      cumulative++;
      growthMap.set(date, cumulative);
    });

    return Array.from(growthMap.entries()).map(([date, count]) => ({ date, count }));
  }, [state.users]);

  // Daily Registrations (New Users per day)
  const dailyRegsData = useMemo(() => {
    const regMap = new Map<string, { count: number, rawDate: number }>();
    state.users.forEach(u => {
      const d = new Date(u.createdAt);
      const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const current = regMap.get(dateLabel) || { count: 0, rawDate: d.getTime() };
      regMap.set(dateLabel, { count: current.count + 1, rawDate: current.rawDate });
    });
    return Array.from(regMap.entries())
      .map(([date, val]) => ({ date, count: val.count, rawDate: val.rawDate }))
      .sort((a, b) => a.rawDate - b.rawDate);
  }, [state.users]);

  // Weekly Registrations (New Users per week)
  const weeklyRegsData = useMemo(() => {
    const regMap = new Map<string, { count: number, rawDate: number }>();
    state.users.forEach(u => {
      const d = new Date(u.createdAt);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(d.getFullYear(), d.getMonth(), diff);
      const weekLabel = `Wk ${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      const current = regMap.get(weekLabel) || { count: 0, rawDate: startOfWeek.getTime() };
      regMap.set(weekLabel, { count: current.count + 1, rawDate: current.rawDate });
    });
    return Array.from(regMap.entries())
      .map(([week, val]) => ({ week, count: val.count, rawDate: val.rawDate }))
      .sort((a, b) => a.rawDate - b.rawDate);
  }, [state.users]);

  const withdrawalStatusData = useMemo(() => {
    const counts = state.withdrawals.reduce((acc, w) => {
      acc[w.status] = (acc[w.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = state.withdrawals.length || 1;

    return [
      { 
        name: 'Pending', 
        value: counts[WithdrawalStatus.PENDING] || 0, 
        color: '#f59e0b',
        percentage: (((counts[WithdrawalStatus.PENDING] || 0) / total) * 100).toFixed(1)
      },
      { 
        name: 'Approved', 
        value: counts[WithdrawalStatus.APPROVED] || 0, 
        color: '#118131',
        percentage: (((counts[WithdrawalStatus.APPROVED] || 0) / total) * 100).toFixed(1)
      },
      { 
        name: 'Rejected', 
        value: counts[WithdrawalStatus.REJECTED] || 0, 
        color: '#D21034',
        percentage: (((counts[WithdrawalStatus.REJECTED] || 0) / total) * 100).toFixed(1)
      },
    ];
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

  const saveAdminNote = (id: string) => {
    const updatedWithdrawals = state.withdrawals.map(w => 
      w.id === id ? { ...w, adminNote: tempNote } : w
    );
    onStateUpdate({ withdrawals: updatedWithdrawals });
    setEditingNoteId(null);
    setNoteSavedId(id);
    setTimeout(() => setNoteSavedId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-malawi-black tracking-tight uppercase">Admin Control Center</h1>
          <p className="text-gray-500">Managing <span className="text-malawi-red font-bold">KENNETHPOETRYHEALTH</span> Financials</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-lg text-gray-600"><Search size={18} /></div>
            <input 
              type="text" 
              placeholder="Search directory..." 
              className="outline-none text-sm w-32 md:w-48"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
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

      {/* NEW: User Acquisition Analytics Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="bg-malawi-green p-2 rounded-lg text-white shadow-lg shadow-green-500/20">
            <Activity size={20} />
          </div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Acquisition Analytics</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Registrations Area Chart */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest flex items-center gap-2">
                  <Calendar size={14} className="text-malawi-red" /> Daily New Affiliates
                </h3>
                <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">24-hour interval tracking</p>
              </div>
              <div className="flex items-center gap-1.5 text-malawi-green text-xs font-black">
                <ArrowUpRight size={14} />
                <span>REAL-TIME</span>
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyRegsData}>
                  <defs>
                    <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D21034" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#D21034" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    cursor={{ stroke: '#D21034', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    name="New Users"
                    stroke="#D21034" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorDaily)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Trends Line Chart */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest flex items-center gap-2">
                  <TrendingUp size={14} className="text-malawi-green" /> Weekly Growth Trend
                </h3>
                <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Registration velocity by week</p>
              </div>
              <div className="bg-gray-100 px-2 py-1 rounded text-[10px] font-black text-gray-600 uppercase">
                Aggregated
              </div>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyRegsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="week" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Line 
                    type="stepAfter" 
                    dataKey="count" 
                    name="Registrations"
                    stroke="#118131" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#118131', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                    animationDuration={2500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Analytics Charts (Original Section Enhanced) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2 text-gray-800 uppercase tracking-tighter"><TrendingUp size={18} className="text-blue-500" /> Cumulative Network Growth</h3>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Active Affiliates</span>
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

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2 text-gray-800 uppercase tracking-tighter"><PieChartIcon size={18} className="text-malawi-red" /> Health Check</h3>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Quick Status Summary</span>
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
              <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Total Requests</span>
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
      </div>

      {/* Primary Table & Queue Sections (Remaining code logic kept same for brevity) */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg text-gray-800 uppercase tracking-tighter">Withdrawal Queue</h3>
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-tighter border border-yellow-200">
              {filteredQueue.length} Pending
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center gap-2">
               <Filter size={14} className="text-gray-400" />
               <input 
                 type="text" 
                 placeholder="Filter queue..." 
                 className="outline-none text-xs w-32 md:w-40"
                 value={queueSearch}
                 onChange={(e) => setQueueSearch(e.target.value)}
               />
            </div>
            <button 
              onClick={() => exportToCSV(pendingWithdrawals, "Pending_Withdrawals")}
              className="flex items-center gap-2 bg-malawi-green text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet size={16} /> Export
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredQueue.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
              <CheckCircle className="text-malawi-green" size={32} />
              <p className="font-medium text-gray-600">No matching requests in the queue.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4">Beneficiary</th>
                  <th className="px-6 py-4">Net Amount</th>
                  <th className="px-6 py-4">Payment Info</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Verification</th>
                  <th className="px-6 py-4 text-center">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredQueue.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/50 transition-colors animate-in fade-in duration-300">
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
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                        w.paymentMethod === 'Airtel Money' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                      }`}>
                        {w.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {w.proofUrl ? (
                        <div className="flex gap-2 items-center">
                          <Link 
                            to={`/admin/proof-preview?url=${encodeURIComponent(w.proofUrl || '')}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1.5 text-xs font-bold underline transition-colors group"
                          >
                            <ExternalLink size={14} className="group-hover:scale-110 transition-transform" /> 
                            View Proof
                          </Link>
                        </div>
                      ) : <span className="text-gray-400 text-xs italic font-medium">No Proof</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.APPROVED)}
                          className="bg-malawi-green text-white p-2 rounded-lg hover:shadow-lg hover:scale-110 active:scale-95 transition-all"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleWithdrawalAction(w.id, WithdrawalStatus.REJECTED)}
                          className="bg-malawi-red text-white p-2 rounded-lg hover:shadow-lg hover:scale-110 active:scale-95 transition-all"
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

      {/* User Directory (Original) */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/30">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-gray-800 uppercase tracking-tighter">Affiliate Directory</h3>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest bg-white border border-gray-200 px-2 rounded-full">{filteredUsers.length} Results</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-white p-2 rounded-lg border border-gray-200 flex items-center gap-2">
               <Search size={14} className="text-gray-400" />
               <input 
                 type="text" 
                 placeholder="Find user..." 
                 className="outline-none text-xs w-32 md:w-40"
                 value={userSearch}
                 onChange={(e) => setUserSearch(e.target.value)}
               />
            </div>
            <button 
              onClick={() => exportToCSV(state.users, "Affiliate_Directory")}
              className="flex items-center gap-2 bg-malawi-black text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors"
            >
              <FileSpreadsheet size={16} /> Export
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4">Name & Code</th>
                <th className="px-6 py-4">Access Level</th>
                <th className="px-6 py-4">Current Wallet</th>
                <th className="px-6 py-4">Lifetime Yield</th>
                <th className="px-6 py-4">Onboarding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors animate-in fade-in duration-300">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{u.fullName}</p>
                    <p className="text-[10px] text-gray-400 font-mono uppercase font-semibold">{u.referralCode}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tighter ${
                      u.role === 'ADMIN' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-malawi-green">MWK {u.balance.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">MWK {u.totalEarnings.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs font-medium">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
