import { useEffect, useState } from 'react';
import { APP_TOAST_EVENT, type AppToastPayload } from '@/lib/toast';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

function toneClass(type: ToastItem['type']) {
  if (type === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (type === 'error') return 'border-red-200 bg-red-50 text-red-800';
  return 'border-blue-200 bg-blue-50 text-blue-800';
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let counter = 0;
    const onToast = (event: Event) => {
      const custom = event as CustomEvent<AppToastPayload>;
      if (!custom.detail?.message) return;

      counter += 1;
      const id = counter;
      const type = custom.detail.type ?? 'info';

      setToasts((prev) => [...prev, { id, message: custom.detail.message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3200);
    };

    window.addEventListener(APP_TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(APP_TOAST_EVENT, onToast);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed z-[90] bottom-3 right-3 left-3 md:left-auto md:w-[360px] space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl border px-3 py-2 text-sm shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 ${toneClass(toast.type)}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
