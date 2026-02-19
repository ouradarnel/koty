import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import FirstUseGuide from '@/components/shared/FirstUseGuide';
import { groupsService } from '@/services/groups.service';
import { getApiErrorMessage } from '@/lib/api-error';
import { trackEvent } from '@/lib/analytics';

interface NewGroupPageProps {
  onLoggedOut: () => void;
}

export default function NewGroupPage({ onLoggedOut }: NewGroupPageProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameLength = name.trim().length;
  const descriptionLength = description.trim().length;
  const isNameValid = useMemo(() => nameLength >= 3, [nameLength]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Le nom du groupe est requis.');
      return;
    }
    if (!isNameValid) {
      setError('Le nom du groupe doit contenir au moins 3 caractères.');
      return;
    }

    setIsSubmitting(true);
    try {
      const group = await groupsService.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      trackEvent('group_create_success', { hasDescription: Boolean(description.trim()) });
      navigate(`/groups/${group.id}?created=1`);
    } catch (err: unknown) {
      trackEvent('group_create_failed');
      setError(getApiErrorMessage(err, 'Impossible de créer le groupe.'));
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Nouveau groupe"
      subtitle="Crée d'abord le groupe, puis ajoute les membres et cotisations."
      onLoggedOut={onLoggedOut}
    >
      <section className="max-w-5xl space-y-4 md:space-y-5">
        <FirstUseGuide
          pageKey="new-group"
          title="Création de groupe: étape 1"
          description="Crée d'abord ton groupe, puis configure les membres et les cotisations depuis la page détail."
          bullets={[
            'Le créateur devient automatiquement gestionnaire.',
            'Nom obligatoire, description optionnelle.',
            'Après création, tu es redirigé vers le détail du groupe.',
          ]}
        />

        <div className="flex items-center justify-between">
          <Link to="/groups" className="text-sm text-blue-600 hover:text-blue-700">
            ← Retour à mes groupes
          </Link>
        </div>

        <div className="glass-panel-strong px-4 py-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/55 to-white/45">
          <p className="text-sm font-semibold text-slate-900">Configuration initiale du groupe</p>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Un groupe peut être créé vide. Ensuite, tu invites des membres et tu configures une ou plusieurs cotisations.
          </p>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
          <form onSubmit={handleSubmit} className="glass-panel p-5 md:p-6 space-y-4">
            <div>
              <label htmlFor="group-name" className="block text-sm font-medium text-slate-700 mb-1">
                Nom du groupe
              </label>
              <input
                id="group-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Famille 2026"
                maxLength={80}
                className="glass-input w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="mt-1 flex items-center justify-between">
                <p className={`text-xs ${nameLength > 0 && !isNameValid ? 'text-amber-700' : 'text-slate-500'}`}>
                  {nameLength > 0 && !isNameValid ? 'Minimum 3 caractères.' : 'Nom visible par tous les membres.'}
                </p>
                <p className="text-xs text-slate-400">{nameLength}/80</p>
              </div>
            </div>

            <div>
              <label htmlFor="group-description" className="block text-sm font-medium text-slate-700 mb-1">
                Description (optionnel)
              </label>
              <textarea
                id="group-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                maxLength={280}
                placeholder="Ex: Cotisation familiale mensuelle"
                className="glass-input w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-400 text-right">{descriptionLength}/280</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => navigate('/groups')}
                className="px-3 py-2 text-sm rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSubmitting ? 'Création...' : 'Créer le groupe'}
              </button>
            </div>
          </form>

          <aside className="glass-panel p-5 md:p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Ce qui se passe après création</h3>
            <div className="space-y-2 text-sm text-slate-700">
              <p>1. Le groupe est créé avec ton nom et ta description.</p>
              <p>2. Tu deviens automatiquement gestionnaire du groupe.</p>
              <p>3. Tu peux ensuite inviter des membres.</p>
              <p>4. Tu configures une ou plusieurs cotisations.</p>
            </div>
            <div className="glass-surface px-3 py-2 text-xs text-slate-600 leading-relaxed">
              Conseil: commence par une cotisation simple (montant fixe mensuel), puis ajoute les autres caisses.
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
