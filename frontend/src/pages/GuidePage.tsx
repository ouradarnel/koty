import { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  CreditCard,
  PlusCircle,
  ShieldCheck,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';

type GuidePageProps = {
  onLoggedOut: () => void;
};

export default function GuidePage({ onLoggedOut }: GuidePageProps) {
  const [resetMessage, setResetMessage] = useState('');
  const userId = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? (JSON.parse(raw) as { id?: string }) : {};
      return user.id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }, []);

  const reactivateFirstUseGuides = () => {
    const prefix = `koty:first-use:${userId}:`;
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => localStorage.removeItem(key));
    setResetMessage('Bulles de guidage réactivées. Elles réapparaîtront sur les pages concernées.');
  };

  return (
    <AppShell
      title="Guide d'utilisation"
      subtitle="Les étapes essentielles, de la création d'un groupe jusqu'à la validation des paiements."
      onLoggedOut={onLoggedOut}
    >
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-white/65 bg-white/55 backdrop-blur-2xl shadow-[0_22px_55px_-35px_rgba(15,23,42,0.65)]">
          <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gradient-to-br from-sky-400/35 via-blue-600/25 to-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-400/20 via-cyan-400/18 to-sky-500/18 blur-3xl" />

          <div className="relative p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vue d'ensemble</p>
                <h3 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  Les bases pour bien démarrer, sans te perdre dans les détails.
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
                  Koty est organisé en 2 niveaux: <span className="font-medium text-slate-800">un groupe</span>, puis une ou plusieurs{' '}
                  <span className="font-medium text-slate-800">cotisations</span> (caisses) dans ce groupe. On participe à une cotisation
                  uniquement si on y est invité et qu'on accepte.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/groups/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-[0_14px_26px_-18px_rgba(37,99,235,0.85)] hover:bg-blue-700 transition"
                >
                  <PlusCircle size={18} />
                  Créer un groupe
                </Link>
                <Link
                  to="/groups"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200/70 hover:bg-white transition"
                >
                  <Users size={18} className="text-slate-700" />
                  Mes groupes
                </Link>
                <button
                  onClick={reactivateFirstUseGuides}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-white transition"
                >
                  Réactiver les bulles
                </button>
              </div>
            </div>
            {resetMessage && (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/85 px-3 py-2 text-xs font-medium text-emerald-700">
                {resetMessage}
              </p>
            )}

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="glass-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Invitations</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Toujours à confirmer</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Un point rouge apparaît quand une action est nécessaire. Ouvre la cloche pour traiter.
                </p>
              </div>
              <div className="glass-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Paiements</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Déclarer puis valider</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Les paiements déclarés sont validés par un gestionnaire. Tu reçois une mise à jour ensuite.
                </p>
              </div>
              <div className="glass-surface p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Statuts</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">À jour, retard, avance</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Le statut reflète ta situation sur les périodes attendues de chaque cotisation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-panel-strong p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">Parcours recommandé</h3>
              <span className="text-xs font-semibold text-slate-500">7 étapes</span>
            </div>

            <div className="mt-4 space-y-3">
              <details className="group rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl shadow-sm open:bg-white/70 transition">
                <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-2xl bg-blue-600/10 text-blue-700 flex items-center justify-center ring-1 ring-blue-600/15">
                      <Users size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">1) Démarrer</span>
                      <span className="block text-xs text-slate-600">Compte, accès et invitations en attente</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 group-open:text-slate-700">Voir</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-700 space-y-2">
                  <p>
                    Ton email est unique: tu ne peux pas créer 2 comptes avec la même adresse. Si une invitation est en attente, elle doit
                    être acceptée pour que tu deviennes membre actif.
                  </p>
                  <p className="text-xs text-slate-500">
                    Astuce: la cloche en bas à droite regroupe les actions importantes (invitations, validations, mises à jour).
                  </p>
                </div>
              </details>

              <details className="group rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl shadow-sm open:bg-white/70 transition">
                <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-2xl bg-sky-500/10 text-sky-700 flex items-center justify-center ring-1 ring-sky-500/15">
                      <PlusCircle size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">2) Créer un groupe</span>
                      <span className="block text-xs text-slate-600">Tu deviens gestionnaire automatiquement</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 group-open:text-slate-700">Voir</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-700 space-y-2">
                  <p>
                    Un groupe peut être vide au départ. Ensuite, tu ajoutes des membres et tu crées des cotisations (caisses) selon tes
                    besoins.
                  </p>
                  <p className="text-xs text-slate-500">
                    Le groupe doit toujours avoir au moins un gestionnaire.
                  </p>
                </div>
              </details>

              <details className="group rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl shadow-sm open:bg-white/70 transition">
                <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-2xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center ring-1 ring-indigo-500/15">
                      <UserPlus size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">3) Inviter des membres</span>
                      <span className="block text-xs text-slate-600">Invitation puis acceptation</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 group-open:text-slate-700">Voir</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-700 space-y-2">
                  <p>
                    L'invitation crée une demande. Le membre doit accepter pour rejoindre. Tant que ce n'est pas accepté, le membre n'est
                    pas actif.
                  </p>
                </div>
              </details>

              <details className="group rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl shadow-sm open:bg-white/70 transition">
                <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center ring-1 ring-emerald-500/15">
                      <WalletCards size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">4) Créer une cotisation (caisse)</span>
                      <span className="block text-xs text-slate-600">Montant, devise, fréquence, échéance</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 group-open:text-slate-700">Voir</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-700 space-y-2">
                  <p>
                    Une cotisation est une caisse du groupe. Seul un gestionnaire peut la créer. La participation se fait par invitation:
                    tu peux inviter tous les membres ou seulement certains.
                  </p>
                </div>
              </details>

              <details className="group rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl shadow-sm open:bg-white/70 transition">
                <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center ring-1 ring-amber-500/15">
                      <CreditCard size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">5) Déclarer un paiement</span>
                      <span className="block text-xs text-slate-600">Uniquement sur les cotisations auxquelles tu participes</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 group-open:text-slate-700">Voir</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-700 space-y-2">
                  <p>
                    Le paiement déclaré passe en attente. Le gestionnaire reçoit une notification et traite la validation.
                  </p>
                </div>
              </details>

              <details className="group rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl shadow-sm open:bg-white/70 transition">
                <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-2xl bg-red-500/10 text-red-700 flex items-center justify-center ring-1 ring-red-500/15">
                      <CheckCircle2 size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">6) Valider (gestionnaire)</span>
                      <span className="block text-xs text-slate-600">Le statut se met à jour automatiquement</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 group-open:text-slate-700">Voir</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-700 space-y-2">
                  <p>
                    Une fois validé, les soldes sont recalculés (à jour, retard, avance). Le membre reçoit une notification de mise à jour.
                  </p>
                </div>
              </details>

              <details className="group rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl shadow-sm open:bg-white/70 transition">
                <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-2xl bg-slate-900/5 text-slate-700 flex items-center justify-center ring-1 ring-slate-900/10">
                      <Bell size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">7) Suivre les actions</span>
                      <span className="block text-xs text-slate-600">Points rouges et notifications</span>
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 group-open:text-slate-700">Voir</span>
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-700 space-y-2">
                  <p>
                    Les liens qui nécessitent une action affichent un point rouge. La cloche te permet de traiter rapidement.
                  </p>
                </div>
              </details>
            </div>
          </div>

          <aside className="glass-panel-strong p-5">
            <h3 className="text-base font-semibold text-slate-900">Rôles et sécurité</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 h-9 w-9 rounded-2xl bg-blue-600/10 text-blue-700 flex items-center justify-center ring-1 ring-blue-600/15">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Gestionnaire</p>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Crée des groupes et des cotisations, invite des membres, valide les paiements et traite les actions en attente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 h-9 w-9 rounded-2xl bg-slate-900/5 text-slate-700 flex items-center justify-center ring-1 ring-slate-900/10">
                    <Users size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Membre</p>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Voit ses cotisations, déclare des paiements et suit son statut (à jour, retard, avance).
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 h-9 w-9 rounded-2xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center ring-1 ring-emerald-600/15">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Mot de passe</p>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Les réinitialisations et modification de mot de passe sont gérées par l'administrateur.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
