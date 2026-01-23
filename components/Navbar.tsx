
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, MembershipStatus } from '../types';
import { 
  LayoutDashboard, 
  Wallet, 
  History as HistoryIcon, 
  LogOut, 
  ShieldCheck,
  User as UserIcon,
  MessageSquareWarning,
  Zap
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  complaintsCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout, complaintsCount = 0 }) => {
  const location = useLocation();
  const isInactive = currentUser?.membershipStatus === MembershipStatus.INACTIVE;

  if (!currentUser) return (
    <nav className="bg-malawi-black text-white p-4 shadow-lg border-b-4 border-malawi-red">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="bg-malawi-green p-1 rounded">KP</span>
          <span>KENNETH<span className="text-malawi-red">POETRYHEALTH</span></span>
        </Link>
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
          <div className="flex items-center gap-8">
            <Link to={isInactive ? "/activate" : "/dashboard"} className="flex items-center gap-2 font-bold text-xl">
              <span className="bg-malawi-green p-1 rounded">KP</span>
              <span>KENNETH<span className="text-malawi-red">POETRYHEALTH</span></span>
            </Link>
            
            <div className="flex gap-2">
              <NavItem to={isInactive ? "/activate" : "/dashboard"} icon={isInactive ? Zap : LayoutDashboard} label={isInactive ? "Activate" : "Dashboard"} />
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
            <div className="text-right mr-4">
              <p className="text-xs text-gray-400">Balance</p>
              <p className="text-sm font-bold text-malawi-green">MWK {currentUser.balance.toLocaleString()}</p>
            </div>
            
            <Link to="/profile" className="w-10 h-10 rounded-full border-2 border-malawi-green overflow-hidden bg-gray-800 flex items-center justify-center">
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
              <span className="hidden lg:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-malawi-black border-t border-gray-800 flex justify-around p-2 z-50 pb-safe">
        <NavItem to={isInactive ? "/activate" : "/dashboard"} icon={isInactive ? Zap : LayoutDashboard} label={isInactive ? "Activate" : "Home"} />
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
        {currentUser.role === 'ADMIN' ? (
          <NavItem to="/admin" icon={ShieldCheck} label="Admin" />
        ) : (
          <button onClick={onLogout} className="flex flex-col items-center gap-1 text-gray-400 p-2">
            <LogOut size={20} />
            <span className="text-[10px]">Logout</span>
          </button>
        )}
      </nav>
    </>
  );
};

export default Navbar;
