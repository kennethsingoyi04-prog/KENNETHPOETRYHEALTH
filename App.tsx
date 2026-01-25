
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProofPreview from './pages/ProofPreview';
import Withdraw from './pages/Withdraw';
import History from './pages/History';
import Profile from './pages/Profile';
import Complaints from './pages/Complaints';
import Activate from './pages/Activate';
import ImageLab from './pages/ImageLab';
import Navbar from './components/Navbar';
import Logo from './components/Logo';
import { User, AppState, MembershipStatus, MembershipTier } from './types';
import { syncAppStateToCloud, fetchAppStateFromCloud, checkCloudHealth } from './dataService';
import { Loader2, RefreshCw, Ban, MessageCircle, ArrowLeft, ShieldAlert } from 'lucide-react';

const SESSION_KEY = 'kph_session_uid';

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSyncRef = useRef<string>("");
  
  const [state, setState] = useState<AppState>({
    currentUser: null,
    systemSettings: { 
      masterKey: 'KPH-OWNER-2025', 
      maintenanceMode: false 
    },
    users: [{
      id: 'owner-1',
      username: 'owner',
      fullName: 'Main Owner',
      email: 'owner@kennethpoetryhealth.mw',
      phone: '+265888000000',
      whatsapp: '+265888000000',
      referralCode: 'OWNER001',
      role: 'ADMIN',
      isOwner: true,
      balance: 0,
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      password: 'ownerpassword',
      membershipTier: MembershipTier.GOLD,
      membershipStatus: MembershipStatus.ACTIVE
    }],
    withdrawals: [],
    referrals: [],
    complaints: []
  });

  // 1. Initialize App and fetch Cloud Data
  useEffect(() => {
    const initApp = async () => {
      const health = await checkCloudHealth();
      setIsOnline(health.ok);

      if (health.ok) {
        const cloudData = await fetchAppStateFromCloud();
        const savedUid = localStorage.getItem(SESSION_KEY);
        
        if (cloudData) {
          const cloudUsers = cloudData.users || [];
          let sessionUser = savedUid ? cloudUsers.find(u => u.id === savedUid) : null;
          
          // Check for temporary ban expiry
          if (sessionUser?.isBanned && sessionUser.banType === 'TEMPORARY' && sessionUser.banExpiresAt) {
             if (new Date() > new Date(sessionUser.banExpiresAt)) {
                sessionUser.isBanned = false;
                sessionUser.banType = undefined;
                sessionUser.banReason = undefined;
                sessionUser.banExpiresAt = undefined;
             }
          }

          setState(prev => ({
            ...prev,
            ...cloudData,
            currentUser: sessionUser || null,
            systemSettings: {
               ...prev.systemSettings,
               ...(cloudData.systemSettings || {})
            }
          }));
          lastSyncRef.current = JSON.stringify(cloudData);
        }
      }
      setIsReady(true);
    };
    initApp();
  }, []);

  const triggerManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncAppStateToCloud(state);
      setHasUnsavedChanges(false);
      lastSyncRef.current = JSON.stringify(state);
    } catch (e) {
      console.error("Sync Failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateUserState = useCallback((updatedState: Partial<AppState>) => {
    setState(prev => {
      const newState = { ...prev, ...updatedState };
      if (updatedState.users && prev.currentUser) {
        const refreshedUser = updatedState.users.find(u => u.id === prev.currentUser?.id);
        if (refreshedUser) newState.currentUser = refreshedUser;
      }
      setHasUnsavedChanges(true);
      return newState;
    });
  }, []);

  const login = (identifier: string, password?: string) => {
    const user = state.users.find(u => 
      (u.email.toLowerCase() === identifier.toLowerCase() || u.username.toLowerCase() === identifier.toLowerCase()) && 
      (!u.password || u.password === password)
    );
    if (user) {
      const now = new Date().toISOString();
      const updatedUser = { ...user, lastLoginAt: now };
      
      // Auto-expire ban on login if applicable
      if (updatedUser.isBanned && updatedUser.banType === 'TEMPORARY' && updatedUser.banExpiresAt) {
         if (new Date() > new Date(updatedUser.banExpiresAt)) {
            updatedUser.isBanned = false;
            updatedUser.banType = undefined;
         }
      }

      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      localStorage.setItem(SESSION_KEY, user.id);
      updateUserState({ users: updatedUsers, currentUser: updatedUser });
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setState(prev => ({ ...prev, currentUser: null }));
  };

  if (!isReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-malawi-black text-white space-y-6">
        <Logo size="lg" variant="light" showText={false} className="animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-malawi-green" size={32} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Establishing Secure Connection...</p>
        </div>
      </div>
    );
  }

  // DISCIPLINE BARRIER: Redirect banned users away from the dashboard
  if (state.currentUser?.isBanned && state.currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-malawi-black flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-32 h-32 bg-malawi-red rounded-full flex items-center justify-center mb-10 shadow-2xl shadow-red-500/20 animate-bounce">
          <Ban size={64} />
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tight mb-6">Account Suspended</h1>
        <p className="text-gray-400 max-w-lg mb-10 text-lg">
          Your KENNETHPOETRYHEALTH access has been restricted by the administration for violating platform use policies.
        </p>
        
        <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] w-full max-w-2xl mb-10 text-left">
          <div className="flex items-center gap-3 text-malawi-red mb-4">
             <ShieldAlert size={20} />
             <span className="text-xs font-black uppercase tracking-widest">Discipline Record</span>
          </div>
          <div className="space-y-4">
             <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Reason for Restriction:</p>
             <p className="text-2xl font-black italic">"{state.currentUser.banReason || 'Standard Platform Violation'}"</p>
             {state.currentUser.banType === 'TEMPORARY' && state.currentUser.banExpiresAt && (
                <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                   <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Restricted Until:</p>
                   <p className="font-black text-malawi-green">{new Date(state.currentUser.banExpiresAt).toLocaleString()}</p>
                </div>
             )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-md">
          <a 
            href={`https://wa.me/${state.users.find(u => u.isOwner)?.whatsapp}`} 
            target="_blank" 
            className="flex-grow bg-malawi-green text-white font-black py-6 rounded-3xl uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
          >
            <MessageCircle size={24} /> Appeal Decision
          </a>
          <button 
            onClick={logout} 
            className="px-10 bg-white/10 hover:bg-white/20 text-white font-black py-6 rounded-3xl uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft size={18} /> Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <Navbar 
          currentUser={state.currentUser} 
          onLogout={logout} 
          isOnline={isOnline}
          isSyncing={isSyncing}
          hasUnsavedChanges={hasUnsavedChanges}
          onSync={triggerManualSync}
          complaintsCount={state.complaints.filter(c => c.status === 'PENDING').length} 
        />
        
        <main className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={state.currentUser ? <Navigate to="/dashboard" /> : <Landing />} />
            <Route path="/auth" element={state.currentUser ? <Navigate to="/dashboard" /> : <Auth state={state} onLogin={login} onStateUpdate={updateUserState} />} />
            <Route path="/activate" element={state.currentUser ? <Activate state={state} onStateUpdate={updateUserState} /> : <Navigate to="/auth" />} />
            <Route path="/dashboard" element={state.currentUser ? <Dashboard state={state} onStateUpdate={updateUserState} /> : <Navigate to="/auth" />} />
            <Route path="/withdraw" element={state.currentUser ? <Withdraw state={state} onStateUpdate={updateUserState} /> : <Navigate to="/auth" />} />
            <Route path="/history" element={state.currentUser ? <History state={state} /> : <Navigate to="/auth" />} />
            <Route path="/profile" element={state.currentUser ? <Profile state={state} onStateUpdate={updateUserState} onLogout={logout} /> : <Navigate to="/auth" />} />
            <Route path="/complaints" element={state.currentUser ? <Complaints state={state} onStateUpdate={updateUserState} /> : <Navigate to="/auth" />} />
            <Route path="/image-lab" element={state.currentUser ? <ImageLab /> : <Navigate to="/auth" />} />
            <Route path="/admin" element={state.currentUser?.role === 'ADMIN' ? <AdminDashboard state={state} onStateUpdate={updateUserState} /> : <Navigate to="/dashboard" />} />
            <Route path="/admin/proof-preview" element={state.currentUser?.role === 'ADMIN' ? <ProofPreview /> : <Navigate to="/auth" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
