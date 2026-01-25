
import React, { useState, useMemo } from 'react';
import { AppState, WithdrawalStatus } from '../types';
import { Download, Clock, CheckCircle2, XCircle, FileText, Info, Loader2, Image as ImageIcon, Receipt, X, Maximize2, TrendingUp, Users, Wallet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface HistoryProps {
  state: AppState;
}

const History: React.FC<HistoryProps> = ({ state }) => {
  const user = state.currentUser!;
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'profits'>('withdrawals');
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  const myWithdrawals = useMemo(() => 
    state.withdrawals.filter(w => w.userId === user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.withdrawals, user.id]
  );

  const myReferrals = useMemo(() => 
    state.referrals.filter(r => r.referrerId === user.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [state.referrals, user.id]
  );

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
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(17, 129, 49);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('KENNETH', 20, 25);
      const prefixWidth = doc.getTextWidth('KENNETH');
      doc.setTextColor(210, 16, 52);
      doc.text('POETRYHEALTH', 20 + prefixWidth, 25);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('OFFICIAL EARNINGS STATEMENT', 20, 32);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text('Account: ' + user.fullName, 20, 55);
      doc.text('Generated: ' + new Date().toLocaleString(), 140, 55);
      
      const tableBody = activeTab === 'withdrawals' 
        ? myWithdrawals.map(w => [new Date(w.createdAt).toLocaleDateString(), `MWK ${w.amount.toLocaleString()}`, w.paymentMethod, w.status])
        : myReferrals.map(r => [new Date(r.timestamp).toLocaleDateString(), `MWK ${r.commission.toLocaleString()}`, `Level ${r.level}`, 'PROFIT']);

      const tableHead = activeTab === 'withdrawals'
        ? [['Date', 'Amount', 'Method', 'Status']]
        : [['Date', 'Commission', 'Source', 'Type']];

      doc.autoTable({
        startY: 70,
        head: tableHead,
        body: tableBody,
        headStyles: { fillColor: [0, 0, 0] }
      });
      doc.save(`${user.username}_History.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-in fade-in duration-700">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setViewingProofUrl(null)}>
          <button className="absolute top-6 right-6 p-4 bg-malawi-red text-white rounded-full"><X size={24} /></button>
          <img src={viewingProofUrl} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl" alt="Proof" />
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-malawi-black uppercase tracking-tight">Transaction History</h1>
          <p className="text-gray-500 font-medium">Verify your earnings and track your payout progress.</p>
        </div>
        <button onClick={handleDownloadStatement} disabled={isGenerating} className="bg-malawi-black hover:bg-gray-800 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl active:scale-95 transition-all">
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download Ledger (PDF)
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-[2rem] border shadow-sm w-fit">
        <button onClick={() => setActiveTab('withdrawals')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'withdrawals' ? 'bg-malawi-black text-white shadow-md' : 'text-gray-400 hover:text-malawi-black'}`}>
          Payout Requests
        </button>
        <button onClick={() => setActiveTab('profits')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profits' ? 'bg-malawi-black text-white shadow-md' : 'text-gray-400 hover:text-malawi-black'}`}>
          Profits History
        </button>
      </div>

      <main className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
        {activeTab === 'withdrawals' ? (
          <div className="overflow-x-auto">
            {myWithdrawals.length === 0 ? (
              <div className="p-24 text-center space-y-4">
                 <Wallet size={48} className="mx-auto text-gray-100" />
                 <p className="italic font-black text-gray-300 uppercase tracking-widest">No withdrawal records found</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="px-10 py-6">Date & Request ID</th>
                    <th className="px-10 py-6">Payout Details</th>
                    <th className="px-10 py-6">Recipient Proof</th>
                    <th className="px-10 py-6 text-right">Progress Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-10 py-8">
                         <p className="font-black text-malawi-black">{new Date(w.createdAt).toLocaleDateString()}</p>
                         <p className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">ID: {w.id}</p>
                      </td>
                      <td className="px-10 py-8">
                         <p className="text-xl font-black text-malawi-green">K{w.amount.toLocaleString()}</p>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{w.paymentMethod} • {w.phone}</p>
                      </td>
                      <td className="px-10 py-8">
                        {w.status === WithdrawalStatus.APPROVED && w.paymentProofUrl ? (
                          <button onClick={() => setViewingProofUrl(w.paymentProofUrl || null)} className="flex items-center gap-2 bg-malawi-black text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md">
                            <ImageIcon size={14} /> Receipt
                          </button>
                        ) : (
                          <span className="text-[9px] font-black text-gray-300 uppercase italic">Awaiting Admin</span>
                        )}
                      </td>
                      <td className="px-10 py-8 text-right">
                         <div className="flex flex-col items-end gap-1">
                            {getStatusBadge(w.status)}
                            {w.adminNote && <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 italic">"{w.adminNote}"</p>}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {myReferrals.length === 0 ? (
              <div className="p-24 text-center space-y-4">
                 <TrendingUp size={48} className="mx-auto text-gray-100" />
                 <p className="italic font-black text-gray-300 uppercase tracking-widest">No team earnings detected yet</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="px-10 py-6">Earning Date</th>
                    <th className="px-10 py-6">Commission Amount</th>
                    <th className="px-10 py-6">Invite Source</th>
                    <th className="px-10 py-6 text-right">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myReferrals.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-10 py-8">
                         <p className="font-black text-malawi-black">{new Date(r.timestamp).toLocaleDateString()}</p>
                         <p className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">{new Date(r.timestamp).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-10 py-8">
                         <p className="text-xl font-black text-malawi-green">+K{r.commission.toLocaleString()}</p>
                      </td>
                      <td className="px-10 py-8">
                         <div className="flex items-center gap-2">
                            <Users size={14} className="text-gray-400" />
                            <div>
                               <p className="font-bold text-gray-700">Level {r.level} Invite</p>
                               <p className="text-[10px] text-gray-400 uppercase font-black">Network Growth</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${r.level === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           {r.level === 1 ? 'Direct Invite' : 'Indirect Bonus'}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
