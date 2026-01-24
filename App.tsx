
import React, { useState, useEffect } from 'react';
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
import { User, AppState, MembershipStatus, MembershipTier } from './types';
import { syncAppStateToCloud, fetchAppStateFromCloud, checkCloudHealth } from './dataService';

const STORAGE_KEY = 'kph_v7_final_storage';

const App: React.FC = () => {
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.users && parsed.users.length > 0) return parsed;
      } catch (e) { console.error("Cache corrupted"); }
    }
    
    return {
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
        password: 'ownerpassword',
        membershipTier: MembershipTier.GOLD,
        membershipStatus: MembershipStatus.ACTIVE
      }],
      withdrawals: [],
      referrals: [],
      complaints: []
    };
  });

  // Initialize Cloud
  useEffect(() => {
    const initCloud = async () => {
      // 1. Check if Supabase is reachable
      const health = await checkCloudHealth();
      setIsOnline(health.ok);

      if (health.ok) {
        const cloudData = await fetchAppStateFromCloud();
        if (cloudData) {
          setState(prev => ({
            ...prev,
            ...cloudData,
            currentUser: prev.currentUser // Preserve session
          }));
        } else {
          // SEEDING: If cloud is empty, push the local owner account up immediately
          await syncAppStateToCloud(state);
        }
      }
      setIsCloudLoaded(true);
    };
    initCloud();
  }, []);

  // Periodic Auto-Sync
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    if (isCloudLoaded && isOnline) {
      const timer = setTimeout(() => {
        syncAppStateToCloud(state);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, isCloudLoaded, isOnline]);

  const login = (identifier: string, password?: string) => {
    const user = state.users.find(u => 
      (u.email === identifier || u.username === identifier) && 
      (!u.password || u.password === password)
    );
    if (user) {
      setState(prev => ({ ...prev, currentUser: user }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const updateUserState = (updatedState: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updatedState }));
  };

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
