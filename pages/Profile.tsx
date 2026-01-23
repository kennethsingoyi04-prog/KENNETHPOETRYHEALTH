
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  // Added AlertCircle to fix the reported error on line 506
  AlertCircle
} from 'lucide-react';

interface ProfileProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
  onLogout: () => void;
}

type ProfileTab = 'account' | 'security' | 'support';

const Profile: React.FC<ProfileProps> = ({ state, onStateUpdate, onLogout }) => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  };

  // Support Form State
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);

  const myComplaints = state.complaints
    .filter(c => c.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Personal Info Form State
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

  const generateAIBio = async () => {
    setIsGeneratingBio(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a senior marketing consultant for the Malawian market. Write a professional, high-converting affiliate bio for a person named ${formData.fullName} located in ${formData.location || 'Malawi'}. The bio should sound trustworthy, energetic, and focus on helping others achieve financial freedom through KENNETHPOETRYHEALTH. Keep it under 150 characters and use Malawian-friendly professional tone. Return ONLY the bio text.`,
      });
      
      if (response.text) {
        setFormData(prev => ({ ...prev, bio: response.text!.trim() }));
      }
    } catch (err) {
      console.error("AI Generation failed", err);
      alert("AI Assistant is currently unavailable.");
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
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      onStateUpdate({ complaints: [newComplaint, ...state.complaints] });
      setIsSubmittingSupport(false);
      setSupportSubject('');
      setSupportMessage('');
      setShowSupportForm(false);
      alert("Ticket submitted successfully! An admin will respond shortly.");
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
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isActive ? 'bg-malawi-green text-white shadow-sm' : 'bg-gray-200 text-gray-400'}`}>
          <Icon size={16} />
        </div>
        <span className="text-sm font-bold text-gray-700">{label}</span>
      </div>
      <button 
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          isActive ? 'bg-malawi-green' : 'bg-gray-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-malawi-black uppercase tracking-tight">Profile Hub</h1>
          <p className="text-gray-500">Manage your identity, security, and support tickets.</p>
        </div>
        {(updateSuccess || securitySuccess) && (
          <div className="flex items-center gap-2 bg-malawi-green/10 text-malawi-green px-4 py-2 rounded-full font-bold animate-in slide-in-from-top-4 shadow-sm border border-malawi-green/20">
            <CheckCircle size={18} />
            <span className="text-[10px] uppercase tracking-wider">Changes Saved</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Summary Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="relative group mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-malawi-green bg-gray-50 flex items-center justify-center shadow-inner group-hover:opacity-90 transition-opacity">
                {user.profilePic ? (
                  <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="bg-malawi-green/10 w-full h-full flex items-center justify-center text-malawi-green">
                    <UserIcon size={48} />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 flex gap-1">
                {user.profilePic && (
                  <button onClick={() => {if(window.confirm("Remove photo?")) onStateUpdate({currentUser: {...user, profilePic: undefined}});}} className="bg-white text-malawi-red p-2 rounded-full shadow-lg border border-red-50 hover:bg-red-50 transition-all">
                    <Trash2 size={14} />
                  </button>
                )}
                <button onClick={() => fileInputRef.current?.click()} className="bg-malawi-black text-white p-2.5 rounded-full shadow-lg hover:bg-malawi-red transition-all">
                  <Camera size={18} />
                </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProfilePicChange} />
            </div>
            
            <h2 className="text-xl font-black text-malawi-black mb-1">{user.fullName}</h2>
            <p className="text-sm text-gray-500 mb-1">@{user.username}</p>
            {user.location && (
              <p className="text-[10px] text-malawi-green font-bold flex items-center justify-center gap-1 mb-1 uppercase tracking-tight">
                <MapPin size={10} /> {user.location}
              </p>
            )}
            <p className="text-xs text-gray-400 mb-6">{user.email}</p>

            <div className="w-full space-y-2">
              <button 
                onClick={() => handleTabChange('account')}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activeTab === 'account' ? 'bg-malawi-green text-white shadow-lg' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-3">
                  <UserIcon size={18} />
                  <span className="text-sm font-bold uppercase tracking-tight">Account Info</span>
                </div>
                <ChevronRight size={14} />
              </button>
              <button 
                onClick={() => handleTabChange('security')}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activeTab === 'security' ? 'bg-malawi-red text-white shadow-lg' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-3">
                  <Lock size={18} />
                  <span className="text-sm font-bold uppercase tracking-tight">Security</span>
                </div>
                <ChevronRight size={14} />
              </button>
              <button 
                onClick={() => handleTabChange('support')}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activeTab === 'support' ? 'bg-malawi-black text-white shadow-lg' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquareWarning size={18} />
                  <span className="text-sm font-bold uppercase tracking-tight">Support Tickets</span>
                </div>
                <div className="flex items-center gap-2">
                   {myComplaints.filter(c => c.status === 'PENDING').length > 0 && <span className="w-2 h-2 bg-malawi-red rounded-full"></span>}
                   <ChevronRight size={14} />
                </div>
              </button>
              
              <div className="pt-4 mt-4 border-t border-gray-100">
                 <button 
                  onClick={() => { if(window.confirm("Are you sure you want to log out?")) onLogout(); }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 text-malawi-red hover:bg-malawi-red hover:text-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <LogOut size={18} />
                    <span className="text-sm font-bold uppercase tracking-tight">Sign Out</span>
                  </div>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[500px]">
            {activeTab === 'account' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <Settings className="text-malawi-green" />
                  <h3 className="text-xl font-black text-malawi-black uppercase tracking-tight">General Account</h3>
                </div>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                      <input type="text" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-green outline-none font-medium" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">District / Region</label>
                      <input type="text" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-green outline-none font-medium" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input type="tel" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-green outline-none font-medium" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Line</label>
                      <input type="tel" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-green outline-none font-medium" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Public Bio & Strategy</label>
                      <button type="button" onClick={generateAIBio} disabled={isGeneratingBio} className="text-malawi-green text-[9px] font-black uppercase flex items-center gap-1 hover:underline">
                        {isGeneratingBio ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Suggestion
                      </button>
                    </div>
                    <textarea rows={4} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-green outline-none font-medium resize-none" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                  </div>

                  <div className="pt-6 border-t border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Notification Settings</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <PreferenceToggle label="Email: Withdrawals" isActive={notifPrefs.emailWithdrawal} onToggle={() => setNotifPrefs({...notifPrefs, emailWithdrawal: !notifPrefs.emailWithdrawal})} icon={Mail} />
                      <PreferenceToggle label="WhatsApp: Referrals" isActive={notifPrefs.whatsappReferral} onToggle={() => setNotifPrefs({...notifPrefs, whatsappReferral: !notifPrefs.whatsappReferral})} icon={Smartphone} />
                    </div>
                  </div>

                  <button type="submit" disabled={isUpdating} className="w-full bg-malawi-green text-white font-black py-4 rounded-2xl shadow-lg hover:bg-green-700 transition-all active:scale-[0.98]">
                    {isUpdating ? 'Saving Changes...' : 'Update Information'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <ShieldCheck className="text-malawi-red" />
                  <h3 className="text-xl font-black text-malawi-black uppercase tracking-tight">Security & Credentials</h3>
                </div>
                {securityError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{securityError}</div>}
                <form onSubmit={handleUpdateSecurity} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username (Handle)</label>
                    <div className="relative">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input type="text" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-red outline-none font-black" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password Change</p>
                    <input type="password" placeholder="Current Password" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-red outline-none font-medium" value={formData.currentPassword} onChange={e => setFormData({...formData, currentPassword: e.target.value})} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input type="password" placeholder="New Password" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-red outline-none font-medium" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})} />
                      <input type="password" placeholder="Confirm New Password" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-red outline-none font-medium" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                    </div>
                  </div>
                  <button type="submit" disabled={isUpdatingSecurity} className="w-full bg-malawi-red text-white font-black py-4 rounded-2xl shadow-lg hover:bg-red-800 transition-all active:scale-[0.98]">
                    {isUpdatingSecurity ? 'Applying Security Changes...' : 'Update Login Credentials'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 h-full flex flex-col">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <MessageSquareWarning className="text-malawi-black" />
                    <h3 className="text-xl font-black text-malawi-black uppercase tracking-tight">Support Tickets</h3>
                  </div>
                  {!showSupportForm && (
                    <button onClick={() => setShowSupportForm(true)} className="text-malawi-green font-black uppercase tracking-widest text-[10px] flex items-center gap-1 hover:underline">
                      <PlusCircle size={14} /> New Message
                    </button>
                  )}
                </div>

                {showSupportForm ? (
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 animate-in zoom-in-95 duration-200">
                    <h4 className="font-black text-sm uppercase mb-4">Send a Message to Admin</h4>
                    <form onSubmit={handleSupportSubmit} className="space-y-4">
                      <input type="text" required placeholder="Subject (e.g. Withdrawal issue)" className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-green outline-none font-medium" value={supportSubject} onChange={e => setSupportSubject(e.target.value)} />
                      <textarea rows={4} required placeholder="Explain your problem in detail..." className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-malawi-green outline-none font-medium resize-none" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} />
                      <div className="flex gap-3">
                        <button type="submit" disabled={isSubmittingSupport} className="flex-grow bg-malawi-black text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md">
                          {isSubmittingSupport ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Send to Admin
                        </button>
                        <button type="button" onClick={() => setShowSupportForm(false)} className="px-6 bg-white border border-gray-200 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="flex-grow space-y-4 overflow-y-auto pr-2 max-h-[600px]">
                    {myComplaints.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
                        <MessageSquare size={48} className="opacity-20" />
                        <p className="text-sm italic">No support messages sent yet.</p>
                      </div>
                    ) : (
                      myComplaints.map(ticket => (
                        <div key={ticket.id} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                               <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${ticket.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                 {ticket.status === 'PENDING' ? 'In Review' : 'Resolved'}
                               </span>
                               <h5 className="font-black text-malawi-black mt-2">{ticket.subject}</h5>
                               <p className="text-[10px] text-gray-400 uppercase font-bold">{new Date(ticket.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-200 text-gray-400 shadow-sm">
                              <History size={18} />
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600 bg-white/50 p-4 rounded-2xl italic border border-gray-50 mb-4">
                            "{ticket.message}"
                          </div>

                          {ticket.reply && (
                            <div className="mt-4 flex gap-3 items-start animate-in slide-in-from-top-2">
                               <div className="w-8 h-8 rounded-full bg-malawi-black flex items-center justify-center shrink-0 shadow-lg ring-2 ring-malawi-red">
                                 <ShieldCheck size={16} className="text-malawi-red" />
                               </div>
                               <div className="bg-malawi-black text-white p-4 rounded-2xl rounded-tl-none shadow-xl flex-grow">
                                  <p className="text-xs font-black uppercase tracking-widest text-malawi-red mb-1">Admin Response</p>
                                  <p className="text-sm leading-relaxed">{ticket.reply}</p>
                               </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Mobile-only Logout Area inside Profile Hub Content */}
            <div className="md:hidden pt-8 mt-12 border-t border-gray-100">
               <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-center space-y-4">
                 <div className="flex items-center justify-center gap-2 text-malawi-red">
                    <AlertCircle size={20} />
                    <h4 className="font-black uppercase tracking-tight text-sm">Danger Zone</h4>
                 </div>
                 <p className="text-xs text-gray-500 font-medium">Ready to end your session? You can sign back in at any time.</p>
                 <button 
                  onClick={() => { if(window.confirm("Are you sure you want to log out?")) onLogout(); }}
                  className="w-full bg-malawi-red text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <LogOut size={20} /> Sign Out Now
                </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
