import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
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
import { authService } from '@/services/auth.service';
import { usersService, type AdminUserAccount } from '@/services/users.service';
import type { PasswordResetRequest } from '@/types';

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
      <section className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
          <article className="relative overflow-hidden glass-panel-strong p-4 md:p-6 bg-gradient-to-br from-white/65 via-slate-50/50 to-blue-100/40">
            <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-blue-100/70 blur-2xl" />
            <div className="relative">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-blue-600 text-white font-bold text-lg md:text-xl flex items-center justify-center shadow-[0_12px_24px_-16px_rgba(37,99,235,0.85)]">
                  {profileInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg md:text-xl font-bold text-slate-900 truncate">{profileFullName}</p>
                  <p className="text-sm text-slate-600 truncate">{user.email || 'Email non disponible'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-700">
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
                <div className="glass-surface px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Prénom</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{user.firstName || '-'}</p>
                </div>
                <div className="glass-surface px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Nom</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{user.lastName || '-'}</p>
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

          <article className="glass-panel p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Actions rapides</p>
              <span className="text-[11px] text-slate-400">Profil</span>
            </div>

            <div className="mt-3 space-y-2.5">
              <button
                onClick={() => void copyToClipboard(user.email, 'email')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 transition"
              >
                <span className="inline-flex items-center gap-2">
                  <Mail size={15} className="text-slate-500" />
                  Copier l'email
                </span>
                {copiedField === 'email' && (
                  <span className="mt-1 block text-xs font-medium text-emerald-700">Copié dans le presse-papiers.</span>
                )}
              </button>

              {user.isAdmin && (
                <button
                  onClick={() => void loadAdminData()}
                  className="glass-surface w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-white/60 transition"
                >
                  <RefreshCw size={14} />
                  Actualiser les données admin
                </button>
              )}
            </div>

            <div className="glass-surface mt-4 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Sécurité</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Les réinitialisations et modification de mot de passe sont gérées par l'administrateur.
              </p>
            </div>
          </article>
        </div>

        {user.isAdmin && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 p-4 md:p-5 text-white shadow-[0_22px_45px_-28px_rgba(15,23,42,0.75)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm md:text-base font-semibold">Panneau administrateur</p>
                <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[11px]">
                  Gestion des accès
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-200">
                Gère les demandes de mot de passe oublié et les comptes utilisateurs.
              </p>

              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-200">Comptes</p>
                  <p className="mt-1 text-lg font-bold">{adminStats.totalAccounts}</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-200">Admins</p>
                  <p className="mt-1 text-lg font-bold">{adminStats.adminAccounts}</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-200">Utilisateurs</p>
                  <p className="mt-1 text-lg font-bold">{adminStats.memberAccounts}</p>
                </div>
                <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-slate-200">Demandes en attente</p>
                  <p className="mt-1 text-lg font-bold">{adminStats.pendingRequests}</p>
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
              <div className="glass-panel p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">Demandes en attente</p>
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    {passwordResetRequests.length}
                  </span>
                </div>

                {loadingAdminData ? (
                  <div className="mt-3 space-y-2">
                    <div className="h-16 rounded-lg bg-slate-100 animate-pulse" />
                    <div className="h-16 rounded-lg bg-slate-100 animate-pulse" />
                  </div>
                ) : passwordResetRequests.length === 0 ? (
                  <div className="glass-surface mt-3 px-3 py-4 text-sm text-slate-500">
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
                              ? 'border-blue-300 bg-blue-50/70 shadow-[0_10px_20px_-18px_rgba(37,99,235,0.8)]'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{request.user.email}</p>
                              <p className="text-[11px] text-slate-500">{formatDateTime(request.createdAt)}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isSelected ? 'Sélectionnée' : 'En attente'}
                            </span>
                          </div>

                          {request.note && <p className="mt-2 text-xs text-slate-600 leading-relaxed">{request.note}</p>}

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserId(request.userId);
                                setSelectedRequestId(request.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
                            >
                              <CheckCircle2 size={12} />
                              Traiter
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRejectRequest(request.id)}
                              disabled={rejectingRequestId === request.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
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

              <form onSubmit={handleAdminReset} className="glass-panel p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Réinitialisation manuelle</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sans fournisseur email: le mot de passe est défini directement par un administrateur.
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
                  <div className="glass-surface px-3 py-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">{selectedAccount.name}</p>
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
            </div>
          </section>
        )}

      </section>
    </AppShell>
  );
}
