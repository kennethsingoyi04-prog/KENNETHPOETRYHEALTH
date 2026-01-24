
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

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'account' || tab === 'security' || tab === 'support')) {
      setActiveTab(tab as ProfileTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSelectedTicketId(null);
    setShowSupportForm(false);
  };

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

  const defaultPrefs: NotificationPreferences = {
    emailWithdrawal: true,
    emailReferral: true,
    whatsappWithdrawal: true,
    whatsappReferral: true
  };

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

  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    user.notificationPrefs || defaultPrefs
  );
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const viewImage = (url?: string) => {
    if (!url) return;
    navigate(`/admin/proof-preview?url=${encodeURIComponent(url)}`);
  };

  const generateAIBio = async () => {
    setIsGeneratingBio(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a senior marketing consultant for the Malawian market. Write a professional, high-converting affiliate bio for a person named ${formData.fullName} located in ${formData.location || 'Malawi'}. Return ONLY the bio text.`,
      });
      if (response.text) {
        setFormData(prev => ({ ...prev, bio: response.text!.trim() }));
      }
    } catch (err) {
      console.error("AI Generation failed", err);
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setUpdateSuccess(false);
    setTimeout(() => {
      const updatedUser: User = {
        ...user,
        fullName: formData.fullName,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        bio: formData.bio,
        location: formData.location,
        notificationPrefs: notifPrefs
      };
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      onStateUpdate({ users: updatedUsers, currentUser: updatedUser });
      setIsUpdating(false);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    }, 800);
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

  const handleUpdateSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(false);
    if (formData.username.toLowerCase() !== user.username.toLowerCase()) {
      const isUsernameTaken = state.users.some(u => u.id !== user.id && u.username.toLowerCase() === formData.username.toLowerCase());
      if (isUsernameTaken) {
        setSecurityError("This username is already taken.");
        return;
      }
    }
    if (formData.newPassword || formData.currentPassword) {
      if (user.password && formData.currentPassword !== user.password) {
        setSecurityError("Incorrect current password.");
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setSecurityError("New passwords do not match!");
        return;
      }
    }
    setIsUpdatingSecurity(true);
    setTimeout(() => {
      const updatedUser: User = {
        ...user,
        username: formData.username.toLowerCase().trim(),
        password: formData.newPassword || user.password
      };
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      onStateUpdate({ users: updatedUsers, currentUser: updatedUser });
      setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsUpdatingSecurity(false);
      setSecuritySuccess(true);
      setTimeout(() => setSecuritySuccess(false), 3000);
    }, 1000);
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const updatedUser = { ...user, profilePic: result };
        const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
        onStateUpdate({ users: updatedUsers, currentUser: updatedUser });
      };
      reader.readAsDataURL(file);
    }
  };

  const PreferenceToggle = ({ label, isActive, onToggle, icon: Icon }: any) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isActive ? 'bg-malawi-green text-white shadow-sm' : 'bg-gray-200 text-gray-400'}`}>
          <Icon size={16} />
        </div>
        <span className="text-sm font-bold text-gray-700">{label}</span>
      </div>
      <button type="button" onClick={onToggle} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-malawi-green' : 'bg-gray-300'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-malawi-black uppercase tracking-tight">Identity Hub</h1>
        </div>
        {(updateSuccess || securitySuccess) && (
          <div className="flex items-center gap-2 bg-malawi-green/10 text-malawi-green px-4 py-2 rounded-full font-bold shadow-sm border border-malawi-green/20">
            <CheckCircle size={18} /> <span className="text-[10px] uppercase tracking-wider">Saved</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="relative group mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-malawi-green bg-gray-50 flex items-center justify-center">
                {user.profilePic ? <img src={user.profilePic} alt="" className="w-full h-full object-cover" /> : <UserIcon size={48} className="text-malawi-green" />}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-malawi-black text-white p-2.5 rounded-full shadow-lg"><Camera size={18} /></button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProfilePicChange} />
            </div>
            <h2 className="text-xl font-black text-malawi-black mb-1">{user.fullName}</h2>
            <div className="w-full space-y-2 mt-4">
              <button onClick={() => handleTabChange('account')} className={`w-full flex items-center justify-between p-4 rounded-2xl ${activeTab === 'account' ? 'bg-malawi-green text-white shadow-lg' : 'bg-gray-50 text-gray-600'}`}><div className="flex items-center gap-3"><UserIcon size={18} /><span className="text-sm font-bold uppercase tracking-tight">Personal Details</span></div><ChevronRight size={14} /></button>
              <button onClick={() => handleTabChange('security')} className={`w-full flex items-center justify-between p-4 rounded-2xl ${activeTab === 'security' ? 'bg-malawi-red text-white shadow-lg' : 'bg-gray-50 text-gray-600'}`}><div className="flex items-center gap-3"><Lock size={18} /><span className="text-sm font-bold uppercase tracking-tight">Security Center</span></div><ChevronRight size={14} /></button>
              <button onClick={() => handleTabChange('support')} className={`w-full flex items-center justify-between p-4 rounded-2xl ${activeTab === 'support' ? 'bg-malawi-black text-white shadow-lg' : 'bg-gray-50 text-gray-600'}`}><div className="flex items-center gap-3"><MessageSquareWarning size={18} /><span className="text-sm font-bold uppercase tracking-tight">Support Desk</span></div><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
            {activeTab === 'account' && (
              <form onSubmit={handleUpdateProfile} className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-xl font-black uppercase tracking-tight">Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Legal Name</label><input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl outline-none" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Line</label><input type="tel" className="w-full p-4 bg-gray-50 border rounded-2xl outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                </div>
                <button type="submit" disabled={isUpdating} className="w-full bg-malawi-green text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2">{isUpdating ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}</button>
              </form>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6 animate-in fade-in h-full flex flex-col">
                <div className="flex items-center justify-between border-b pb-6">
                  <h3 className="text-xl font-black uppercase tracking-tight">Support Desk</h3>
                  {!showSupportForm && !selectedTicketId && <button onClick={() => setShowSupportForm(true)} className="bg-malawi-green text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all"><PlusCircle size={14} /> New Ticket</button>}
                </div>

                {showSupportForm ? (
                  <form onSubmit={handleSupportSubmit} className="space-y-4 animate-in zoom-in-95">
                    <div className="flex items-center gap-2 mb-2">
                      <button type="button" onClick={() => setShowSupportForm(false)} className="p-2 hover:bg-gray-200 rounded-lg"><ArrowLeft size={18} /></button>
                      <h4 className="font-black text-sm uppercase">Compose Inquiry</h4>
                    </div>
                    <input type="text" required placeholder="Subject..." className="w-full p-4 bg-gray-50 border rounded-2xl outline-none" value={supportSubject} onChange={e => setSupportSubject(e.target.value)} />
                    <textarea rows={6} required placeholder="Detail your concern..." className="w-full p-4 bg-gray-50 border rounded-2xl outline-none resize-none" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} />
                    
                    {/* Attachment Upload */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Attach Image (Optional)</label>
                      <div className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center relative cursor-pointer group transition-all ${supportImage ? 'border-malawi-green bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" onChange={handleSupportImageUpload} />
                        {supportImage ? (
                          <div className="flex flex-col items-center gap-2">
                            <img src={supportImage} className="w-24 h-24 object-cover rounded-xl shadow-md" />
                            <p className="text-[9px] font-black text-malawi-green uppercase">Image Ready</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="mx-auto text-gray-300 group-hover:text-malawi-green transition-colors mb-2" />
                            <p className="text-[10px] font-black text-gray-400 uppercase">Click to add screenshot</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <button type="submit" disabled={isSubmittingSupport} className="w-full bg-malawi-black text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase text-xs">
                      {isSubmittingSupport ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Send Ticket
                    </button>
                  </form>
                ) : selectedTicket ? (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                    <button onClick={() => setSelectedTicketId(null)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400"><ArrowLeft size={16} /> Back to Inbox</button>
                    <div className="bg-white border rounded-3xl p-8 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inquiry Date: {new Date(selectedTicket.createdAt).toLocaleDateString()}</p>
                      <h4 className="text-2xl font-black mb-6">{selectedTicket.subject}</h4>
                      <div className="bg-gray-50 p-6 rounded-2xl text-sm italic text-gray-600 border mb-6">"{selectedTicket.message}"</div>
                      
                      {/* User's original attachment */}
                      {selectedTicket.imageUrl && (
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Attachment:</p>
                           <button onClick={() => viewImage(selectedTicket.imageUrl)} className="w-24 h-24 rounded-xl border-2 overflow-hidden hover:opacity-80 transition-opacity">
                              <img src={selectedTicket.imageUrl} className="w-full h-full object-cover" />
                           </button>
                        </div>
                      )}
                    </div>

                    {selectedTicket.reply ? (
                      <div className="flex gap-4 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-malawi-black flex items-center justify-center shrink-0 border-b-4 border-malawi-red"><ShieldCheck size={24} className="text-malawi-red" /></div>
                        <div className="bg-malawi-black text-white p-6 rounded-[2rem] rounded-tl-none flex-grow border-b-8 border-malawi-red/20">
                          <p className="text-[10px] font-black uppercase tracking-widest text-malawi-red mb-2">Admin Verdict</p>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4">{selectedTicket.reply}</p>
                          {/* Admin's reply attachment */}
                          {selectedTicket.replyImageUrl && (
                            <div className="space-y-2">
                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Admin Attached Visual:</p>
                              <button onClick={() => viewImage(selectedTicket.replyImageUrl)} className="w-24 h-24 rounded-xl border border-white/20 overflow-hidden hover:scale-105 transition-transform">
                                <img src={selectedTicket.replyImageUrl} className="w-full h-full object-cover" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 p-6 bg-yellow-50 rounded-2xl border text-yellow-700">
                        <Clock size={24} className="animate-pulse" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest">In Progress</p>
                          <p className="text-[10px]">An admin is reviewing your concern.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-grow space-y-3 overflow-y-auto max-h-[600px]">
                    {myComplaints.length === 0 ? <div className="text-center p-12 text-gray-400">No support history.</div> : myComplaints.map(ticket => <button key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} className="w-full bg-white rounded-3xl p-6 border hover:border-malawi-black flex items-center justify-between group"><div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${ticket.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{ticket.status === 'PENDING' ? <Clock size={20} /> : <CheckCircle size={20} />}</div><div><h5 className="font-black text-sm uppercase tracking-tight">{ticket.subject}</h5><span className="text-[9px] text-gray-400 font-bold uppercase">{new Date(ticket.createdAt).toLocaleDateString()}</span></div></div><ChevronRight size={18} className="text-gray-300 group-hover:text-malawi-black" /></button>)}
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
