import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import LoginPage from '@/pages/LoginPage';
import MainDashboard from '@/pages/MainDashboard';
import AdminDashboard from '@/pages/AdminDashboard';

function AppRoutes() {
  const { currentUser, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;
  if (loading) return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/admin" element={currentUser?.isAdmin ? <AdminDashboard /> : <Navigate to="/" />} />
      <Route path="/*" element={currentUser ? <MainDashboard /> : <Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
