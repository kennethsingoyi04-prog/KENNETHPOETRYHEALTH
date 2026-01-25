
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, PaymentMethod, WithdrawalStatus, WithdrawalRequest } from '../types';
import { MIN_WITHDRAWAL } from '../constants';
import { Wallet, Upload, Loader2, CheckCircle, AlertCircle, MessageCircle, Smartphone } from 'lucide-react';
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
    
    if (!hasMinBalance) {
      alert(`Minimum payout is MWK ${MIN_WITHDRAWAL.toLocaleString()}`);
      return;
    }
    
    if (withdrawAmount < MIN_WITHDRAWAL || withdrawAmount > user.balance || !proofUrl || !payoutPhone || !payoutWhatsapp) {
      alert("Please ensure all details, including WhatsApp number, are correct and proof is uploaded.");
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
      <h2 className="text-3xl font-black uppercase tracking-tight">Request Received</h2>
      <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest leading-relaxed">Admin will process your payout to {method} shortly.</p>
      <button onClick={() => navigate('/dashboard')} className="w-full py-5 bg-malawi-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">Return to Dashboard</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-in fade-in duration-700">
      {!hasMinBalance && (
        <div className="bg-malawi-red p-8 rounded-[2.5rem] text-white flex items-center gap-6 shadow-2xl border-b-8 border-black/20">
          <AlertCircle size={48} className="shrink-0" />
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">Balance Insufficient</h3>
            <p className="text-white/70 text-xs font-bold uppercase mt-1">Minimum withdrawal is MWK {MIN_WITHDRAWAL.toLocaleString()}. Keep building your network!</p>
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex justify-between items-center relative overflow-hidden group">
        <div className="relative z-10">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Withdrawable Funds</p>
          <p className="text-4xl font-black text-malawi-green">K{user.balance.toLocaleString()}</p>
        </div>
        <Wallet size={60} className="text-gray-50 absolute right-[-10px] top-1/2 -translate-y-1/2 rotate-12 group-hover:rotate-0 transition-transform" />
      </div>

      <form onSubmit={handleSubmit} className={`bg-white p-10 rounded-[3rem] border shadow-2xl space-y-8 ${!hasMinBalance ? 'grayscale opacity-50 pointer-events-none' : ''}`}>
        <div className="border-b pb-6 flex justify-between items-center">
           <h2 className="text-2xl font-black uppercase tracking-tight">Payout Setup</h2>
           <div className="flex flex-col items-end">
             <span className="text-[9px] font-black bg-malawi-green text-white px-3 py-1 rounded-full uppercase tracking-widest">Verified Wallet</span>
           </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Withdraw Amount (MWK)</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">K</span>
              <input type="number" required min={MIN_WITHDRAWAL} max={user.balance} placeholder="5,000" className="w-full pl-10 pr-5 py-5 bg-gray-50 border rounded-2xl font-black text-2xl outline-none focus:ring-2 focus:ring-malawi-green transition-all" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Wallet Provider</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl font-black text-xs uppercase outline-none appearance-none cursor-pointer" value={method} onChange={e => setMethod(e.target.value as any)}>
                     <option value={PaymentMethod.AIRTEL_MONEY}>Airtel Money</option>
                     <option value={PaymentMethod.TNM_MPAMBA}>TNM Mpamba</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone Number</label>
                <input type="tel" required placeholder="088/099xxxxxx" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-green transition-all" value={payoutPhone} onChange={e => setPayoutPhone(e.target.value)} />
             </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">WhatsApp Number (For Notification)</label>
            <div className="relative">
              <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-malawi-green" size={18} />
              <input type="tel" required placeholder="WhatsApp Phone" className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-green transition-all" value={payoutWhatsapp} onChange={e => setPayoutWhatsapp(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">ID Verification Screenshot</label>
            <div className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center relative cursor-pointer transition-all ${proofUrl ? 'bg-green-50 border-malawi-green' : 'border-gray-100 hover:bg-gray-50'}`}>
              <input type="file" required accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              {isUploading ? <Loader2 className="animate-spin text-malawi-green" /> : proofUrl ? <CheckCircle className="text-malawi-green" size={32} /> : <Upload className="text-gray-300" size={32} />}
              <p className="text-[10px] font-black uppercase text-gray-400 mt-4 text-center">{proofUrl ? 'ID Proof Successfully Linked' : 'Upload National ID / Passport Screenshot'}</p>
            </div>
          </div>
        </div>

        <button disabled={isSubmitting || isUploading || !proofUrl || !hasMinBalance} className="w-full py-6 bg-malawi-black text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all transform hover:-translate-y-1">
          {isSubmitting ? 'Submitting Application...' : 'Confirm Payout Request'}
        </button>
      </form>
    </div>
  );
};

export default Withdraw;
