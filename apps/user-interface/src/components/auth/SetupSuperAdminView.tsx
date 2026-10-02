/**
 * @file SetupSuperAdminView.tsx
 * @description Sunucu ilk açıldığında doğrudan kayıt olabilecek tek kullanıcı olan
 * Super Admin ve varsayılan kurumun tanımlandığı ilk kurulum ekranı (Bootstrap View).
 * Aydınlık/Karanlık tema geçişi ve Nexus Precision kurumsal renk paletiyle tam uyumludur.
 */

import React, { useState } from 'react';
import { useAuth } from '#hooks/useAuth';
import { ThemeSwitch } from '#components/ui/ThemeSwitch';

export function SetupSuperAdminView() {
  const { setupSuperAdmin } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('NexusAI Kurumsal');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setErrorMessage('Lütfen zorunlu alanların tümünü doldurunuz.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Parola en az 8 karakter uzunluğunda olmalıdır.');
      return;
    }

    setIsSubmitting(true);
    try {
      await setupSuperAdmin({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        organizationName: organizationName.trim() || 'NexusAI Kurumsal',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kurulum sırasında beklenmeyen bir hata oluştu.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 relative">
      {/* Sağ Üst: Tema Değiştirme Butonu (Switch) */}
      <div className="absolute top-5 right-5">
        <ThemeSwitch />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 backdrop-blur-md">
        {/* Logo ve Başlık */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-md shadow-brand-500/20 mb-3">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 mb-2">
            İlk Kurulum (Bootstrap Mode)
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">NexusAI Platform Kurulumu</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Sistemin ilk yönetici (Super Admin) hesabını ve kurumunuzu tanımlayın.
          </p>
        </div>

        {/* Hata Bildirimi */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <svg
              className="w-4 h-4 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Bilgilendirme Kutusu */}
        <div className="mb-5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs flex items-start gap-2">
          <span className="text-base select-none">🛡️</span>
          <span className="leading-relaxed">
            Bu işlem tek seferliktir. Kurulum tamamlandıktan sonra halka açık doğrudan kayıt
            kalıcı olarak kapatılacaktır.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="setup-firstname" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ad <span className="text-red-500">*</span>
              </label>
              <input
                id="setup-firstname"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ahmet"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
            </div>
            <div>
              <label htmlFor="setup-lastname" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Soyad <span className="text-red-500">*</span>
              </label>
              <input
                id="setup-lastname"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Yılmaz"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="setup-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kurumsal E-posta <span className="text-red-500">*</span>
            </label>
            <input
              id="setup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kurumunuz.com"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="setup-orgname" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kurum / Şirket Adı
            </label>
            <input
              id="setup-orgname"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="NexusAI Kurumsal"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="setup-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Güvenli Parola <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="setup-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 8 karakter"
                className="w-full pl-3.5 pr-10 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Minimum 8 karakter, güçlü parola önerilir.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 shadow-sm shadow-brand-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Kurulum Yapılıyor...</span>
              </>
            ) : (
              <span>Sistemi Başlat ve Oturum Aç</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
