
import React, { useState } from 'react';
import { AppState, PaymentMethod, WithdrawalStatus, WithdrawalRequest } from '../types';
import { MIN_WITHDRAWAL } from '../constants';
import { Wallet, Info, Upload, CheckCircle, Smartphone } from 'lucide-react';
import { notifyWithdrawalRequest } from '../services/NotificationService';

interface WithdrawProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Withdraw: React.FC<WithdrawProps> = ({ state, onStateUpdate }) => {
  const user = state.currentUser!;
  const [amount, setAmount] = useState<string>('');
  const [phone, setPhone] = useState(user.phone);
  const [whatsapp, setWhatsapp] = useState(user.whatsapp);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.AIRTEL_MONEY);
  const [proof, setProof] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount < MIN_WITHDRAWAL) {
      alert(`Minimum withdrawal is MWK ${MIN_WITHDRAWAL.toLocaleString()}`);
      return;
    }

    if (withdrawAmount > user.balance) {
      alert('Insufficient balance');
      return;
    }

    setIsSubmitting(true);

    // Simulate request creation
    const newRequest: WithdrawalRequest = {
      id: `wd-${Date.now()}`,
      userId: user.id,
      userName: user.fullName,
      amount: withdrawAmount,
      phone,
      whatsapp,
      paymentMethod: method,
      status: WithdrawalStatus.PENDING,
      createdAt: new Date().toISOString(),
      proofUrl: proof ? 'https://picsum.photos/400/600' : undefined // Placeholder for local file
    };

    const updatedUser = {
      ...user,
      balance: user.balance - withdrawAmount
    };

    const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);

    setTimeout(() => {
      onStateUpdate({
        withdrawals: [newRequest, ...state.withdrawals],
        users: updatedUsers,
        currentUser: updatedUser
      });
      
      // Notify admin about the new withdrawal request
      notifyWithdrawalRequest(user.fullName, withdrawAmount, method);
      
      setIsSubmitting(false);
      setSuccess(true);
      setAmount('');
    }, 1500);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="bg-malawi-green/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-malawi-green">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-3xl font-bold">Request Submitted!</h2>
        <p className="text-gray-600">
          Your withdrawal request for <strong>MWK {amount}</strong> is being processed. 
          You will receive a notification via WhatsApp once approved.
        </p>
        <button 
          onClick={() => setSuccess(false)}
          className="bg-malawi-black text-white px-8 py-3 rounded-xl font-bold w-full"
        >
          Make Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <p className="text-gray-500 text-sm">Available Balance</p>
          <p className="text-3xl font-bold text-malawi-green">MWK {user.balance.toLocaleString()}</p>
        </div>
        <Wallet className="text-gray-200" size={48} />
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg flex gap-3 text-sm text-blue-800">
        <div className="bg-blue-100 p-1 rounded-md h-fit"><Info size={20} className="shrink-0" /></div>
        <div>
          <p className="font-bold">Withdrawal Rules:</p>
          <ul className="list-disc ml-4 mt-1">
            <li>Minimum withdrawal: MWK {MIN_WITHDRAWAL.toLocaleString()}</li>
            <li>Processing time: 1-24 hours</li>
            <li>Make sure your phone number matches your mobile money account.</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 space-y-6">
        <h2 className="text-xl font-bold border-b pb-4">New Withdrawal Request</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            type="button"
            onClick={() => setMethod(PaymentMethod.AIRTEL_MONEY)}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
              method === PaymentMethod.AIRTEL_MONEY ? 'border-malawi-red bg-red-50' : 'border-gray-100 hover:border-gray-300'
            }`}
          >
            <Smartphone size={24} className="text-malawi-red" />
            <span className="font-bold text-sm">Airtel Money</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setMethod(PaymentMethod.TNM_MPAMBA)}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
              method === PaymentMethod.TNM_MPAMBA ? 'border-malawi-green bg-green-50' : 'border-gray-100 hover:border-gray-300'
            }`}
          >
            <Smartphone size={24} className="text-malawi-green" />
            <span className="font-bold text-sm">TNM Mpamba</span>
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Withdrawal Amount (MWK)</label>
          <input 
            type="number"
            required
            placeholder="e.g. 10000"
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-malawi-black outline-none"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Mobile Number</label>
            <input 
              type="tel"
              required
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">WhatsApp Number</label>
            <input 
              type="tel"
              required
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Upload Identity/Proof (Optional)</label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 hover:border-malawi-black transition-colors cursor-pointer relative">
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => setProof(e.target.files?.[0] || null)}
            />
            <Upload size={32} className="mb-2" />
            <p className="text-sm">{proof ? proof.name : "Click to upload screenshot"}</p>
          </div>
        </div>

        <button 
          disabled={isSubmitting}
          className={`w-full py-4 rounded-xl text-white font-bold transition-all ${
            isSubmitting ? 'bg-gray-400' : 'bg-malawi-black hover:bg-gray-800'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Request Payout Now'}
        </button>
      </form>
    </div>
  );
};

export default Withdraw;
