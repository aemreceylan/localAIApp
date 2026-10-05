/**
 * @file App.tsx
 * @description React Router v7 Rotaları ve Yetkilendirme Korumalı Rota Sarmalayıcısı.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '#hooks/useAuth.js';
import { AdminLayout } from '#layouts/AdminLayout.js';
import { LoginPage } from '#pages/LoginPage.js';
import { DashboardPage } from '#pages/DashboardPage.js';
import { ModelsPage } from '#pages/ModelsPage.js';
import { UsersPage } from '#pages/UsersPage.js';
import { OnboardingPage } from '#pages/OnboardingPage.js';
import { InvitationsPage } from '#pages/InvitationsPage.js';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, setupStatus } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Oturum doğrulanıyor...</span>
        </div>
      </div>
    );
  }

  // İlk kurulum gerekiyorsa doğrudan login/setup sayfasına yönlendir
  if (setupStatus && !setupStatus.isSetupComplete) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Korumalı Yönetici Rotaları */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route path="invitations" element={<InvitationsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
