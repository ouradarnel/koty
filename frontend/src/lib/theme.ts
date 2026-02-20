export type AppTheme = 'classic' | 'responsable';

export const APP_THEME_STORAGE_KEY = 'app-theme';
export const APP_THEME_CHANGE_EVENT = 'app-theme-change';

export function getStoredTheme(): AppTheme {
  const value = localStorage.getItem(APP_THEME_STORAGE_KEY);
  if (value === 'responsable' || value === 'classic') {
    return value;
  }
  return 'classic';
}

export function applyTheme(theme: AppTheme): void {
  document.body.classList.toggle('theme-responsable', theme === 'responsable');
}

export function setAppTheme(theme: AppTheme): void {
  localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(APP_THEME_CHANGE_EVENT, { detail: { theme } }));
}
