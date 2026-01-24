
import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AppState, MembershipTier, MembershipStatus } from '../types';
import { MEMBERSHIP_TIERS } from '../constants';
import { Upload, Info, MessageSquare, ExternalLink, ShieldCheck, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
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
      const base64Content = base64Data.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: base64Content } },
              { text: "Is this a valid Airtel Money or TNM Mpamba receipt? Look for 'Transaction ID', 'Successful', or 'Trans ID'. Reply with 'VALID' or 'INVALID: [reason]'." }
            ]
          }
        ]
      });

      const result = response.text?.trim() || "INVALID: No result";
      if (result === 'VALID') {
        setVerificationResult({ valid: true, message: "Receipt verified." });
      } else {
        setVerificationResult({ valid: false, message: result.replace('INVALID:', '').trim() });
      }
    } catch (err) {
      setVerificationResult({ valid: true, message: "Manual check required." });
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
    if (!membershipProof) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const updatedUser = { ...user, membershipTier: selectedTier, membershipStatus: MembershipStatus.PENDING, membershipProofUrl: membershipProof };
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      onStateUpdate({ users: updatedUsers, currentUser: updatedUser });
      setIsSubmitting(false);
      navigate('/dashboard');
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-malawi-black uppercase tracking-tight">Activate Account</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Select Tier</h2>
          <div className="grid grid-cols-2 gap-4">
            {MEMBERSHIP_TIERS.map(tier => (
              <button key={tier.tier} onClick={() => setSelectedTier(tier.tier)} className={`p-6 rounded-3xl border-2 text-left transition-all ${selectedTier === tier.tier ? 'border-malawi-green bg-green-50' : 'bg-white'}`}>
                <p className="text-[10px] font-black uppercase" style={{ color: tier.color }}>{tier.name}</p>
                <p className="text-xl font-black">MWK {tier.price.toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <form onSubmit={handleActivate} className="space-y-6 bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <div className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center relative cursor-pointer ${membershipProof ? 'bg-green-50' : ''}`}>
              <input type="file" required accept="image/*" onChange={handleProofUpload} className="absolute inset-0 opacity-0 z-20" />
              {isVerifying ? <Loader2 className="animate-spin" /> : membershipProof ? <img src={membershipProof} className="w-20 h-20 object-cover rounded-xl" /> : <Upload />}
              <p className="text-[10px] font-black uppercase mt-3">{verificationResult?.message || 'Upload Receipt'}</p>
            </div>
            <button disabled={isSubmitting || !membershipProof} className="w-full py-5 bg-malawi-green text-white font-black rounded-2xl uppercase text-xs shadow-lg">
              {isSubmitting ? 'Processing...' : 'Submit Activation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Activate;
