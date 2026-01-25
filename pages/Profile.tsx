
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppState, Complaint, User, BookSellerStatus } from '../types';
import { 
  X, 
  ChevronRight, 
  Upload, 
  PlusCircle, 
  ArrowLeft,
  ShieldCheck,
  Loader2,
  Eye,
  MessageSquareWarning,
  Smartphone,
  Edit3,
  Save,
  User as UserIcon,
  BookOpen,
  CheckCircle,
  AlertCircle,
  MapPin,
  Send
} from 'lucide-react';
import { uploadImage } from '../dataService';

interface ProfileProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
  onLogout: () => void;
}

type ProfileTab = 'account' | 'support' | 'bookselling';

const Profile: React.FC<ProfileProps> = ({ state, onStateUpdate }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = state.currentUser!;
  const [activeTab, setActiveTab] = useState<ProfileTab>((searchParams.get('tab') as ProfileTab) || 'account');

  // Account Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: user.fullName,
    phone: user.phone,
    whatsapp: user.whatsapp,
    email: user.email
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Book Selling State
  const [bookSellerFullName, setBookSellerFullName] = useState(user.bookSellerFullName || user.fullName || '');
  const [bookWhatsapp, setBookWhatsapp] = useState(user.bookSellerWhatsapp || user.whatsapp || '');
  const [bookAddress, setBookAddress] = useState(user.bookSellerAddress || '');
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);

  // Support Ticket States
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportImageUrl, setSupportImageUrl] = useState<string | null>(null);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  useEffect(() => {
    setEditFormData({
      fullName: user.fullName,
      phone: user.phone,
      whatsapp: user.whatsapp,
      email: user.email
    });
  }, [user, isEditing]);

  const myComplaints = useMemo(() => {
    return state.complaints
      .filter(c => c.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.complaints, user.id]);

  const handleProfileSave = () => {
    setIsSavingProfile(true);
    setTimeout(() => {
      const updatedUser: User = {
        ...user,
        fullName: editFormData.fullName,
        phone: editFormData.phone,
        whatsapp: editFormData.whatsapp,
        email: editFormData.email
      };
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      onStateUpdate({ users: updatedUsers, currentUser: updatedUser });
      setIsSavingProfile(false);
      setIsEditing(false);
    }, 800);
  };

  const handleBookSellerRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBook(true);
    setTimeout(() => {
      const updatedUser: User = {
        ...user,
        bookSellerStatus: BookSellerStatus.PENDING,
        bookSellerFullName: bookSellerFullName,
        bookSellerWhatsapp: bookWhatsapp,
        bookSellerAddress: bookAddress
      };
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      onStateUpdate({ users: updatedUsers, currentUser: updatedUser });
      setIsSubmittingBook(false);
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

  const handleSupportImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadImage(file, 'support_tickets');
    if (url) setSupportImageUrl(url);
    setIsUploading(false);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setViewingProofUrl(null)}>
           <button onClick={() => setViewingProofUrl(null)} className="absolute top-6 right-6 p-4 bg-malawi-red text-white rounded-full shadow-xl active:scale-95 transition-all z-[210]"><X size={24} /></button>
           <img src={viewingProofUrl} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain ring-4 ring-white/10" alt="Detail View" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-24 h-24 bg-malawi-black rounded-[2rem] flex items-center justify-center text-white text-3xl font-black mb-6 shadow-xl border-4 border-white ring-1 ring-gray-100">
              {user.fullName.charAt(0)}
            </div>
            <h2 className="text-xl font-black text-malawi-black text-center uppercase tracking-tight">{user.fullName}</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">@{user.username}</p>
            
            <div className="w-full space-y-3">
              <button onClick={() => { setActiveTab('account'); setShowSupportForm(false); setSelectedTicketId(null); }} className={`w-full flex justify-between items-center p-5 rounded-3xl transition-all ${activeTab === 'account' ? 'bg-malawi-green text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}><span className="text-xs font-black uppercase tracking-widest">Account Details</span><ChevronRight size={14} /></button>
              <button onClick={() => { setActiveTab('bookselling'); setShowSupportForm(false); setSelectedTicketId(null); }} className={`w-full flex justify-between items-center p-5 rounded-3xl transition-all ${activeTab === 'bookselling' ? 'bg-malawi-red text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}><span className="text-xs font-black uppercase tracking-widest">Book Selling</span><ChevronRight size={14} /></button>
              <button onClick={() => { setActiveTab('support'); setShowSupportForm(false); setSelectedTicketId(null); }} className={`w-full flex justify-between items-center p-5 rounded-3xl transition-all ${activeTab === 'support' ? 'bg-malawi-black text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}><span className="text-xs font-black uppercase tracking-widest">Help & Support</span><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 min-h-[600px]">
            {activeTab === 'account' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="border-b pb-6 flex justify-between items-center">
                   <h3 className="text-xl font-black uppercase tracking-tight">Personal Information</h3>
                   {!isEditing ? (
                     <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-malawi-green hover:underline"><Edit3 size={14} /> Edit Profile</button>
                   ) : (
                     <div className="flex gap-4">
                        <button onClick={handleProfileSave} disabled={isSavingProfile} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-malawi-green hover:underline disabled:opacity-50">{isSavingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button>
                        <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-malawi-red hover:underline"><X size={14} /> Cancel</button>
                     </div>
                   )}
                </div>
                
                <div className="space-y-6">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Name</label>
                         {isEditing ? (
                           <input type="text" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-malawi-green" value={editFormData.fullName} onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})}/>
                         ) : <p className="p-4 bg-gray-50 rounded-2xl border font-bold text-sm uppercase">{user.fullName}</p>}
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Affiliate Code</label>
                         <p className="p-4 bg-gray-100 rounded-2xl border font-mono font-black text-sm text-gray-400 select-none">{user.referralCode}</p>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Phone Number</label>
                        {isEditing ? (
                          <input type="tel" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-green" value={editFormData.phone} onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}/>
                        ) : <p className="p-4 bg-gray-50 rounded-2xl border font-bold text-sm">{user.phone}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">WhatsApp Number</label>
                        {isEditing ? (
                          <input type="tel" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-green" value={editFormData.whatsapp} onChange={(e) => setEditFormData({...editFormData, whatsapp: e.target.value})}/>
                        ) : <p className="p-4 bg-gray-50 rounded-2xl border font-bold text-sm">{user.whatsapp || 'Not set'}</p>}
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'bookselling' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="border-b pb-6">
                   <h3 className="text-xl font-black uppercase tracking-tight">Book Selling Application</h3>
                </div>

                {user.bookSellerStatus === BookSellerStatus.APPROVED ? (
                   <div className="bg-green-50 p-10 rounded-[3rem] border border-green-200 text-center space-y-6">
                      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white shadow-xl"><CheckCircle size={40} /></div>
                      <div>
                        <h4 className="text-2xl font-black text-green-800 uppercase tracking-tight">Verified Book Seller</h4>
                        <p className="text-green-600 font-bold text-[10px] uppercase tracking-widest mt-2">Your shop is active and visible to all affiliates.</p>
                      </div>
                   </div>
                ) : user.bookSellerStatus === BookSellerStatus.PENDING ? (
                  <div className="bg-yellow-50 p-10 rounded-[3rem] border border-yellow-200 text-center space-y-6">
                     <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto text-white shadow-xl"><Loader2 size={40} className="animate-spin" /></div>
                     <div>
                       <h4 className="text-2xl font-black text-yellow-800 uppercase tracking-tight">Request Pending</h4>
                       <p className="text-yellow-600 font-bold text-[10px] uppercase tracking-widest mt-2">Admin is reviewing your application for book distribution.</p>
                     </div>
                  </div>
                ) : (
                  <form onSubmit={handleBookSellerRequest} className="space-y-6">
                    <div className="p-6 bg-malawi-red/5 rounded-3xl border border-malawi-red/10 flex items-start gap-4">
                       <AlertCircle className="text-malawi-red shrink-0" size={24}/>
                       <p className="text-xs font-bold text-gray-600 leading-relaxed uppercase">Apply to become a verified book seller. All fields are required for verification.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Name</label>
                         <div className="relative">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="text" required className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-red" value={bookSellerFullName} onChange={(e) => setBookSellerFullName(e.target.value)} placeholder="Full Legal Name"/>
                         </div>
                      </div>

                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">WhatsApp Number</label>
                         <div className="relative">
                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input type="tel" required className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-red" value={bookWhatsapp} onChange={(e) => setBookWhatsapp(e.target.value)} placeholder="WhatsApp Contact (088/099...)"/>
                         </div>
                      </div>

                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Home Address</label>
                         <div className="relative">
                            <MapPin className="absolute left-4 top-4 text-gray-400" size={18} />
                            <textarea required rows={3} className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-red resize-none" value={bookAddress} onChange={(e) => setBookAddress(e.target.value)} placeholder="Village/Area, District, etc."/>
                         </div>
                      </div>
                    </div>

                    <button disabled={isSubmittingBook} className="w-full py-6 bg-malawi-red text-white font-black rounded-[2rem] uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                       {isSubmittingBook ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                       {isSubmittingBook ? 'SENDING...' : 'SEND APPLICATION'}
                    </button>
                    {user.bookSellerStatus === BookSellerStatus.REJECTED && <p className="text-center text-malawi-red font-black uppercase text-[10px]">Your previous request was declined. Please update your details and resend.</p>}
                  </form>
                )}
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b pb-6">
                  <h3 className="text-xl font-black uppercase tracking-tight">Support Desk</h3>
                  {!showSupportForm && <button onClick={() => setShowSupportForm(true)} className="bg-malawi-green text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all"><PlusCircle size={16} /> New Ticket</button>}
                </div>
                {showSupportForm ? (
                  <form onSubmit={handleSupportSubmit} className="space-y-4 animate-in slide-in-from-top-4">
                    <input type="text" required placeholder="Ticket Subject" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-black" value={supportSubject} onChange={e => setSupportSubject(e.target.value)} />
                    <textarea rows={6} required placeholder="Detail message..." className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-medium resize-none outline-none focus:ring-2 focus:ring-malawi-black" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} />
                    <button type="submit" disabled={isSubmittingSupport || isUploading} className="w-full bg-malawi-black text-white font-black py-4 rounded-3xl uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50">
                       {isSubmittingSupport ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                    <button type="button" onClick={() => setShowSupportForm(false)} className="w-full bg-gray-100 text-gray-400 font-black py-4 rounded-3xl uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {myComplaints.length === 0 ? <div className="py-20 text-center text-gray-300 italic uppercase font-black">No tickets logged</div> : myComplaints.map(ticket => (
                      <button key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} className="w-full bg-white rounded-3xl p-6 border border-gray-100 hover:border-malawi-black flex justify-between items-center shadow-sm">
                        <div className="text-left"><h5 className="font-black text-sm uppercase text-malawi-black mb-1">{ticket.subject}</h5><p className="text-[9px] text-gray-400 font-bold uppercase">{ticket.id}</p></div>
                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${ticket.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{ticket.status}</span>
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
