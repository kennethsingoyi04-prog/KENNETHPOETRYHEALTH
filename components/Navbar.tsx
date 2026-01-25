
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, MembershipStatus } from '../types';
import Logo from './Logo';
import { 
  LayoutDashboard, 
  Wallet, 
  History as HistoryIcon, 
  LogOut, 
  ShieldCheck,
  User as UserIcon,
  MessageSquareWarning,
  Zap,
  ChevronRight,
  ImageIcon,
  Cloud,
  RefreshCw,
  Save
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  isOnline?: boolean;
  isSyncing?: boolean;
  hasUnsavedChanges?: boolean;
  onSync?: () => void;
  complaintsCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ 
  currentUser, 
  onLogout, 
  isOnline = false, 
  isSyncing = false, 
  hasUnsavedChanges = false,
  onSync,
  complaintsCount = 0 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isInactive = currentUser?.membershipStatus === MembershipStatus.INACTIVE;

  const SyncIndicator = () => (
    <button 
      onClick={onSync}
      disabled={isSyncing || !isOnline}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
        !isOnline ? 'bg-red-500/10 border-red-500/20 text-red-600 grayscale' :
        hasUnsavedChanges ? 'bg-malawi-red text-white border-malawi-red shadow-lg animate-pulse' : 
        'bg-green-500/10 border-green-500/20 text-green-600'
      }`}
    >
      {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : 
       hasUnsavedChanges ? <Save size={14} /> : <Cloud size={14} />}
      <span className="text-[9px] font-black uppercase tracking-widest">
        {isSyncing ? 'Saving...' : hasUnsavedChanges ? 'Unsaved' : 'Cloud OK'}
      </span>
    </button>
  );

  if (!currentUser) return (
    <nav className="bg-white text-malawi-black p-4 border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/"><Logo variant="dark" size="sm" /></Link>
        <div className="flex items-center gap-4">
           <button onClick={() => navigate('/auth?type=login')} className="text-xs font-black uppercase tracking-widest">Login</button>
           <button onClick={() => navigate('/auth?type=signup')} className="bg-malawi-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest">Join Now</button>
        </div>
      </div>
    </nav>
  );

  const NavItem = ({ to, icon: Icon, label, badge, disabled }: { to: string, icon: any, label: string, badge?: number, disabled?: boolean }) => {
    const isActive = location.pathname === to;
    if (disabled) return null;
    return (
      <Link 
        to={to} 
        className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg transition-colors relative ${
          isActive ? 'bg-malawi-green text-white shadow-md' : 'text-gray-400 hover:text-white'
        }`}
      >
        <Icon size={20} />
        <span className="text-[10px] md:text-sm font-medium">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-malawi-red text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <nav className="bg-malawi-black text-white p-3 md:p-4 shadow-lg sticky top-0 z-50 border-b-2 border-malawi-red">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to={isInactive ? "/activate" : "/dashboard"}><Logo size="sm" variant="light" showText={false} /></Link>
            <SyncIndicator />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-1">
              <NavItem to={isInactive ? "/activate" : "/dashboard"} icon={LayoutDashboard} label="Home" />
              <NavItem to="/withdraw" icon={Wallet} label="Wallet" />
              {currentUser.role === 'ADMIN' && <NavItem to="/admin" icon={ShieldCheck} label="Admin" badge={complaintsCount} />}
            </div>
            <Link to="/profile?tab=account" className="w-8 h-8 rounded-full border border-malawi-green overflow-hidden">
              {currentUser.profilePic ? <img src={currentUser.profilePic} className="w-full h-full object-cover" /> : <UserIcon size={16} className="m-auto mt-1.5 text-gray-400" />}
            </Link>
            <button onClick={onLogout} className="p-2 text-malawi-red hover:bg-malawi-red/10 rounded-lg"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      {/* Mobile Footer - Strictly Navigation only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-malawi-black border-t border-gray-800 flex justify-around items-center p-2 z-50 pb-safe">
        <NavItem to={isInactive ? "/activate" : "/dashboard"} icon={LayoutDashboard} label="Home" />
        <NavItem to="/withdraw" icon={Wallet} label="Wallet" />
        <NavItem to="/history" icon={HistoryIcon} label="History" />
        <NavItem to="/profile?tab=support" icon={MessageSquareWarning} label="Support" />
      </nav>
    </>
  );
};

export default Navbar;
