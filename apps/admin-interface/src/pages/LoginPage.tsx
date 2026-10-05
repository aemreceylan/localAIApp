/**
 * @file LoginPage.tsx
 * @description Admin Girişi ve İlk Kurulum (Setup Super Admin) Ekranı.
 */

import React, { useState } from 'react';
import { Shield, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '#hooks/useAuth.js';
import { Button } from '#components/ui/Button.js';
import { Input } from '#components/ui/Input.js';

export function LoginPage() {
  const { setupStatus, isLoading, login, setup, isLoggingIn, isSettingUp } = useAuth();

  const isSetupNeeded = Boolean(setupStatus?.isSetupRequired ?? (setupStatus ? !setupStatus.isSetupComplete : false));

  // Form alanları
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isSetupNeeded) {
        if (password !== passwordConfirm) {
          setError('Girdiğiniz parolalar birbiriyle eşleşmiyor.');
          return;
        }
        await setup({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
      } else {
        await login({
          email: email.trim(),
          password,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'İşlem sırasında bir hata oluştu.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Sistem durumu doğrulanıyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 space-y-6 animate-fade-in">
        {/* Logo & Başlık */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isSetupNeeded ? 'Sistem İlk Kurulumu' : 'Chotonack AI Yönetim Konsolu'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isSetupNeeded
              ? 'Sistemde henüz yönetici hesabı bulunmuyor. İlk Super Admin hesabınızı oluşturun.'
              : 'Kurumsal Gateway ve Veri Yönetimi Paneline giriş yapınız.'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Giriş / Kurulum Formu */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSetupNeeded && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ad"
                placeholder="Örn: Ahmet"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
              <Input
                label="Soyad"
                placeholder="Örn: Yılmaz"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          )}

          <Input
            type="email"
            label="Kurumsal E-posta"
            placeholder="admin@kurum.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoComplete="email"
          />

          <Input
            type="password"
            label="Parola"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
            autoComplete={isSetupNeeded ? 'new-password' : 'current-password'}
          />

          {isSetupNeeded && (
            <Input
              type="password"
              label="Parola Doğrulama"
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
              autoComplete="new-password"
            />
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isLoggingIn || isSettingUp}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {isSetupNeeded ? 'Super Admin Hesabını Başlat' : 'Güvenli Giriş Yap'}
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            Chotonack AI Gateway • Uçtan Uca Şifreli Oturum
          </p>
        </div>
      </div>
    </div>
  );
}
