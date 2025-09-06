// Lightweight global notifier with throttling and React-agnostic API
// Dispatches window events that a React bridge component will render via useToast

type Level = 'info' | 'success' | 'warning' | 'error';

const lastToastAt = new Map<string, number>();

function shouldToast(key: string, ttlMs: number) {
  const now = Date.now();
  const last = lastToastAt.get(key) || 0;
  if (now - last < ttlMs) return false;
  lastToastAt.set(key, now);
  return true;
}

function emit(level: Level, title: string, description?: string, key?: string, ttlMs: number = 4000) {
  const dedupeKey = key || `${level}:${title}:${description || ''}`;
  if (!shouldToast(dedupeKey, ttlMs)) return;
  try {
    const detail = { level, title, description };
    window.dispatchEvent(new CustomEvent('sck:toast', { detail }));
  } catch {
    // no-op in non-browser or if dispatch fails
  }
}

export const notify = {
  info: (title: string, description?: string, key?: string, ttlMs?: number) => emit('info', title, description, key, ttlMs),
  success: (title: string, description?: string, key?: string, ttlMs?: number) => emit('success', title, description, key, ttlMs),
  warn: (title: string, description?: string, key?: string, ttlMs?: number) => emit('warning', title, description, key, ttlMs),
  error: (title: string, description?: string, key?: string, ttlMs?: number) => emit('error', title, description, key, ttlMs),
};

export type { Level };
