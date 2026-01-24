
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppState, User, NotificationPreferences, Complaint } from '../types';
import {GoogleGenAI} from "@google/genai";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Smartphone, 
  Lock, 
  Camera, 
  CheckCircle,
  ShieldCheck,
  MapPin,
  AtSign,
  MessageSquare,
  Sparkles,
  Loader2,
  Trash2,
  MessageSquareWarning,
  Send,
  PlusCircle,
  History,
  Settings,
  ChevronRight,
  LogOut,
  AlertCircle,
  Eye,
  Clock,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  FileImage
} from 'lucide-react';

interface ProfileProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
  onLogout: () => void;
}

type ProfileTab = 'account' | 'security' | 'support';

const Profile: React.FC<ProfileProps> = ({ state, onStateUpdate, onLogout }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = state.currentUser!;
  const [activeTab, setActiveTab] = useState<ProfileTab>((searchParams.get('tab') as ProfileTab) || 'account');

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportImage, setSupportImage] = useState<string | null>(null);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);

  const myComplaints = useMemo(() => {
    return state.complaints
      .filter(c => c.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.complaints, user.id]);

  const selectedTicket = useMemo(() => 
    myComplaints.find(c => c.id === selectedTicketId),
    [myComplaints, selectedTicketId]
  );

  const [formData, setFormData] = useState({
    fullName: user.fullName,
    username: user.username,
    phone: user.phone,
    whatsapp: user.whatsapp,
    bio: user.bio || '',
    location: user.location || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const viewImage = (url?: string) => {
    if (!url) return;
    navigate(`/admin/proof-preview?url=${encodeURIComponent(url)}`);
  };

  const handleSupportImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSupportImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
      imageUrl: supportImage || undefined,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTimeout(() => {
      onStateUpdate({ complaints: [newComplaint, ...state.complaints] });
      setIsSubmittingSupport(false);
      setSupportSubject('');
      setSupportMessage('');
      setSupportImage(null);
      setShowSupportForm(false);
      setSelectedTicketId(newComplaint.id);
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col items-center">
            <h2 className="text-xl font-black text-malawi-black mb-6">{user.fullName}</h2>
            <div className="w-full space-y-2">
              <button onClick={() => setActiveTab('account')} className={`w-full flex justify-between p-4 rounded-2xl ${activeTab === 'account' ? 'bg-malawi-green text-white shadow-lg' : 'bg-gray-50 text-gray-600'}`}><span className="text-sm font-bold uppercase">Account</span><ChevronRight size={14} /></button>
              <button onClick={() => setActiveTab('support')} className={`w-full flex justify-between p-4 rounded-2xl ${activeTab === 'support' ? 'bg-malawi-black text-white shadow-lg' : 'bg-gray-50 text-gray-600'}`}><span className="text-sm font-bold uppercase">Support Desk</span><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 min-h-[600px]">
            {activeTab === 'support' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-6">
                  <h3 className="text-xl font-black uppercase">Support Desk</h3>
                  {!showSupportForm && <button onClick={() => setShowSupportForm(true)} className="bg-malawi-green text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase"><PlusCircle size={14} /> New Ticket</button>}
                </div>

                {showSupportForm ? (
                  <form onSubmit={handleSupportSubmit} className="space-y-4">
                    <input type="text" required placeholder="Subject..." className="w-full p-4 bg-gray-50 border rounded-2xl" value={supportSubject} onChange={e => setSupportSubject(e.target.value)} />
                    <textarea rows={6} required placeholder="Detail your concern..." className="w-full p-4 bg-gray-50 border rounded-2xl" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Attach Screenshot</label>
                      <div className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center relative hover:bg-gray-50 cursor-pointer">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" onChange={handleSupportImageUpload} />
                        {supportImage ? <img src={supportImage} className="w-24 h-24 object-cover rounded-xl" /> : <Upload className="text-gray-300" />}
                      </div>
                    </div>
                    <button type="submit" disabled={isSubmittingSupport} className="w-full bg-malawi-black text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-xs">
                       Send Ticket
                    </button>
                  </form>
                ) : selectedTicket ? (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                    <button onClick={() => setSelectedTicketId(null)} className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400"><ArrowLeft size={16} /> Back</button>
                    <div className="bg-gray-50 p-6 rounded-3xl border">
                      <h4 className="text-2xl font-black mb-4">{selectedTicket.subject}</h4>
                      <p className="text-sm italic mb-4">"{selectedTicket.message}"</p>
                      {selectedTicket.imageUrl && <button onClick={() => viewImage(selectedTicket.imageUrl)} className="w-24 h-24 rounded-xl overflow-hidden border"><img src={selectedTicket.imageUrl} className="w-full h-full object-cover" /></button>}
                    </div>

                    {selectedTicket.reply && (
                      <div className="bg-malawi-black text-white p-6 rounded-[2rem] border-b-8 border-malawi-red/20">
                        <p className="text-[10px] font-black text-malawi-red uppercase mb-2">Admin Verdict</p>
                        <p className="text-sm leading-relaxed mb-4">{selectedTicket.reply}</p>
                        {selectedTicket.replyImageUrl && <button onClick={() => viewImage(selectedTicket.replyImageUrl)} className="w-24 h-24 rounded-xl border border-white/20 overflow-hidden"><img src={selectedTicket.replyImageUrl} className="w-full h-full object-cover" /></button>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myComplaints.map(ticket => (
                      <button key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} className="w-full bg-white rounded-3xl p-6 border hover:border-malawi-black flex justify-between items-center transition-all">
                        <div>
                          <h5 className="font-black text-sm uppercase">{ticket.subject}</h5>
                          <span className="text-[9px] text-gray-400 font-bold uppercase">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${ticket.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{ticket.status}</span>
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
