export const APP_NOTIFICATIONS_REFRESH_EVENT = 'app:notifications:refresh';

export function emitNotificationsRefresh() {
  window.dispatchEvent(new CustomEvent(APP_NOTIFICATIONS_REFRESH_EVENT));
}
