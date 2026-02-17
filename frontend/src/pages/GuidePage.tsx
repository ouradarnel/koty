import AppShell from '@/components/AppShell';

type GuidePageProps = {
  onLoggedOut: () => void;
};

export default function GuidePage({ onLoggedOut }: GuidePageProps) {
  return (
    <AppShell
      title="Guide d'utilisation"
      subtitle="Les étapes essentielles, de la création d'un groupe jusqu'à la validation des paiements."
      onLoggedOut={onLoggedOut}
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">1. Démarrer</h3>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-2">
            <li>
              Crée un compte puis connecte-toi. Ton email est unique: il ne peut pas être utilisé par un autre compte.
            </li>
            <li>
              Va dans <span className="font-medium">Mes groupes</span> pour voir tous tes groupes (créés par toi ou rejoints).
            </li>
            <li>
              Si tu as une invitation en attente, un point rouge apparaît sur l'onglet concerné. Ouvre les notifications
              pour accepter ou refuser.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">2. Créer un groupe</h3>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-2">
            <li>
              Clique sur <span className="font-medium">Nouveau groupe</span> dans la navigation.
            </li>
            <li>Renseigne le nom (obligatoire) et une description (optionnelle).</li>
            <li>
              Une fois le groupe créé, tu deviens automatiquement <span className="font-medium">gestionnaire</span> du groupe.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">3. Inviter des membres</h3>
          <p className="mt-3 text-sm text-slate-700">
            Dans le détail d'un groupe, un gestionnaire peut inviter des personnes. L'adhésion se fait en 2 étapes:
            invitation puis acceptation.
          </p>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-2">
            <li>Le gestionnaire envoie une invitation (par email).</li>
            <li>Le membre reçoit une notification et doit accepter pour rejoindre le groupe.</li>
            <li>
              Tant que l'invitation n'est pas acceptée, la personne n'apparaît pas comme membre actif du groupe.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">4. Créer une cotisation (caisse)</h3>
          <p className="mt-3 text-sm text-slate-700">
            Une cotisation est une caisse au sein d'un groupe (montant, devise, fréquence). Seul un gestionnaire peut la créer.
          </p>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-2">
            <li>Ouvre le groupe, puis clique sur l'action de création de cotisation.</li>
            <li>Choisis: nom, description, montant, devise, fréquence et les paramètres de la première échéance.</li>
            <li>
              Participation: le gestionnaire peut inviter tous les membres du groupe ou seulement certains. Les invités
              doivent accepter (comme pour rejoindre un groupe).
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">5. Payer et valider</h3>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-2">
            <li>
              Un membre peut <span className="font-medium">déclarer un paiement</span> sur une cotisation à laquelle il participe.
            </li>
            <li>
              Le gestionnaire voit une notification et peut <span className="font-medium">valider</span> (ou refuser) le paiement.
            </li>
            <li>
              Une fois validé, le membre reçoit une notification de mise à jour et les soldes se recalculent (à jour, retard, avance).
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">6. Comprendre les statuts</h3>
          <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-2">
            <li>
              <span className="font-medium">À jour</span>: tu as payé ce qui est attendu jusqu'à la période en cours.
            </li>
            <li>
              <span className="font-medium">En retard</span>: il manque un ou plusieurs paiements sur la période attendue.
            </li>
            <li>
              <span className="font-medium">En avance</span>: tu as payé plus que demandé (avance sur des périodes futures).
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">7. Mot de passe</h3>
          <p className="mt-3 text-sm text-slate-700">
            Les réinitialisations et modification de mot de passe sont gérées par l'administrateur.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

