
import React, { useState, useRef } from 'react';
import { AppState, User } from '../types';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Smartphone, 
  Lock, 
  Camera, 
  Save, 
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Calendar,
  FileText,
  MapPin
} from 'lucide-react';

interface ProfileProps {
  state: AppState;
  onStateUpdate: (s: Partial<AppState>) => void;
}

const Profile: React.FC<ProfileProps> = ({ state, onStateUpdate }) => {
  const user = state.currentUser!;
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    phone: user.phone,
    whatsapp: user.whatsapp,
    bio: user.bio || '',
    location: user.location || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setUpdateSuccess(false);

    // Simulate update logic with local state sync
    setTimeout(() => {
      const updatedUser: User = {
        ...user,
        fullName: formData.fullName,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        bio: formData.bio,
        location: formData.location
      };

      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      
      onStateUpdate({
        users: updatedUsers,
        currentUser: updatedUser
      });

      setIsUpdating(false);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    }, 800);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUpdateSuccess(false);

    if (user.password && formData.currentPassword !== user.password) {
      setError("Incorrect current password.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match!");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsUpdating(true);

    // Simulate password change
    setTimeout(() => {
      const updatedUser: User = {
        ...user,
        password: formData.newPassword
      };

      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      
      onStateUpdate({
        users: updatedUsers,
        currentUser: updatedUser
      });

      setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsUpdating(false);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
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
        
        onStateUpdate({
          users: updatedUsers,
          currentUser: updatedUser
        });
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-malawi-black uppercase tracking-tight">Account Settings</h1>
          <p className="text-gray-500">Customize your public presence and secure your earnings.</p>
        </div>
        {updateSuccess && (
          <div className="flex items-center gap-2 bg-malawi-green/10 text-malawi-green px-4 py-2 rounded-full font-bold animate-in fade-in slide-in-from-top-4 shadow-sm border border-malawi-green/20">
            <CheckCircle size={18} />
            <span className="text-xs uppercase tracking-wider">Changes Saved!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="relative group mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-malawi-green bg-gray-50 flex items-center justify-center shadow-inner">
                {user.profilePic ? (
                  <img src={user.profilePic} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="bg-malawi-green/10 w-full h-full flex items-center justify-center text-malawi-green">
                    <UserIcon size={48} />
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-malawi-black text-white p-2.5 rounded-full shadow-lg hover:bg-malawi-red transition-all hover:scale-110 active:scale-95"
                title="Upload Profile Photo"
              >
                <Camera size={18} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleProfilePicChange}
              />
            </div>
            <h2 className="text-xl font-black text-malawi-black leading-tight mb-1">{user.fullName}</h2>
            <p className="text-sm text-gray-500 mb-4">{user.email}</p>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
              user.role === 'ADMIN' ? 'bg-malawi-red text-white' : 'bg-malawi-green text-white'
            }`}>
              {user.role} Status
            </div>
          </div>

          <div className="bg-malawi-black rounded-3xl p-6 text-white space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Identity Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Affiliate Since</span>
                <span className="text-sm font-bold flex items-center gap-1.5">
                  <Calendar size={14} className="text-malawi-green" /> {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">System ID</span>
                <span className="text-sm font-mono font-bold text-malawi-green bg-malawi-green/10 px-2 py-0.5 rounded">{user.referralCode}</span>
              </div>
              <div className="border-t border-gray-800 pt-4 flex justify-between items-center">
                <span className="text-sm text-gray-400">Verification</span>
                <div className="flex gap-1.5 text-malawi-green items-center">
                  <ShieldCheck size={16} />
                  <span className="text-xs font-black uppercase tracking-tighter">Verified Member</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* General Information */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-malawi-black uppercase tracking-tight">
              <UserIcon className="text-malawi-green" size={24} />
              Identity & Profile
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="text" 
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green focus:bg-white transition-all text-sm font-medium"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location / District</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="text" 
                      placeholder="e.g. Blantyre, Lilongwe"
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green focus:bg-white transition-all text-sm font-medium"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="tel" 
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green focus:bg-white transition-all text-sm font-medium"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="tel" 
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green focus:bg-white transition-all text-sm font-medium"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bio / Marketing Strategy</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 text-gray-300" size={18} />
                  <textarea 
                    rows={3}
                    placeholder="Briefly describe how you plan to reach new affiliates..."
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-green focus:bg-white transition-all text-sm font-medium resize-none"
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isUpdating}
                className="bg-malawi-black hover:bg-gray-800 text-white font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-black/10 w-full sm:w-auto uppercase text-xs tracking-widest"
              >
                <Save size={18} />
                {isUpdating ? 'Saving...' : 'Update Information'}
              </button>
            </form>
          </section>

          {/* Change Password */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-malawi-black uppercase tracking-tight">
              <Lock className="text-malawi-red" size={24} />
              Password & Security
            </h3>
            {error && (
              <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-in slide-in-from-left-4">
                <AlertCircle size={18} />
                <span className="uppercase tracking-tight">{error}</span>
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Current Password</label>
                  <input 
                    type="password" 
                    placeholder="Verify identity with old password"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-red focus:bg-white transition-all text-sm font-medium"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                  <input 
                    type="password" 
                    placeholder="Min. 6 characters"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-red focus:bg-white transition-all text-sm font-medium"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <input 
                    type="password" 
                    placeholder="Repeat new password"
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-malawi-red focus:bg-white transition-all text-sm font-medium"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isUpdating}
                className="bg-malawi-red hover:bg-red-800 text-white font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-red-500/10 w-full sm:w-auto uppercase text-xs tracking-widest"
              >
                <Lock size={18} />
                {isUpdating ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
