interface ViewSwitcherProps {
  simpleView: boolean;
  onToggle: () => void;
  className?: string;
}

export default function ViewSwitcher({ simpleView, onToggle, className }: ViewSwitcherProps) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition ${
        simpleView
          ? 'bg-blue-600 text-white border-blue-500 shadow-[0_12px_22px_-16px_rgba(37,99,235,0.95)]'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
      } ${className ?? ''}`}
    >
      {simpleView ? 'Vue détaillée' : 'Vue simplifiée'}
    </button>
  );
}
