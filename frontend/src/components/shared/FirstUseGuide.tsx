import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';

type FirstUseGuideProps = {
  pageKey: string;
  title: string;
  description: string;
  bullets?: string[];
};

export default function FirstUseGuide({ pageKey, title, description, bullets = [] }: FirstUseGuideProps) {
  const [visible, setVisible] = useState(false);

  const storageKey = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? (JSON.parse(raw) as { id?: string }) : {};
      const userId = user.id || 'anonymous';
      return `koty:first-use:${userId}:${pageKey}`;
    } catch {
      return `koty:first-use:anonymous:${pageKey}`;
    }
  }, [pageKey]);

  useEffect(() => {
    const alreadySeen = localStorage.getItem(storageKey) === 'seen';
    setVisible(!alreadySeen);
  }, [storageKey]);

  const close = () => {
    localStorage.setItem(storageKey, 'seen');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/55 backdrop-blur-2xl p-4 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.65)]">
      <div className="pointer-events-none absolute -top-14 -right-12 h-28 w-28 rounded-full bg-gradient-to-br from-sky-400/30 to-blue-600/20 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            <Sparkles size={12} />
            Première visite
          </p>
          <h3 className="mt-2 text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-700">{description}</p>
          {bullets.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-600 space-y-1">
              {bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Link to="/guide" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
              Ouvrir le guide
            </Link>
            <button
              onClick={close}
              className="rounded-lg border border-slate-300 bg-white/75 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Compris
            </button>
          </div>
        </div>

        <button
          onClick={close}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Fermer le guide"
        >
          <X size={16} />
        </button>
      </div>
    </section>
  );
}

