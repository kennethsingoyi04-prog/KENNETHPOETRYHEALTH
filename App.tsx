
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
import { syncAppStateToCloud, fetchAppStateFromCloud, checkCloudHealth, saveToLocal, loadFromLocal } from './dataService';
import { Loader2, RefreshCw, Ban, MessageCircle, ArrowLeft, ShieldAlert } from 'lucide-react';

const SESSION_KEY = 'kph_session_uid';

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [state, setState] = useState<AppState>({
    currentUser: null,
    systemSettings: { 
      masterKey: 'KPH-OWNER-2025', 
      maintenanceMode: false 
    },
    users: [],
    withdrawals: [],
    referrals: [],
    complaints: []
  });

  // 1. Initial Load: LocalStorage First -> Then Cloud
  useEffect(() => {
    const initApp = async () => {
      // Load from Local Cache instantly for speed
      const localData = loadFromLocal();
      if (localData) {
        setState(prev => ({ ...prev, ...localData }));
      }

      // Check Cloud Connectivity
      const health = await checkCloudHealth();
      setIsOnline(health.ok);

      if (health.ok) {
        const cloudData = await fetchAppStateFromCloud();
        const savedUid = localStorage.getItem(SESSION_KEY);
        
        if (cloudData) {
          const cloudUsers = cloudData.users || [];
          let sessionUser = savedUid ? cloudUsers.find(u => u.id === savedUid) : null;
          
          setState(prev => ({
            ...prev,
            ...cloudData,
            currentUser: sessionUser || null
          }));
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
      const success = await syncAppStateToCloud(state);
      if (success) {
        setHasUnsavedChanges(false);
        alert("Cloud Sync Successful. Your Netlify Credits are safe.");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateUserState = useCallback((updatedState: Partial<AppState>) => {
    setState(prev => {
      const newState = { ...prev, ...updatedState };
      
      // Update session user if users list changed
      if (updatedState.users && prev.currentUser) {
        const refreshedUser = updatedState.users.find(u => u.id === prev.currentUser?.id);
        if (refreshedUser) newState.currentUser = refreshedUser;
      }

      // Save to LocalStorage immediately (Zero Bandwidth Cost)
      saveToLocal(newState);
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
      localStorage.setItem(SESSION_KEY, user.id);
      updateUserState({ currentUser: user });
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
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Connecting to Private Network...</p>
        </div>
      </div>
    );
  }

  // Banned UI Barrier
  if (state.currentUser?.isBanned && state.currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-malawi-black flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-32 h-32 bg-malawi-red rounded-full flex items-center justify-center mb-10 shadow-2xl animate-bounce">
          <Ban size={64} />
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tight mb-6">Access Revoked</h1>
        <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] w-full max-w-2xl mb-10 text-left">
          <p className="text-2xl font-black italic">"{state.currentUser.banReason || 'Platform Policy Violation'}"</p>
        </div>
        <button onClick={logout} className="px-10 bg-white/10 hover:bg-white/20 text-white font-black py-6 rounded-3xl uppercase text-xs tracking-widest transition-all">
          Logout
        </button>
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
