'use client';

import React, { useState } from 'react';
import { signIn } from '@/lib/session';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Trophy, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

function safeNext(raw: string | null): string {
  if (!raw) return '/home';
  // Restringimos a paths internos para evitar open-redirect
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/home';
  return raw;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';

export default function AuthPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if ('error' in result) {
        setError(t('errors.invalidCredentials'));
      } else {
        router.push(next);
      }
    } catch {
      setError(t('errors.connection'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || t('errors.registerFailed'));
        return;
      }

      // Auto-login after successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if ('error' in result) {
        setError(t('errors.loginAfterRegister'));
      } else {
        router.push(next);
      }
    } catch {
      setError(t('errors.connection'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-[calc(100vh-160px)] items-center justify-center relative p-4">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon/5 rounded-full blur-[120px] pointer-events-none"></div>

      <main className="w-full max-w-105 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="size-8 text-neon" />
            <h1 className="font-headline font-black text-3xl italic tracking-tighter text-neon">PRODE ARENA</h1>
          </div>
          <p className="text-ink-muted text-sm font-medium tracking-wide uppercase">{t('tagline')}</p>
        </div>

        <div className="bg-surface-1 border border-line rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.4)] overflow-hidden">
          {/* Tabs */}
          <div role="tablist" className="flex bg-surface-1 border-b border-line">
            <button
              role="tab"
              aria-selected={isLogin}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${isLogin ? 'border-b-2 border-neon text-neon' : 'text-ink-muted hover:text-foreground'}`}
              onClick={() => { setIsLogin(true); setError(''); }}
              type="button"
            >
              {t('tabs.login')}
            </button>
            <button
              role="tab"
              aria-selected={!isLogin}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${!isLogin ? 'border-b-2 border-neon text-neon' : 'text-ink-muted hover:text-foreground'}`}
              onClick={() => { setIsLogin(false); setError(''); }}
              type="button"
            >
              {t('tabs.register')}
            </button>
          </div>

          <div className="p-8">
            <form className="space-y-5" onSubmit={isLogin ? handleLogin : handleRegister}>
              {/* Username field (register only) */}
              {!isLogin && (
                <div className="space-y-2">
                  <label htmlFor="auth-username" className="block text-xs font-bold uppercase tracking-widest text-ink-muted ml-1">{t('labels.username')}</label>
                  <input
                    id="auth-username"
                    className="w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-foreground placeholder:text-ink-dim focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/30 transition-all relative z-20"
                    placeholder={t('placeholders.username')}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="auth-email" className="block text-xs font-bold uppercase tracking-widest text-ink-muted ml-1">{t('labels.email')}</label>
                <input
                  id="auth-email"
                  className="w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-foreground placeholder:text-ink-dim focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/30 transition-all relative z-20"
                  placeholder={t('placeholders.email')}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="auth-password" className="block text-xs font-bold uppercase tracking-widest text-ink-muted ml-1">{t('labels.password')}</label>
                <div className="relative">
                  <input
                    id="auth-password"
                    className="w-full bg-surface-2 border border-line rounded-xl px-4 py-3 text-foreground placeholder:text-ink-dim focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/30 transition-all relative z-20"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-foreground transition-colors z-30"
                    type="button"
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              {/* Error display */}
              {error && (
                <div role="alert" className="flex items-center gap-2 text-destructive text-xs font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                className="w-full bg-neon text-primary-foreground font-black py-4 rounded-xl shadow-(--shadow-neon-sm) hover:shadow-(--shadow-neon) hover:-translate-y-0.5 active:scale-95 transition-all duration-200 uppercase tracking-tight disabled:opacity-50 disabled:cursor-not-allowed relative z-20"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {isLogin ? t('submit.loggingIn') : t('submit.registering')}
                  </span>
                ) : (
                  isLogin ? t('submit.login') : t('submit.register')
                )}
              </button>
            </form>

            <div className="mt-8 text-center space-y-4">
              <p className="text-xs text-ink-muted font-medium relative z-20">
                {isLogin ? t('switch.toRegisterPrompt') : t('switch.toLoginPrompt')}
                <button
                  className="text-neon font-bold hover:underline"
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  type="button"
                >
                  {isLogin ? t('switch.toRegisterCta') : t('switch.toLoginCta')}
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
