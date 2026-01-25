
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
import { Loader2, RefreshCw, Ban, MessageCircle, ArrowLeft, ShieldAlert, Clock, Gavel, Zap } from 'lucide-react';

const SESSION_KEY = 'kph_session_uid';
const SYNC_INTERVAL_MS = 15000;

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const syncTimerRef = useRef<number | null>(null);
  
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

  const fetchAndMergeCloudState = async () => {
    const cloudData = await fetchAppStateFromCloud();
    if (cloudData) {
      const savedUid = localStorage.getItem(SESSION_KEY);
      const cloudUsers = cloudData.users || [];
      let sessionUser = savedUid ? cloudUsers.find(u => u.id === savedUid) : null;
      
      // Auto-Expiry for Temporary Bans
      if (sessionUser?.isBanned && sessionUser.banType === 'TEMPORARY' && sessionUser.banExpiresAt) {
         if (new Date() > new Date(sessionUser.banExpiresAt)) {
            sessionUser.isBanned = false;
         }
      }

      setState(prev => ({
        ...prev,
        ...cloudData,
        currentUser: sessionUser || prev.currentUser
      }));
    }
  };

  useEffect(() => {
    const initApp = async () => {
      const localData = loadFromLocal();
      if (localData) {
        setState(prev => ({ ...prev, ...localData }));
      }

      const health = await checkCloudHealth();
      setIsOnline(health.ok);

      if (health.ok) {
        await fetchAndMergeCloudState();
      }
      setIsReady(true);
    };

    initApp();

    syncTimerRef.current = window.setInterval(async () => {
      const health = await checkCloudHealth();
      setIsOnline(health.ok);
      if (health.ok && !hasUnsavedChanges) {
        await fetchAndMergeCloudState();
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [hasUnsavedChanges]);

  const triggerManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const success = await syncAppStateToCloud(state);
      if (success) {
        setHasUnsavedChanges(false);
      }
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateUserState = useCallback((updatedState: Partial<AppState>) => {
    setState(prev => {
      const newState = { ...prev, ...updatedState };
      
      if (updatedState.currentUser) {
        localStorage.setItem(SESSION_KEY, updatedState.currentUser.id);
      } else if (updatedState.users && prev.currentUser) {
        const refreshedUser = updatedState.users.find(u => u.id === prev.currentUser?.id);
        if (refreshedUser) newState.currentUser = refreshedUser;
      }

      saveToLocal(newState);
      setHasUnsavedChanges(true);
      
      syncAppStateToCloud(newState).then(success => {
        if (success) setHasUnsavedChanges(false);
      });

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
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Connecting to KPH Cloud...</p>
        </div>
      </div>
    );
  }

  if (state.currentUser?.isBanned && state.currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-malawi-black flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-32 h-32 bg-malawi-red rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl animate-bounce">
          <Ban size={64} />
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 text-malawi-red">Access Revoked</h1>
        <p className="text-gray-500 max-w-lg mb-12 font-bold uppercase tracking-widest text-xs">Administrative disciplinary action has been taken on your account.</p>
        <div className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem] w-full max-w-2xl mb-12 text-left relative overflow-hidden backdrop-blur-md">
           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3 text-malawi-red">
                 <ShieldAlert size={20} />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Disciplinary Report</span>
              </div>
              <div className="space-y-2">
                 <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Reason:</p>
                 <p className="text-3xl font-black italic">"{state.currentUser.banReason || 'Standard Violation'}"</p>
              </div>
           </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-md">
           <a href={`https://wa.me/265881234567`} target="_blank" className="flex-grow bg-malawi-green text-white font-black py-6 rounded-[2rem] uppercase text-xs tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3">
             <MessageCircle size={20} /> Appeal Now
           </a>
           <button onClick={logout} className="px-12 bg-white/5 text-white font-black py-6 rounded-[2rem] border border-white/10 uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-2">
             <ArrowLeft size={16} /> Logout
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
