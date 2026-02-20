import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import FirstUseGuide from '@/components/shared/FirstUseGuide';
import ViewSwitcher from '@/components/shared/ViewSwitcher';
import { useGroups } from '@/hooks/useGroups';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { isManager } from '@/lib/group';

interface GroupsPageProps {
  onLoggedOut: () => void;
}

export default function GroupsPage({ onLoggedOut }: GroupsPageProps) {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}') as { id?: string; name?: string };
    } catch {
      return {};
    }
  }, []);

  const [simpleView, setSimpleView] = useState(true);
  const { groups: visibleGroups, loading, error } = useGroups();
  const { summary, delayedGroups } = useDashboardSummary(visibleGroups, user.id);

  const totalContributions = visibleGroups.reduce((sum, group) => sum + (group.contributions?.length ?? 0), 0);
  const managerGroups = visibleGroups.filter((group) => isManager(group, user.id)).length;
  const memberOnlyGroups = visibleGroups.length - managerGroups;
  const groupsWithoutContribution = visibleGroups.filter((group) => (group.contributions?.length ?? 0) === 0).length;
  const delayedGroupsMap = useMemo(
    () => new Map(delayedGroups.map((group) => [group.groupId, group.balance])),
    [delayedGroups],
  );
  const monthlyTargetByMembers = visibleGroups.reduce(
    (sum, group) =>
      sum +
      (group.contributions ?? []).reduce(
        (acc, contribution) => acc + Number(contribution.amount) * (group.members?.length ?? 0),
        0,
      ),
    0,
  );
  const currencyBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    visibleGroups.forEach((group) => {
      (group.contributions ?? []).forEach((contribution) => {
        const currency = contribution.currency || 'N/D';
        const current = map.get(currency) ?? 0;
        map.set(currency, current + Number(contribution.amount));
      });
    });
    return Array.from(map.entries())
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [visibleGroups]);

  return (
    <AppShell
      title="Mes groupes"
      subtitle={`Bienvenue ${user.name || 'Utilisateur'}. Cette page regroupe tous les groupes liés à ton compte.`}
      onLoggedOut={onLoggedOut}
    >
      <div className={`groups-page space-y-3 md:space-y-6 ${simpleView ? '' : 'detail-theme detail-theme-bg rounded-3xl p-3 md:p-5'}`}>
        <FirstUseGuide
          pageKey="groups"
          title="Mes groupes: vue simplifiée puis détail"
          description="La vue simplifiée est idéale pour vérifier rapidement ton statut. Passe en vue détaillée pour piloter chaque groupe."
          bullets={[
            'Un clic sur un groupe ouvre son résumé complet.',
            'Le badge retard met en avant les groupes à traiter en priorité.',
            'Le bouton « Nouveau groupe » est disponible dans la navigation.',
          ]}
        />

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full border border-white/60 bg-white/55 backdrop-blur-md px-2.5 py-1 text-[10px] md:text-[11px] text-slate-600">
            Données en temps réel
          </span>
          <ViewSwitcher simpleView={simpleView} onToggle={() => setSimpleView((prev) => !prev)} />
        </div>

        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{error}</div>}

        {simpleView && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3">
            <article className="glass-panel p-3.5 md:p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mon statut</p>
              <p className={`mt-1 text-xl md:text-2xl font-bold ${summary.isUpToDate ? 'text-emerald-700' : 'text-red-700'}`}>
                {summary.isUpToDate ? 'À jour partout' : 'Retards détectés'}
              </p>
            </article>
            <article className="glass-panel p-3.5 md:p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Groupes en retard</p>
              <p className="mt-1 text-xl md:text-2xl font-bold text-slate-900">{summary.groupsNotUpToDate}</p>
            </article>
            <article className="glass-panel p-3.5 md:p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Groupes gérés</p>
              <p className="mt-1 text-xl md:text-2xl font-bold text-slate-900">{managerGroups}</p>
            </article>
          </section>
        )}

        {!simpleView && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
              <div className="glass-panel p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Groupes actifs</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{visibleGroups.length}</p>
              </div>
              <div className="glass-panel p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Cotisations</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{totalContributions}</p>
              </div>
              <div className="glass-panel p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Groupes gérés</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{managerGroups}</p>
              </div>
              <div className="glass-panel p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Groupes en retard</p>
                <p className={`mt-1 text-2xl font-bold ${summary.groupsNotUpToDate > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {summary.groupsNotUpToDate}
                </p>
              </div>
              <div className="glass-panel p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Sans cotisation</p>
                <p className={`mt-1 text-2xl font-bold ${groupsWithoutContribution > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                  {groupsWithoutContribution}
                </p>
              </div>
            </section>

            {loading ? (
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2].map((item) => (
                  <div key={item} className="glass-panel p-5 space-y-4 animate-pulse">
                    <div className="h-4 w-40 bg-slate-200 rounded" />
                    <div className="h-3 w-56 bg-slate-200 rounded" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-14 bg-slate-100 rounded-lg" />
                      <div className="h-14 bg-slate-100 rounded-lg" />
                    </div>
                    <div className="h-9 bg-slate-100 rounded-lg" />
                  </div>
                ))}
              </section>
            ) : visibleGroups.length === 0 ? (
              <section className="glass-panel p-6 text-sm text-slate-600">
                <p className="font-semibold text-slate-900 mb-1">Aucun groupe à afficher.</p>
                <p>Tu n'appartiens à aucun groupe pour le moment.</p>
                <Link
                  to="/groups/new"
                  className="inline-flex mt-3 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                >
                  Créer un groupe
                </Link>
              </section>
            ) : (
              <>
                <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="glass-panel p-5 xl:col-span-2">
                    <h3 className="text-base font-semibold text-slate-900">Alertes et priorités</h3>
                    <div className="mt-3 space-y-2">
                      {summary.groupsNotUpToDate > 0 ? (
                        delayedGroups.slice(0, 6).map((group) => (
                          <div key={group.groupId} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 flex items-center justify-between">
                            <Link to={`/groups/${group.groupId}`} className="text-sm font-medium text-red-800 hover:underline">
                              {group.groupName}
                            </Link>
                            <span className="text-sm font-semibold text-red-700">{group.balance.toFixed(2)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                          Aucun retard détecté sur tes groupes.
                        </div>
                      )}

                      {groupsWithoutContribution > 0 && (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                          {groupsWithoutContribution} groupe(s) n'ont pas encore de cotisation active.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="glass-panel p-5">
                    <h3 className="text-base font-semibold text-slate-900">Répartition portefeuille</h3>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-slate-500">Groupes gérés</p>
                        <p className="font-semibold text-slate-900">{managerGroups}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-slate-500">Groupes en tant que membre</p>
                        <p className="font-semibold text-slate-900">{memberOnlyGroups}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-slate-500">Volume mensuel estimé</p>
                        <p className="font-semibold text-slate-900">{monthlyTargetByMembers.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-4 border-t pt-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Montants par devise</p>
                      <div className="space-y-1.5">
                        {currencyBreakdown.length === 0 ? (
                          <p className="text-sm text-slate-600">Aucune cotisation active.</p>
                        ) : (
                          currencyBreakdown.map((item) => (
                            <div key={item.currency} className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">{item.currency}</span>
                              <span className="font-semibold text-slate-900">{item.amount.toFixed(2)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {visibleGroups.map((group) => {
                    const role = isManager(group, user.id) ? 'MANAGER' : 'MEMBER';
                    const isDelayed = delayedGroupsMap.has(group.id);
                    const delayedBalance = delayedGroupsMap.get(group.id) ?? 0;
                    const groupMonthly = (group.contributions ?? []).reduce(
                      (sum, contribution) => sum + Number(contribution.amount),
                      0,
                    );
                    const groupTarget = groupMonthly * (group.members?.length ?? 0);
                    const contributionsCount = group.contributions?.length ?? 0;
                    const setupScore = Math.min(
                      100,
                      (contributionsCount > 0 ? 50 : 0) +
                        ((group.members?.length ?? 0) >= 3 ? 30 : 15) +
                        (isDelayed ? 0 : 20),
                    );

                    return (
                      <article key={group.id} className="glass-panel p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-slate-900 truncate">{group.name}</h2>
                            <p className="text-sm text-slate-600">{group.description || 'Aucune description'}</p>
                          </div>
                          <div className="flex flex-col gap-1 items-end shrink-0">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                role === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {role === 'MANAGER' ? 'Gestionnaire' : 'Membre'}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                isDelayed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {isDelayed ? 'En retard' : 'À jour'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-slate-500">Membres</p>
                            <p className="font-semibold text-slate-900">{group.members.length}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-slate-500">Cotisations</p>
                            <p className="font-semibold text-slate-900">{contributionsCount}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-slate-500">Mensuel</p>
                            <p className="font-semibold text-slate-900">{groupMonthly.toFixed(2)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-slate-500">Objectif estimé</p>
                            <p className="font-semibold text-slate-900">{groupTarget.toFixed(2)}</p>
                          </div>
                        </div>

                        {isDelayed && (
                          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                            Solde groupe en retard: {delayedBalance.toFixed(2)}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Niveau de santé du groupe</span>
                            <span>{setupScore}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full ${setupScore >= 80 ? 'bg-emerald-500' : setupScore >= 55 ? 'bg-blue-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.max(5, setupScore)}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(group.contributions ?? []).slice(0, 3).map((contribution) => (
                            <div key={contribution.id} className="flex items-center justify-between text-sm border rounded-xl p-2.5">
                              <span className="text-slate-700">{contribution.name}</span>
                              <span className="font-semibold text-slate-900">
                                {Number(contribution.amount)} {contribution.currency}
                              </span>
                            </div>
                          ))}
                          {(group.contributions?.length ?? 0) === 0 && (
                            <div className="text-xs text-slate-500 rounded-xl border border-dashed px-3 py-2">
                              Aucune cotisation configurée pour ce groupe.
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/groups/${group.id}`}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Ouvrir le groupe
                          </Link>
                          {(group.contributions ?? [])[0] && (
                            <Link
                              to={`/contributions/${group.contributions?.[0].id}`}
                              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              Ouvrir une cotisation
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
