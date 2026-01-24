
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
  CloudOff
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  isOnline?: boolean;
  complaintsCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout, isOnline = false, complaintsCount = 0 }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isInactive = currentUser?.membershipStatus === MembershipStatus.INACTIVE;

  const CloudIndicator = () => (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
      isOnline ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'
    }`}>
      {isOnline ? <Cloud size={12} className="animate-pulse" /> : <CloudOff size={12} />}
      <span className="text-[8px] font-black uppercase tracking-widest hidden sm:inline">
        {isOnline ? 'Sync Active' : 'Offline'}
      </span>
    </div>
  );

  if (!currentUser) return (
    <nav className="bg-white text-malawi-black p-4 border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Logo variant="dark" />
          </Link>
          <CloudIndicator />
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => navigate('/auth?type=login')} 
             className="text-xs font-black uppercase tracking-widest hover:text-malawi-green transition-colors"
           >
             Login
           </button>
           <button 
             onClick={() => navigate('/auth?type=signup')} 
             className="bg-malawi-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-black/10 hover:bg-gray-800 transition-all flex items-center gap-2"
           >
             Join Now <ChevronRight size={14} />
           </button>
        </div>
      </div>
    </nav>
  );

  const NavItem = ({ to, icon: Icon, label, badge, disabled }: { to: string, icon: any, label: string, badge?: number, disabled?: boolean }) => {
    const isActive = location.pathname === to || (to.includes('/profile') && location.pathname === '/profile' && location.search.includes(to.split('=')[1]));
    
    if (disabled) return (
      <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg text-gray-600 cursor-not-allowed grayscale opacity-50">
        <Icon size={20} />
        <span className="text-xs md:text-sm font-medium">{label}</span>
      </div>
    );

    return (
      <Link 
        to={to} 
        className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg transition-colors relative ${
          isActive ? 'bg-malawi-green text-white shadow-md' : 'text-gray-400 md:text-gray-300 hover:bg-gray-800'
        }`}
      >
        <Icon size={20} />
        <span className="text-xs md:text-sm font-medium">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 md:relative md:top-0 md:right-0 bg-malawi-red text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-malawi-black md:border-none">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <nav className="bg-malawi-black text-white p-4 shadow-lg sticky top-0 z-50 border-b-4 border-malawi-red hidden md:block">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link to={isInactive ? "/activate" : "/dashboard"}>
               <Logo size="md" variant="light" />
            </Link>
            
            <div className="flex gap-1">
              <NavItem to={isInactive ? "/activate" : "/dashboard"} icon={isInactive ? Zap : LayoutDashboard} label={isInactive ? "Activate" : "Dashboard"} />
              <NavItem to="/image-lab" icon={ImageIcon} label="AI Lab" disabled={isInactive} />
              <NavItem to="/withdraw" icon={Wallet} label="Withdraw" disabled={isInactive} />
              <NavItem to="/history" icon={HistoryIcon} label="History" disabled={isInactive} />
              <NavItem 
                to={currentUser.role === 'ADMIN' ? "/admin?tab=complaints" : "/profile?tab=support"} 
                icon={MessageSquareWarning} 
                label="Support" 
                badge={currentUser.role === 'ADMIN' ? complaintsCount : 0} 
              />
              <NavItem to="/profile?tab=account" icon={UserIcon} label="Profile" />
              {currentUser.role === 'ADMIN' && (
                <NavItem to="/admin" icon={ShieldCheck} label="Admin" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CloudIndicator />
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase font-black">Balance</p>
              <p className="text-sm font-bold text-malawi-green">MWK {currentUser.balance.toLocaleString()}</p>
            </div>
            
            <Link to="/profile" className="w-10 h-10 rounded-full border-2 border-malawi-green overflow-hidden bg-gray-800 flex items-center justify-center ml-2">
              {currentUser.profilePic ? (
                <img src={currentUser.profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={20} className="text-gray-400" />
              )}
            </Link>

            <button 
              onClick={onLogout}
              className="flex items-center gap-2 bg-malawi-red/10 hover:bg-malawi-red text-malawi-red hover:text-white px-4 py-2 rounded-xl transition-all border border-malawi-red/20 font-black uppercase text-[10px] tracking-widest"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-malawi-black border-t border-gray-800 flex justify-around p-2 z-50 pb-safe">
        <NavItem to={isInactive ? "/activate" : "/dashboard"} icon={isInactive ? Zap : LayoutDashboard} label={isInactive ? "Activate" : "Home"} />
        <NavItem to="/image-lab" icon={ImageIcon} label="AI Lab" disabled={isInactive} />
        <NavItem to="/withdraw" icon={Wallet} label="Wallet" disabled={isInactive} />
        <NavItem 
          to={currentUser.role === 'ADMIN' ? "/admin" : "/profile?tab=support"} 
          icon={MessageSquareWarning} 
          label="Support" 
          badge={currentUser.role === 'ADMIN' ? complaintsCount : 0} 
        />
        <Link to="/profile?tab=account" className={`flex flex-col items-center gap-1 p-2 rounded-lg ${location.pathname === '/profile' ? 'text-malawi-green' : 'text-gray-400'}`}>
          <div className="w-6 h-6 rounded-full overflow-hidden border border-current flex items-center justify-center">
            {currentUser.profilePic ? (
              <img src={currentUser.profilePic} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={14} />
            )}
          </div>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>
    </>
  );
};

export default Navbar;
