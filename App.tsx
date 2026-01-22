
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Withdraw from './pages/Withdraw';
import History from './pages/History';
import Navbar from './components/Navbar';
import { User, AppState, UserRole } from './types';

const STORAGE_KEY = 'kwacha_affiliate_state';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    
    // Initial Seed Data
    return {
      currentUser: null,
      users: [
        {
          id: 'admin-1',
          fullName: 'System Administrator',
          email: 'admin@kwacha.mw',
          phone: '+265888123456',
          whatsapp: '+265888123456',
          referralCode: 'ADMIN001',
          role: 'ADMIN',
          balance: 0,
          totalEarnings: 0,
          createdAt: new Date().toISOString()
        }
      ],
      withdrawals: [],
      referrals: []
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const login = (email: string) => {
    const user = state.users.find(u => u.email === email);
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
    <HashRouter>
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <Navbar currentUser={state.currentUser} onLogout={logout} />
        <main className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/auth" element={
              state.currentUser ? <Navigate to="/dashboard" /> : <Auth state={state} onLogin={login} onStateUpdate={updateUserState} />
            } />
            
            <Route path="/dashboard" element={
              state.currentUser ? <Dashboard state={state} onStateUpdate={updateUserState} /> : <Navigate to="/auth" />
            } />

            <Route path="/withdraw" element={
              state.currentUser ? <Withdraw state={state} onStateUpdate={updateUserState} /> : <Navigate to="/auth" />
            } />

            <Route path="/history" element={
              state.currentUser ? <History state={state} /> : <Navigate to="/auth" />
            } />

            <Route path="/admin" element={
              state.currentUser?.role === 'ADMIN' ? <AdminDashboard state={state} onStateUpdate={updateUserState} /> : <Navigate to="/dashboard" />
            } />

            <Route path="/" element={<Navigate to="/auth" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
