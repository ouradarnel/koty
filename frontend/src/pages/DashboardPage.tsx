import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import FirstUseGuide from '@/components/shared/FirstUseGuide';
import { useGroups } from '@/hooks/useGroups';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { isManager } from '@/lib/group';

interface DashboardPageProps {
  onLoggedOut: () => void;
}

export default function DashboardPage({ onLoggedOut }: DashboardPageProps) {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}') as { id?: string; name?: string };
    } catch {
      return {};
    }
  }, []);

  const [showDelayedGroups, setShowDelayedGroups] = useState(false);
  const { groups, error: groupsError, loading: groupsLoading } = useGroups();
  const { summary, delayedGroups, error: summaryError, loading: summaryLoading } = useDashboardSummary(groups, user.id);

  const contributions = groups.reduce((sum, group) => sum + (group.contributions?.length ?? 0), 0);
  const managerGroups = groups.filter((group) => isManager(group, user.id)).length;
  const monthlyDue = groups.reduce(
    (sum, group) => sum + (group.contributions ?? []).reduce((acc, contribution) => acc + Number(contribution.amount), 0),
    0,
  );
  const nextDue = useMemo(() => {
    const dueDays = groups
      .flatMap((group) => group.contributions ?? [])
      .map((contribution) => contribution.dueDay)
      .filter((day): day is number => typeof day === 'number');

    if (dueDays.length === 0) return 'Aucune échéance';

    const now = new Date();
    const currentDay = now.getDate();
    const sorted = [...dueDays].sort((a, b) => a - b);
    const nextDay = sorted.find((day) => day >= currentDay) ?? sorted[0];
    const monthOffset = sorted.find((day) => day >= currentDay) ? 0 : 1;
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, nextDay);
    return targetDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }, [groups]);

  return (
    <AppShell
      title="Tableau de bord"
      subtitle={`Bonjour ${user.name || 'Utilisateur'}, voici l'état global de tes cotisations`}
      onLoggedOut={onLoggedOut}
    >
      <div className="dashboard-page space-y-3 md:space-y-6">
        <FirstUseGuide
          pageKey="dashboard"
          title="Tableau de bord: lecture rapide de ta situation"
          description="Tu vois ici les indicateurs principaux. Clique sur « Retard » pour ouvrir directement les groupes concernés."
          bullets={[
            'Volume du mois: estimation globale de tes cotisations actives.',
            'Statut global: à jour ou retard selon ton solde consolidé.',
            'Prochaine échéance: prochaine date cible détectée dans tes cotisations.',
          ]}
        />

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-white/60 bg-white/55 backdrop-blur-md px-2.5 py-1 text-[10px] md:text-[11px] text-slate-600">
            Données en temps réel
          </span>
        </div>

        {(groupsError || summaryError) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {groupsError || summaryError}
          </div>
        )}

        {(groupsLoading || summaryLoading) && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="glass-panel p-4 animate-pulse">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-7 w-32 bg-slate-200 rounded mt-3" />
              </div>
            ))}
          </section>
        )}

        {!groupsLoading && !summaryLoading && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3">
            <article className="glass-panel p-3.5 md:p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Volume du mois</p>
              <p className="mt-1 text-xl md:text-2xl font-bold text-slate-900">{monthlyDue.toFixed(2)}</p>
            </article>

            <article className="glass-panel p-3.5 md:p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Statut global</p>
              <button
                onClick={() => {
                  if (!summary.isUpToDate) {
                    setShowDelayedGroups((prev) => !prev);
                  }
                }}
                className={`mt-1 text-xl md:text-2xl font-bold ${
                  summary.isUpToDate ? 'text-emerald-700 cursor-default' : 'text-red-700 hover:underline'
                }`}
                disabled={summary.isUpToDate}
                title={summary.isUpToDate ? 'Aucun retard' : 'Afficher les groupes en retard'}
              >
                {summary.isUpToDate ? 'À jour' : 'Retard'}
              </button>
            </article>

            <article className="glass-panel p-3.5 md:p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Prochaine échéance</p>
              <p className="mt-1 text-xl md:text-2xl font-bold text-blue-700">{nextDue}</p>
            </article>
          </section>
        )}

        {!groupsLoading && !summaryLoading && showDelayedGroups && (
          <section className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Groupes où ton solde est en retard</h3>
            {delayedGroups.length === 0 ? (
              <p className="text-sm text-slate-600">Aucun retard détecté.</p>
            ) : (
              <div className="space-y-2">
                {delayedGroups.map((item) => (
                  <div key={item.groupId} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <Link to={`/groups/${item.groupId}`} className="text-sm font-medium text-blue-700 hover:text-blue-800">
                      {item.groupName}
                    </Link>
                    <span className="text-sm font-semibold text-red-700">{item.balance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-3">
          <div className="glass-panel p-3.5 md:p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Mes groupes</p>
            <p className="mt-1 text-xl md:text-2xl font-bold text-slate-900">{groups.length}</p>
          </div>
          <div className="glass-panel p-3.5 md:p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Cotisations actives</p>
            <p className="mt-1 text-xl md:text-2xl font-bold text-slate-900">{contributions}</p>
          </div>
          <div className="glass-panel p-3.5 md:p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Groupes gérés</p>
            <p className="mt-1 text-xl md:text-2xl font-bold text-slate-900">{managerGroups}</p>
          </div>
        </section>

        <section className="glass-panel-strong p-4 md:p-5 bg-gradient-to-r from-white/60 to-blue-100/45">
          <h3 className="text-base md:text-lg font-semibold text-slate-900">Vue d'ensemble</h3>
          <p className="text-sm text-slate-600 mt-1.5">
            Gère tes groupes, consulte les soldes par cotisation et traite les paiements en attente.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              to="/groups"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Ouvrir mes groupes
            </Link>
            <Link
              to="/groups"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Consulter les cotisations
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
