
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, PaymentMethod, WithdrawalStatus, WithdrawalRequest } from '../types';
import { MIN_WITHDRAWAL } from '../constants';
import { Wallet, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadImage } from '../dataService';

interface WithdrawProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Withdraw: React.FC<WithdrawProps> = ({ state, onStateUpdate }) => {
  const navigate = useNavigate();
  const user = state.currentUser!;
  
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.AIRTEL_MONEY);
  const [payoutPhone, setPayoutPhone] = useState(user.phone || '');
  const [payoutWhatsapp, setPayoutWhatsapp] = useState(user.whatsapp || '');
  
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const hasMinBalance = user.balance >= MIN_WITHDRAWAL;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadImage(file, 'id_proofs');
    if (url) setProofUrl(url);
    setIsUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);
    
    // Strict Payout Logic: MWK 5000 Minimum
    if (!hasMinBalance) {
      alert(`Minimum payout is MWK ${MIN_WITHDRAWAL.toLocaleString()}`);
      return;
    }
    
    if (withdrawAmount < MIN_WITHDRAWAL || withdrawAmount > user.balance || !proofUrl || !payoutPhone) {
      alert("Please ensure all details are correct and proof is uploaded.");
      return;
    }
    
    setIsSubmitting(true);
    setTimeout(() => {
      const newRequest: WithdrawalRequest = { 
        id: `wd-${Date.now()}`, 
        userId: user.id, 
        userName: user.fullName, 
        amount: withdrawAmount, 
        phone: payoutPhone, 
        whatsapp: payoutWhatsapp, 
        paymentMethod: method, 
        status: WithdrawalStatus.PENDING, 
        createdAt: new Date().toISOString(), 
        proofUrl: proofUrl 
      };
      
      const updatedUser = { ...user, balance: user.balance - withdrawAmount };
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      
      onStateUpdate({ 
        withdrawals: [newRequest, ...state.withdrawals], 
        users: updatedUsers, 
        currentUser: updatedUser 
      });
      
      setSuccess(true);
    }, 1500);
  };

  if (success) return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-6 p-10 bg-white rounded-[3rem] border shadow-2xl">
      <div className="bg-malawi-green w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-white shadow-xl"><CheckCircle size={40} /></div>
      <h2 className="text-3xl font-black uppercase tracking-tight">Request Sent</h2>
      <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Admin will process your payout shortly.</p>
      <button onClick={() => navigate('/dashboard')} className="w-full py-5 bg-malawi-black text-white rounded-2xl font-black uppercase text-xs">Home</button>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24 animate-in fade-in duration-700">
      {!hasMinBalance && (
        <div className="bg-malawi-red p-8 rounded-[2.5rem] text-white flex items-center gap-6 shadow-2xl border-b-8 border-black/20">
          <AlertCircle size={48} className="shrink-0" />
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Payout Restricted</h3>
            <p className="text-white/70 text-xs font-bold uppercase mt-1">Minimum requirement MWK {MIN_WITHDRAWAL.toLocaleString()} not met. Keep inviting!</p>
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available for Payout</p>
          <p className="text-4xl font-black text-malawi-green">MWK {user.balance.toLocaleString()}</p>
        </div>
        <Wallet size={40} className="text-gray-100" />
      </div>

      <form onSubmit={handleSubmit} className={`bg-white p-8 rounded-[3rem] border shadow-2xl space-y-8 ${!hasMinBalance ? 'grayscale opacity-50 pointer-events-none' : ''}`}>
        <div className="border-b pb-4 flex justify-between items-center">
           <h2 className="text-xl font-black uppercase tracking-tight">Withdraw Funds</h2>
           <span className="text-[9px] font-black bg-malawi-green/10 text-malawi-green px-3 py-1 rounded-full uppercase">K5,000 Minimum</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Amount to Withdraw (MWK)</label>
            <input type="number" required min={MIN_WITHDRAWAL} max={user.balance} placeholder="MWK 5,000+" className="w-full p-5 bg-gray-50 border rounded-2xl font-black text-xl outline-none focus:ring-2 focus:ring-malawi-green" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Wallet Phone Number</label>
                <input type="tel" required placeholder="088xxxxxx" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none" value={payoutPhone} onChange={e => setPayoutPhone(e.target.value)} />
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Wallet Provider</label>
                <select className="w-full p-4 bg-gray-50 border rounded-2xl font-black text-xs uppercase outline-none" value={method} onChange={e => setMethod(e.target.value as any)}>
                   <option value={PaymentMethod.AIRTEL_MONEY}>Airtel Money</option>
                   <option value={PaymentMethod.TNM_MPAMBA}>TNM Mpamba</option>
                </select>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Identity Proof (ID Screenshot)</label>
            <div className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center relative cursor-pointer ${proofUrl ? 'bg-green-50 border-malawi-green' : 'border-gray-100 hover:bg-gray-50'}`}>
              <input type="file" required accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              {isUploading ? <Loader2 className="animate-spin text-malawi-green" /> : proofUrl ? <CheckCircle className="text-malawi-green" size={32} /> : <Upload className="text-gray-300" size={32} />}
              <span className="text-[10px] font-black uppercase text-gray-400 mt-2">{proofUrl ? 'ID Uploaded Successfully' : 'Tap to Upload National ID/Passport'}</span>
            </div>
          </div>
        </div>

        <button disabled={isSubmitting || isUploading || !proofUrl || !hasMinBalance} className="w-full py-6 bg-malawi-black text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all">
          {isSubmitting ? 'Submitting Request...' : 'Confirm Withdrawal Request'}
        </button>
      </form>
    </div>
  );
};

export default Withdraw;
