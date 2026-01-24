
import React, { useState, useEffect, useCallback } from 'react';
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
import { Loader2, Cloud } from 'lucide-react';

const SESSION_KEY = 'kph_session_uid';

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  
  const [state, setState] = useState<AppState>({
    currentUser: null,
    systemSettings: { masterKey: 'KPH-OWNER-2025', maintenanceMode: false },
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

  // 1. Initial Cloud Sync
  useEffect(() => {
    const initApp = async () => {
      const health = await checkCloudHealth();
      setIsOnline(health.ok);

      if (health.ok) {
        const cloudData = await fetchAppStateFromCloud();
        const savedUid = localStorage.getItem(SESSION_KEY);
        
        if (cloudData) {
          const cloudUsers = cloudData.users || [];
          const sessionUser = savedUid ? cloudUsers.find(u => u.id === savedUid) : null;
          
          setState(prev => ({
            ...prev,
            ...cloudData,
            currentUser: sessionUser || null
          }));
        } else {
          await syncAppStateToCloud(state);
        }
      }
      setIsReady(true);
    };
    initApp();
  }, []);

  // 2. Enhanced Heartbeat: Update "lastLoginAt" every 60 seconds while active
  useEffect(() => {
    if (state.currentUser && isOnline) {
      const heartbeat = setInterval(() => {
        const now = new Date().toISOString();
        setState(prev => {
          if (!prev.currentUser) return prev;
          const updatedUser = { ...prev.currentUser, lastLoginAt: now };
          const updatedUsers = prev.users.map(u => u.id === prev.currentUser?.id ? updatedUser : u);
          return { ...prev, users: updatedUsers, currentUser: updatedUser };
        });
      }, 60000); // 1 minute heartbeat
      return () => clearInterval(heartbeat);
    }
  }, [state.currentUser?.id, isOnline]);

  // 3. Continuous Cloud Sync
  useEffect(() => {
    if (isReady && isOnline) {
      const timeout = setTimeout(() => {
        syncAppStateToCloud(state);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [state, isReady, isOnline]);

  const login = (identifier: string, password?: string) => {
    const user = state.users.find(u => 
      (u.email.toLowerCase() === identifier.toLowerCase() || u.username.toLowerCase() === identifier.toLowerCase()) && 
      (!u.password || u.password === password)
    );
    if (user) {
      const now = new Date().toISOString();
      const updatedUser = { ...user, lastLoginAt: now };
      const updatedUsers = state.users.map(u => u.id === user.id ? updatedUser : u);
      
      localStorage.setItem(SESSION_KEY, user.id);
      setState(prev => ({ 
        ...prev, 
        users: updatedUsers,
        currentUser: updatedUser 
      }));
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const updateUserState = useCallback((updatedState: Partial<AppState>) => {
    setState(prev => {
      const newState = { ...prev, ...updatedState };
      if (updatedState.users && prev.currentUser) {
        const refreshedUser = updatedState.users.find(u => u.id === prev.currentUser?.id);
        if (refreshedUser) newState.currentUser = refreshedUser;
      }
      return newState;
    });
  }, []);

  if (!isReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-malawi-black text-white space-y-6">
        <Logo size="lg" variant="light" showText={false} className="animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-malawi-green" size={32} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Establishing Secure Connection...</p>
        </div>
        <div className="absolute bottom-10 flex items-center gap-2 text-gray-600">
           <Cloud size={14} />
           <span className="text-[9px] font-bold uppercase">KENNETHPOETRYHEALTH Cloud Sync v1.0</span>
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
