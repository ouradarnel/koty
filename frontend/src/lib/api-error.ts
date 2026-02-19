import axios from 'axios';

function translateAuthMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid credentials')) return 'Email ou mot de passe incorrect.';
  if (lower.includes('access denied')) return 'Accès refusé.';
  if (lower.includes('email already exists')) return 'Vous avez déjà un compte.';
  if (lower.includes('first name and last name are required')) return 'Le prénom et le nom sont requis.';
  if (lower.includes('failed to fetch')) return 'Connexion réseau impossible pour le moment.';
  return message;
}

export function getApiErrorMessage(error: unknown, fallback = "Une erreur est survenue."): string {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return translateAuthMessage(message.join(', '));
  if (typeof message === 'string' && message.trim()) return translateAuthMessage(message);
  return fallback;
}
