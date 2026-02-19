import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { usersService } from '@/services/users.service';
import LogoKoty from '@/assets/logo-koty-icon.webp';

interface LoginPageProps {
  onAuthenticated: () => void;
}

interface LoginPageLocationState {
  prefillEmail?: string;
  notice?: string;
}

function getFrenchAuthMessage(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  const lower = message.toLowerCase();

  if (lower.includes('invalid credentials')) return 'Email ou mot de passe incorrect.';
  if (lower.includes('access denied')) return 'Accès refusé.';
  if (lower.includes('email already exists')) return 'Vous avez déjà un compte.';
  if (lower.includes('first name and last name are required')) return 'Le prénom et le nom sont requis.';

  return message;
}

export default function LoginPage({ onAuthenticated }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetRequestLoading, setResetRequestLoading] = useState(false);

  useEffect(() => {
    const sessionError = localStorage.getItem('auth_error');
    if (sessionError) {
      setError(getFrenchAuthMessage(sessionError, 'Échec de la connexion'));
      localStorage.removeItem('auth_error');
    }
  }, []);

  useEffect(() => {
    const state = location.state as LoginPageLocationState | null;
    if (!state) return;

    if (state.prefillEmail) {
      setEmail(state.prefillEmail);
    }
    if (state.notice) {
      setNotice(state.notice);
      const timeoutId = window.setTimeout(() => {
        setNotice('');
      }, 5000);
      navigate(location.pathname, { replace: true, state: null });
      return () => window.clearTimeout(timeoutId);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authService.login(email, password);
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      onAuthenticated();
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        const normalizedMessage = Array.isArray(message) ? message.join(', ') : message;
        setError(getFrenchAuthMessage(normalizedMessage, 'Échec de la connexion'));
      } else {
        setError('Échec de la connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  const handlePasswordResetRequest = async () => {
    setError('');
    setNotice('');

    if (!email.trim()) {
      setError('Renseigne ton email pour envoyer la demande.');
      return;
    }

    setResetRequestLoading(true);
    try {
      const response = await usersService.requestPasswordReset(email.trim());
      setNotice(response.message || 'Demande envoyée aux administrateurs.');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        const normalizedMessage = Array.isArray(message) ? message.join(', ') : message;
        setError(getFrenchAuthMessage(normalizedMessage, "Impossible d'envoyer la demande pour le moment."));
      } else {
        setError("Impossible d'envoyer la demande pour le moment.");
      }
    } finally {
      setResetRequestLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/55 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-slate-300/45 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-3 sm:px-4 py-4 sm:py-8 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-4 sm:gap-5 items-stretch">
          <section className="hidden lg:block animate-fade-up-soft">
            <div className="h-full rounded-3xl border border-white/65 bg-gradient-to-br from-blue-600/90 via-sky-600/85 to-indigo-700/85 text-white shadow-[0_30px_70px_-40px_rgba(15,23,42,0.9)] p-7 xl:p-8">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                <img src={LogoKoty} alt="Koty Logo" className="w-5 h-5 rounded-md object-cover bg-white/90" />
                Bienvenue sur Koty
              </p>
              <h1 className="mt-4 text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight">
                Gérez vos cotisations
                <br />
                sans friction.
              </h1>
              <p className="mt-3 text-sm text-blue-100 leading-relaxed max-w-md">
                Créez vos groupes, invitez les membres, suivez les retards et validez les paiements en quelques clics.
              </p>

              <div className="mt-7 space-y-3">
                <div className="rounded-2xl bg-white/18 border border-white/25 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-wide text-blue-100">Clarté</p>
                  <p className="mt-1 text-sm font-semibold">Vue simplifiée puis détail complet selon ton besoin.</p>
                </div>
                <div className="rounded-2xl bg-white/18 border border-white/25 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-wide text-blue-100">Contrôle</p>
                  <p className="mt-1 text-sm font-semibold">Notifications des actions à traiter avec accès direct.</p>
                </div>
                <div className="rounded-2xl bg-white/18 border border-white/25 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-wide text-blue-100">Fiabilité</p>
                  <p className="mt-1 text-sm font-semibold">Suivi précis des soldes: à jour, retard ou avance.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="glass-panel-strong p-4 sm:p-8 animate-fade-up-soft">
            <div className="mb-5 sm:mb-6">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                <img src={LogoKoty} alt="Koty Logo" className="w-8 h-8 rounded-lg object-cover" />
                <span className="font-extrabold text-slate-900 normal-case tracking-tight">
                  Koty<span className="text-blue-600">.</span>
                </span>
              </p>
              <h2 className="mt-2 text-[28px] sm:text-3xl font-extrabold text-slate-900 tracking-tight">Connexion</h2>
              <p className="mt-1.5 text-[13px] sm:text-sm text-slate-600 leading-relaxed">
                Accède à tes groupes, tes cotisations et tes actions en attente.
              </p>
              <div className="mt-3 lg:hidden flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white/80 border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">
                  Suivi en temps réel
                </span>
                <span className="rounded-full bg-white/80 border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">
                  Validation rapide
                </span>
                <span className="rounded-full bg-white/80 border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">
                  Notifications
                </span>
              </div>
            </div>

            <form className="space-y-3.5 sm:space-y-4" onSubmit={handleSubmit}>
              {notice && (
                <div className="glass-surface p-3 text-sm text-blue-800 border-blue-200/70">
                  {notice}
                </div>
              )}
              {error && (
                <div className="glass-surface p-3 text-sm text-red-700 border-red-200/70 animate-shake-soft">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="glass-input w-full rounded-xl pl-10 pr-3 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="exemple@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="glass-input w-full rounded-xl pl-10 pr-11 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-2 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_16px_28px_-18px_rgba(37,99,235,0.9)]"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handlePasswordResetRequest}
                  disabled={resetRequestLoading}
                  className="text-[13px] text-slate-500 hover:text-blue-700 disabled:opacity-60"
                >
                  {resetRequestLoading
                    ? 'Envoi de la demande...'
                    : 'Mot de passe oublié ? Envoyer une demande à un administrateur'}
                </button>
              </div>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4 text-center">
              <Link to="/register" className="text-base sm:text-sm font-semibold text-blue-600 hover:text-blue-700">
                Pas encore de compte ? S'inscrire
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
