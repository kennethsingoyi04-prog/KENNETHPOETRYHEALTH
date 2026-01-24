
import React, { useState } from 'react';
import { AppState, PaymentMethod, WithdrawalStatus, WithdrawalRequest } from '../types';
import { MIN_WITHDRAWAL } from '../constants';
import { Wallet, Info, Upload, CheckCircle, Smartphone, FileImage, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

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
  const [proofBase64, setProofBase64] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const verifyIDWithAI = async (base64Data: string) => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Content = base64Data.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Content } },
            { text: "Is this a valid National ID card or Passport? Reply with 'VALID' or 'INVALID: [reason]'." }
          ]}
        ]
      });
      const result = response.text?.trim() || "INVALID: Error";
      if (result === 'VALID') setVerificationResult({ valid: true, message: "ID Accepted." });
      else setVerificationResult({ valid: false, message: result.replace('INVALID:', '').trim() });
    } catch (err) {
      setVerificationResult({ valid: true, message: "Manual verification required." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProofBase64(result);
        verifyIDWithAI(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount < MIN_WITHDRAWAL || withdrawAmount > user.balance || !proofBase64) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const newRequest: WithdrawalRequest = { id: `wd-${Date.now()}`, userId: user.id, userName: user.fullName, amount: withdrawAmount, phone, whatsapp, paymentMethod: method, status: WithdrawalStatus.PENDING, createdAt: new Date().toISOString(), proofUrl: proofBase64 };
      const updatedUser = { ...user, balance: user.balance - withdrawAmount };
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      onStateUpdate({ withdrawals: [newRequest, ...state.withdrawals], users: updatedUsers, currentUser: updatedUser });
      setIsSubmitting(false);
      setSuccess(true);
    }, 1200);
  };

  if (success) return (
    <div className="max-w-md mx-auto mt-12 text-center space-y-6">
      <CheckCircle size={48} className="mx-auto text-malawi-green" />
      <h2 className="text-3xl font-black uppercase">Requested!</h2>
      <button onClick={() => setSuccess(false)} className="w-full py-4 bg-malawi-black text-white rounded-2xl font-black uppercase text-xs">Return</button>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-3xl border flex justify-between items-center shadow-sm">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase">Available</p>
          <p className="text-4xl font-black text-malawi-green">MWK {user.balance.toLocaleString()}</p>
        </div>
        <Wallet className="text-gray-200" size={40} />
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border shadow-xl space-y-8">
        <h2 className="text-2xl font-black uppercase border-b pb-4">Payout</h2>
        <input type="number" required placeholder="Amount (MWK)" className="w-full p-4 bg-gray-50 border rounded-2xl font-black" value={amount} onChange={e => setAmount(e.target.value)} />
        <div className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center relative ${proofBase64 ? 'bg-blue-50' : ''}`}>
          <input type="file" required accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
          {isVerifying ? <Loader2 className="animate-spin" /> : proofBase64 ? <FileImage size={32} /> : <Upload />}
          <p className="text-[10px] font-black uppercase mt-2">{verificationResult?.message || 'Upload ID'}</p>
        </div>
        <button disabled={isSubmitting || isVerifying || !proofBase64} className="w-full py-5 bg-malawi-black text-white font-black rounded-2xl uppercase text-xs">
          {isSubmitting ? 'Submitting...' : 'Request Payout'}
        </button>
      </form>
    </div>
  );
};

export default Withdraw;
