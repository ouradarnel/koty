import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import type { Balance, Group, Payment } from '@/types';
import AppShell from '@/components/AppShell';
import ViewSwitcher from '@/components/shared/ViewSwitcher';
import { contributionsService } from '@/services/contributions.service';
import { dashboardService } from '@/services/dashboard.service';
import { groupsService } from '@/services/groups.service';
import { paymentsService } from '@/services/payments.service';
import { isManager } from '@/lib/group';
import { getApiErrorMessage } from '@/lib/api-error';
import { emitToast } from '@/lib/toast';

interface ContributionDetailPageProps {
  onLoggedOut: () => void;
}

interface ContributionSummary {
  expectedTotal: number;
  collectedTotal: number;
  pendingPayments: number;
  membersNotUpToDate: number;
}

interface LocalContribution {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'DELAY';
  dueDay: number;
  deadlineDate?: string | null;
  periods?: Array<{
    id: string;
    month: number;
    year: number;
    amount: number;
  }>;
  members?: Array<{
    member: {
      user: {
        id: string;
        name: string;
        email: string;
      };
    };
  }>;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function statusClass(status: Payment['status']) {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'DECLARED') return 'bg-amber-100 text-amber-700';
  if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  return 'bg-indigo-100 text-indigo-700';
}

function statusLabel(status: Payment['status']) {
  if (status === 'APPROVED') return 'Approuvé';
  if (status === 'DECLARED') return 'Déclaré';
  if (status === 'REJECTED') return 'Refusé';
  return 'Direct';
}

function fallbackSummary(balance: Balance): ContributionSummary {
  return {
    expectedTotal: Number(balance.expected ?? 0),
    collectedTotal: Number(balance.paid ?? 0),
    pendingPayments: 0,
    membersNotUpToDate: 0,
  };
}

export default function ContributionDetailPage({ onLoggedOut }: ContributionDetailPageProps) {
  const { contributionId } = useParams<{ contributionId: string }>();
  const [searchParams] = useSearchParams();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}') as { id?: string; name?: string; email?: string };
    } catch {
      return {};
    }
  }, []);

  const [group, setGroup] = useState<Group | null>(null);
  const [contribution, setContribution] = useState<LocalContribution | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [myBalance, setMyBalance] = useState<Balance>({ expected: 0, paid: 0, balance: 0 });
  const [summary, setSummary] = useState<ContributionSummary>({
    expectedTotal: 0,
    collectedTotal: 0,
    pendingPayments: 0,
    membersNotUpToDate: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [simpleView, setSimpleView] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  const managerView = !!(group && user.id && isManager(group, user.id));

  const loadData = useCallback(async () => {
    if (!contributionId || !user.id) {
      setLoading(false);
      setError('Cotisation introuvable.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const contributionData = (await contributionsService.getContributionById(contributionId)) as unknown as LocalContribution;
      const groupData = await groupsService.getGroupById(contributionData.groupId);
      const localPaymentUserMap = new Map<string, { id: string; name: string; email: string }>();
      (contributionData.members ?? []).forEach((entry) => {
        if (entry.member?.user?.id) {
          localPaymentUserMap.set(entry.member.user.id, entry.member.user);
        }
      });
      localPaymentUserMap.set(user.id, {
        id: user.id,
        name: user.name || 'Utilisateur',
        email: user.email || '',
      });

      if (!groupData.members.some((member) => member.user.id === user.id)) {
        setError('Accès refusé à cette cotisation.');
        setLoading(false);
        return;
      }

      const memberDashboard = await dashboardService.getMemberDashboard(groupData.id);
      const memberContribution = memberDashboard.contributions.find((item) => item.id === contributionId);
      const balance = memberContribution?.balance ?? (await contributionsService.getBalance(contributionId, user.id));

      let nextSummary = fallbackSummary(balance);
      if (isManager(groupData, user.id)) {
        const managerDashboard = await dashboardService.getManagerDashboard(groupData.id);
        const contributionStats = managerDashboard.contributionsStats.find((item) => item.id === contributionId);
        if (contributionStats) {
          nextSummary = {
            expectedTotal: Number(contributionStats.expectedTotal ?? 0),
            collectedTotal: Number(contributionStats.collectedTotal ?? 0),
            pendingPayments: Number(contributionStats.pendingPayments ?? 0),
            membersNotUpToDate: contributionStats.members.filter((member) => Number(member.balance?.balance ?? 0) < 0).length,
          };
        }
      }

      let paymentList: Payment[] = [];
      if (isManager(groupData, user.id)) {
        const contributionMemberIds = Array.from(
          new Set((contributionData.members ?? []).map((entry) => entry.member?.user?.id).filter((id): id is string => !!id)),
        );

        const allPayments = await Promise.all(
          contributionMemberIds.map(async (memberId) => {
            const memberPayments = await paymentsService.listUserPayments(contributionId, memberId);
            return memberPayments.map((payment) => ({
              ...payment,
              user: localPaymentUserMap.get(payment.userId),
            }));
          }),
        );

        paymentList = allPayments.flat();
      } else {
        const mine = await paymentsService.listUserPayments(contributionId, user.id);
        paymentList = mine.map((payment) => ({
          ...payment,
          user: localPaymentUserMap.get(payment.userId),
        }));
      }

      paymentList.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

      setGroup(groupData);
      setContribution(contributionData);
      setMyBalance({
        expected: Number(balance.expected ?? 0),
        paid: Number(balance.paid ?? 0),
        balance: Number(balance.balance ?? 0),
      });
      setSummary(nextSummary);
      setPayments(paymentList);
      setAmount(String(contributionData.amount));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger cette cotisation.'));
    } finally {
      setLoading(false);
    }
  }, [contributionId, user.email, user.id, user.name]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get('pending') === '1' || searchParams.get('updates') === '1') {
      setSimpleView(false);
    }
  }, [searchParams]);

  const simplified = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentPotCollected = payments
      .filter((payment) => {
        const created = new Date(payment.createdAt);
        return (
          (payment.status === 'APPROVED' || payment.status === 'DIRECT') &&
          created.getMonth() === currentMonth &&
          created.getFullYear() === currentYear
        );
      })
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      currentPotCollected,
      membersNotUpToDate: summary.membersNotUpToDate,
      isUpToDate: myBalance.balance >= 0,
    };
  }, [myBalance.balance, payments, summary.membersNotUpToDate]);

  const pending = useMemo(() => payments.filter((payment) => payment.status === 'DECLARED'), [payments]);
  const mine = useMemo(() => payments.filter((payment) => payment.userId === user.id), [payments, user.id]);

  if (!contributionId || !user.id) {
    return <Navigate to="/groups" replace />;
  }

  if (!loading && (!contribution || !group || error)) {
    return (
      <AppShell title="Cotisation" subtitle="Détails" onLoggedOut={onLoggedOut}>
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error || 'Cotisation introuvable.'}
          </div>
          <Link to="/groups" className="inline-flex px-3 py-2 rounded-xl text-sm bg-blue-600 text-white hover:bg-blue-700">
            Retour aux groupes
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!contribution || !group) {
    return (
      <AppShell title="Cotisation" subtitle="Chargement" onLoggedOut={onLoggedOut}>
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-2xl bg-slate-100" />
          <div className="h-28 rounded-2xl bg-slate-100" />
        </div>
      </AppShell>
    );
  }

  const handleDeclare = async (event: FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      emitToast({ type: 'error', message: 'Montant invalide.' });
      return;
    }

    setSubmitting(true);
    try {
      await paymentsService.declarePayment(contribution.id, {
        amount: parsedAmount,
        note: note || undefined,
        proofUrl: proofUrl || undefined,
      });
      setNote('');
      setProofUrl('');
      emitToast({ type: 'success', message: 'Paiement déclaré.' });
      await loadData();
    } catch (err: unknown) {
      emitToast({ type: 'error', message: getApiErrorMessage(err, 'Impossible de déclarer le paiement.') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidatePayment = async (paymentId: string, approve: boolean) => {
    setSubmitting(true);
    try {
      await paymentsService.validatePayment(paymentId, approve);
      emitToast({ type: 'success', message: approve ? 'Paiement approuvé.' : 'Paiement refusé.' });
      await loadData();
    } catch (err: unknown) {
      emitToast({ type: 'error', message: getApiErrorMessage(err, 'Impossible de traiter ce paiement.') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title={contribution.name}
      subtitle={`${contribution.description || 'Cotisation'} • ${formatMoney(contribution.amount, contribution.currency)} • ${
        contribution.frequency === 'MONTHLY'
          ? `Mensuelle (jour ${contribution.dueDay})`
          : contribution.frequency === 'QUARTERLY'
            ? `Trimestrielle (jour ${contribution.dueDay})`
            : contribution.deadlineDate
              ? `Délai (${new Date(contribution.deadlineDate).toLocaleDateString('fr-FR')})`
              : 'Délai'
      }`}
      onLoggedOut={onLoggedOut}
    >
      <div className="space-y-4 md:space-y-6">
        {searchParams.get('pending') === '1' && pending.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Cette cotisation contient des paiements en attente de validation.
          </div>
        )}
        {searchParams.get('updates') === '1' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Des mises à jour de paiement ont été enregistrées sur cette cotisation.
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <Link to={`/groups/${group.id}`} className="text-sm text-blue-600 hover:text-blue-700">
            ← Retour au groupe
          </Link>
          <ViewSwitcher simpleView={simpleView} onToggle={() => setSimpleView((prev) => !prev)} />
        </div>

        {simpleView && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mon statut</p>
              <p className={`text-2xl font-bold mt-1 ${simplified.isUpToDate ? 'text-emerald-700' : 'text-red-700'}`}>
                {simplified.isUpToDate ? 'À jour' : 'En retard'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Membres pas à jour</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{simplified.membersNotUpToDate}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Cagnotte actuelle collectée</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {formatMoney(simplified.currentPotCollected, contribution.currency)}
              </p>
            </div>
          </section>
        )}

        {!simpleView && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Attendu</p>
                <p className="text-xl font-bold text-slate-900">{formatMoney(summary.expectedTotal, contribution.currency)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Collecté</p>
                <p className="text-xl font-bold text-emerald-700">{formatMoney(summary.collectedTotal, contribution.currency)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Mon solde</p>
                <p className={`text-xl font-bold ${myBalance.balance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {formatMoney(myBalance.balance, contribution.currency)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">En attente</p>
                <p className="text-xl font-bold text-slate-900">{summary.pendingPayments}</p>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Historique des paiements</h2>
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div key={payment.id} className="border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{payment.user?.name ?? 'Membre'}</p>
                          <p className="text-sm text-slate-600">{payment.note || 'Sans note'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatMoney(Number(payment.amount), contribution.currency)}</p>
                          <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs ${statusClass(payment.status)}`}>
                            {statusLabel(payment.status)}
                          </span>
                        </div>
                      </div>
                      {payment.proofUrl && (
                        <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 mt-2 inline-block">
                          Voir preuve
                        </a>
                      )}
                    </div>
                  ))}
                  {payments.length === 0 && <p className="text-sm text-slate-600">Aucun paiement enregistré.</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">Périodes</h2>
                  <div className="space-y-2 text-sm">
                    {(contribution.periods ?? []).map((period) => (
                      <div key={period.id} className="flex items-center justify-between border border-slate-200 rounded-xl p-2.5">
                        <span className="text-slate-700">
                          {String(period.month).padStart(2, '0')}/{period.year}
                        </span>
                        <span className="font-medium text-slate-900">{formatMoney(Number(period.amount), contribution.currency)}</span>
                      </div>
                    ))}
                    {(contribution.periods ?? []).length === 0 && (
                      <p className="text-sm text-slate-600">Aucune période disponible.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">Déclarer un paiement</h2>
                  <form className="space-y-3" onSubmit={handleDeclare}>
                    <div>
                      <label className="text-sm text-slate-700">Montant</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">Note (optionnel)</label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">URL preuve (optionnel)</label>
                      <input
                        type="text"
                        value={proofUrl}
                        onChange={(e) => setProofUrl(e.target.value)}
                        className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-blue-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                    >
                      {submitting ? 'Envoi...' : 'Déclarer (statut DECLARED)'}
                    </button>
                  </form>
                </div>
              </div>
            </section>

            {managerView && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Paiements en attente de validation</h2>
                {pending.length === 0 ? (
                  <p className="text-sm text-slate-600">Aucun paiement en attente.</p>
                ) : (
                  <div className="space-y-3">
                    {pending.map((payment) => (
                      <div key={payment.id} className="border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{payment.user?.name ?? 'Membre'}</p>
                          <p className="text-sm text-slate-600">{payment.note || 'Sans note'}</p>
                          <p className="text-sm font-semibold text-slate-900 mt-1">
                            {formatMoney(Number(payment.amount), contribution.currency)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => void handleValidatePayment(payment.id, true)}
                            disabled={submitting}
                            className="px-3 py-2 text-sm rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => void handleValidatePayment(payment.id, false)}
                            disabled={submitting}
                            className="px-3 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            Refuser
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {!managerView && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Mes paiements sur cette cotisation</h2>
                <div className="space-y-2">
                  {mine.map((payment) => (
                    <div key={payment.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-700">{payment.note || 'Paiement'}</p>
                        <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs ${statusClass(payment.status)}`}>
                          {statusLabel(payment.status)}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900">{formatMoney(Number(payment.amount), contribution.currency)}</p>
                    </div>
                  ))}
                  {mine.length === 0 && <p className="text-sm text-slate-600">Aucun paiement enregistré.</p>}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
