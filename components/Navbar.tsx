
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../types';
import { 
  LayoutDashboard, 
  Wallet, 
  History as HistoryIcon, 
  Settings, 
  LogOut, 
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout }) => {
  const location = useLocation();

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

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 rounded-lg transition-colors ${
          isActive ? 'bg-malawi-green text-white' : 'text-gray-400 md:text-gray-300 hover:bg-gray-800'
        }`}
      >
        <Icon size={20} />
        <span className="text-xs md:text-sm font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <>
      <nav className="bg-malawi-black text-white p-4 shadow-lg sticky top-0 z-50 border-b-4 border-malawi-red hidden md:block">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl">
              <span className="bg-malawi-green p-1 rounded">KP</span>
              <span>KENNETH<span className="text-malawi-red">POETRYHEALTH</span></span>
            </Link>
            
            <div className="flex gap-2">
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
              <NavItem to="/withdraw" icon={Wallet} label="Withdraw" />
              <NavItem to="/history" icon={HistoryIcon} label="History" />
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
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 bg-malawi-red/20 hover:bg-malawi-red text-malawi-red hover:text-white px-4 py-2 rounded-lg transition-all"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-malawi-black border-t border-gray-800 flex justify-around p-2 z-50">
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Home" />
        <NavItem to="/withdraw" icon={Wallet} label="Wallet" />
        <NavItem to="/history" icon={HistoryIcon} label="History" />
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
