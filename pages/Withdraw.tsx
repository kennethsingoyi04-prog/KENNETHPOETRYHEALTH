
import React, { useState } from 'react';
// Added useNavigate import to resolve the missing 'navigate' reference
import { useNavigate } from 'react-router-dom';
import { AppState, PaymentMethod, WithdrawalStatus, WithdrawalRequest } from '../types';
import { MIN_WITHDRAWAL } from '../constants';
import { Wallet, Upload, FileImage, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { uploadImage } from '../dataService';

interface WithdrawProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Withdraw: React.FC<WithdrawProps> = ({ state, onStateUpdate }) => {
  // Initialized the navigate function from react-router-dom
  const navigate = useNavigate();
  const user = state.currentUser!;
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.AIRTEL_MONEY);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const verifyIDWithAI = async (base64Data: string) => {
    setIsVerifying(true);
    try {
      // Re-instantiating AI client right before the call to ensure fresh configuration
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Content = base64Data.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Content } },
          { text: "Is this a valid National ID card or Passport? Reply with 'VALID' or 'INVALID: [reason]'." }
        ]}]
      });
      // Correctly accessing the .text property from GenerateContentResponse
      const result = response.text?.trim() || "INVALID: Error";
      if (result === 'VALID') setVerificationResult({ valid: true, message: "ID Accepted." });
      else setVerificationResult({ valid: false, message: result.replace('INVALID:', '').trim() });
    } catch (err) {
      setVerificationResult({ valid: true, message: "Manual verification required." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setVerificationResult(null);

    // 1. Get Base64 for AI check
    const reader = new FileReader();
    reader.onloadend = () => verifyIDWithAI(reader.result as string);
    reader.readAsDataURL(file);

    // 2. Upload to Cloud
    const url = await uploadImage(file, 'id_proofs');
    if (url) setProofUrl(url);
    setIsUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount < MIN_WITHDRAWAL || withdrawAmount > user.balance || !proofUrl) return;
    
    setIsSubmitting(true);
    setTimeout(() => {
      const newRequest: WithdrawalRequest = { 
        id: `wd-${Date.now()}`, 
        userId: user.id, 
        userName: user.fullName, 
        amount: withdrawAmount, 
        phone: user.phone, 
        whatsapp: user.whatsapp, 
        paymentMethod: method, 
        status: WithdrawalStatus.PENDING, 
        createdAt: new Date().toISOString(), 
        proofUrl: proofUrl 
      };
      const updatedUser = { ...user, balance: user.balance - withdrawAmount };
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      onStateUpdate({ withdrawals: [newRequest, ...state.withdrawals], users: updatedUsers, currentUser: updatedUser });
      setIsSubmitting(false);
      setSuccess(true);
    }, 1200);
  };

  if (success) return (
    <div className="max-w-md mx-auto mt-12 text-center space-y-6">
      <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-lg">
        <CheckCircle size={48} />
      </div>
      <h2 className="text-3xl font-black uppercase tracking-tight">Request Logged!</h2>
      <p className="text-gray-500 font-medium px-8 text-sm">Your payout request is being processed. Funds will reach your {method} wallet soon.</p>
      <button onClick={() => navigate('/dashboard')} className="w-full py-4 bg-malawi-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-black/10 transition-all active:scale-95">Back to Dashboard</button>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-[2.5rem] border flex justify-between items-center shadow-sm">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available Balance</p>
          <p className="text-4xl font-black text-malawi-green">MWK {user.balance.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-3xl text-gray-200">
          <Wallet size={40} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[3rem] border shadow-2xl space-y-8">
        <div className="border-b pb-4 flex items-center justify-between">
           <h2 className="text-xl font-black uppercase tracking-tight">Request Payout</h2>
           <span className="text-[9px] font-black bg-gray-50 border px-3 py-1 rounded-full text-gray-400 uppercase tracking-widest">Verified Mode</span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Withdrawal Amount</label>
            <input type="number" required placeholder="Min. MWK 5,000" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg focus:ring-2 focus:ring-malawi-green outline-none" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Mobile Wallet</label>
            <div className="grid grid-cols-2 gap-3">
               {[PaymentMethod.AIRTEL_MONEY, PaymentMethod.TNM_MPAMBA].map(m => (
                 <button key={m} type="button" onClick={() => setMethod(m)} className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase transition-all ${method === m ? 'border-malawi-black bg-gray-50' : 'bg-white text-gray-400 opacity-60'}`}>{m}</button>
               ))}
            </div>
          </div>

          <div className="space-y-1 pt-4">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Identity Verification (ID/Passport)</label>
            <div className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center relative min-h-[220px] transition-all ${proofUrl ? 'bg-green-50 border-malawi-green' : 'border-gray-200 hover:border-malawi-black'}`}>
              <input type="file" required accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                   <Loader2 className="animate-spin text-malawi-black" />
                   <span className="text-[9px] font-black uppercase">Cloud Syncing...</span>
                </div>
              ) : proofUrl ? (
                <div className="flex flex-col items-center gap-2">
                   <FileImage size={40} className="text-malawi-green" />
                   <span className="text-[9px] font-black text-malawi-green uppercase tracking-widest">ID Logged Successfully</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                   <Upload className="text-gray-300" />
                   <span className="text-[10px] font-black uppercase text-gray-400">Tap to Scan Document</span>
                </div>
              )}

              {isVerifying && <div className="mt-4 flex items-center gap-1.5 text-malawi-green font-black text-[9px] uppercase"><Sparkles size={12} className="animate-pulse" /> AI Scanner Active</div>}
              {verificationResult && <p className={`text-[9px] font-black uppercase mt-3 px-3 py-1 rounded-full ${verificationResult.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{verificationResult.message}</p>}
            </div>
          </div>
        </div>

        <button disabled={isSubmitting || isUploading || !proofUrl} className="w-full py-5 bg-malawi-black text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl shadow-black/10 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Withdrawal Request'}
        </button>
      </form>
    </div>
  );
};

export default Withdraw;
