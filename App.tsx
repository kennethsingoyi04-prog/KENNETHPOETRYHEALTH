
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

  // Background sync logic that respects the current login state
  const fetchAndMergeCloudState = async () => {
    const cloudData = await fetchAppStateFromCloud();
    if (cloudData) {
      const cloudUsers = cloudData.users || [];
      
      setState(prev => {
        // Only recover or refresh the user if we already have a session active in state
        // This prevents the "automatic relogging" loop during background refreshes
        let updatedCurrentUser = prev.currentUser;
        
        if (prev.currentUser) {
          const refreshed = cloudUsers.find(u => u.id === prev.currentUser?.id);
          if (refreshed) updatedCurrentUser = refreshed;
        }

        return {
          ...prev,
          ...cloudData,
          currentUser: updatedCurrentUser
        };
      });
    }
  };

  useEffect(() => {
    const initApp = async () => {
      // 1. Load basic UI state from local storage
      const localData = loadFromLocal();
      if (localData) {
        setState(prev => ({ ...prev, ...localData }));
      }

      // 2. Check cloud health and pull fresh data
      const health = await checkCloudHealth();
      setIsOnline(health.ok);

      if (health.ok) {
        const cloudData = await fetchAppStateFromCloud();
        if (cloudData) {
          const savedUid = localStorage.getItem(SESSION_KEY);
          const cloudUsers = cloudData.users || [];
          
          // Initial boot: log in only if savedUid is physically in storage
          const sessionUser = savedUid ? cloudUsers.find(u => u.id === savedUid) : null;
          
          setState(prev => ({
            ...prev,
            ...cloudData,
            currentUser: sessionUser
          }));
        }
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
      if (success) setHasUnsavedChanges(false);
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateUserState = useCallback((updatedState: Partial<AppState>) => {
    setState(prev => {
      const newState = { ...prev, ...updatedState };
      
      // Keep storage session in sync with manual state changes
      if (updatedState.currentUser !== undefined) {
        if (updatedState.currentUser) {
          localStorage.setItem(SESSION_KEY, updatedState.currentUser.id);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
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
    const MASTER_KEY = 'KPH-OWNER-2025';
    
    const userIndex = state.users.findIndex(u => 
      (u.email.toLowerCase() === identifier.toLowerCase() || u.username.toLowerCase() === identifier.toLowerCase()) && 
      (u.password === password || (u.role === 'ADMIN' && password === MASTER_KEY))
    );

    if (userIndex !== -1) {
      const user = state.users[userIndex];
      const updatedUser = { ...user, lastLoginAt: new Date().toISOString() };
      const updatedUsers = [...state.users];
      updatedUsers[userIndex] = updatedUser;
      
      // Absolute login sequence
      localStorage.setItem(SESSION_KEY, user.id);
      updateUserState({ users: updatedUsers, currentUser: updatedUser });
      return true;
    }
    return false;
  };

  const logout = () => {
    // Clear everything instantly to stop background sync races
    localStorage.removeItem(SESSION_KEY);
    setState(prev => ({ ...prev, currentUser: null }));
    // Hard refresh to clear memory if needed, but state reset is enough
  };

  if (!isReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-malawi-black text-white space-y-6">
        <Logo size="lg" variant="light" showText={false} className="animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-malawi-green" size={32} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Initializing Security...</p>
        </div>
      </div>
    );
  }

  // Handle Banned State
  if (state.currentUser?.isBanned && state.currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-malawi-black flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-24 h-24 bg-malawi-red rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl animate-bounce">
          <Ban size={48} />
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 text-malawi-red">Access Revoked</h1>
        <p className="text-gray-500 max-w-md mb-10 font-bold uppercase tracking-widest text-[10px]">Your account has been restricted by system administration.</p>
        <button onClick={logout} className="px-12 py-5 bg-white/5 text-white font-black rounded-2xl border border-white/10 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-white/10">
          <ArrowLeft size={16} /> Logout Securely
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
