/**
 * @file useAuth.tsx
 * @description Uygulama genelinde kimlik doğrulama durumunu, ilk kurulum kontrolünü (bootstrap)
 * ve anlık oturum yönetimini sağlayan Context & Hook.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService } from '#services/authService';
import type { LoginPayload, SetupSuperAdminPayload, User } from '#types/auth.types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSetupRequired: boolean | null;
  setupSuperAdmin: (payload: SetupSuperAdminPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('nexus_token') : null;
  });
  const [isSetupRequired, setIsSetupRequired] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Oturumu ve kurulum durumunu ilk yüklemede sorgula
  const initAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      // 1. Kurulum durumu kontrolü (Bootstrap)
      const setupStatus = await authService.getSetupStatus();
      setIsSetupRequired(setupStatus.isSetupRequired);

      // Eğer ilk kurulum gerekiyorsa, doğrudan kurulum ekranına yönlendir
      if (setupStatus.isSetupRequired) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('nexus_token');
        setIsLoading(false);
        return;
      }

      // 2. İlk kurulum tamamlanmışsa, kayıtlı token var mı denetle
      const existingToken = localStorage.getItem('nexus_token');
      if (existingToken) {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          setToken(existingToken);
        } catch {
          // Token geçersiz veya süresi dolmuşsa yerel depolamadan temizle
          localStorage.removeItem('nexus_token');
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.error('[AuthContext] İlk başlatma hatası:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  // Anlık banlama veya 401 Unauthorized sinyalini dinle
  useEffect(() => {
    const handleRemoteLogout = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('nexus_token');
    };

    window.addEventListener('nexus_auth_logout', handleRemoteLogout);
    return () => {
      window.removeEventListener('nexus_auth_logout', handleRemoteLogout);
    };
  }, []);

  const setupSuperAdmin = useCallback(async (payload: SetupSuperAdminPayload) => {
    setIsLoading(true);
    try {
      const authData = await authService.setupSuperAdmin(payload);
      localStorage.setItem('nexus_token', authData.token);
      setToken(authData.token);
      setUser(authData.user);
      setIsSetupRequired(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const authData = await authService.login(payload);
      localStorage.setItem('nexus_token', authData.token);
      setToken(authData.token);
      setUser(authData.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('nexus_token');
      setUser(null);
      setToken(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      localStorage.removeItem('nexus_token');
      setUser(null);
      setToken(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        isSetupRequired,
        setupSuperAdmin,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
