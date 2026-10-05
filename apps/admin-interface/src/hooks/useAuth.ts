/**
 * @file useAuth.ts
 * @description Yönetici kimlik doğrulama, kullanıcı durumu ve oturum yönetimi kancası.
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '#services/authService.js';
import type { User, SetupStatus } from '#types/auth.js';

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 1. Sistem ilk kurulum durumu
  const { data: setupStatus, isLoading: isSetupLoading } = useQuery<SetupStatus>({
    queryKey: ['auth', 'setup-status'],
    queryFn: () => authService.getSetupStatus(),
    staleTime: 60000,
  });

  // 2. Aktif oturum sahibi kullanıcı profili
  const {
    data: currentUser,
    isLoading: isUserLoading,
    error: userError,
  } = useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await authService.getMe();
      } catch {
        return null;
      }
    },
    staleTime: 30000,
    retry: false,
  });

  // 3. Oturum sonlanması (401) olayını dinle
  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.setQueryData(['auth', 'me'], null);
      navigate('/login', { replace: true });
    };

    window.addEventListener('nexus:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('nexus:unauthorized', handleUnauthorized);
    };
  }, [queryClient, navigate]);

  // Giriş Mutation
  const loginMutation = useMutation({
    mutationFn: (payload: { email: string; password: string }) => authService.login(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
      navigate('/', { replace: true });
    },
  });

  // Kurulum Mutation
  const setupMutation = useMutation({
    mutationFn: (payload: { email: string; password: string; firstName: string; lastName: string }) =>
      authService.setupSuperAdmin(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'setup-status'], { isSetupComplete: true });
      queryClient.setQueryData(['auth', 'me'], data.user);
      navigate('/', { replace: true });
    },
  });

  // Çıkış Mutation
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  const isAuthenticated = Boolean(currentUser && currentUser.isActive);
  const isSuperAdmin = currentUser?.systemRole === 'superadmin';
  const isAdmin = currentUser?.systemRole === 'admin' || isSuperAdmin;

  return {
    currentUser,
    setupStatus,
    isLoading: isSetupLoading || isUserLoading,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    userError,
    login: loginMutation.mutateAsync,
    setup: setupMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isSettingUp: setupMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
