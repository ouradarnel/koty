export type AppToastType = 'success' | 'error' | 'info';

export interface AppToastPayload {
  message: string;
  type?: AppToastType;
}

export const APP_TOAST_EVENT = 'app:toast';

export function emitToast(payload: AppToastPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AppToastPayload>(APP_TOAST_EVENT, { detail: payload }));
}
