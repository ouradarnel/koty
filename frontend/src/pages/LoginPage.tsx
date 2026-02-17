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
    <div className="min-h-screen relative overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-slate-300/40 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="glass-panel-strong p-6 sm:p-8">
            <div className="mb-6">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                <img src={LogoKoty} alt="Koty Logo" className="w-7 h-7 rounded-md object-cover" />
                <span className="font-extrabold text-slate-900 normal-case tracking-tight">
                  Koty<span className="text-blue-600">.</span>
                </span>
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Connexion</h2>
              <p className="mt-1 text-sm text-slate-600">Accédez à vos groupes et suivez vos cotisations en temps réel.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {notice && (
                <div className="glass-surface p-3 text-sm text-blue-800">
                  {notice}
                </div>
              )}
              {error && (
                <div className="glass-surface p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                    className="glass-input w-full rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                    className="glass-input w-full rounded-lg pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
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
                className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handlePasswordResetRequest}
                  disabled={resetRequestLoading}
                  className="text-xs text-slate-500 hover:text-blue-700 disabled:opacity-60"
                >
                  {resetRequestLoading
                    ? 'Envoi de la demande...'
                    : 'Mot de passe oublié ? Envoyer une demande à un administrateur'}
                </button>
              </div>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4 text-center">
              <Link to="/register" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Pas encore de compte ? S'inscrire
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
