import React, { useState } from 'react';
import { AuthService } from '../firebase/authService';
import { soundManager } from '../game/audio/SoundManager';
import { LogIn, ShieldCheck, Crosshair, Users, Sparkles } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    soundManager.playButtonClick();
    setError(null);
    setLoading(true);

    try {
      const user = await AuthService.loginWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('O login com Google foi cancelado.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Uma tentativa de login já está em andamento.');
      } else {
        setError('Falha ao conectar com o Google. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="login-screen-root"
      className="relative w-screen min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 select-none overflow-hidden"
    >
      {/* Cartoon Paper Background Texture */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* Decorative Origami Floating Elements */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-amber-400/10 rounded-3xl rotate-12 border-2 border-amber-400/20 pointer-events-none hidden sm:block" />
      <div className="absolute bottom-12 right-12 w-32 h-32 bg-blue-500/10 rounded-3xl -rotate-12 border-2 border-blue-500/20 pointer-events-none hidden sm:block" />

      <div
        id="login-card"
        className="relative z-10 w-full max-w-md bg-amber-50 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_rgba(15,23,42,1)] p-6 sm:p-8 flex flex-col items-center text-center transform -rotate-0.5"
      >
        {/* Brand Header */}
        <div className="w-16 h-16 rounded-3xl bg-amber-400 border-4 border-slate-950 flex items-center justify-center font-black text-slate-950 text-3xl font-comic shadow-[4px_4px_0px_rgba(15,23,42,1)] mb-4">
          P
        </div>

        <h1 className="text-3xl sm:text-4xl font-black font-comic tracking-wider text-slate-950 drop-shadow-sm flex items-center gap-2">
          PAPERNITE
        </h1>
        <p className="text-xs font-mono font-bold text-amber-800 bg-amber-200/80 px-3 py-0.5 rounded-full border border-amber-300 mt-1 mb-4">
          FPS MULTIPLAYER 3D EM CARTOLINA
        </p>

        <p className="text-sm font-medium text-slate-700 leading-relaxed mb-6">
          Entre com sua conta Google para salvar seu nickname, personalizar seu arsenal de papel e disputar partidas online reais.
        </p>

        {/* Features List */}
        <div className="w-full bg-white rounded-2xl p-4 border-2 border-slate-300 text-left space-y-2.5 mb-6 text-xs text-slate-700">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Matchmaking online 6 vs 6 com jogadores reais</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Crosshair className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Controle de câmera FPS real para celular e PC</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Perfil e nickname persistentes na sua conta</span>
          </div>
        </div>

        {error && (
          <div
            id="login-error-message"
            className="w-full mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-xl text-xs font-bold text-red-700 animate-shake"
          >
            {error}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          id="btn-google-sign-in"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 active:scale-98 text-white p-4 rounded-2xl font-black font-comic text-base flex items-center justify-center gap-3 shadow-[4px_4px_0px_rgba(245,158,11,1)] border-2 border-slate-950 transition cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>CONECTANDO COM GOOGLE...</span>
            </div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>ENTRAR COM GOOGLE</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-500 font-medium mt-4">
          Autenticação segura via Firebase Auth • Seus dados ficam protegidos.
        </p>
      </div>
    </div>
  );
};
