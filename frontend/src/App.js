import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MainSchedule from './pages/MainSchedule';
import StaffDashboard from './pages/StaffDashboard';
import RotationEditor from './pages/RotationEditor';
import ParentSettings from './pages/ParentSettings';
import StaffSettings from './pages/StaffSettings';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function StaffRoute({ children }) {
  const { isStaff, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isStaff ? children : <Navigate to="/" />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route 
                path="/" 
                element={
                  <PrivateRoute>
                    <MainSchedule />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <PrivateRoute>
                    <ParentSettings />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/staff" 
                element={
                  <StaffRoute>
                    <StaffDashboard />
                  </StaffRoute>
                } 
              />
              <Route 
                path="/staff/rotations" 
                element={
                  <StaffRoute>
                    <RotationEditor />
                  </StaffRoute>
                } 
              />
              <Route 
                path="/staff/settings" 
                element={
                  <StaffRoute>
                    <StaffSettings />
                  </StaffRoute>
                } 
              />
            </Routes>
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
