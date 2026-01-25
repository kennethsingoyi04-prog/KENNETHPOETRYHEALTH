
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
  Send,
  Mail,
  Locate,
  Info
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

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: user.fullName,
    phone: user.phone || '',
    whatsapp: user.whatsapp || '',
    email: user.email,
    location: user.location || '',
    bio: user.bio || ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [bookSellerFullName, setBookSellerFullName] = useState(user.bookSellerFullName || user.fullName || '');
  const [bookWhatsapp, setBookWhatsapp] = useState(user.bookSellerWhatsapp || user.whatsapp || '');
  const [bookAddress, setBookAddress] = useState(user.bookSellerAddress || '');
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);

  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);

  useEffect(() => {
    setEditFormData({
      fullName: user.fullName,
      phone: user.phone || '',
      whatsapp: user.whatsapp || '',
      email: user.email,
      location: user.location || '',
      bio: user.bio || ''
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
      const updatedUser: User = { ...user, ...editFormData };
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      onStateUpdate({ users: updatedUsers, currentUser: updatedUser });
      setIsSavingProfile(false);
      setIsEditing(false);
      alert("Account Updated Successfully.");
    }, 800);
  };

  const handleBookDistributorRequest = (e: React.FormEvent) => {
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
      alert("Distributor Application Submitted. Admin will verify your home address shortly.");
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
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      {viewingProofUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setViewingProofUrl(null)}>
           <button className="absolute top-6 right-6 p-4 bg-malawi-red text-white rounded-full"><X size={24} /></button>
           <img src={viewingProofUrl} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl" alt="View" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-24 h-24 bg-malawi-black rounded-[2.5rem] flex items-center justify-center text-white text-3xl font-black mb-6 shadow-xl relative overflow-hidden">
               <span className="relative z-10">{user.fullName.charAt(0)}</span>
               <div className="absolute inset-0 bg-gradient-to-tr from-malawi-red/20 to-transparent"></div>
            </div>
            <h2 className="text-xl font-black text-malawi-black uppercase tracking-tight">{user.fullName}</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">ID: {user.referralCode}</p>
            
            <div className="w-full space-y-3">
              <button onClick={() => setActiveTab('account')} className={`w-full flex justify-between items-center p-5 rounded-3xl transition-all ${activeTab === 'account' ? 'bg-malawi-black text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}><span className="text-xs font-black uppercase tracking-widest">My Account</span><ChevronRight size={14} /></button>
              <button onClick={() => setActiveTab('bookselling')} className={`w-full flex justify-between items-center p-5 rounded-3xl transition-all ${activeTab === 'bookselling' ? 'bg-malawi-red text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}><span className="text-xs font-black uppercase tracking-widest">Book Distributor</span><ChevronRight size={14} /></button>
              <button onClick={() => setActiveTab('support')} className={`w-full flex justify-between items-center p-5 rounded-3xl transition-all ${activeTab === 'support' ? 'bg-malawi-green text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}><span className="text-xs font-black uppercase tracking-widest">Help Desk</span><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 min-h-[600px]">
            {activeTab === 'account' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="border-b pb-6 flex justify-between items-center">
                   <h3 className="text-xl font-black uppercase tracking-tight">Personal Details</h3>
                   {!isEditing ? (
                     <button onClick={() => setIsEditing(true)} className="text-[10px] font-black uppercase tracking-widest text-malawi-red underline underline-offset-4">Edit Profile</button>
                   ) : (
                     <div className="flex gap-4">
                        <button onClick={handleProfileSave} disabled={isSavingProfile} className="text-[10px] font-black uppercase tracking-widest text-malawi-green underline">Save</button>
                        <button onClick={() => setIsEditing(false)} className="text-[10px] font-black uppercase tracking-widest text-malawi-red underline">Cancel</button>
                     </div>
                   )}
                </div>
                
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Full Legal Name</label>
                         {isEditing ? <input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none" value={editFormData.fullName} onChange={e => setEditFormData({...editFormData, fullName: e.target.value})}/> : <p className="p-4 bg-gray-50 rounded-2xl border font-bold text-sm uppercase">{user.fullName}</p>}
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Email Address</label>
                         {isEditing ? <input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})}/> : <p className="p-4 bg-gray-50 rounded-2xl border font-bold text-sm">{user.email}</p>}
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">WhatsApp Number</label>
                         {isEditing ? <input className="w-full p-4 bg-gray-50 border rounded-2xl outline-none" value={editFormData.whatsapp} onChange={e => setEditFormData({...editFormData, whatsapp: e.target.value})}/> : <p className="p-4 bg-gray-50 rounded-2xl border font-bold text-sm text-malawi-green">{user.whatsapp || 'Not linked'}</p>}
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Affiliate Reference</label>
                         <p className="p-4 bg-gray-100 rounded-2xl border font-mono font-black text-sm text-gray-400">{user.referralCode}</p>
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'bookselling' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="border-b pb-6">
                   <h3 className="text-xl font-black uppercase tracking-tight text-malawi-red">Book Distributor Portal</h3>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Register your distribution address to start earning from poetry sales.</p>
                </div>

                {user.bookSellerStatus === BookSellerStatus.APPROVED ? (
                   <div className="bg-green-50 p-10 rounded-[3rem] border border-green-200 text-center space-y-4">
                      <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto text-white shadow-xl"><CheckCircle size={32} /></div>
                      <h4 className="text-2xl font-black text-green-800 uppercase tracking-tight">Verified Distributor</h4>
                      <p className="text-green-600 font-bold text-[10px] uppercase tracking-widest">You are authorized to sell KPH books in your area.</p>
                   </div>
                ) : user.bookSellerStatus === BookSellerStatus.PENDING ? (
                  <div className="bg-yellow-50 p-10 rounded-[3rem] border border-yellow-200 text-center space-y-4">
                     <Loader2 className="animate-spin text-yellow-500 mx-auto" size={48} />
                     <h4 className="text-2xl font-black text-yellow-800 uppercase tracking-tight">Under Verification</h4>
                     <p className="text-yellow-600 font-bold text-[10px] uppercase tracking-widest">Admin is reviewing your home address and contact details.</p>
                  </div>
                ) : (
                  <form onSubmit={handleBookDistributorRequest} className="space-y-6">
                    <div className="p-6 bg-malawi-red/5 rounded-3xl border border-malawi-red/10 flex items-start gap-4">
                       <AlertCircle className="text-malawi-red shrink-0" size={24}/>
                       <p className="text-xs font-bold text-gray-600 leading-relaxed uppercase italic">"Provide your accurate Home Address. This is where physical book shipments may be coordinated for local distribution."</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Full Distributor Name</label>
                         <input type="text" required className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-red transition-all" value={bookSellerFullName} onChange={e => setBookSellerFullName(e.target.value)} placeholder="Legal Name"/>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Distribution WhatsApp</label>
                         <input type="tel" required className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-malawi-red transition-all" value={bookWhatsapp} onChange={e => setBookWhatsapp(e.target.value)} placeholder="088/099..."/>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Home Address (Physical Location)</label>
                         <textarea required rows={3} className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none resize-none focus:ring-2 focus:ring-malawi-red transition-all" value={bookAddress} onChange={e => setBookAddress(e.target.value)} placeholder="Street, Area, District, City"/>
                      </div>
                    </div>

                    <button disabled={isSubmittingBook} className="w-full py-6 bg-malawi-red text-white font-black rounded-3xl uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                       {isSubmittingBook ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                       {isSubmittingBook ? 'Registering...' : 'Confirm Distributor Registration'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b pb-6">
                  <h3 className="text-xl font-black uppercase tracking-tight text-malawi-green">Support & Help</h3>
                  {!showSupportForm && <button onClick={() => setShowSupportForm(true)} className="bg-malawi-black text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-md hover:scale-105 transition-all"><PlusCircle size={16} /> Open Ticket</button>}
                </div>
                {showSupportForm ? (
                  <form onSubmit={handleSupportSubmit} className="space-y-4">
                    <input type="text" required placeholder="What is the issue?" className="w-full p-4 bg-gray-50 border rounded-2xl font-bold text-sm outline-none" value={supportSubject} onChange={e => setSupportSubject(e.target.value)} />
                    <textarea rows={6} required placeholder="Provide details about your complaint or request..." className="w-full p-4 bg-gray-50 border rounded-2xl text-sm font-medium resize-none outline-none" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} />
                    <div className="flex gap-3">
                       <button type="submit" disabled={isSubmittingSupport} className="flex-grow bg-malawi-green text-white font-black py-4 rounded-3xl uppercase text-[10px] tracking-widest shadow-xl">Submit to Admin</button>
                       <button type="button" onClick={() => setShowSupportForm(false)} className="px-8 bg-gray-100 text-gray-500 font-black rounded-3xl uppercase text-[10px]">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {myComplaints.length === 0 ? <div className="py-24 text-center text-gray-300 italic uppercase font-black opacity-30"><MessageSquareWarning size={48} className="mx-auto mb-2"/> No active tickets</div> : myComplaints.map(ticket => (
                      <div key={ticket.id} className="w-full bg-white rounded-[2rem] p-6 border border-gray-100 flex flex-col gap-4 shadow-sm hover:border-malawi-green transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="text-left"><h5 className="font-black text-sm uppercase text-malawi-black mb-1">{ticket.subject}</h5><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Ticket ID: {ticket.id.split('-')[1]}</p></div>
                          <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${ticket.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{ticket.status === 'PENDING' ? 'Reviewing' : 'Handled'}</span>
                        </div>
                        {ticket.reply && (
                          <div className="p-5 bg-malawi-black text-white rounded-2xl text-[11px] font-medium border-l-4 border-malawi-red shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                               <ShieldCheck size={14} className="text-malawi-red" />
                               <p className="text-[8px] font-black uppercase text-malawi-red tracking-widest">Admin Response</p>
                            </div>
                            <p className="italic leading-relaxed text-gray-300">"{ticket.reply}"</p>
                          </div>
                        )}
                      </div>
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
