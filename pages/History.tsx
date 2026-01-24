
import React, { useState } from 'react';
import { AppState, WithdrawalStatus } from '../types';
import { Download, Clock, CheckCircle2, XCircle, FileText, Info, Loader2, Image as ImageIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

interface HistoryProps {
  state: AppState;
}

const History: React.FC<HistoryProps> = ({ state }) => {
  const user = state.currentUser!;
  const navigate = useNavigate();
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

  const viewImage = (url?: string) => {
    if (!url) return;
    navigate(`/admin/proof-preview?url=${encodeURIComponent(url)}`);
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
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(20, 75, pageWidth - 40, 25, 3, 3, 'F');
      doc.setFontSize(10);
      doc.text('CURRENT BALANCE: MWK ' + user.balance.toLocaleString(), 30, 93);
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
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <button onClick={handleDownloadStatement} disabled={isGenerating} className="bg-malawi-black text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Statement
        </button>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="text-malawi-red" size={20} /> Withdrawals</h2>
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {myWithdrawals.length === 0 ? <div className="p-12 text-center text-gray-400">No withdrawals yet.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold">Date</th>
                    <th className="px-6 py-4 font-bold">Amount</th>
                    <th className="px-6 py-4 font-bold">Identity</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {myWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(w.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-bold">MWK {w.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {w.proofUrl ? (
                          <button onClick={() => viewImage(w.proofUrl)} className="text-blue-600 font-black text-[10px] uppercase flex items-center gap-1 hover:underline">
                            <ImageIcon size={14} /> My ID Proof
                          </button>
                        ) : <span className="text-gray-300 italic text-[10px]">No Proof</span>}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(w.status)}</td>
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
