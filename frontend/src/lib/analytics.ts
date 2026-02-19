type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

type AnalyticsEvent = {
  name: string;
  payload?: AnalyticsPayload;
  at: string;
};

const MAX_EVENTS = 200;
const STORAGE_KEY = 'koty:analytics:events';

export function trackEvent(name: string, payload?: AnalyticsPayload) {
  if (typeof window === 'undefined') return;

  const event: AnalyticsEvent = {
    name,
    payload,
    at: new Date().toISOString(),
  };

  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    const existing = existingRaw ? (JSON.parse(existingRaw) as AnalyticsEvent[]) : [];
    const next = [...existing.slice(-(MAX_EVENTS - 1)), event];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore analytics storage errors to avoid impacting UX.
  }

  if (import.meta.env.DEV) {
    console.info('[analytics]', event);
  }
}

