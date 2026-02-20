import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import FirstUseGuide from '@/components/shared/FirstUseGuide';
import ViewSwitcher from '@/components/shared/ViewSwitcher';
import { groupsService } from '@/services/groups.service';
import { dashboardService } from '@/services/dashboard.service';
import { contributionsService } from '@/services/contributions.service';
import type { Group, GroupInvitation, GroupMember, MemberStartMode } from '@/types';
import { isManager } from '@/lib/group';
import { getApiErrorMessage } from '@/lib/api-error';
import { trackEvent } from '@/lib/analytics';

interface GroupDetailPageProps {
  onLoggedOut: () => void;
}

type PersonalStatus = 'A_JOUR' | 'RETARD' | 'AVANCE';

interface ContributionHealth {
  id: string;
  name: string;
  currency: string;
  expectedTotal: number;
  collectedTotal: number;
  deficit: number;
  pendingPayments: number;
  completionRate: number;
}

interface MemberHealth {
  userId: string;
  name: string;
  email: string;
  balance: number;
  status: PersonalStatus;
}

interface GroupResume {
  personalBalance: number;
  personalStatus: PersonalStatus;
  membersOnTime: number;
  membersLate: number;
  membersAhead: number;
  membersStatusAvailable: boolean;
  expectedTotal: number;
  collectedTotal: number;
  pendingPayments: number;
  contributionsHealth: ContributionHealth[];
  membersHealth: MemberHealth[];
}

function getRoleLabel(role: GroupMember['role'] | GroupInvitation['role']): string {
  return role === 'MANAGER' ? 'Gestionnaire' : 'Membre';
}

function getMemberDisplayName(member: GroupMember['user']): string {
  const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
  return fullName || member.name || 'Membre';
}

function getStatusFromBalance(balance: number): PersonalStatus {
  if (balance < 0) return 'RETARD';
  if (balance > 0) return 'AVANCE';
  return 'A_JOUR';
}

function getFrequencyLabel(frequency: 'MONTHLY' | 'QUARTERLY' | 'DELAY'): string {
  if (frequency === 'QUARTERLY') return 'Trimestre';
  if (frequency === 'DELAY') return 'Délai';
  return 'Mois';
}

function defaultResume(): GroupResume {
  return {
    personalBalance: 0,
    personalStatus: 'A_JOUR',
    membersOnTime: 0,
    membersLate: 0,
    membersAhead: 0,
    membersStatusAvailable: false,
    expectedTotal: 0,
    collectedTotal: 0,
    pendingPayments: 0,
    contributionsHealth: [],
    membersHealth: [],
  };
}

export default function GroupDetailPage({ onLoggedOut }: GroupDetailPageProps) {
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}') as { id?: string };
    } catch {
      return {};
    }
  }, []);
  const [group, setGroup] = useState<Group | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<GroupInvitation[]>([]);
  const [simpleView, setSimpleView] = useState(true);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [membersListOpen, setMembersListOpen] = useState(false);
  const [visibleMembersCount, setVisibleMembersCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resume, setResume] = useState<GroupResume>(defaultResume);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState('');

  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<GroupMember['role']>('MEMBER');
  const [memberFeedback, setMemberFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [memberPanelOpen, setMemberPanelOpen] = useState(false);
  const [contributionPanelOpen, setContributionPanelOpen] = useState(false);
  const [contributionName, setContributionName] = useState('');
  const [contributionDescription, setContributionDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionCurrency, setContributionCurrency] = useState('USD');
  const [contributionFrequency, setContributionFrequency] = useState<'MONTHLY' | 'QUARTERLY' | 'DELAY'>('MONTHLY');
  const [contributionDuration, setContributionDuration] = useState<string>('NONE');
  const [contributionDeadlineDate, setContributionDeadlineDate] = useState('');
  const [contributionFirstPeriodDate, setContributionFirstPeriodDate] = useState('');
  const [contributionDueDay, setContributionDueDay] = useState(5);
  const [contributionSubmitting, setContributionSubmitting] = useState(false);
  const [contributionFeedback, setContributionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [contributionInviteScope, setContributionInviteScope] = useState<'ALL' | 'SELECTED'>('ALL');
  const [contributionInvitedUserIds, setContributionInvitedUserIds] = useState<string[]>([]);
  const [contributionInvitationStartMode, setContributionInvitationStartMode] = useState<MemberStartMode>('NEXT_PERIOD');
  const [contributionInviteTargetId, setContributionInviteTargetId] = useState<string | null>(null);
  const [contributionInviteUserIds, setContributionInviteUserIds] = useState<string[]>([]);
  const [contributionInviteStartMode, setContributionInviteStartMode] = useState<MemberStartMode>('NEXT_PERIOD');
  const [contributionInviteSubmitting, setContributionInviteSubmitting] = useState(false);
  const [contributionInviteFeedback, setContributionInviteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const managerView = group ? isManager(group, user.id) : false;
  const displayedMembers = (group?.members ?? []).slice(0, visibleMembersCount);
  const personalSituation = useMemo(() => {
    const amount = Math.abs(resume.personalBalance).toFixed(2);
    if (resume.personalStatus === 'RETARD') {
      return {
        label: `Retard de ${amount}`,
        hint: 'Tu dois régulariser ton solde sur les cotisations actives.',
        className: 'text-red-700',
      };
    }
    if (resume.personalStatus === 'AVANCE') {
      return {
        label: `En avance de ${amount}`,
        hint: 'Ton avance couvre les prochaines périodes à venir.',
        className: 'text-emerald-700',
      };
    }
    return {
      label: 'À jour',
      hint: 'Aucun montant en retard actuellement.',
      className: 'text-slate-900',
    };
  }, [resume.personalBalance, resume.personalStatus]);
  const totals = useMemo(() => {
    const contributionCount = group?.contributions?.length ?? 0;
    const membersCount = group?.members?.length ?? 0;
    const monthlyTarget = (group?.contributions ?? []).reduce(
      (sum, contribution) => sum + Number(contribution.amount) * membersCount,
      0,
    );
    return { contributionCount, membersCount, monthlyTarget };
  }, [group]);
  const groupMemberOptions = useMemo(
    () =>
      (group?.members ?? []).map((member) => ({
        id: member.user.id,
        label: getMemberDisplayName(member.user),
      })),
    [group],
  );

  const loadGroupResume = useCallback(
    async (targetGroup: Group) => {
      if (!user.id) return;

      setResumeLoading(true);
      setResumeError('');

      try {
        const memberDashboard = await dashboardService.getMemberDashboard(targetGroup.id);
        const personalBalance = memberDashboard.contributions.reduce(
          (sum, contribution) => sum + Number(contribution.balance?.balance ?? 0),
          0,
        );
        const personalStatus = getStatusFromBalance(personalBalance);

        const fallbackExpected = memberDashboard.contributions.reduce(
          (sum, contribution) => sum + Number(contribution.balance?.expected ?? 0),
          0,
        );
        const fallbackCollected = memberDashboard.contributions.reduce(
          (sum, contribution) => sum + Number(contribution.balance?.paid ?? 0),
          0,
        );

        try {
          const managerDashboard = await dashboardService.getManagerDashboard(targetGroup.id);
          const expectedTotal = managerDashboard.contributionsStats.reduce(
            (sum, contribution) => sum + Number(contribution.expectedTotal ?? 0),
            0,
          );
          const collectedTotal = managerDashboard.contributionsStats.reduce(
            (sum, contribution) => sum + Number(contribution.collectedTotal ?? 0),
            0,
          );
          const pendingPayments = managerDashboard.contributionsStats.reduce(
            (sum, contribution) => sum + Number(contribution.pendingPayments ?? 0),
            0,
          );

          const contributionsHealth: ContributionHealth[] = managerDashboard.contributionsStats.map((contribution) => {
            const expected = Number(contribution.expectedTotal ?? 0);
            const collected = Number(contribution.collectedTotal ?? 0);
            const completionRate = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
            return {
              id: contribution.id,
              name: contribution.name,
              currency: contribution.currency,
              expectedTotal: expected,
              collectedTotal: collected,
              deficit: Number(contribution.deficit ?? 0),
              pendingPayments: Number(contribution.pendingPayments ?? 0),
              completionRate,
            };
          });

          const aggregatedMemberBalances = new Map<string, number>();
          const memberLookup = new Map<string, { name: string; email: string }>();
          managerDashboard.contributionsStats.forEach((contribution) => {
            contribution.members.forEach((member) => {
              const current = aggregatedMemberBalances.get(member.user.id) ?? 0;
              aggregatedMemberBalances.set(member.user.id, current + Number(member.balance?.balance ?? 0));
              if (!memberLookup.has(member.user.id)) {
                memberLookup.set(member.user.id, {
                  name: member.user.name,
                  email: member.user.email,
                });
              }
            });
          });

          const membersHealth: MemberHealth[] = Array.from(aggregatedMemberBalances.entries())
            .map(([userId, balance]) => {
              const details = memberLookup.get(userId);
              return {
                userId,
                name: details?.name || 'Membre',
                email: details?.email || '',
                balance,
                status: getStatusFromBalance(balance),
              };
            })
            .sort((a, b) => a.balance - b.balance);

          let membersOnTime = 0;
          let membersLate = 0;
          let membersAhead = 0;
          membersHealth.forEach((member) => {
            const balance = member.balance;
            if (balance < 0) membersLate += 1;
            else if (balance > 0) membersAhead += 1;
            else membersOnTime += 1;
          });

          setResume({
            personalBalance,
            personalStatus,
            membersOnTime,
            membersLate,
            membersAhead,
            membersStatusAvailable: true,
            expectedTotal,
            collectedTotal,
            pendingPayments,
            contributionsHealth,
            membersHealth,
          });
        } catch {
          const personalContributionsHealth: ContributionHealth[] = memberDashboard.contributions.map((contribution) => {
            const expected = Number(contribution.balance?.expected ?? 0);
            const collected = Number(contribution.balance?.paid ?? 0);
            const completionRate = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : 0;
            return {
              id: contribution.id,
              name: contribution.name,
              currency: contribution.currency,
              expectedTotal: expected,
              collectedTotal: collected,
              deficit: expected - collected,
              pendingPayments: 0,
              completionRate,
            };
          });

          setResume({
            personalBalance,
            personalStatus,
            membersOnTime: 0,
            membersLate: 0,
            membersAhead: 0,
            membersStatusAvailable: false,
            expectedTotal: fallbackExpected,
            collectedTotal: fallbackCollected,
            pendingPayments: 0,
            contributionsHealth: personalContributionsHealth,
            membersHealth: [],
          });
        }
      } catch {
        setResume(defaultResume());
        setResumeError('Résumé indisponible pour le moment.');
      } finally {
        setResumeLoading(false);
      }
    },
    [user.id],
  );

  const loadGroup = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError('');
    try {
      const data = await groupsService.getGroupById(groupId);
      setGroup(data);
      await loadGroupResume(data);
      if (isManager(data, user.id)) {
        const invitations = await groupsService.listPendingInvitations(groupId);
        setPendingInvitations(invitations);
      } else {
        setPendingInvitations([]);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger le groupe'));
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [groupId, loadGroupResume, user.id]);

  useEffect(() => {
    void loadGroup();
  }, [loadGroup]);

  if (!groupId) {
    return <Navigate to="/groups" replace />;
  }

  if (!loading && !group) {
    return <Navigate to="/groups" replace />;
  }

  const handleInviteMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!group) return;
    setMemberFeedback(null);
    try {
      await groupsService.createInvitation(group.id, {
        email: memberEmail.trim(),
        role: memberRole,
      });
      trackEvent('group_invitation_sent', { role: memberRole });
      setMemberEmail('');
      await loadGroup();
      setMemberFeedback({ type: 'success', message: 'Invitation envoyée. Le membre doit accepter pour rejoindre le groupe.' });
    } catch (err: unknown) {
      trackEvent('group_invitation_failed', { role: memberRole });
      setMemberFeedback({ type: 'error', message: getApiErrorMessage(err, "Impossible d'envoyer l'invitation") });
    }
  };

  const handleCreateContribution = async (event: FormEvent) => {
    event.preventDefault();
    if (!group) return;

    setContributionFeedback(null);

    const name = contributionName.trim();
    const amount = Number(contributionAmount);
    const dueDay = Number(contributionDueDay);
    const currency = contributionCurrency.trim().toUpperCase();
    const durationPeriods =
      contributionDuration === 'NONE' ? undefined : Number(contributionDuration);

    if (!name) {
      setContributionFeedback({ type: 'error', message: 'Le nom de la cotisation est requis.' });
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setContributionFeedback({ type: 'error', message: 'Le montant doit être supérieur à 0.' });
      return;
    }
    if (!currency) {
      setContributionFeedback({ type: 'error', message: 'La devise est requise.' });
      return;
    }
    if (contributionFrequency === 'DELAY') {
      if (!contributionDeadlineDate) {
        setContributionFeedback({ type: 'error', message: 'La date limite est requise pour la fréquence délai.' });
        return;
      }
    } else {
      if (Number.isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
        setContributionFeedback({ type: 'error', message: "Le jour d'échéance doit être entre 1 et 31." });
        return;
      }
      if (durationPeriods !== undefined && (Number.isNaN(durationPeriods) || durationPeriods < 1)) {
        setContributionFeedback({ type: 'error', message: 'La durée doit être supérieure à 0.' });
        return;
      }
    }
    if (contributionInviteScope === 'SELECTED' && contributionInvitedUserIds.length === 0) {
      setContributionFeedback({ type: 'error', message: 'Sélectionne au moins un membre à inviter.' });
      return;
    }

    setContributionSubmitting(true);
    try {
      await contributionsService.createContribution(group.id, {
        name,
        description: contributionDescription.trim() || undefined,
        amount,
        currency,
        frequency: contributionFrequency,
        dueDay: contributionFrequency === 'DELAY' ? undefined : dueDay,
        deadlineDate: contributionFrequency === 'DELAY' ? contributionDeadlineDate : undefined,
        firstPeriodDate: contributionFrequency === 'DELAY' ? undefined : contributionFirstPeriodDate || undefined,
        durationPeriods: contributionFrequency === 'DELAY' ? undefined : durationPeriods,
        inviteScope: contributionInviteScope,
        invitedUserIds: contributionInviteScope === 'SELECTED' ? contributionInvitedUserIds : undefined,
        invitationStartMode: contributionInvitationStartMode,
      });
      trackEvent('contribution_create_success', {
        frequency: contributionFrequency,
        inviteScope: contributionInviteScope,
      });

      setContributionName('');
      setContributionDescription('');
      setContributionAmount('');
      setContributionFrequency('MONTHLY');
      setContributionDuration('NONE');
      setContributionDeadlineDate('');
      setContributionFirstPeriodDate('');
      setContributionInviteScope('ALL');
      setContributionInvitedUserIds([]);
      setContributionInvitationStartMode('NEXT_PERIOD');
      setContributionFeedback({ type: 'success', message: 'Cotisation créée avec succès.' });
      await loadGroup();
    } catch (err: unknown) {
      trackEvent('contribution_create_failed', {
        frequency: contributionFrequency,
        inviteScope: contributionInviteScope,
      });
      setContributionFeedback({
        type: 'error',
        message: getApiErrorMessage(err, 'Impossible de créer la cotisation.'),
      });
    } finally {
      setContributionSubmitting(false);
    }
  };

  const toggleContributionInviteUser = (memberUserId: string) => {
    setContributionInviteUserIds((prev) =>
      prev.includes(memberUserId) ? prev.filter((id) => id !== memberUserId) : [...prev, memberUserId],
    );
  };

  const handleToggleContributionInvitePanel = (targetContributionId: string) => {
    setContributionInviteFeedback(null);
    if (contributionInviteTargetId === targetContributionId) {
      setContributionInviteTargetId(null);
      setContributionInviteUserIds([]);
      return;
    }

    setContributionInviteTargetId(targetContributionId);
    setContributionInviteUserIds([]);
    setContributionInviteStartMode('NEXT_PERIOD');
  };

  const handleInviteContributionMembers = async (event: FormEvent, targetContributionId: string) => {
    event.preventDefault();
    setContributionInviteFeedback(null);

    if (contributionInviteUserIds.length === 0) {
      setContributionInviteFeedback({ type: 'error', message: 'Sélectionne au moins un membre.' });
      return;
    }

    setContributionInviteSubmitting(true);
    try {
      const result = await contributionsService.inviteMembers(targetContributionId, {
        userIds: contributionInviteUserIds,
        startMode: contributionInviteStartMode,
      });
      trackEvent('contribution_invitation_sent', {
        selectedCount: contributionInviteUserIds.length,
        startMode: contributionInviteStartMode,
      });

      const details: string[] = [];
      if (result.created > 0) {
        details.push(`${result.created} invitation(s) envoyée(s)`);
      }
      if (result.skippedAlreadyMembers > 0) {
        details.push(`${result.skippedAlreadyMembers} déjà participant(s)`);
      }
      if (result.skippedPending > 0) {
        details.push(`${result.skippedPending} déjà en attente`);
      }

      setContributionInviteFeedback({
        type: result.created > 0 ? 'success' : 'error',
        message:
          details.length > 0
            ? `${details.join(' • ')}.`
            : "Aucune invitation envoyée.",
      });
      setContributionInviteUserIds([]);
    } catch (err: unknown) {
      trackEvent('contribution_invitation_failed', {
        selectedCount: contributionInviteUserIds.length,
        startMode: contributionInviteStartMode,
      });
      setContributionInviteFeedback({
        type: 'error',
        message: getApiErrorMessage(err, "Impossible d'envoyer les invitations."),
      });
    } finally {
      setContributionInviteSubmitting(false);
    }
  };

  return (
    <AppShell
      title={group?.name || 'Groupe'}
      subtitle={group?.description || 'Détails du groupe'}
      onLoggedOut={onLoggedOut}
    >
      <div
        className={`group-detail-page space-y-3 md:space-y-6 ${
          simpleView ? '' : 'detail-theme detail-theme-bg rounded-3xl p-3 md:p-5'
        }`}
      >
        <FirstUseGuide
          pageKey="group-detail"
          title="Détail groupe: ton centre de pilotage"
          description="Commence par “Votre situation”, puis vérifie le statut global des membres et les cotisations actives."
          bullets={[
            'Gestionnaire: tu peux inviter des membres et créer des cotisations.',
            'Membre: tu suis ton statut et tes obligations de paiement.',
            'La vue détaillée affiche la santé financière complète du groupe.',
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/groups" className="text-xs md:text-sm text-blue-600 hover:text-blue-700">
            ← Retour aux groupes
          </Link>
          <div className="flex items-center gap-2">
            <ViewSwitcher simpleView={simpleView} onToggle={() => setSimpleView((prev) => !prev)} />
            <span
              className={`px-3 py-1 text-xs rounded-full ${
                managerView ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {managerView ? 'Vue gestionnaire' : 'Vue membre'}
            </span>
          </div>
        </div>

        {searchParams.get('created') === '1' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Groupe créé avec succès.
          </div>
        )}
        {searchParams.get('invited') === '1' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Invitation acceptée. Tu as bien rejoint le groupe.
          </div>
        )}
        {searchParams.get('contributionInvited') === '1' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Participation à la cotisation confirmée.
          </div>
        )}

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {resumeError && <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{resumeError}</div>}
        {loading && <div className="glass-surface px-3 py-2 text-sm text-slate-600">Chargement...</div>}

        {!loading && group && (
          <section className="glass-panel-strong p-3.5 md:p-4 bg-gradient-to-r from-white/60 via-slate-50/50 to-blue-100/40">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Votre situation</p>
            <p className={`mt-1 text-xl md:text-2xl font-bold ${personalSituation.className}`}>{personalSituation.label}</p>
            <p className="text-xs text-slate-600 mt-1">{personalSituation.hint}</p>
          </section>
        )}

        {!loading && group && simpleView && resumeLoading && (
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="glass-panel p-4 animate-pulse">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-7 w-32 bg-slate-200 rounded mt-3" />
              </div>
            ))}
          </section>
        )}

        {!loading && group && simpleView && !resumeLoading && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-4">
              <div className="glass-panel p-3.5 md:p-4">
                <p className="text-xs uppercase text-slate-500">Statut global membres</p>
                {resume.membersStatusAvailable ? (
                  <div className="space-y-1 mt-1 text-sm">
                    <p className="text-slate-900 font-semibold">À jour: {resume.membersOnTime}</p>
                    <p className="text-red-700 font-semibold">En retard: {resume.membersLate}</p>
                    <p className="text-emerald-700 font-semibold">En avance: {resume.membersAhead}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">Disponible en vue gestionnaire</p>
              )}
            </div>
            <div className="glass-panel p-3.5 md:p-4">
              <p className="text-xs uppercase text-slate-500">Collecté / Attendu</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {resume.collectedTotal.toFixed(2)} / {resume.expectedTotal.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Objectif mensuel estimé: {totals.monthlyTarget.toFixed(2)}</p>
            </div>
            <div className="glass-panel p-3.5 md:p-4">
              <p className="text-xs uppercase text-slate-500">Suivi rapide</p>
              <p className="text-sm text-slate-700 mt-1">Membres actifs: {totals.membersCount}</p>
              <p className="text-sm text-slate-700">Cotisations actives: {totals.contributionCount}</p>
              <p className="text-sm text-slate-700">Paiements en attente: {resume.pendingPayments}</p>
            </div>
          </section>
        )}

        {!loading && group && !simpleView && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 md:gap-4">
              <div className="glass-panel p-3.5 md:p-4">
                <p className="text-xs uppercase text-slate-500">Membres</p>
                <p className="text-2xl font-bold text-slate-900">{totals.membersCount}</p>
              </div>
              <div className="glass-panel p-3.5 md:p-4">
                <p className="text-xs uppercase text-slate-500">Cotisations</p>
                <p className="text-2xl font-bold text-slate-900">{totals.contributionCount}</p>
              </div>
              <div className="glass-panel p-3.5 md:p-4">
                <p className="text-xs uppercase text-slate-500">Attendu total</p>
                <p className="text-xl font-bold text-slate-900">{resume.expectedTotal.toFixed(2)}</p>
              </div>
              <div className="glass-panel p-3.5 md:p-4">
                <p className="text-xs uppercase text-slate-500">Collecté total</p>
                <p className="text-xl font-bold text-emerald-700">{resume.collectedTotal.toFixed(2)}</p>
              </div>
              <div className="glass-panel p-3.5 md:p-4">
                <p className="text-xs uppercase text-slate-500">Écart global</p>
                <p className={`text-xl font-bold ${resume.collectedTotal - resume.expectedTotal < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {(resume.collectedTotal - resume.expectedTotal).toFixed(2)}
                </p>
              </div>
              <div className="glass-panel p-3.5 md:p-4">
                <p className="text-xs uppercase text-slate-500">Paiements / invitations en attente</p>
                <p className="text-xl font-bold text-amber-700">{resume.pendingPayments} / {pendingInvitations.length}</p>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="glass-panel p-5 xl:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-slate-900">Santé financière des cotisations</h2>
                  <span className="text-xs text-slate-500">{resume.contributionsHealth.length} cotisation(s)</span>
                </div>
                <div className="space-y-3">
                  {resume.contributionsHealth.length === 0 ? (
                    <p className="text-sm text-slate-600">Aucune donnée financière détaillée pour le moment.</p>
                  ) : (
                    resume.contributionsHealth.map((item) => (
                      <div key={item.id} className="rounded-xl border p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              Collecté {item.collectedTotal.toFixed(2)} / Attendu {item.expectedTotal.toFixed(2)} {item.currency}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${item.deficit > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                              {item.deficit > 0 ? `Déficit ${item.deficit.toFixed(2)}` : `Excédent ${Math.abs(item.deficit).toFixed(2)}`}
                            </p>
                            <p className="text-xs text-slate-500">En attente: {item.pendingPayments}</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full ${item.completionRate >= 100 ? 'bg-emerald-500' : item.completionRate >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.max(4, item.completionRate)}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">Taux de couverture: {item.completionRate}%</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-panel p-5">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Distribution des membres</h2>
                {resume.membersStatusAvailable ? (
                  <div className="space-y-2">
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <p className="text-slate-500">À jour</p>
                      <p className="font-semibold text-slate-900">{resume.membersOnTime}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-sm">
                      <p className="text-red-500">En retard</p>
                      <p className="font-semibold text-red-700">{resume.membersLate}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                      <p className="text-emerald-500">En avance</p>
                      <p className="font-semibold text-emerald-700">{resume.membersAhead}</p>
                    </div>

                    <div className="pt-3 border-t mt-3">
                      <p className="text-xs uppercase text-slate-500 mb-2">Membres les plus en retard</p>
                      <div className="space-y-1.5">
                        {resume.membersHealth.filter((member) => member.status === 'RETARD').slice(0, 5).map((member) => (
                          <div key={member.userId} className="rounded-lg border px-2.5 py-2">
                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs font-semibold text-red-700 mt-1">{member.balance.toFixed(2)}</p>
                          </div>
                        ))}
                        {resume.membersHealth.filter((member) => member.status === 'RETARD').length === 0 && (
                          <p className="text-sm text-slate-600">Aucun membre en retard.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Cette analyse détaillée est visible en mode gestionnaire.</p>
                )}
              </div>
            </section>

            <section className="glass-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Cotisations</h2>
              </div>
              <div className="space-y-3">
                {(group.contributions ?? []).map((contribution) => (
                  <div key={contribution.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{contribution.name}</h3>
                        <p className="text-sm text-slate-600">
                          Fréquence: {getFrequencyLabel(contribution.frequency)}
                          {contribution.frequency === 'DELAY'
                            ? contribution.deadlineDate
                              ? ` • Délai: ${new Date(contribution.deadlineDate).toLocaleDateString('fr-FR')}`
                              : ''
                            : ` • Échéance: jour ${contribution.dueDay}`}
                          {contribution.durationPeriods ? ` • Durée: ${contribution.durationPeriods} période(s)` : ' • Durée: aucune'}
                          {` • Montant: ${Number(contribution.amount)} ${contribution.currency}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {managerView && (
                          <button
                            type="button"
                            onClick={() => handleToggleContributionInvitePanel(contribution.id)}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          >
                            {contributionInviteTargetId === contribution.id ? 'Masquer invitation' : 'Inviter membres'}
                          </button>
                        )}
                        <Link
                          to={`/contributions/${contribution.id}`}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Ouvrir
                        </Link>
                      </div>
                    </div>

                    {managerView && contributionInviteTargetId === contribution.id && (
                      <form
                        onSubmit={(event) => handleInviteContributionMembers(event, contribution.id)}
                        className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 space-y-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-500">Début participation</label>
                            <select
                              value={contributionInviteStartMode}
                              onChange={(event) => setContributionInviteStartMode(event.target.value as MemberStartMode)}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="CURRENT_PERIOD">Immédiat</option>
                              <option value="NEXT_PERIOD">Prochaine période</option>
                              <option value="CATCH_UP">Rattrapage</option>
                            </select>
                          </div>
                          <div className="self-end text-xs text-slate-600">
                            {contributionInviteUserIds.length} membre(s) sélectionné(s)
                          </div>
                        </div>

                        <div className="glass-surface max-h-40 overflow-y-auto px-2.5 py-2 space-y-1.5">
                          {groupMemberOptions.map((member) => (
                            <label key={member.id} className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={contributionInviteUserIds.includes(member.id)}
                                onChange={() => toggleContributionInviteUser(member.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{member.label}</span>
                            </label>
                          ))}
                        </div>

                        <button
                          type="submit"
                          disabled={contributionInviteSubmitting}
                          className="w-full rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {contributionInviteSubmitting ? 'Envoi...' : 'Envoyer les invitations'}
                        </button>

                        {contributionInviteFeedback && (
                          <p
                            className={`rounded-lg px-2.5 py-2 text-xs ${
                              contributionInviteFeedback.type === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {contributionInviteFeedback.message}
                          </p>
                        )}
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-panel p-5">
                <button
                  onClick={() => setMembersListOpen((prev) => !prev)}
                  className="w-full mb-3 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Membres</h2>
                    <p className="text-xs text-slate-500">
                      {membersListOpen
                        ? `${displayedMembers.length} affiché(s) sur ${group.members.length}`
                        : `${group.members.length} membre(s)`}
                    </p>
                  </div>
                  <span className="text-sm text-slate-600">
                    {membersListOpen ? '▲' : '▼'}
                  </span>
                </button>

                {membersListOpen && (
                  <div className="space-y-2">
                    {displayedMembers.map((member) => (
                      <div key={member.id} className="border rounded-lg text-sm overflow-hidden">
                        <button
                          onClick={() =>
                            setExpandedMemberId((prev) => (prev === member.id ? null : member.id))
                          }
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{getMemberDisplayName(member.user)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${member.role === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                              {getRoleLabel(member.role)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {expandedMemberId === member.id ? '▲' : '▼'}
                            </span>
                          </div>
                        </button>
                        {expandedMemberId === member.id && (
                          <div className="border-t bg-slate-50 px-3 py-2.5 text-xs text-slate-700 space-y-1">
                            <p>
                              <span className="font-medium">Nom complet:</span> {getMemberDisplayName(member.user)}
                            </p>
                            <p>
                              <span className="font-medium">Rôle:</span> {getRoleLabel(member.role)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}

                    {group.members.length > visibleMembersCount && (
                      <div className="pt-1 flex gap-2">
                        <button
                          onClick={() =>
                            setVisibleMembersCount((prev) =>
                              Math.min(prev + 10, group.members.length),
                            )
                          }
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          Voir 10 de plus
                        </button>
                        <button
                          onClick={() => setVisibleMembersCount(group.members.length)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          Tout afficher
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="glass-panel p-5">
                {managerView && (
                  <div className="mb-4 glass-surface p-4 bg-gradient-to-b from-blue-50/55 to-white/45">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Créer une cotisation</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Nom, description, montant, devise, fréquence et durée.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setContributionPanelOpen((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                      >
                        {contributionPanelOpen ? 'Masquer' : 'Ouvrir'}
                      </button>
                    </div>

                    {contributionPanelOpen && (
                      <form onSubmit={handleCreateContribution} className="mt-3 space-y-3">
                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-slate-500">Nom</label>
                          <input
                            type="text"
                            value={contributionName}
                            onChange={(event) => setContributionName(event.target.value)}
                            placeholder="Ex: Caisse urgence"
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-slate-500">Description</label>
                          <input
                            type="text"
                            value={contributionDescription}
                            onChange={(event) => setContributionDescription(event.target.value)}
                            placeholder="Optionnel"
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-500">Montant</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={contributionAmount}
                              onChange={(event) => setContributionAmount(event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-500">Devise</label>
                            <input
                              type="text"
                              value={contributionCurrency}
                              onChange={(event) => setContributionCurrency(event.target.value)}
                              placeholder="USD"
                              maxLength={6}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-500">Fréquence</label>
                            <select
                              value={contributionFrequency}
                              onChange={(event) => setContributionFrequency(event.target.value as 'MONTHLY' | 'QUARTERLY' | 'DELAY')}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="MONTHLY">Mois</option>
                              <option value="QUARTERLY">Trimestre</option>
                              <option value="DELAY">Délai</option>
                            </select>
                          </div>
                          {contributionFrequency !== 'DELAY' && (
                            <div>
                              <label className="text-[11px] uppercase tracking-wide text-slate-500">Durée</label>
                              <select
                                value={contributionDuration}
                                onChange={(event) => setContributionDuration(event.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="NONE">Aucune</option>
                                <option value="3">3 périodes</option>
                                <option value="6">6 périodes</option>
                                <option value="12">12 périodes</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {contributionFrequency === 'DELAY' ? (
                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-500">Date limite</label>
                            <input
                              type="date"
                              value={contributionDeadlineDate}
                              onChange={(event) => setContributionDeadlineDate(event.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] uppercase tracking-wide text-slate-500">Échéance (jour)</label>
                              <input
                                type="number"
                                min={1}
                                max={31}
                                value={contributionDueDay}
                                onChange={(event) => setContributionDueDay(Number(event.target.value))}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[11px] uppercase tracking-wide text-slate-500">Début 1ère période</label>
                              <input
                                type="date"
                                value={contributionFirstPeriodDate}
                                onChange={(event) => setContributionFirstPeriodDate(event.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-500">Invitations</label>
                            <select
                              value={contributionInviteScope}
                              onChange={(event) => setContributionInviteScope(event.target.value as 'ALL' | 'SELECTED')}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="ALL">Tous les membres</option>
                              <option value="SELECTED">Membres sélectionnés</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-500">Début participation</label>
                            <select
                              value={contributionInvitationStartMode}
                              onChange={(event) => setContributionInvitationStartMode(event.target.value as MemberStartMode)}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="CURRENT_PERIOD">Immédiat</option>
                              <option value="NEXT_PERIOD">Prochaine période</option>
                              <option value="CATCH_UP">Rattrapage</option>
                            </select>
                          </div>
                        </div>

                        {contributionInviteScope === 'SELECTED' && (
                          <div className="glass-surface p-2.5">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Membres à inviter</p>
                              <span className="text-[11px] text-slate-500">{contributionInvitedUserIds.length} sélectionné(s)</span>
                            </div>
                            {groupMemberOptions.length === 0 ? (
                              <p className="text-xs text-slate-500">Aucun membre disponible.</p>
                            ) : (
                              <div className="max-h-36 overflow-y-auto space-y-1.5">
                                {groupMemberOptions.map((member) => (
                                  <label key={member.id} className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={contributionInvitedUserIds.includes(member.id)}
                                      onChange={() =>
                                        setContributionInvitedUserIds((prev) =>
                                          prev.includes(member.id) ? prev.filter((id) => id !== member.id) : [...prev, member.id],
                                        )
                                      }
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{member.label}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={contributionSubmitting}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
                        >
                          {contributionSubmitting ? 'Création...' : 'Créer la cotisation'}
                        </button>

                        {contributionFeedback && (
                          <p
                            className={`rounded-lg px-2.5 py-2 text-xs ${
                              contributionFeedback.type === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {contributionFeedback.message}
                          </p>
                        )}
                      </form>
                    )}
                  </div>
                )}

                {managerView && (
                  <div className="mb-4 glass-surface p-4 bg-gradient-to-b from-slate-50/55 to-white/45">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Inviter un membre</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Le membre recevra une invitation et devra l'accepter avant d'intégrer le groupe.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMemberPanelOpen((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                      >
                        {memberPanelOpen ? 'Masquer' : 'Ouvrir'}
                      </button>
                    </div>

                    {memberPanelOpen && (
                      <form onSubmit={handleInviteMember} className="mt-3 space-y-3">
                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-slate-500">Email du membre</label>
                          <input
                            type="email"
                            value={memberEmail}
                            onChange={(event) => setMemberEmail(event.target.value)}
                            placeholder="ex: membre@email.com"
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <div>
                            <label className="text-[11px] uppercase tracking-wide text-slate-500">Rôle</label>
                            <select
                              value={memberRole}
                              onChange={(event) => setMemberRole(event.target.value as GroupMember['role'])}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="MEMBER">Membre</option>
                              <option value="MANAGER">Gestionnaire</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-sm"
                        >
                          Envoyer l'invitation
                        </button>

                        {memberFeedback && (
                          <p
                            className={`rounded-lg px-2.5 py-2 text-xs ${
                              memberFeedback.type === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {memberFeedback.message}
                          </p>
                        )}
                      </form>
                    )}
                  </div>
                )}

                {managerView && (
                  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-900">Invitations en attente</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{pendingInvitations.length}</span>
                    </div>
                    {pendingInvitations.length === 0 ? (
                      <p className="text-xs text-slate-600">Aucune invitation en attente.</p>
                    ) : (
                      <div className="space-y-2">
                        {pendingInvitations.map((invitation) => (
                          <div key={invitation.id} className="glass-surface px-2.5 py-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-slate-900 truncate">{invitation.email}</p>
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px]">EN ATTENTE</span>
                            </div>
                            <p className="text-slate-600 mt-1">{getRoleLabel(invitation.role)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
