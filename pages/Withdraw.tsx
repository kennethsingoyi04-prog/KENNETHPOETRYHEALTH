
import React, { useState } from 'react';
import { AppState, PaymentMethod, WithdrawalStatus, WithdrawalRequest } from '../types';
import { MIN_WITHDRAWAL } from '../constants';
import { Wallet, Info, Upload, CheckCircle, Smartphone, FileImage, Loader2, AlertCircle } from 'lucide-react';
import { notifyWithdrawalRequest } from '../services/NotificationService';
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
  const [proofFile, setProofFile] = useState<File | null>(null);
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
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Content
                }
              },
              {
                text: "Analyze this image. Is it a valid identity document (such as a National ID card, Passport, or Driver's License)? If it looks like a person's identity document, respond with ONLY the word 'VALID'. If it is not an ID (e.g., it is a photo of a landscape, a person, text, or a random object), respond with 'INVALID: [short reason]'."
              }
            ]
          }
        ]
      });

      const result = response.text?.trim() || "INVALID: Unable to verify";
      if (result === 'VALID') {
        setVerificationResult({ valid: true, message: "ID document looks valid." });
      } else {
        setVerificationResult({ 
          valid: false, 
          message: result.startsWith('INVALID:') ? result.replace('INVALID:', '').trim() : "This does not appear to be a valid identity document." 
        });
      }
    } catch (err) {
      console.error("AI ID Verification failed", err);
      setVerificationResult({ valid: true, message: "Manual verification required by admin." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
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

    if (withdrawAmount < MIN_WITHDRAWAL) {
      alert(`Minimum withdrawal is MWK ${MIN_WITHDRAWAL.toLocaleString()}`);
      return;
    }

    if (withdrawAmount > user.balance) {
      alert('Insufficient balance');
      return;
    }

    if (!proofBase64) {
      alert('Please upload a proof of ID');
      return;
    }

    if (verificationResult && !verificationResult.valid) {
      if (!window.confirm("Our system flagged this document as potentially invalid. Submitting false documents can get your account banned. Continue?")) {
        return;
      }
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
      proofUrl: proofBase64
    };

    const updatedUser = {
      ...user,
      balance: user.balance - withdrawAmount
    };

    const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);

    // Simulate network delay
    setTimeout(() => {
      onStateUpdate({
        withdrawals: [newRequest, ...state.withdrawals],
        users: updatedUsers,
        currentUser: updatedUser
      });
      
      notifyWithdrawalRequest(user.fullName, withdrawAmount, method);
      
      setIsSubmitting(false);
      setSuccess(true);
      setAmount('');
      setProofFile(null);
      setProofBase64(null);
      setVerificationResult(null);
    }, 1200);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="bg-malawi-green/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-malawi-green border-4 border-white shadow-xl">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-3xl font-black text-malawi-black uppercase tracking-tight">Request Submitted!</h2>
        <p className="text-gray-600 leading-relaxed">
          Your payout for <span className="text-malawi-green font-bold">MWK {amount}</span> is now in the verification queue. 
          Expect a confirmation on WhatsApp (+{whatsapp}) within 24 hours.
        </p>
        <button 
          onClick={() => setSuccess(false)}
          className="bg-malawi-black hover:bg-gray-800 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all w-full shadow-lg shadow-black/10"
        >
          Finish & Return
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center transition-all hover:shadow-md">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Available Payout Balance</p>
          <p className="text-4xl font-black text-malawi-green">MWK {user.balance.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-2xl">
          <Wallet className="text-gray-300" size={32} />
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-3xl flex gap-4 text-sm text-blue-900 shadow-sm">
        <div className="bg-blue-500/10 p-2 rounded-xl h-fit"><Info size={20} className="text-blue-600 shrink-0" /></div>
        <div className="space-y-1">
          <p className="font-black uppercase text-[10px] tracking-widest">Withdrawal Guidelines</p>
          <ul className="list-disc ml-4 mt-1 space-y-1 text-xs font-medium text-blue-800/80">
            <li>Minimum payout threshold: <span className="font-bold">MWK {MIN_WITHDRAWAL.toLocaleString()}</span></li>
            <li>Standard processing window: <span className="font-bold">1 - 12 hours</span></li>
            <li>Verify your mobile number to avoid transaction delays.</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-malawi-green/5 rounded-full -mr-16 -mt-16"></div>
        
        <h2 className="text-2xl font-black text-malawi-black uppercase tracking-tight border-b border-gray-100 pb-4">Payout Application</h2>
        
        <div className="space-y-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Gateway</p>
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => setMethod(PaymentMethod.AIRTEL_MONEY)}
              className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                method === PaymentMethod.AIRTEL_MONEY ? 'border-malawi-red bg-red-50 ring-4 ring-red-500/5' : 'border-gray-50 hover:border-gray-200 bg-gray-50/50'
              }`}
            >
              <div className={`p-2 rounded-lg ${method === PaymentMethod.AIRTEL_MONEY ? 'bg-malawi-red text-white' : 'bg-gray-100 text-gray-400'}`}>
                <Smartphone size={24} />
              </div>
              <span className="font-black text-[10px] uppercase tracking-wider">Airtel Money</span>
            </button>
            
            <button 
              type="button"
              onClick={() => setMethod(PaymentMethod.TNM_MPAMBA)}
              className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                method === PaymentMethod.TNM_MPAMBA ? 'border-malawi-green bg-green-50 ring-4 ring-green-500/5' : 'border-gray-50 hover:border-gray-200 bg-gray-50/50'
              }`}
            >
              <div className={`p-2 rounded-lg ${method === PaymentMethod.TNM_MPAMBA ? 'bg-malawi-green text-white' : 'bg-gray-100 text-gray-400'}`}>
                <Smartphone size={24} />
              </div>
              <span className="font-black text-[10px] uppercase tracking-wider">TNM Mpamba</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cash Out Amount (MWK)</label>
          <div className="relative">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">MWK</div>
             <input 
               type="number"
               required
               placeholder="Enter amount..."
               className="w-full pl-16 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-green outline-none font-black text-lg transition-all"
               value={amount}
               onChange={(e) => setAmount(e.target.value)}
             />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination Number</label>
            <input 
              type="tel"
              required
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green font-medium transition-all"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Verification</label>
            <input 
              type="tel"
              required
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green font-medium transition-all"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identity Verification (Upload ID)</label>
          <div className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center relative transition-all group overflow-hidden ${
             verificationResult?.valid === false ? 'border-red-300 bg-red-50/30' : 
             verificationResult?.valid === true ? 'border-green-300 bg-green-50/30' : 
             'border-gray-200 hover:bg-green-50/30 hover:border-malawi-green'
          }`}>
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer z-20" 
              accept="image/*"
              onChange={handleFileChange}
              disabled={isVerifying}
            />
            {isVerifying ? (
              <div className="flex flex-col items-center gap-3 animate-pulse">
                <Loader2 className="animate-spin text-malawi-green" size={32} />
                <p className="text-xs font-black uppercase tracking-widest text-malawi-green">Analyzing Document...</p>
              </div>
            ) : proofBase64 ? (
              <div className="flex flex-col items-center gap-2 animate-in zoom-in">
                <div className="bg-malawi-green text-white p-3 rounded-2xl shadow-lg">
                  <FileImage size={32} />
                </div>
                <p className="text-sm font-bold text-gray-700">{proofFile?.name}</p>
                {verificationResult?.valid ? (
                   <p className="text-[10px] font-black text-malawi-green uppercase tracking-widest flex items-center gap-1"><CheckCircle size={12}/> Verified ID Format</p>
                ) : verificationResult?.valid === false ? (
                   <p className="text-[10px] font-black text-malawi-red uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12}/> {verificationResult.message}</p>
                ) : null}
                <p className="text-[9px] uppercase font-black text-gray-400">Click to replace file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 group-hover:scale-105 transition-transform">
                <Upload size={40} className="mb-2 text-gray-300 group-hover:text-malawi-green transition-colors" />
                <p className="text-sm font-bold text-gray-600">Click or Drag Proof of ID</p>
                <p className="text-[10px] uppercase font-black text-gray-400">JPG, PNG up to 5MB</p>
              </div>
            )}
          </div>
        </div>

        <button 
          disabled={isSubmitting || isVerifying || !proofBase64}
          className={`w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-xl transition-all flex items-center justify-center gap-2 ${
            isSubmitting || isVerifying ? 'bg-gray-400 cursor-not-allowed' : 'bg-malawi-black hover:bg-gray-800 hover:scale-[1.01] active:scale-[0.99] shadow-black/20'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Processing...
            </>
          ) : 'Request Withdrawal Now'}
        </button>
      </form>
    </div>
  );
};

export default Withdraw;
