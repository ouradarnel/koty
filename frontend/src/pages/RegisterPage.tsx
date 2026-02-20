import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { authService } from '@/services/auth.service';
import { getApiErrorMessage } from '@/lib/api-error';
import { trackEvent } from '@/lib/analytics';
import LogoKoty from '@/assets/logo-koty-icon.webp';

interface RegisterPageProps {
  onAuthenticated: () => void;
}

export default function RegisterPage({ onAuthenticated }: RegisterPageProps) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError('Le prénom et le nom sont requis');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register(email, password, firstName.trim(), lastName.trim());
      trackEvent('auth_register_success', { emailDomain: email.split('@')[1] || '' });
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      onAuthenticated();
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        trackEvent('auth_register_failed', { emailDomain: email.split('@')[1] || '' });
        const message = err.response?.data?.message;
        const normalizedMessage = Array.isArray(message) ? message.join(', ') : (message ?? "Échec de l'inscription");
        const normalizedLower = normalizedMessage.toLowerCase();
        const isExistingEmailError =
          err.response?.status === 409 ||
          normalizedLower.includes('email already exists') ||
          normalizedLower.includes('email existe');

        if (isExistingEmailError) {
          trackEvent('auth_register_existing_email_redirect', { emailDomain: email.split('@')[1] || '' });
          navigate('/login', {
            replace: true,
            state: {
              prefillEmail: email.trim(),
              notice: 'Vous avez déjà un compte.',
            },
          });
          return;
        }

        setError(getApiErrorMessage(err, "Échec de l'inscription"));
      } else {
        trackEvent('auth_register_failed', { emailDomain: email.split('@')[1] || '' });
        setError("Échec de l'inscription");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page min-h-[100dvh] relative overflow-hidden bg-slate-100 px-3 sm:px-6 lg:px-8 py-4 sm:py-12 pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-slate-300/40 blur-3xl" />
      </div>
      <div className="relative z-10 max-w-md w-full space-y-6 mx-auto">
        <div>
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
            <img src={LogoKoty} alt="Logo Koty" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-extrabold text-slate-900 normal-case tracking-tight">
              Koty<span className="text-blue-600">.</span>
            </span>
          </p>
          <h2 className="mt-3 text-center text-[28px] sm:text-3xl font-extrabold text-slate-900 tracking-tight">Créer un compte</h2>
          <p className="mt-1.5 text-center text-[13px] sm:text-sm text-slate-600">
            Rejoins tes groupes et suis tes cotisations en temps réel.
          </p>
        </div>
        <form className="glass-panel-strong space-y-4 p-4 sm:p-8 animate-fade-up-soft" onSubmit={handleSubmit}>
          {error && (
            <div className="glass-surface p-3 border-red-200/70 animate-shake-soft">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-3.5">
            <div>
              <label htmlFor="firstName" className="sr-only">
                Prénom
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className="glass-input appearance-none relative block w-full px-3 py-3.5 text-base placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="sr-only">
                Nom
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className="glass-input appearance-none relative block w-full px-3 py-3.5 text-base placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="glass-input appearance-none relative block w-full px-3 py-3.5 text-base placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="glass-input appearance-none relative block w-full px-3 py-3.5 text-base placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mot de passe (min. 6 caractères)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="glass-input appearance-none relative block w-full px-3 py-3.5 text-base placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 shadow-[0_16px_28px_-18px_rgba(37,99,235,0.9)]"
            >
              {isLoading ? 'Inscription...' : 'S\'inscrire'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-semibold text-base sm:text-sm text-blue-600 hover:text-blue-500"
            >
              Déjà un compte ? Se connecter
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
