import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback = "Une erreur est survenue."): string {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}
