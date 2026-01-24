
import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppState, Complaint } from '../types';
import { 
  X, 
  ChevronRight, 
  Upload, 
  PlusCircle, 
  ArrowLeft,
  ShieldCheck,
  Loader2,
  Eye,
  MessageSquareWarning
} from 'lucide-react';
import { uploadImage } from '../dataService';

interface ProfileProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
  onLogout: () => void;
}

type ProfileTab = 'account' | 'support';

const Profile: React.FC<ProfileProps> = ({ state, onStateUpdate }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = state.currentUser!;
  const [activeTab, setActiveTab] = useState<ProfileTab>((searchParams.get('tab') as ProfileTab) || 'account');

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportImageUrl, setSupportImageUrl] = useState<string | null>(null);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  const myComplaints = useMemo(() => {
    return state.complaints
      .filter(c => c.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.complaints, user.id]);

  const selectedTicket = useMemo(() => 
    myComplaints.find(c => c.id === selectedTicketId),
    [myComplaints, selectedTicketId]
  );

  const handleSupportImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const url = await uploadImage(file, 'support_tickets');
    if (url) setSupportImageUrl(url);
    setIsUploading(false);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) return;
    setIsSubmittingSupport(true);
    
    const newComplaint: Complaint = {
      id: `ticket-${Date.now()}`,
      userId: user.id,
      userName: user.fullName,
      subject: supportSubject.trim(),
      message: supportMessage.trim(),
      imageUrl: supportImageUrl || undefined,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      onStateUpdate({ complaints: [newComplaint, ...state.complaints] });
      setIsSubmittingSupport(false);
      setSupportSubject('');
      setSupportMessage('');
      setSupportImageUrl(null);
      setShowSupportForm(false);
      setSelectedTicketId(newComplaint.id);
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setViewingProofUrl(null)}>
           <button onClick={() => setViewingProofUrl(null)} className="absolute top-6 right-6 p-4 bg-malawi-red text-white rounded-full shadow-xl active:scale-95 transition-all"><X size={24} /></button>
           <img src={viewingProofUrl} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain ring-4 ring-white/10" alt="HD Proof" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-24 h-24 bg-malawi-black rounded-[2rem] flex items-center justify-center text-white text-3xl font-black mb-6 shadow-xl border-4 border-white ring-1 ring-gray-100">
              {user.fullName.charAt(0)}
            </div>
            <h2 className="text-xl font-black text-malawi-black text-center">{user.fullName}</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">@{user.username}</p>
            
            <div className="w-full space-y-3">
              <button onClick={() => setActiveTab('account')} className={`w-full flex justify-between items-center p-5 rounded-3xl transition-all ${activeTab === 'account' ? 'bg-malawi-green text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}><span className="text-xs font-black uppercase tracking-widest">Profile Info</span><ChevronRight size={14} /></button>
              <button onClick={() => setActiveTab('support')} className={`w-full flex justify-between items-center p-5 rounded-3xl transition-all ${activeTab === 'support' ? 'bg-malawi-black text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}><span className="text-xs font-black uppercase tracking-widest">Support Hub</span><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 min-h-[600px]">
            {activeTab === 'account' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="border-b pb-6">
                   <h3 className="text-xl font-black uppercase tracking-tight">Account Record</h3>
                </div>
                <div className="space-y-6">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Legal Name</label>
                         <p className="p-4 bg-gray-50 rounded-2xl border font-bold text-sm">{user.fullName}</p>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Referral Code</label>
                         <p className="p-4 bg-gray-50 rounded-2xl border font-mono font-black text-sm text-malawi-green">{user.referralCode}</p>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Contact Phone</label>
                      <p className="p-4 bg-gray-50 rounded-2xl border font-bold text-sm">{user.phone}</p>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Official Email</label>
                      <p className="p-4 bg-gray-50 rounded-2xl border font-bold text-sm">{user.email}</p>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b pb-6">
                  <h3 className="text-xl font-black uppercase tracking-tight">Support Desk</h3>
                  {!showSupportForm && <button onClick={() => setShowSupportForm(true)} className="bg-malawi-green text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-green-500/10 active:scale-95 transition-all"><PlusCircle size={16} /> New Ticket</button>}
                </div>

                {showSupportForm ? (
                  <form onSubmit={handleSupportSubmit} className="space-y-4 animate-in slide-in-from-top-4">
                    <input type="text" required placeholder="Subject (e.g. Payment Issue)" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-black transition-all" value={supportSubject} onChange={e => setSupportSubject(e.target.value)} />
                    <textarea rows={6} required placeholder="Detail your concern in English or Chichewa..." className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-medium resize-none outline-none focus:ring-2 focus:ring-malawi-black transition-all" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Attach Evidence (Screenshot)</label>
                      <div className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center relative hover:bg-gray-50 cursor-pointer transition-all ${supportImageUrl ? 'bg-green-50 border-malawi-green' : 'border-gray-200'}`}>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" onChange={handleSupportImageUpload} />
                        {isUploading ? (
                          <Loader2 className="animate-spin text-malawi-green" />
                        ) : supportImageUrl ? (
                          <div className="flex flex-col items-center gap-2">
                            <img src={supportImageUrl} className="w-24 h-24 object-cover rounded-xl shadow-lg border-2 border-white" />
                            <span className="text-[9px] font-black text-malawi-green uppercase">Image Ready</span>
                          </div>
                        ) : <Upload className="text-gray-300" />}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="submit" disabled={isSubmittingSupport || isUploading} className="flex-grow bg-malawi-black text-white font-black py-4 rounded-3xl flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all disabled:opacity-50">
                         {isSubmittingSupport ? 'Sending...' : 'Transmit Ticket'}
                      </button>
                      <button type="button" onClick={() => setShowSupportForm(false)} className="px-8 bg-gray-100 text-gray-400 font-black py-4 rounded-3xl uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                    </div>
                  </form>
                ) : selectedTicket ? (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                    <button onClick={() => setSelectedTicketId(null)} className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 hover:text-malawi-black transition-colors"><ArrowLeft size={16} /> All Tickets</button>
                    <div className="bg-gray-50 p-8 rounded-[2.5rem] border shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                         <h4 className="text-2xl font-black text-malawi-black uppercase leading-tight">{selectedTicket.subject}</h4>
                         <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${selectedTicket.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{selectedTicket.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed mb-6 italic">"{selectedTicket.message}"</p>
                      {selectedTicket.imageUrl && (
                        <button onClick={() => setViewingProofUrl(selectedTicket.imageUrl || null)} className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl group relative">
                           <img src={selectedTicket.imageUrl} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"><Eye size={20} /></div>
                        </button>
                      )}
                    </div>

                    {selectedTicket.reply ? (
                      <div className="bg-malawi-black text-white p-8 rounded-[2.5rem] shadow-2xl relative border-b-8 border-malawi-red/30">
                        <div className="flex items-center gap-2 mb-4">
                           <ShieldCheck size={18} className="text-malawi-red" />
                           <p className="text-[10px] font-black text-malawi-red uppercase tracking-widest">Official Support Verdict</p>
                        </div>
                        <p className="text-sm leading-relaxed mb-6 text-gray-300">{selectedTicket.reply}</p>
                        {selectedTicket.replyImageUrl && (
                          <button onClick={() => setViewingProofUrl(selectedTicket.replyImageUrl || null)} className="w-32 h-32 rounded-3xl border-4 border-white/10 overflow-hidden shadow-2xl active:scale-95 transition-all"><img src={selectedTicket.replyImageUrl} className="w-full h-full object-cover" /></button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-8 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center gap-3 opacity-60">
                         <div className="animate-bounce"><MessageSquareWarning className="text-gray-400" /></div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Our agents are reviewing your case</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myComplaints.length === 0 ? (
                      <div className="py-20 text-center text-gray-300 italic">No tickets found. Need help? Create one!</div>
                    ) : myComplaints.map(ticket => (
                      <button key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} className="w-full bg-white rounded-3xl p-6 border border-gray-100 hover:border-malawi-black flex justify-between items-center transition-all shadow-sm hover:shadow-md">
                        <div className="text-left">
                          <h5 className="font-black text-sm uppercase tracking-tight text-malawi-black mb-1">{ticket.subject}</h5>
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                             <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                             <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">ID: {ticket.id}</span>
                          </div>
                        </div>
                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${ticket.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>{ticket.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
