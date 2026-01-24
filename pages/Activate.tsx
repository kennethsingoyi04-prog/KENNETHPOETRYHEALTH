
import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AppState, MembershipTier, MembershipStatus } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { Upload, Info, MessageSquare, ExternalLink, ShieldCheck, CheckCircle2, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ActivateProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Activate: React.FC<ActivateProps> = ({ state, onStateUpdate }) => {
  const navigate = useNavigate();
  const user = state.currentUser;
  
  const [selectedTier, setSelectedTier] = useState<MembershipTier>(MembershipTier.BRONZE);
  const [membershipProof, setMembershipProof] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return <Navigate to="/auth" />;
  if (user.membershipStatus === MembershipStatus.ACTIVE) return <Navigate to="/dashboard" />;

  const verifyImageWithAI = async (base64Data: string) => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Remove data:image/png;base64, prefix
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
                text: "Analyze this image. Is it a screenshot of a mobile money payment receipt (specifically Airtel Money or TNM Mpamba from Malawi)? Check for keywords like 'Transaction ID', 'Airtel', 'Mpamba', 'Trans ID', or 'Successful'. If it is a valid receipt, reply with ONLY the word 'VALID'. If it is not a receipt (e.g., it's a random photo, a blank screen, or an unrelated document), reply with 'INVALID: [short reason]'."
              }
            ]
          }
        ]
      });

      const result = response.text?.trim() || "INVALID: Unable to verify";
      if (result === 'VALID') {
        setVerificationResult({ valid: true, message: "Receipt looks genuine. You can now submit." });
      } else {
        setVerificationResult({ 
          valid: false, 
          message: result.startsWith('INVALID:') ? result.replace('INVALID:', '').trim() : "This does not appear to be a valid mobile money receipt." 
        });
      }
    } catch (err) {
      console.error("AI Verification failed", err);
      // Fallback if AI fails, but let the user proceed with a warning
      setVerificationResult({ valid: true, message: "Verification unavailable, but you can proceed at your own risk." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setMembershipProof(result);
        verifyImageWithAI(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipProof) {
      alert("Please upload proof of payment to proceed.");
      return;
    }

    if (verificationResult && !verificationResult.valid) {
      if (!window.confirm("Our AI suggests this might not be a valid receipt. False submissions may lead to account suspension. Are you sure you want to proceed?")) {
        return;
      }
    }

    setIsSubmitting(true);
    
    setTimeout(() => {
      const updatedUser = {
        ...user,
        membershipTier: selectedTier,
        membershipStatus: MembershipStatus.PENDING,
        membershipProofUrl: membershipProof
      };
      
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      
      onStateUpdate({
        users: updatedUsers,
        currentUser: updatedUser
      });
      
      setIsSubmitting(false);
      navigate('/dashboard');
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-10 space-y-4">
        <h1 className="text-4xl font-black text-malawi-black uppercase tracking-tight">Activate Your Membership</h1>
        <p className="text-gray-500 max-w-lg mx-auto font-medium">
          Choose a tier to unlock referral commissions and withdraw your earnings to Airtel Money or TNM Mpamba.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Tier Selection */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-malawi-black uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="text-malawi-green" size={20} />
            Choose Your Level
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MEMBERSHIP_TIERS.map((tier) => (
              <button
                key={tier.tier}
                onClick={() => setSelectedTier(tier.tier)}
                className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden group ${
                  selectedTier === tier.tier 
                    ? 'border-malawi-green bg-green-50 ring-4 ring-green-500/5' 
                    : 'border-gray-100 bg-white hover:border-gray-300'
                }`}
              >
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: tier.color }}>{tier.name}</p>
                  <p className="text-2xl font-black text-malawi-black">MWK {tier.price.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 mt-2 font-bold leading-tight uppercase">{tier.description}</p>
                </div>
                {selectedTier === tier.tier && (
                  <div className="absolute top-2 right-2 text-malawi-green">
                    <CheckCircle2 size={24} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Payment & Proof */}
        <div className="space-y-8">
          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-4 shadow-sm">
            <div className="flex gap-3 text-sm text-blue-900 leading-relaxed">
              <Info className="shrink-0 text-blue-600" size={20} />
              <p className="font-medium">
                To activate your <span className="font-black text-blue-700">{selectedTier}</span> membership, please request the latest payment details from our official sources:
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <a 
                href="https://chat.whatsapp.com/KHyBJz9bNq07QngjuP83Vx" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-[#25D366] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1ebd59] transition-all shadow-md active:scale-95"
              >
                 <MessageSquare size={18} /> Official WhatsApp Group
              </a>
              <a 
                href="https://www.kennethpoetryhealth.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-malawi-black text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md active:scale-95"
              >
                 <ExternalLink size={18} /> Visit Official Website
              </a>
            </div>
          </div>

          <form onSubmit={handleActivate} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Upload Payment Receipt</label>
              <div className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center relative cursor-pointer transition-all group overflow-hidden ${
                verificationResult?.valid === false ? 'border-red-300 bg-red-50/30' : 
                verificationResult?.valid === true ? 'border-green-300 bg-green-50/30' : 
                'border-gray-200 hover:bg-gray-50'
              }`}>
                <input type="file" required accept="image/*" onChange={handleProofUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" disabled={isVerifying} />
                {isVerifying ? (
                  <div className="flex flex-col items-center gap-3 animate-in fade-in">
                    <Loader2 className="animate-spin text-malawi-green" size={32} />
                    <p className="text-xs font-black uppercase tracking-widest text-malawi-green">AI Scanning Receipt...</p>
                  </div>
                ) : membershipProof ? (
                  <div className="flex flex-col items-center gap-3 animate-in zoom-in">
                     <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl border-2 border-white">
                       <img src={membershipProof} alt="Proof" className="w-full h-full object-cover" />
                     </div>
                     <div className="text-center">
                        {verificationResult?.valid ? (
                          <p className="text-[10px] font-black text-malawi-green uppercase tracking-widest flex items-center justify-center gap-1"><CheckCircle2 size={12}/> Verified Receipt</p>
                        ) : verificationResult?.valid === false ? (
                          <p className="text-[10px] font-black text-malawi-red uppercase tracking-widest flex items-center justify-center gap-1"><AlertCircle size={12}/> {verificationResult.message}</p>
                        ) : null}
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Click to Replace</p>
                     </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 group-hover:scale-105 transition-transform">
                    <div className="bg-gray-100 p-4 rounded-2xl text-gray-400 group-hover:bg-malawi-green/10 group-hover:text-malawi-green transition-colors">
                      <Upload size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-gray-600 uppercase tracking-widest">Select Payment Screenshot</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Airtel Money or TNM Mpamba Confirmation</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button 
              disabled={isSubmitting || !membershipProof || isVerifying}
              className={`w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-2xl transition-all flex items-center justify-center gap-3 ${
                isSubmitting || isVerifying ? 'bg-gray-400' : 'bg-malawi-green hover:bg-green-700 active:scale-[0.98] shadow-green-500/20'
              }`}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
              {isSubmitting ? 'Submitting Activation...' : 'Submit Activation Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Activate;
