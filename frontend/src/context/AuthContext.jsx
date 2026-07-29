import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminLogin,
  adminRegister,
  clearAuthTokens,
  getAuthTokens,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  setAuthTokens,
} from '../services/authService';
import { getDashboardPath } from '../utils/roles';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [dashboardPath, setDashboardPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const establishSession = useCallback((data) => {
    const { user: userData, accessToken, refreshToken, dashboardPath: path } = data;
    setAuthTokens(accessToken, refreshToken);
    setUser(userData);
    const resolvedPath = path || getDashboardPath(userData?.role);
    setDashboardPath(resolvedPath);
    return { user: userData, accessToken, refreshToken, dashboardPath: resolvedPath };
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await getCurrentUser();
    setUser(data.user);
    setDashboardPath(getDashboardPath(data.user?.role));
    return data.user;
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const { accessToken } = getAuthTokens();
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await getCurrentUser();
        setUser(data.user);
        setDashboardPath(getDashboardPath(data.user?.role));
      } catch {
        clearAuthTokens();
        setUser(null);
        setDashboardPath(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (credential, password) => {
    const data = await loginUser({ credential, password, portal: 'user' });
    return establishSession(data);
  };

  const register = async (payload) => {
    const data = await registerUser(payload);
    return establishSession(data);
  };

  const needsProfileSetup = (userData) =>
    userData?.role === 'user' && userData?.profileSetupComplete === false;

  const adminPanelLogin = async (credential, password) => {
    const data = await adminLogin(credential, password);
    return establishSession(data);
  };

  const adminPanelRegister = async (payload) => adminRegister(payload);

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Clear local session even if server logout fails
    } finally {
      clearAuthTokens();
      setUser(null);
      setDashboardPath(null);
      navigate('/');
    }
  };

  const role = user?.role ?? null;

  const value = {
    user,
    role,
    dashboardPath,
    loading,
    login,
    register,
    adminPanelLogin,
    adminPanelRegister,
    logout,
    establishSession,
    refreshUser,
    fetchUser: refreshUser,
    needsProfileSetup,
    isAuthenticated: !!user,
    isAdmin: role === 'admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
    isRecoveryAgent: role === 'recovery_agent',
    isStaff: ['super_admin', 'admin', 'recovery_agent'].includes(role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
