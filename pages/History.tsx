
import React, { useState } from 'react';
import { AppState, WithdrawalStatus } from '../types';
import { Download, Clock, CheckCircle2, XCircle, FileText, Info, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface HistoryProps {
  state: AppState;
}

const History: React.FC<HistoryProps> = ({ state }) => {
  const user = state.currentUser!;
  const [isGenerating, setIsGenerating] = useState(false);
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
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Branding
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(17, 129, 49); // Malawi Green
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('KENNETH', 20, 25);
      
      doc.setTextColor(210, 16, 52); // Malawi Red
      doc.text('POETRYHEALTH', 63, 25);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL EARNINGS STATEMENT', 20, 32);

      // User Details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Account Holder:', 20, 55);
      doc.setFont('helvetica', 'normal');
      doc.text(user.fullName, 60, 55);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Referral Code:', 20, 62);
      doc.setFont('helvetica', 'normal');
      doc.text(user.referralCode, 60, 62);

      doc.setFont('helvetica', 'bold');
      doc.text('Statement Date:', 140, 55);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleDateString(), 175, 55);

      // Financial Summary Box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(20, 75, pageWidth - 40, 25, 3, 3, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('CURRENT BALANCE', 30, 85);
      doc.setFontSize(14);
      doc.text(`MWK ${user.balance.toLocaleString()}`, 30, 93);
      
      doc.setFontSize(10);
      doc.text('LIFETIME EARNINGS', 110, 85);
      doc.setFontSize(14);
      doc.text(`MWK ${user.totalEarnings.toLocaleString()}`, 110, 93);

      // Withdrawals Table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Withdrawal History', 20, 115);

      const withdrawalRows = myWithdrawals.map(w => [
        new Date(w.createdAt).toLocaleDateString(),
        `MWK ${w.amount.toLocaleString()}`,
        w.paymentMethod,
        w.status,
        w.adminNote || '-'
      ]);

      (doc as any).autoTable({
        startY: 120,
        head: [['Date', 'Amount', 'Method', 'Status', 'Notes']],
        body: withdrawalRows,
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 20, right: 20 }
      });

      // Footer
      const finalY = (doc as any).lastAutoTable.cursor.y || 120;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('This is a computer-generated statement and does not require a signature.', pageWidth / 2, finalY + 20, { align: 'center' });
      doc.text('KENNETHPOETRYHEALTH Malawi - Empowering Local Affiliates', pageWidth / 2, finalY + 25, { align: 'center' });

      doc.save(`${user.fullName.replace(/\s+/g, '_')}_Statement.pdf`);
    } catch (error) {
      console.error('PDF Generation Failed:', error);
      alert('Could not generate PDF. Please try again later.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payment History</h1>
        <button 
          onClick={handleDownloadStatement}
          disabled={isGenerating}
          className="flex items-center gap-2 text-sm bg-malawi-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 font-semibold transition-all disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {isGenerating ? 'Generating...' : 'Download Statement'}
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
          {myEarnings.length === 0 ? (
            <div className="md:col-span-2 p-12 bg-white rounded-2xl border border-gray-100 text-center text-gray-400 italic">
              No referral commissions earned yet.
            </div>
          ) : (
            myEarnings.map((e) => {
              const refUser = state.users.find(u => u.id === e.referredId);
              return (
                <div key={e.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center hover:border-malawi-green transition-colors group">
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-malawi-green transition-colors">{refUser?.fullName || 'Deleted User'}</p>
                    <p className="text-xs text-gray-400">Level {e.level} Referral • {new Date(e.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-malawi-green">+MWK {e.commission.toLocaleString()}</p>
                    <div className="w-full bg-malawi-green/10 h-1 mt-1 rounded-full overflow-hidden">
                       <div className="bg-malawi-green h-full animate-in slide-in-from-left duration-1000" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

const TrendingUpIcon = ({ className, size }: { className?: string, size: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

export default History;
