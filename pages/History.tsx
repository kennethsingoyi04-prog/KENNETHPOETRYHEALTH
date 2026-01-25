
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
        return <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase"><Clock size={12} /> PENDING REVIEW</span>;
      case WithdrawalStatus.APPROVED:
        return <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase"><CheckCircle2 size={12} /> VERIFIED & PAID</span>;
      case WithdrawalStatus.REJECTED:
        return <span className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase"><XCircle size={12} /> REJECTED</span>;
    }
  };

  const handleDownloadStatement = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('KPH TRANSFORM MALAWI', 20, 25);
      doc.setFontSize(10);
      doc.text('OFFICIAL SETTLEMENT RECORD', 20, 32);
      doc.setTextColor(0, 0, 0);
      doc.text('Member: ' + user.fullName, 20, 55);
      
      const tableBody = activeTab === 'withdrawals' 
        ? myWithdrawals.map(w => [new Date(w.createdAt).toLocaleDateString(), `K${w.amount.toLocaleString()}`, w.paymentMethod, w.status])
        : myReferrals.map(r => [new Date(r.timestamp).toLocaleDateString(), `K${r.commission.toLocaleString()}`, `Level ${r.level}`, 'PROFIT']);

      const tableHead = activeTab === 'withdrawals'
        ? [['Date', 'Amount (MWK)', 'Method', 'Status']]
        : [['Date', 'Profit (MWK)', 'Tier Bonus', 'Category']];

      doc.autoTable({
        startY: 70,
        head: tableHead,
        body: tableBody,
        headStyles: { fillColor: [0, 0, 0] }
      });
      doc.save(`KPH_${user.username}_History.pdf`);
    } catch (error) {
      console.error('PDF error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-in fade-in duration-700">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setViewingProofUrl(null)}>
          <button className="absolute top-6 right-6 p-4 bg-malawi-red text-white rounded-full shadow-2xl hover:bg-red-800 transition-colors"><X size={24} /></button>
          <img src={viewingProofUrl} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl animate-in zoom-in duration-300" alt="Admin Proof" />
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-malawi-black uppercase tracking-tight">Financial Ledger</h1>
          <p className="text-gray-500 font-medium">Review your earnings and mutual payout confirmations.</p>
        </div>
        <button onClick={handleDownloadStatement} disabled={isGenerating} className="bg-malawi-black text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl active:scale-95 transition-all">
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download PDF Statement
        </button>
      </div>

      <div className="flex gap-2 bg-white p-2 rounded-[2rem] border shadow-sm w-fit">
        <button onClick={() => setActiveTab('withdrawals')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'withdrawals' ? 'bg-malawi-black text-white shadow-md' : 'text-gray-400 hover:text-malawi-black'}`}>
          Payout Log
        </button>
        <button onClick={() => setActiveTab('profits')} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profits' ? 'bg-malawi-black text-white shadow-md' : 'text-gray-400 hover:text-malawi-black'}`}>
          Earnings Log
        </button>
      </div>

      <main className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
        {activeTab === 'withdrawals' ? (
          <div className="overflow-x-auto">
            {myWithdrawals.length === 0 ? (
              <div className="p-24 text-center opacity-20">
                 <Wallet size={48} className="mx-auto mb-2" />
                 <p className="font-black uppercase tracking-widest">No Payout Records</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="px-10 py-6">Date</th>
                    <th className="px-10 py-6">Payout Details</th>
                    <th className="px-10 py-6">Admin Receipt</th>
                    <th className="px-10 py-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-10 py-8">
                         <p className="font-black text-malawi-black">{new Date(w.createdAt).toLocaleDateString()}</p>
                         <p className="text-[9px] text-gray-400 uppercase font-black">ID: {w.id.split('-')[1]}</p>
                      </td>
                      <td className="px-10 py-8">
                         <p className="text-xl font-black text-malawi-green">K{w.amount.toLocaleString()}</p>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{w.paymentMethod}</p>
                      </td>
                      <td className="px-10 py-8">
                        {w.paymentProofUrl ? (
                          <button 
                            onClick={() => setViewingProofUrl(w.paymentProofUrl || null)}
                            className="flex items-center gap-2 bg-malawi-green text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md"
                          >
                            <ImageIcon size={14} /> View Receipt
                          </button>
                        ) : (
                          <span className="text-[9px] font-black text-gray-300 uppercase italic">Awaiting Transfer</span>
                        )}
                      </td>
                      <td className="px-10 py-8 text-right">
                         <div className="flex flex-col items-end gap-1">
                            {getStatusBadge(w.status)}
                            {w.adminNote && <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">"{w.adminNote}"</p>}
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
             <div className="p-20 text-center text-gray-300 font-black uppercase italic">Referral profits are logged here for mutual verification.</div>
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
