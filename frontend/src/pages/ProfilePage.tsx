import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCircle2,
  XCircle,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import FirstUseGuide from '@/components/shared/FirstUseGuide';
import { useGroups } from '@/hooks/useGroups';
import { authService } from '@/services/auth.service';
import { usersService, type AdminUserAccount } from '@/services/users.service';
import type { PasswordResetRequest } from '@/types';
import { getStoredTheme, setAppTheme, type AppTheme } from '@/lib/theme';

interface ProfilePageProps {
  onLoggedOut: () => void;
}

type LocalUser = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  id?: string;
  isAdmin?: boolean;
};

type CurrencySlice = {
  currency: string;
  value: number;
  percentage: number;
  color: string;
};

type ProjectionPoint = {
  label: string;
  amount: number;
};

const defaultUser: LocalUser = {
  name: 'Utilisateur',
  email: 'session@locale.com',
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

const readAxiosMessage = (err: unknown, fallback: string) => {
  if (!axios.isAxiosError(err)) return fallback;
  const message = err.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
};

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const prev = i > 0 ? points[i - 1] : current;
    const afterNext = i < points.length - 2 ? points[i + 2] : next;

    const smoothing = 0.2;
    const cp1x = current.x + (next.x - prev.x) * smoothing;
    const cp1y = current.y + (next.y - prev.y) * smoothing;
    const cp2x = next.x - (afterNext.x - current.x) * smoothing;
    const cp2y = next.y - (afterNext.y - current.y) * smoothing;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  return path;
}

export default function ProfilePage({ onLoggedOut }: ProfilePageProps) {
  const storedUser = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('user') || '{}') as LocalUser;
      return { ...defaultUser, ...parsed };
    } catch {
      return defaultUser;
    }
  }, []);

  const [user, setUser] = useState<LocalUser>(storedUser);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [copiedField, setCopiedField] = useState<'email' | null>(null);
  const [profileExpertView, setProfileExpertView] = useState(false);
  const [selectedChartCurrency, setSelectedChartCurrency] = useState<string>('');
  const [appTheme, setAppThemeState] = useState<AppTheme>(() => getStoredTheme());

  const [accounts, setAccounts] = useState<AdminUserAccount[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState('');

  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>([]);
  const [rejectingRequestId, setRejectingRequestId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingAdminData, setLoadingAdminData] = useState(false);
  const { groups, loading: groupsLoading } = useGroups();

  const profileFullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.name || 'Utilisateur';
  const profileInitials = `${(user.firstName || user.name || 'U').charAt(0)}${(user.lastName || '').charAt(0)}`.toUpperCase();

  const filteredAccounts = useMemo(() => {
    const search = accountSearch.trim().toLowerCase();
    if (!search) return accounts;
    return accounts.filter((account) => {
      const haystack = `${account.email} ${account.firstName} ${account.lastName} ${account.name}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [accountSearch, accounts]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedUserId) ?? null,
    [accounts, selectedUserId],
  );

  const selectedRequest = useMemo(
    () => passwordResetRequests.find((request) => request.id === selectedRequestId) ?? null,
    [passwordResetRequests, selectedRequestId],
  );

  const adminStats = useMemo(() => {
    const totalAccounts = accounts.length;
    const adminAccounts = accounts.filter((account) => account.isAdmin).length;
    return {
      totalAccounts,
      adminAccounts,
      memberAccounts: Math.max(0, totalAccounts - adminAccounts),
      pendingRequests: passwordResetRequests.length,
    };
  }, [accounts, passwordResetRequests.length]);

  const engagementSummary = useMemo(() => {
    const userId = user.id;
    const recurringByCurrency = new Map<string, number>();
    const oneShotByCurrency = new Map<string, number>();
    const oneShotDetails: Array<{ id: string; name: string; groupName: string; amount: number; currency: string; deadline?: string | null }> = [];
    let recurringCount = 0;
    let oneShotCount = 0;

    groups.forEach((group) => {
      (group.contributions ?? []).forEach((contribution) => {
        if (contribution.isActive === false) return;

        const isParticipant =
          !contribution.members ||
          contribution.members.length === 0 ||
          contribution.members.some((item) => item.member.user.id === userId);

        if (!isParticipant) return;

        const amount = Number(contribution.amount) || 0;
        const currency = contribution.currency || 'N/D';

        if (contribution.frequency === 'DELAY') {
          oneShotCount += 1;
          oneShotByCurrency.set(currency, (oneShotByCurrency.get(currency) ?? 0) + amount);
          oneShotDetails.push({
            id: contribution.id,
            name: contribution.name,
            groupName: group.name,
            amount,
            currency,
            deadline: contribution.deadlineDate,
          });
          return;
        }

        recurringCount += 1;
        const monthlyEquivalent = contribution.frequency === 'QUARTERLY' ? amount / 3 : amount;
        recurringByCurrency.set(currency, (recurringByCurrency.get(currency) ?? 0) + monthlyEquivalent);
      });
    });

    const recurringRows = Array.from(recurringByCurrency.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => b.amount - a.amount);
    const oneShotRows = Array.from(oneShotByCurrency.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => b.amount - a.amount);

    oneShotDetails.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    return {
      recurringCount,
      oneShotCount,
      recurringRows,
      oneShotRows,
      oneShotDetails: oneShotDetails.slice(0, 6),
    };
  }, [groups, user.id]);

  const expertCharts = useMemo(() => {
    const colorPalette = ['#3b82f6', '#0ea5e9', '#6366f1', '#64748b', '#10b981', '#ef4444', '#1e293b'];
    const userId = user.id;
    const contributionEntries: Array<{
      currency: string;
      frequency: 'MONTHLY' | 'QUARTERLY' | 'DELAY';
      amount: number;
      deadlineDate?: string | null;
      dueDay: number;
    }> = [];

    groups.forEach((group) => {
      (group.contributions ?? []).forEach((contribution) => {
        if (contribution.isActive === false) return;
        const isParticipant =
          !contribution.members ||
          contribution.members.length === 0 ||
          contribution.members.some((item) => item.member.user.id === userId);
        if (!isParticipant) return;
        contributionEntries.push({
          currency: contribution.currency || 'N/D',
          frequency: contribution.frequency,
          amount: Number(contribution.amount) || 0,
          deadlineDate: contribution.deadlineDate,
          dueDay: contribution.dueDay,
        });
      });
    });

    const totalsByCurrency = new Map<string, number>();
    contributionEntries.forEach((entry) => {
      const normalized = entry.frequency === 'QUARTERLY' ? entry.amount / 3 : entry.amount;
      totalsByCurrency.set(entry.currency, (totalsByCurrency.get(entry.currency) ?? 0) + normalized);
    });

    const sumTotal = Array.from(totalsByCurrency.values()).reduce((acc, val) => acc + val, 0);
    const slices: CurrencySlice[] = Array.from(totalsByCurrency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([currency, value], index) => ({
        currency,
        value,
        percentage: sumTotal > 0 ? (value / sumTotal) * 100 : 0,
        color: colorPalette[index % colorPalette.length],
      }));

    const now = new Date();
    const baseYear = now.getFullYear();
    const baseMonth = now.getMonth();

    const buildProjectionForCurrency = (currency: string): ProjectionPoint[] => {
      const monthLabels: ProjectionPoint[] = Array.from({ length: 6 }).map((_, idx) => {
        const date = new Date(baseYear, baseMonth + idx, 1);
        const label = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
        return { label: label.charAt(0).toUpperCase() + label.slice(1), amount: 0 };
      });

      contributionEntries
        .filter((entry) => entry.currency === currency)
        .forEach((entry) => {
          if (entry.frequency === 'MONTHLY') {
            monthLabels.forEach((point) => {
              point.amount += entry.amount;
            });
            return;
          }

          if (entry.frequency === 'QUARTERLY') {
            monthLabels.forEach((point, idx) => {
              if (idx % 3 === 0) {
                point.amount += entry.amount;
              }
            });
            return;
          }

          if (!entry.deadlineDate) return;
          const deadline = new Date(entry.deadlineDate);
          if (Number.isNaN(deadline.getTime())) return;
          const monthDiff = (deadline.getFullYear() - baseYear) * 12 + (deadline.getMonth() - baseMonth);
          if (monthDiff >= 0 && monthDiff < monthLabels.length) {
            monthLabels[monthDiff].amount += entry.amount;
          }
        });

      return monthLabels;
    };

    const availableCurrencies = slices.map((slice) => slice.currency);
    const projectionsByCurrency = new Map<string, ProjectionPoint[]>();
    availableCurrencies.forEach((currency) => {
      projectionsByCurrency.set(currency, buildProjectionForCurrency(currency));
    });

    const currencyWithBestProjection =
      availableCurrencies
        .map((currency) => ({
          currency,
          projectedTotal: (projectionsByCurrency.get(currency) ?? []).reduce((acc, point) => acc + point.amount, 0),
        }))
        .sort((a, b) => b.projectedTotal - a.projectedTotal)[0]?.currency ?? availableCurrencies[0] ?? 'N/D';

    const currentCurrency = availableCurrencies.includes(selectedChartCurrency) ? selectedChartCurrency : currencyWithBestProjection;

    const monthLabels: ProjectionPoint[] = projectionsByCurrency.get(currentCurrency) ?? Array.from({ length: 6 }).map((_, idx) => {
      const date = new Date(baseYear, baseMonth + idx, 1);
      const label = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      return { label: label.charAt(0).toUpperCase() + label.slice(1), amount: 0 };
    });

    const lineMax = Math.max(...monthLabels.map((item) => item.amount), 1);
    const linePoints = monthLabels.map((item, idx) => {
      const x = monthLabels.length <= 1 ? 0 : (idx / (monthLabels.length - 1)) * 100;
      const y = 100 - (item.amount / lineMax) * 100;
      return { ...item, x, y };
    });

    const donutGradient =
      slices.length === 0
        ? '#cbd5e1'
        : `conic-gradient(${slices
            .map((slice, index) => {
              const start = slices.slice(0, index).reduce((acc, current) => acc + current.percentage, 0);
              const end = start + slice.percentage;
              return `${slice.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
            })
            .join(', ')})`;

    return {
      slices,
      donutGradient,
      monthLabels,
      linePoints,
      lineMax,
      availableCurrencies,
      currentCurrency,
    };
  }, [groups, selectedChartCurrency, user.id]);

  useEffect(() => {
    if (!expertCharts.availableCurrencies.length) return;
    if (!selectedChartCurrency || !expertCharts.availableCurrencies.includes(selectedChartCurrency)) {
      setSelectedChartCurrency(expertCharts.availableCurrencies[0]);
    }
  }, [expertCharts.availableCurrencies, selectedChartCurrency]);

  const copyToClipboard = async (value: string | undefined, field: 'email') => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1600);
    } catch {
      // Clipboard can be unavailable on some environments.
    }
  };

  const handleThemeChange = (theme: AppTheme) => {
    setAppThemeState(theme);
    setAppTheme(theme);
  };

  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError('');
      try {
        const me = await authService.getMe();
        setUser(me);
        localStorage.setItem('user', JSON.stringify(me));
      } catch {
        setUser(storedUser);
        setProfileError('Impossible de synchroniser le profil pour le moment.');
      } finally {
        setProfileLoading(false);
      }
    };

    void loadProfile();
  }, [storedUser]);

  const loadAdminData = useCallback(async () => {
    if (!user.isAdmin) return;

    setLoadingAdminData(true);
    setAdminError('');
    try {
      const [data, pendingRequests] = await Promise.all([
        usersService.listAdminAccounts(),
        usersService.listPendingPasswordResetRequests(),
      ]);
      setAccounts(data);
      setPasswordResetRequests(pendingRequests);
      setSelectedUserId((prev) => prev || data[0]?.id || '');
    } catch (err: unknown) {
      setAdminError(readAxiosMessage(err, 'Impossible de charger les données administrateur.'));
    } finally {
      setLoadingAdminData(false);
    }
  }, [user.isAdmin]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (selectedUserId && accounts.some((account) => account.id === selectedUserId)) return;
    setSelectedUserId(accounts[0]?.id ?? '');
  }, [accounts, selectedUserId]);

  const handleAdminReset = async (event: FormEvent) => {
    event.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    if (!selectedUserId) {
      setAdminError('Sélectionne un utilisateur.');
      return;
    }
    if (newPassword.length < 6) {
      setAdminError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setAdminError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      const result = selectedRequestId
        ? await usersService.adminResetPasswordFromRequest(selectedUserId, newPassword, selectedRequestId)
        : await usersService.adminResetPassword(selectedUserId, newPassword);
      setAdminSuccess(result.message || 'Mot de passe réinitialisé.');
      setNewPassword('');
      setConfirmPassword('');
      setSelectedRequestId('');
      await loadAdminData();
    } catch (err: unknown) {
      setAdminError(readAxiosMessage(err, 'Impossible de réinitialiser le mot de passe.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setAdminError('');
    setAdminSuccess('');
    setRejectingRequestId(requestId);
    try {
      const result = await usersService.rejectPasswordResetRequest(requestId);
      setAdminSuccess(result.message || 'Demande refusée.');
      await loadAdminData();
      if (selectedRequestId === requestId) {
        setSelectedRequestId('');
      }
    } catch (err: unknown) {
      setAdminError(readAxiosMessage(err, 'Impossible de refuser la demande.'));
    } finally {
      setRejectingRequestId('');
    }
  };

  return (
    <AppShell title="Profil" subtitle="Compte, identité et sécurité" onLoggedOut={onLoggedOut}>
      <section className={`profile-page space-y-3 md:space-y-6 ${profileExpertView ? 'profile-page--expert detail-theme detail-theme-bg rounded-3xl p-3 md:p-5' : ''}`}>
        {profileExpertView && (
          <FirstUseGuide
            pageKey="profile"
            title="Profil: identité et sécurité"
            description="Cette page te permet de vérifier tes informations et d'accéder aux actions de sécurité."
            bullets={[
              'Les données affichées viennent de ton compte actuel.',
              'Si tu es admin, le panneau administrateur apparaît en bas.',
              'Les réinitialisations et modifications de mot de passe sont gérées par l’administrateur.',
            ]}
          />
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setProfileExpertView((prev) => !prev)}
            className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              profileExpertView
                ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {profileExpertView ? 'Passer en vue simple' : 'Passer en vue experte'}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-3 md:gap-4">
          <article
            className={`relative overflow-hidden p-3.5 md:p-6 ${
              profileExpertView
                ? 'glass-panel-strong bg-gradient-to-br from-white/65 via-slate-50/50 to-blue-100/40'
                : 'glass-panel-strong bg-gradient-to-br from-white/65 via-slate-50/50 to-blue-100/40'
            }`}
          >
            <div className={`absolute -top-16 -right-16 h-36 w-36 rounded-full blur-2xl ${profileExpertView ? 'bg-blue-100/70' : 'bg-blue-100/70'}`} />
            <div className="relative">
              <div className="flex items-start gap-3 md:gap-4">
                <div
                  className={`h-12 w-12 md:h-14 md:w-14 rounded-xl text-white font-bold text-lg md:text-xl flex items-center justify-center ${
                    profileExpertView
                      ? 'bg-blue-600 shadow-[0_12px_24px_-16px_rgba(37,99,235,0.85)]'
                      : 'bg-blue-600 shadow-[0_12px_24px_-16px_rgba(37,99,235,0.85)]'
                  }`}
                >
                  {profileInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-lg md:text-xl font-bold truncate ${profileExpertView ? 'text-slate-900' : 'text-slate-900'}`}>
                    {profileFullName}
                  </p>
                  <p className={`text-sm truncate ${profileExpertView ? 'text-slate-600' : 'text-slate-600'}`}>
                    {user.email || 'Email non disponible'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
                        profileExpertView
                          ? 'border border-slate-200 bg-white/90 text-slate-700'
                          : 'border border-slate-200 bg-white/90 text-slate-700'
                      }`}
                    >
                      <UserCircle2 size={12} />
                      Compte personnel
                    </span>
                    {user.isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
                        <ShieldCheck size={12} />
                        Administrateur
                      </span>
                    )}
                    {profileLoading && (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                        Synchronisation...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className={`px-3 py-2.5 ${profileExpertView ? 'glass-surface' : 'glass-surface'}`}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Prénom</p>
                  <p className={`mt-1 text-sm font-semibold truncate ${profileExpertView ? 'text-slate-900' : 'text-slate-900'}`}>{user.firstName || '-'}</p>
                </div>
                <div className={`px-3 py-2.5 ${profileExpertView ? 'glass-surface' : 'glass-surface'}`}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Nom</p>
                  <p className={`mt-1 text-sm font-semibold truncate ${profileExpertView ? 'text-slate-900' : 'text-slate-900'}`}>{user.lastName || '-'}</p>
                </div>
              </div>

              {profileError && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertCircle size={13} />
                  {profileError}
                </p>
              )}
            </div>
          </article>

          <article
            className={`p-3.5 md:p-6 ${
              profileExpertView ? 'glass-panel' : 'glass-panel'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Actions rapides</p>
              <span className="text-[11px] text-slate-400">Profil</span>
            </div>

            <div className="mt-3 space-y-2.5">
              <button
                onClick={() => void copyToClipboard(user.email, 'email')}
                className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  profileExpertView
                    ? 'border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
                    : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Mail size={15} className="text-slate-500" />
                  Copier l'email
                </span>
                {copiedField === 'email' && (
                  <span className="mt-1 block text-xs font-medium text-blue-700">Copié dans le presse-papiers.</span>
                )}
              </button>

              {user.isAdmin && (
                <button
                  onClick={() => void loadAdminData()}
                className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm transition ${
                  profileExpertView
                    ? 'glass-surface text-slate-700 hover:bg-white/60'
                    : 'glass-surface text-slate-700 hover:bg-white/60'
                }`}
                >
                  <RefreshCw size={14} />
                  Actualiser les données admin
                </button>
              )}

              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Thème</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleThemeChange('classic')}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition ${
                      appTheme === 'classic'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Classique
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('responsable')}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition ${
                      appTheme === 'responsable'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Responsable
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`mt-4 px-3 py-2.5 ${
                profileExpertView
                  ? 'glass-surface'
                  : 'glass-surface'
              }`}
            >
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Sécurité</p>
              <p className={`mt-1 text-xs leading-relaxed ${profileExpertView ? 'text-slate-600' : 'text-slate-600'}`}>
                Les réinitialisations et modifications de mot de passe sont gérées par l’administrateur.
              </p>
            </div>
          </article>
        </div>

        {profileExpertView && (
          <section
            className={`p-3.5 md:p-5 ${
              profileExpertView ? 'glass-panel' : 'glass-panel'
            }`}
          >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={`text-sm md:text-base font-semibold ${profileExpertView ? 'text-slate-900' : 'text-slate-900'}`}>Mes engagements mensuels</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Vue détaillée par devise. Aucun total global n'est mélangé entre devises.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/groups"
                className={`inline-flex rounded-lg border px-2.5 py-1.5 text-xs ${
                  profileExpertView
                    ? 'border-slate-200 bg-white/80 text-slate-700 hover:bg-white'
                    : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-white'
                }`}
              >
                Voir mes groupes
              </Link>
            </div>
          </div>

          {groupsLoading ? (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="h-20 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-20 rounded-xl bg-slate-100 animate-pulse" />
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className={`px-3 py-2.5 ${profileExpertView ? 'glass-surface' : 'glass-surface'}`}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Cotisations récurrentes</p>
                  <p className={`mt-1 text-lg font-bold ${profileExpertView ? 'text-slate-900' : 'text-slate-900'}`}>{engagementSummary.recurringCount}</p>
                </div>
                <div className={`px-3 py-2.5 ${profileExpertView ? 'glass-surface' : 'glass-surface'}`}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Échéances ponctuelles</p>
                  <p className={`mt-1 text-lg font-bold ${profileExpertView ? 'text-slate-900' : 'text-slate-900'}`}>{engagementSummary.oneShotCount}</p>
                </div>
                <div className={`px-3 py-2.5 ${profileExpertView ? 'glass-surface' : 'glass-surface'}`}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Devises actives</p>
                  <p className={`mt-1 text-lg font-bold ${profileExpertView ? 'text-slate-900' : 'text-slate-900'}`}>
                    {engagementSummary.recurringRows.length + engagementSummary.oneShotRows.length}
                  </p>
                </div>
              </div>

              {profileExpertView ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Mensualisé (par devise)</p>
                      <div className="space-y-1.5">
                        {engagementSummary.recurringRows.length === 0 ? (
                          <p className="text-sm text-slate-600">Aucune cotisation récurrente active.</p>
                        ) : (
                          engagementSummary.recurringRows.map((row) => (
                            <div key={row.currency} className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">{row.currency}</span>
                              <span className="font-semibold text-slate-900">{row.amount.toFixed(2)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Ponctuel (par devise)</p>
                      <div className="space-y-1.5">
                        {engagementSummary.oneShotRows.length === 0 ? (
                          <p className="text-sm text-slate-600">Aucune cotisation ponctuelle active.</p>
                        ) : (
                          engagementSummary.oneShotRows.map((row) => (
                            <div key={row.currency} className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">{row.currency}</span>
                              <span className="font-semibold text-slate-900">{row.amount.toFixed(2)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {engagementSummary.oneShotDetails.length > 0 && (
                    <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-sky-700 mb-2">Prochaines échéances ponctuelles</p>
                      <div className="space-y-1.5">
                        {engagementSummary.oneShotDetails.map((item) => (
                          <div key={item.id} className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-sky-500/30 bg-white px-2.5 py-2 text-sm">
                            <span className="text-slate-900">
                              {item.name} <span className="text-slate-500">({item.groupName})</span>
                            </span>
                            <span className="font-semibold text-sky-700">
                              {item.amount.toFixed(2)} {item.currency}
                              {item.deadline ? ` • ${new Date(item.deadline).toLocaleDateString('fr-FR')}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Visualisation experte</p>
                      <span className="text-[11px] text-slate-500">Répartition + projection 6 mois</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5 md:p-3">
                        <p className="text-xs font-semibold text-slate-900">Répartition des engagements par devise</p>
                        <div className="mt-3 flex items-center gap-3">
                          <div
                            className="h-28 w-28 rounded-full border-4 border-white shadow-inner"
                            style={{ background: expertCharts.donutGradient }}
                          />
                          <div className="space-y-1.5 text-xs">
                            {expertCharts.slices.length === 0 ? (
                              <p className="text-slate-500">Aucune donnée.</p>
                            ) : (
                              expertCharts.slices.map((slice) => (
                                <div key={slice.currency} className="flex items-center gap-2">
                                  <span
                                    className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/35"
                                    style={{ backgroundColor: slice.color }}
                                  />
                                  <span className="text-slate-700">
                                    {slice.currency}: <span className="font-semibold">{slice.percentage.toFixed(1)}%</span>
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900">Projection des paiements attendus</p>
                          <div className="flex flex-wrap gap-1">
                            {expertCharts.availableCurrencies.map((currency) => (
                              <button
                                key={currency}
                                type="button"
                                onClick={() => setSelectedChartCurrency(currency)}
                                className={`rounded-md border px-2 py-1 text-[11px] ${
                                  expertCharts.currentCurrency === currency
                                    ? 'border-sky-300 bg-sky-50 text-sky-700'
                                    : 'border-slate-300 bg-white text-slate-700'
                                }`}
                              >
                                {currency}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3">
                          {expertCharts.availableCurrencies.length === 0 ? (
                            <p className="text-sm text-slate-600">Aucune donnée de projection.</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="chart-tooltip rounded-lg px-2.5 py-1.5 text-[11px]">
                                <span className="chart-tooltip-label">Devise active: </span>
                                <span className="font-semibold text-slate-100">{expertCharts.currentCurrency}</span>
                              </div>
                              <svg viewBox="0 0 100 36" className="w-full h-28 md:h-32">
                                {(() => {
                                  const chartPoints = expertCharts.linePoints.map((p) => ({
                                    x: p.x,
                                    y: Math.max(2, Math.min(34, (p.y / 100) * 30 + 2)),
                                  }));
                                  const lossRaw = expertCharts.monthLabels.map((point, index) => {
                                    if (index === 0) return 0;
                                    const previous = expertCharts.monthLabels[index - 1]?.amount ?? 0;
                                    return Math.max(0, previous - point.amount);
                                  });
                                  const lossMax = Math.max(...lossRaw, 1);
                                  const lossChartPoints = lossRaw.map((value, index) => {
                                    const x = chartPoints[index]?.x ?? 0;
                                    const y = 34 - (value / lossMax) * 30;
                                    return { x, y: Math.max(2, Math.min(34, y)) };
                                  });
                                  const linePath = buildSmoothPath(chartPoints);
                                  const lossLinePath = buildSmoothPath(lossChartPoints);
                                  const areaPath =
                                    chartPoints.length > 1
                                      ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} 34 L ${chartPoints[0].x} 34 Z`
                                      : '';
                                  const lossAreaPath =
                                    lossChartPoints.length > 1
                                      ? `${lossLinePath} L ${lossChartPoints[lossChartPoints.length - 1].x} 34 L ${lossChartPoints[0].x} 34 Z`
                                      : '';

                                  return (
                                    <>
                                      <defs>
                                        <linearGradient id="salesAreaFill" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                                          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="lossAreaFill" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
                                          <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                                        </linearGradient>
                                      </defs>
                                      {areaPath && <path d={areaPath} fill="url(#salesAreaFill)" />}
                                      {lossAreaPath && <path d={lossAreaPath} fill="url(#lossAreaFill)" />}
                                      <path d={lossLinePath} fill="none" stroke="#EF4444" strokeWidth="1.4" strokeLinecap="round" />
                                      <path d={linePath} fill="none" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" />
                                    </>
                                  );
                                })()}
                                <polyline fill="none" className="chart-grid" strokeWidth="0.45" points="0,8 100,8" />
                                <polyline fill="none" className="chart-grid" strokeWidth="0.45" points="0,16 100,16" />
                                <polyline fill="none" className="chart-grid" strokeWidth="0.45" points="0,24 100,24" />
                                <polyline
                                  fill="none"
                                  className="chart-axis"
                                  strokeWidth="0.6"
                                  points="0,34 100,34"
                                />
                                {expertCharts.linePoints.map((point) => (
                                  <circle
                                    key={point.label}
                                    cx={point.x}
                                    cy={Math.max(2, Math.min(34, (point.y / 100) * 30 + 2))}
                                    r="1.3"
                                    fill="#10B981"
                                  />
                                ))}
                              </svg>
                              <div className="grid grid-cols-6 gap-1 text-[10px] chart-axis">
                                {expertCharts.monthLabels.map((point) => (
                                  <div key={point.label} className="text-center">
                                    {point.label}
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                                  Montants prévus
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                                  Baisse mensuelle
                                </span>
                              </div>
                              <div className="text-xs text-slate-600">
                                Pic mensuel: <span className="font-semibold">{expertCharts.lineMax.toFixed(2)} {expertCharts.currentCurrency}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="glass-surface px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Récurrentes</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{engagementSummary.recurringCount}</p>
                    <p className="text-xs text-slate-600">cotisation(s) active(s)</p>
                  </div>
                  <div className="glass-surface px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Ponctuelles</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{engagementSummary.oneShotCount}</p>
                    <p className="text-xs text-slate-600">échéance(s) en cours</p>
                  </div>
                  <div className="glass-surface px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Devises</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {engagementSummary.recurringRows.length + engagementSummary.oneShotRows.length}
                    </p>
                    <p className="text-xs text-slate-600">actives</p>
                  </div>
                </div>
              )}
            </div>
          )}
          </section>
        )}

        {user.isAdmin && (
          <section className="space-y-4">
            <div
              className={`rounded-2xl p-4 md:p-5 ${
                profileExpertView
                  ? 'glass-panel'
                  : 'border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 shadow-[0_22px_45px_-28px_rgba(15,23,42,0.75)]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={`text-sm md:text-base font-semibold ${profileExpertView ? 'text-slate-900' : 'text-white'}`}>Panneau administrateur</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] ${profileExpertView ? 'border border-slate-200 bg-white text-slate-700' : 'border border-white/25 bg-white/10'}`}>
                  Gestion des accès
                </span>
              </div>
              <p className={`mt-1 text-xs ${profileExpertView ? 'text-slate-600' : 'text-slate-200'}`}>
                Gère les demandes de mot de passe oublié et les comptes utilisateurs.
              </p>

              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className={`rounded-xl px-3 py-2.5 ${profileExpertView ? 'bg-slate-50 text-slate-900 border border-slate-200' : 'bg-white/10 border border-white/15'}`}>
                  <p className={`text-[10px] uppercase tracking-wide ${profileExpertView ? 'text-slate-500' : 'text-slate-200'}`}>Comptes</p>
                  <p className={`mt-1 text-lg font-bold ${profileExpertView ? 'text-slate-900' : ''}`}>{adminStats.totalAccounts}</p>
                </div>
                <div className={`rounded-xl px-3 py-2.5 ${profileExpertView ? 'bg-slate-50 text-slate-900 border border-slate-200' : 'bg-white/10 border border-white/15'}`}>
                  <p className={`text-[10px] uppercase tracking-wide ${profileExpertView ? 'text-slate-500' : 'text-slate-200'}`}>Admins</p>
                  <p className={`mt-1 text-lg font-bold ${profileExpertView ? 'text-slate-900' : ''}`}>{adminStats.adminAccounts}</p>
                </div>
                <div className={`rounded-xl px-3 py-2.5 ${profileExpertView ? 'bg-slate-50 text-slate-900 border border-slate-200' : 'bg-white/10 border border-white/15'}`}>
                  <p className={`text-[10px] uppercase tracking-wide ${profileExpertView ? 'text-slate-500' : 'text-slate-200'}`}>Utilisateurs</p>
                  <p className={`mt-1 text-lg font-bold ${profileExpertView ? 'text-slate-900' : ''}`}>{adminStats.memberAccounts}</p>
                </div>
                <div className={`rounded-xl px-3 py-2.5 ${profileExpertView ? 'bg-slate-50 text-slate-900 border border-slate-200' : 'bg-white/10 border border-white/15'}`}>
                  <p className={`text-[10px] uppercase tracking-wide ${profileExpertView ? 'text-slate-500' : 'text-slate-200'}`}>Demandes en attente</p>
                  <p className={`mt-1 text-lg font-bold ${profileExpertView ? 'text-slate-900' : ''}`}>{adminStats.pendingRequests}</p>
                </div>
              </div>
            </div>

            {adminError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {adminError}
              </div>
            )}
            {adminSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {adminSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-4">
              <div className={`p-4 ${profileExpertView ? 'glass-panel' : 'glass-panel'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${profileExpertView ? 'text-slate-900' : 'text-slate-900'}`}>Demandes en attente</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      profileExpertView
                        ? 'border border-blue-200 bg-blue-50 text-blue-700'
                        : 'border border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                  >
                    {passwordResetRequests.length}
                  </span>
                </div>

                {loadingAdminData ? (
                  <div className="mt-3 space-y-2">
                    <div className={`h-16 rounded-lg animate-pulse ${profileExpertView ? 'bg-slate-100' : 'bg-slate-100'}`} />
                    <div className={`h-16 rounded-lg animate-pulse ${profileExpertView ? 'bg-slate-100' : 'bg-slate-100'}`} />
                  </div>
                ) : passwordResetRequests.length === 0 ? (
                  <div
                    className={`mt-3 px-3 py-4 text-sm ${
                      profileExpertView
                        ? 'glass-surface text-slate-500'
                        : 'glass-surface text-slate-500'
                    }`}
                  >
                    Aucune demande en attente.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    {passwordResetRequests.map((request) => {
                      const isSelected = selectedRequestId === request.id;
                      return (
                        <article
                          key={request.id}
                          className={`rounded-xl border px-3 py-3 transition ${
                            isSelected
                              ? profileExpertView
                                ? 'border-blue-300 bg-blue-50/70 shadow-[0_10px_20px_-18px_rgba(37,99,235,0.8)]'
                                : 'border-blue-300 bg-blue-50/70 shadow-[0_10px_20px_-18px_rgba(37,99,235,0.8)]'
                              : profileExpertView
                                ? 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${profileExpertView ? 'text-slate-900' : 'text-slate-900'}`}>{request.user.email}</p>
                              <p className={`text-[11px] ${profileExpertView ? 'text-slate-500' : 'text-slate-500'}`}>{formatDateTime(request.createdAt)}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                isSelected
                                  ? profileExpertView
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-600 text-white'
                                  : profileExpertView
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isSelected ? 'Sélectionnée' : 'En attente'}
                            </span>
                          </div>

                          {request.note && (
                            <p className={`mt-2 text-xs leading-relaxed ${profileExpertView ? 'text-slate-600' : 'text-slate-600'}`}>
                              {request.note}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserId(request.userId);
                                setSelectedRequestId(request.id);
                              }}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs ${
                                profileExpertView
                                  ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <CheckCircle2 size={12} />
                              Traiter
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRejectRequest(request.id)}
                              disabled={rejectingRequestId === request.id}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs disabled:opacity-60 ${
                                profileExpertView
                                  ? 'border border-red-200 bg-white text-red-700 hover:bg-red-50'
                                  : 'border border-red-200 bg-white text-red-700 hover:bg-red-50'
                              }`}
                            >
                              <XCircle size={12} />
                              {rejectingRequestId === request.id ? 'Refus...' : 'Refuser'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              {profileExpertView && (
                <form
                  onSubmit={handleAdminReset}
                  className="p-4 space-y-3 glass-panel"
                >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-semibold ${profileExpertView ? 'text-slate-900' : 'text-slate-900'}`}>Réinitialisation manuelle</p>
                    <p className={`text-xs mt-0.5 ${profileExpertView ? 'text-slate-500' : 'text-slate-500'}`}>
                      Sans fournisseur d'e-mail, le mot de passe est défini directement par un administrateur.
                    </p>
                  </div>
                  <KeyRound size={16} className="text-slate-400 mt-0.5" />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wide text-slate-500">Rechercher un compte</label>
                  <div className="relative mt-1">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={accountSearch}
                      onChange={(event) => setAccountSearch(event.target.value)}
                      placeholder="Email ou nom"
                      className="glass-input w-full rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wide text-slate-500">Utilisateur</label>
                  <select
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingAdminData}
                  >
                    {filteredAccounts.length === 0 && <option value="">Aucun résultat</option>}
                    {filteredAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.email} {account.isAdmin ? '(admin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAccount && (
                  <div className={`glass-surface px-3 py-2 text-xs ${profileExpertView ? 'text-slate-700' : 'text-slate-700'}`}>
                    <p className={`font-semibold ${profileExpertView ? 'text-slate-900' : 'text-slate-900'}`}>{selectedAccount.name}</p>
                    <p>{selectedAccount.email}</p>
                    <p>Créé le {new Date(selectedAccount.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}

                {selectedRequest && (
                  <p className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700">
                    <AlertCircle size={13} />
                    Demande liée: {selectedRequest.user.email} ({formatDateTime(selectedRequest.createdAt)})
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Nouveau mot de passe"
                    className="glass-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirmer le mot de passe"
                    className="glass-input rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || loadingAdminData || !selectedUserId}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <KeyRound size={14} />
                  {submitting ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                </button>
                </form>
              )}
            </div>
          </section>
        )}

      </section>
    </AppShell>
  );
}
