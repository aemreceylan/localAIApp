/**
 * @file AdminLayout.tsx
 * @description Admin Paneli Ana Düzeni (Sidebar, Header, Güvenlik Zamanlayıcısı ve Sayfa Çerçevesi).
 */

import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Users,
  UserCheck,
  Ticket,
  LogOut,
  Moon,
  Sun,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '#hooks/useAuth.js';
import { useIdleTimeout } from '#hooks/useIdleTimeout.js';
import { IdleTimeoutModal } from '#components/ui/IdleTimeoutModal.js';
import { Badge } from '#components/ui/Badge.js';

export function AdminLayout() {
  const { currentUser, logout, isLoggingOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // 30 Dakikalık Boşta Kalma (Idle Timeout) Güvenlik Yöneticisi
  const { showPrompt, remainingSeconds, stayLoggedIn } = useIdleTimeout({
    timeoutMs: 30 * 60 * 1000,
    promptBeforeMs: 2 * 60 * 1000,
    onTimeout: () => {
      void logout();
    },
    enabled: Boolean(currentUser),
  });

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    {
      to: '/',
      label: 'Telemetri & Metrikler',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/models',
      label: 'Model Yönetimi & İndirme',
      icon: Cpu,
    },
    {
      to: '/users',
      label: 'Personel & Rol Yetkileri',
      icon: Users,
    },
    {
      to: '/onboarding',
      label: 'Onay Bekleyenler',
      icon: UserCheck,
    },
    {
      to: '/invitations',
      label: 'Davetiyeler',
      icon: Ticket,
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Mobil Sidebar Karartması */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sol Kenar Çubuğu (Sidebar) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / Başlık */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                  NexusAI
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 font-semibold uppercase">
                  Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Yönetim & Gateway</p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menü Linkleri */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Alt Bilgi & Çıkış */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                {currentUser?.firstName} {currentUser?.lastName}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
            </div>
            <Badge
              size="sm"
              variant={currentUser?.systemRole === 'superadmin' ? 'danger' : 'info'}
            >
              {currentUser?.systemRole === 'superadmin' ? 'Root' : 'Admin'}
            </Badge>
          </div>

          <button
            onClick={() => void logout()}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Oturumu Kapat</span>
          </button>
        </div>
      </aside>

      {/* Sağ Ana Gövde */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Üst Bar (Header) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                Sistem Çevrimiçi — Nexus Gateway v2.1
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Tema Değiştirici */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDark ? 'Aydınlık Temaya Geç' : 'Karanlık Temaya Geç'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Sayfa İçeriği */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Boşta Kalma Güvenlik Modalı (30 dk idle) */}
      <IdleTimeoutModal
        isOpen={showPrompt}
        remainingSeconds={remainingSeconds}
        onStayLoggedIn={stayLoggedIn}
        onLogout={() => void logout()}
      />
    </div>
  );
}
