
import React from 'react';
import { AppState, WithdrawalStatus } from '../types';
import { Download, Clock, CheckCircle2, XCircle, FileText, Info } from 'lucide-react';

interface HistoryProps {
  state: AppState;
}

const History: React.FC<HistoryProps> = ({ state }) => {
  const user = state.currentUser!;
  const myWithdrawals = state.withdrawals.filter(w => w.userId === user.id);
  const myEarnings = state.referrals.filter(r => r.referrerId === user.id);

  const getStatusBadge = (status: WithdrawalStatus) => {
    switch (status) {
      case WithdrawalStatus.PENDING:
        return <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase"><Clock size={12} /> Pending</span>;
      case WithdrawalStatus.APPROVED:
        return <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase"><CheckCircle2 size={12} /> Approved</span>;
      case WithdrawalStatus.REJECTED:
        return <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase"><XCircle size={12} /> Rejected</span>;
    }
  };

  const handleDownloadStatement = () => {
    alert("Generating Statement PDF... (This feature requires jspdf, simulating file generation)");
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payment History</h1>
        <button 
          onClick={handleDownloadStatement}
          className="flex items-center gap-2 text-sm bg-white border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 font-semibold"
        >
          <Download size={16} />
          Statement
        </button>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText className="text-malawi-red" size={20} />
          Withdrawal Requests
        </h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {myWithdrawals.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No withdrawal requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-700">Date</th>
                    <th className="px-6 py-4 font-bold text-gray-700">Amount</th>
                    <th className="px-6 py-4 font-bold text-gray-700">Method</th>
                    <th className="px-6 py-4 font-bold text-gray-700">Status</th>
                    <th className="px-6 py-4 font-bold text-gray-700">Note/Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {myWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{new Date(w.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-bold whitespace-nowrap">MWK {w.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{w.paymentMethod}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(w.status)}</td>
                      <td className="px-6 py-4 min-w-[200px]">
                        {w.adminNote ? (
                          <div className="flex items-start gap-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-blue-700 leading-relaxed italic">{w.adminNote}</p>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-[11px] italic">No extra feedback</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TrendingUpIcon className="text-malawi-green" size={20} />
          Earnings Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myEarnings.map((e) => {
            const refUser = state.users.find(u => u.id === e.referredId);
            return (
              <div key={e.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="font-bold">{refUser?.fullName}</p>
                  <p className="text-xs text-gray-400">Level {e.level} Referral • {new Date(e.timestamp).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-malawi-green">+MWK {e.commission.toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

// Renamed internal component to avoid conflict with imports
const TrendingUpIcon = ({ className, size }: { className?: string, size: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

export default History;
