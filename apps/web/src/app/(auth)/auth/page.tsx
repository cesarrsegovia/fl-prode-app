'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';

export default function AuthPage() {
  const router = useRouter();
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

      if (result?.error) {
        setError('Credenciales incorrectas. Por favor, intenta de nuevo.');
      } else {
        router.push('/home');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
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
        setError(data.message || 'Error al registrarse.');
        return;
      }

      // Auto-login after successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Registro exitoso, pero hubo un error al iniciar sesión.');
      } else {
        router.push('/home');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-[calc(100vh-160px)] items-center justify-center relative p-4">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary-container/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-container/5 rounded-full blur-[120px] pointer-events-none"></div>

      <main className="w-full max-w-[420px] relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary-container text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>sports_score</span>
            <h1 className="font-headline font-black text-3xl italic tracking-tighter text-primary-container">PRODE ARENA</h1>
          </div>
          <p className="text-on-surface-variant text-sm font-medium tracking-wide uppercase">The Stadium is Yours</p>
        </div>

        <div className="glass-panel border border-outline-variant/10 rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.4)] overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-surface-container-low/50 border-b border-outline-variant/10">
            <button
              className={`flex-1 py-4 text-sm font-bold transition-colors ${isLogin ? 'border-b-2 border-primary-container text-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
              onClick={() => { setIsLogin(true); setError(''); }}
              type="button"
            >
              Iniciar sesión
            </button>
            <button
              className={`flex-1 py-4 text-sm font-bold transition-colors ${!isLogin ? 'border-b-2 border-primary-container text-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
              onClick={() => { setIsLogin(false); setError(''); }}
              type="button"
            >
              Registrarse
            </button>
          </div>

          <div className="p-8">
            <form className="space-y-5" onSubmit={isLogin ? handleLogin : handleRegister}>
              {/* Username field (register only) */}
              {!isLogin && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Nombre de usuario</label>
                  <input
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all relative z-20"
                    placeholder="tucholopez"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Email</label>
                <input
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all relative z-20"
                  placeholder="nombre@ejemplo.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Contraseña</label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all relative z-20"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors z-30"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Error display */}
              {error && (
                <div className="flex items-center gap-2 text-error text-xs font-medium bg-error-container/10 p-3 rounded-lg border border-error/20">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                className="w-full neon-gradient text-on-primary font-black py-4 rounded-xl shadow-[0_8px_20px_rgba(181,242,61,0.2)] hover:shadow-[0_12px_24px_rgba(181,242,61,0.3)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 uppercase tracking-tight disabled:opacity-50 disabled:cursor-not-allowed relative z-20"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                    {isLogin ? 'Ingresando...' : 'Registrando...'}
                  </span>
                ) : (
                  isLogin ? 'Ingresar' : 'Crear cuenta'
                )}
              </button>
            </form>

            <div className="mt-8 text-center space-y-4">
              <p className="text-xs text-on-surface-variant font-medium relative z-20">
                {isLogin ? '¿No tienes una cuenta? ' : '¿Ya tienes cuenta? '}
                <button
                  className="text-primary-container font-bold hover:underline"
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  type="button"
                >
                  {isLogin ? 'Regístrate ahora' : 'Inicia sesión'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
