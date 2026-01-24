
import React, { useState } from 'react';
import { AppState, WithdrawalStatus } from '../types';
import { Download, Clock, CheckCircle2, XCircle, FileText, Info, Loader2, Image as ImageIcon, Receipt, X, Maximize2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface HistoryProps {
  state: AppState;
}

const History: React.FC<HistoryProps> = ({ state }) => {
  const user = state.currentUser!;
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const myWithdrawals = state.withdrawals.filter(w => w.userId === user.id);

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
      doc.text('Account Holder: ' + user.fullName, 20, 55);
      doc.text('Date: ' + new Date().toLocaleDateString(), 140, 55);
      doc.autoTable({
        startY: 120,
        head: [['Date', 'Amount', 'Method', 'Status']],
        body: myWithdrawals.map(w => [new Date(w.createdAt).toLocaleDateString(), `MWK ${w.amount.toLocaleString()}`, w.paymentMethod, w.status]),
        headStyles: { fillColor: [0, 0, 0] }
      });
      doc.save(`${user.fullName.replace(/\s+/g, '_')}_Statement.pdf`);
    } catch (error) {
      console.error('PDF error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
          <button onClick={() => setViewingProofUrl(null)} className="absolute top-6 right-6 p-4 bg-malawi-red text-white rounded-full shadow-xl active:scale-95 transition-all"><X size={24} /></button>
          <img src={viewingProofUrl} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain ring-4 ring-white/10" alt="HD Proof" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-malawi-black uppercase tracking-tight">Transaction Ledger</h1>
          <p className="text-gray-500 font-medium">Detailed history of all your platform activities.</p>
        </div>
        <button onClick={handleDownloadStatement} disabled={isGenerating} className="bg-malawi-black hover:bg-gray-800 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg transition-all active:scale-95">
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Export Statement
        </button>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-malawi-black uppercase flex items-center gap-2">
          <FileText className="text-malawi-red" size={24} /> 
          Withdrawal Requests
        </h2>
        <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
          {myWithdrawals.length === 0 ? (
            <div className="p-20 text-center text-gray-400 space-y-4">
               <Receipt size={48} className="mx-auto opacity-20" />
               <p className="italic font-medium">No withdrawals found in your history.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b text-[10px] font-black uppercase text-gray-400">
                  <tr>
                    <th className="px-8 py-6">Date & ID</th>
                    <th className="px-8 py-6">Amount Request</th>
                    <th className="px-8 py-6">Admin Receipt</th>
                    <th className="px-8 py-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {myWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-6">
                         <p className="font-bold text-gray-900">{new Date(w.createdAt).toLocaleDateString()}</p>
                         <p className="text-[10px] text-gray-400 uppercase font-black">{w.id}</p>
                      </td>
                      <td className="px-8 py-6">
                         <p className="text-lg font-black text-malawi-green">MWK {w.amount.toLocaleString()}</p>
                         <p className="text-[9px] font-black text-gray-400 uppercase">{w.paymentMethod}</p>
                      </td>
                      <td className="px-8 py-6">
                        {w.status === WithdrawalStatus.APPROVED && w.paymentProofUrl ? (
                          <button onClick={() => setViewingProofUrl(w.paymentProofUrl || null)} className="flex items-center gap-2 bg-malawi-black text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-md">
                            <ImageIcon size={14} /> View Receipt
                          </button>
                        ) : w.status === WithdrawalStatus.APPROVED ? (
                          <span className="text-[9px] font-black text-gray-400 uppercase italic">Contact Support</span>
                        ) : '---'}
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex flex-col gap-1">
                            {getStatusBadge(w.status)}
                            {w.adminNote && <p className="text-[9px] text-gray-400 font-bold uppercase truncate max-w-[150px]">Ref: {w.adminNote}</p>}
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default History;
