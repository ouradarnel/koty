import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Bell,
  BookOpen,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import type {
  ContributionInvitation,
  GroupInvitation,
  MemberPaymentUpdateNotification,
  ManagerPaymentNotification,
  PasswordResetRequest,
} from '@/types';
import { contributionsService } from '@/services/contributions.service';
import { groupsService } from '@/services/groups.service';
import { usersService } from '@/services/users.service';
import { paymentsService } from '@/services/payments.service';
import { APP_NOTIFICATIONS_REFRESH_EVENT } from '@/lib/notifications';
import InvitationPopover from '@/components/shared/InvitationPopover';
import LogoKoty from '@/assets/logo-koty-icon.webp';

interface AppShellProps {
  title: string;
  subtitle?: string;
  onLoggedOut: () => void;
  children: ReactNode;
}

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, exact: true },
  { label: 'Mes groupes', to: '/groups', icon: Users },
  { label: 'Guide', to: '/guide', icon: BookOpen, exact: true },
  { label: 'Profil', to: '/profile', icon: User, exact: true },
];

const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS;

export default function AppShell({ title, subtitle, onLoggedOut, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [pendingInvitations, setPendingInvitations] = useState<GroupInvitation[]>([]);
  const [pendingContributionInvitations, setPendingContributionInvitations] = useState<ContributionInvitation[]>([]);
  const [pendingResetRequests, setPendingResetRequests] = useState<PasswordResetRequest[]>([]);
  const [pendingManagerPaymentActions, setPendingManagerPaymentActions] = useState<ManagerPaymentNotification[]>([]);
  const [memberPaymentUpdates, setMemberPaymentUpdates] = useState<MemberPaymentUpdateNotification[]>([]);
  const [invitationOpen, setInvitationOpen] = useState(false);
  const [invitationError, setInvitationError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored
        ? (JSON.parse(stored) as { id?: string; name?: string; email?: string; isAdmin?: boolean })
        : { id: '', name: 'Utilisateur', email: 'session@locale.com', isAdmin: false };
    } catch {
      return { id: '', name: 'Utilisateur', email: 'session@locale.com', isAdmin: false };
    }
  }, []);

  const pendingInvitationsCount = pendingInvitations.length;
  const pendingContributionInvitationsCount = pendingContributionInvitations.length;
  const pendingGroupRelatedCount = pendingInvitationsCount + pendingContributionInvitationsCount;
  const pendingManagerPaymentActionsCount = pendingManagerPaymentActions.length;
  const memberPaymentUpdatesCount = memberPaymentUpdates.length;
  const pendingResetRequestsCount = user.isAdmin ? pendingResetRequests.length : 0;
  const pendingGroupsActionCount =
    pendingGroupRelatedCount + pendingManagerPaymentActionsCount + memberPaymentUpdatesCount;
  const notificationCount = pendingGroupsActionCount + pendingResetRequestsCount;
  const memberUpdatesSeenAtKey = user.id ? `member-payment-updates-seen-at:${user.id}` : '';

  const handleLogout = async () => {
    await authService.logout();
    onLoggedOut();
    navigate('/login');
  };

  const isActive = (item: NavItem) => {
    if (item.exact) return location.pathname === item.to;
    if (item.to === '/groups') {
      return location.pathname === '/groups' || /^\/groups\/(?!new$)[^/]+$/.test(location.pathname);
    }
    return location.pathname.startsWith(item.to);
  };

  const isNewGroupActive = location.pathname === '/groups/new';

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  }, [collapsed]);

  const loadPendingInvitations = useCallback(async () => {
    try {
      const invitations = await groupsService.listMyPendingInvitations();
      setPendingInvitations(invitations);
    } catch {
      setPendingInvitations([]);
    }
  }, []);

  const loadPendingContributionInvitations = useCallback(async () => {
    try {
      const invitations = await contributionsService.listMyPendingInvitations();
      setPendingContributionInvitations(invitations);
    } catch {
      setPendingContributionInvitations([]);
    }
  }, []);

  const loadPendingResetRequests = useCallback(async () => {
    if (!user.isAdmin) {
      setPendingResetRequests([]);
      return;
    }

    try {
      const requests = await usersService.listPendingPasswordResetRequests();
      setPendingResetRequests(requests);
    } catch {
      setPendingResetRequests([]);
    }
  }, [user.isAdmin]);

  const loadPendingManagerPaymentActions = useCallback(async () => {
    try {
      const notifications = await paymentsService.listManagerPendingNotifications();
      setPendingManagerPaymentActions(notifications);
    } catch {
      setPendingManagerPaymentActions([]);
    }
  }, []);

  const loadMemberPaymentUpdates = useCallback(async () => {
    if (!memberUpdatesSeenAtKey) {
      setMemberPaymentUpdates([]);
      return;
    }

    try {
      const seenAt = localStorage.getItem(memberUpdatesSeenAtKey) || undefined;
      const updates = await paymentsService.listMyPaymentUpdates(seenAt);
      setMemberPaymentUpdates(updates);
    } catch {
      setMemberPaymentUpdates([]);
    }
  }, [memberUpdatesSeenAtKey]);

  const refreshNotifications = useCallback(() => {
    void loadPendingInvitations();
    void loadPendingContributionInvitations();
    void loadPendingResetRequests();
    void loadPendingManagerPaymentActions();
    void loadMemberPaymentUpdates();
  }, [
    loadPendingContributionInvitations,
    loadPendingInvitations,
    loadPendingManagerPaymentActions,
    loadPendingResetRequests,
    loadMemberPaymentUpdates,
  ]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    refreshNotifications();

    const intervalId = window.setInterval(() => {
      refreshNotifications();
    }, 60000);

    const onRefresh = () => {
      refreshNotifications();
    };

    window.addEventListener(APP_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    window.addEventListener('focus', onRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(APP_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [refreshNotifications, location.pathname]);

  useEffect(() => {
    if (notificationCount > 0) {
      setInvitationOpen(true);
    } else {
      setInvitationOpen(false);
    }
  }, [notificationCount]);

  const handleAcceptInvitation = async (invitation: GroupInvitation) => {
    try {
      if (!invitation.token) throw new Error('Token d’invitation manquant');
      await groupsService.acceptInvitation(invitation.token);
      setInvitationError('');
      await loadPendingInvitations();
      navigate(`/groups/${invitation.groupId}?invited=1`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Impossible d'accepter l'invitation";
      setInvitationError(message);
    }
  };

  const handleDeclineInvitation = async (invitation: GroupInvitation) => {
    try {
      await groupsService.declineInvitation(invitation.id);
      setInvitationError('');
      await loadPendingInvitations();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Impossible de refuser l'invitation";
      setInvitationError(message);
    }
  };

  const handleAcceptContributionInvitation = async (invitation: ContributionInvitation) => {
    try {
      if (!invitation.token) throw new Error('Token d’invitation manquant');
      await contributionsService.acceptInvitation(invitation.token);
      setInvitationError('');
      await loadPendingContributionInvitations();
      if (invitation.groupId) {
        navigate(`/groups/${invitation.groupId}?contributionInvited=1`);
      } else {
        navigate('/groups');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Impossible d'accepter l'invitation";
      setInvitationError(message);
    }
  };

  const handleDeclineContributionInvitation = async (invitation: ContributionInvitation) => {
    try {
      await contributionsService.declineInvitation(invitation.id);
      setInvitationError('');
      await loadPendingContributionInvitations();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Impossible de refuser l'invitation";
      setInvitationError(message);
    }
  };

  const markMemberPaymentUpdatesAsRead = () => {
    if (!memberUpdatesSeenAtKey) return;
    localStorage.setItem(memberUpdatesSeenAtKey, new Date().toISOString());
    setMemberPaymentUpdates([]);
  };

  const handleOpenManagerPaymentAction = (contributionId: string) => {
    setInvitationOpen(false);
    navigate(`/contributions/${contributionId}?pending=1`);
  };

  const handleOpenMemberPaymentUpdate = (contributionId: string) => {
    markMemberPaymentUpdatesAsRead();
    setInvitationOpen(false);
    navigate(`/contributions/${contributionId}?updates=1`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-white/45 backdrop-blur-2xl border border-white/40 rounded-b-2xl shadow-[0_10px_28px_-22px_rgba(15,23,42,0.5)] sticky top-0 z-40 px-2.5 py-1.5 flex items-center justify-between mx-1 mt-1">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 active:shadow-inner transition"
          aria-label="Ouvrir le menu"
        >
          <Menu size={18} />
        </button>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
          aria-label="Ouvrir la navigation"
        >
          <img src={LogoKoty} alt="Koty Logo" className="w-8 h-8 rounded-xl object-cover" />
          <span className="font-extrabold text-[13px] tracking-tight text-slate-900">
            Koty<span className="text-blue-600">.</span>
          </span>
        </button>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
          aria-label="Déconnexion"
        >
          <LogOut size={15} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-fit min-w-[148px] max-w-[160px] h-[calc(100%-0.5rem)] mt-1 ml-1 bg-white/70 backdrop-blur-2xl border border-slate-200/60 rounded-2xl shadow-[0_18px_45px_-24px_rgba(15,23,42,0.62)] flex flex-col animate-in slide-in-from-left duration-300 overflow-hidden">
            <div className="p-3 border-b border-slate-200/70 flex items-center justify-between bg-gradient-to-r from-white/35 to-slate-100/20">
              <div>
                <p className="font-semibold text-[12px] text-slate-900 truncate max-w-[82px]">{user.name}</p>
                <p className="text-[9px] text-slate-500 truncate max-w-[82px]">{user.email}</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fermer le menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    isActive(item)
                      ? 'bg-blue-600 text-white shadow-[0_10px_18px_-12px_rgba(37,99,235,0.8)] ring-1 ring-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-100/90'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <item.icon size={14} />
                    {item.label}
                  </span>
                  {item.to === '/groups' && pendingGroupsActionCount > 0 && (
                    <span className="inline-flex min-w-[14px] h-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] text-white">
                      {pendingGroupsActionCount > 9 ? '9+' : pendingGroupsActionCount}
                    </span>
                  )}
                  {item.to === '/profile' && pendingResetRequestsCount > 0 && (
                    <span className="inline-flex min-w-[14px] h-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] text-white">
                      {pendingResetRequestsCount > 9 ? '9+' : pendingResetRequestsCount}
                    </span>
                  )}
                </Link>
              ))}
              <Link
                to="/groups/new"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  isNewGroupActive
                    ? 'bg-blue-600 text-white shadow-[0_10px_18px_-12px_rgba(37,99,235,0.8)] ring-1 ring-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-100/90'
                }`}
              >
                + Nouveau groupe
              </Link>
            </nav>
            <div className="p-2 border-t border-slate-200/70 bg-white/35">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[12px] text-red-500 font-medium hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={14} />
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      <aside
        className={`hidden md:flex flex-col border border-slate-200/70 bg-white/55 backdrop-blur-xl shadow-[0_10px_40px_-32px_rgba(15,23,42,0.75)] sticky top-2 h-[calc(100vh-1rem)] rounded-2xl ml-2 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/60">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-2'}`}>
            <img
              src={LogoKoty}
              alt="Koty Logo"
              className={`${collapsed ? 'w-10 h-10' : 'w-8 h-8'} transition-all duration-300 hover:scale-110`}
            />
            {!collapsed && (
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                Koty<span className="text-blue-600">.</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg bg-white/65 text-slate-500 hover:text-blue-600 hover:bg-blue-50/80 transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-2">
          <Link
            to="/groups/new"
            className={`relative flex items-center ${collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2.5'} rounded-lg text-[15px] transition-all duration-200 ${
              isNewGroupActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
            }`}
            title="Créer un groupe"
          >
            <span className="shrink-0 text-base leading-none">+</span>
            {!collapsed && <span className="font-medium whitespace-nowrap">Nouveau groupe</span>}
          </Link>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive: navIsActive }) => `
                relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] transition-all duration-200 group
                ${
                  navIsActive || isActive(item)
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                }
              `}
            >
              <item.icon size={20} className="shrink-0" />
              {!collapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
              {item.to === '/groups' && pendingGroupsActionCount > 0 && (
                <span className="ml-auto inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] text-white">
                  {pendingGroupsActionCount > 9 ? '9+' : pendingGroupsActionCount}
                </span>
              )}
              {item.to === '/profile' && pendingResetRequestsCount > 0 && (
                <span className="ml-auto inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] text-white">
                  {pendingResetRequestsCount > 9 ? '9+' : pendingResetRequestsCount}
                </span>
              )}
              {collapsed && (
                <div className="absolute left-14 scale-0 group-hover:scale-100 bg-slate-800 text-white text-xs py-1 px-2 rounded-md transition-all z-50 origin-left">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200/60 bg-white/35">
          {!collapsed ? (
            <div className="mb-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <UserCircle size={24} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-4 text-blue-600">
              <UserCircle size={24} />
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-slate-200/70 bg-white/70 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50/80 transition-all ${collapsed ? 'px-0' : 'px-3'}`}
          >
            <LogOut size={18} />
            {!collapsed && <span className="text-sm font-medium">Quitter</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="px-4 py-5 md:px-10 md:py-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-slate-500 mt-1.5 md:mt-2 text-sm md:text-lg leading-relaxed">{subtitle}</p>}
        </header>
        <section className="px-3 md:px-10 pb-[max(env(safe-area-inset-bottom),4.5rem)] md:pb-12 flex-1">
          <div className="glass-panel-strong md:rounded-2xl p-4 md:p-6 min-h-[280px] md:min-h-[400px]">
            {children}
          </div>
        </section>
      </main>

      {notificationCount > 0 && (
        <div className="fixed right-2 bottom-16 md:bottom-4 z-50 flex flex-col items-end gap-2">
          {invitationOpen && (
            <>
              {pendingInvitationsCount > 0 && (
                <InvitationPopover
                  invitations={pendingInvitations}
                  onAccept={handleAcceptInvitation}
                  onDecline={handleDeclineInvitation}
                />
              )}
              {pendingContributionInvitationsCount > 0 && (
                <div className="w-72 bg-white/70 backdrop-blur-2xl shadow-2xl rounded-2xl border border-white/65 z-50 animate-in fade-in slide-in-from-left-2 overflow-hidden">
                  <div className="p-3 border-b border-white/60 bg-blue-50/45 flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Invitations cotisations</span>
                    <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {pendingContributionInvitationsCount}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {pendingContributionInvitations.map((invite) => (
                      <div key={invite.id} className="p-3 border-b border-white/60 last:border-none hover:bg-white/45 transition-colors">
                        <p className="text-sm font-semibold text-slate-800">{invite.contributionName || 'Cotisation'}</p>
                        <p className="text-xs text-slate-500 mb-2">{invite.groupName || 'Groupe'} • {invite.startMode === 'CATCH_UP' ? 'Rattrapage' : invite.startMode === 'CURRENT_PERIOD' ? 'Immédiat' : 'Prochaine période'}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptContributionInvitation(invite)}
                            className="flex-1 bg-blue-600 text-white py-1.5 rounded-md text-xs font-medium hover:bg-blue-700"
                          >
                            Accepter
                          </button>
                          <button
                            onClick={() => handleDeclineContributionInvitation(invite)}
                            className="px-2 py-1.5 border border-slate-200 text-slate-400 rounded-md hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            Refuser
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pendingManagerPaymentActionsCount > 0 && (
                <div className="w-72 bg-white/70 backdrop-blur-2xl shadow-2xl rounded-2xl border border-white/65 z-50 animate-in fade-in slide-in-from-left-2 overflow-hidden">
                  <div className="p-3 border-b border-white/60 bg-red-50/45 flex justify-between items-center">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Paiements à valider</span>
                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {pendingManagerPaymentActionsCount > 9 ? '9+' : pendingManagerPaymentActionsCount}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {pendingManagerPaymentActions.slice(0, 8).map((payment) => (
                      <div key={payment.id} className="p-3 border-b border-white/60 last:border-none hover:bg-white/45 transition-colors">
                        <p className="text-sm font-semibold text-slate-800">{payment.contribution.name}</p>
                        <p className="text-xs text-slate-500 mb-2">
                          {payment.user.name} • {payment.amount} {payment.contribution.currency}
                        </p>
                        <button
                          onClick={() => handleOpenManagerPaymentAction(payment.contributionId)}
                          className="w-full rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Traiter maintenant
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {memberPaymentUpdatesCount > 0 && (
                <div className="w-72 bg-white/70 backdrop-blur-2xl shadow-2xl rounded-2xl border border-white/65 z-50 animate-in fade-in slide-in-from-left-2 overflow-hidden">
                  <div className="p-3 border-b border-white/60 bg-emerald-50/45 flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Mises à jour paiements</span>
                    <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {memberPaymentUpdatesCount > 9 ? '9+' : memberPaymentUpdatesCount}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {memberPaymentUpdates.slice(0, 8).map((payment) => (
                      <div key={payment.id} className="p-3 border-b border-white/60 last:border-none hover:bg-white/45 transition-colors">
                        <p className="text-sm font-semibold text-slate-800">{payment.contribution.name}</p>
                        <p className="text-xs text-slate-500 mb-2">
                          {payment.status === 'APPROVED' ? 'Paiement approuvé' : 'Paiement refusé'} • {payment.amount}{' '}
                          {payment.contribution.currency}
                        </p>
                        <button
                          onClick={() => handleOpenMemberPaymentUpdate(payment.contributionId)}
                          className="w-full rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          Voir le détail
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-white/60">
                    <button
                      onClick={markMemberPaymentUpdatesAsRead}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Marquer comme lues
                    </button>
                  </div>
                </div>
              )}
              {user.isAdmin && pendingResetRequestsCount > 0 && (
                <div className="w-72 bg-white/70 backdrop-blur-2xl shadow-2xl rounded-2xl border border-white/65 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Demandes mot de passe</p>
                    <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {pendingResetRequestsCount > 9 ? '9+' : pendingResetRequestsCount}
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {pendingResetRequests.slice(0, 5).map((request) => (
                      <div key={request.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                        <p className="text-sm font-medium text-slate-900 truncate">{request.user.email}</p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(request.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setInvitationOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Traiter dans le profil admin
                  </button>
                </div>
              )}
              {invitationError && <p className="text-[11px] text-red-700 rounded-md bg-red-50 px-2 py-1">{invitationError}</p>}
            </>
          )}
          <button
            onClick={() => setInvitationOpen((prev) => !prev)}
            className="relative h-10 w-10 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition"
            aria-label="Voir les notifications"
            title="Voir les notifications"
          >
            <Bell size={16} className="mx-auto" />
            <span className="absolute -top-1 -right-1 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          </button>
        </div>
      )}

      <nav className="md:hidden fixed bottom-[max(env(safe-area-inset-bottom),0.625rem)] left-1/2 -translate-x-1/2 z-40 rounded-[26px] bg-white/18 backdrop-blur-3xl border border-white/30 shadow-[0_22px_50px_-30px_rgba(15,23,42,0.5)]">
        <div className="grid grid-cols-4 gap-1.5 px-2.5 py-2.5 min-w-[272px]">
          {MOBILE_NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center justify-center rounded-[18px] py-2.5 transition ${
                isActive(item)
                  ? 'text-blue-950 bg-white/40 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.22)]'
                  : 'text-slate-800 hover:bg-white/25'
              }`}
            >
              <item.icon size={22} />
              <span className="text-[12px] leading-none mt-0.5">{item.label.split(' ')[0]}</span>
              {item.to === '/groups' && pendingGroupsActionCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] text-white">
                  {pendingGroupsActionCount > 9 ? '9+' : pendingGroupsActionCount}
                </span>
              )}
              {item.to === '/profile' && pendingResetRequestsCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] text-white">
                  {pendingResetRequestsCount > 9 ? '9+' : pendingResetRequestsCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
