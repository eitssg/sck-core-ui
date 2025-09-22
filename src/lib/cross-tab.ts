/* Cross-tab auth event helpers with debounce and dedupe.
 * - sendAuthEvent: Debounced per-event-type over a short window to avoid bursts.
 * - onAuthEvent: Listener with simple dedupe using a Map of last-seen ids per type.
 */

export type AuthEvent = {
  type: 'auth:logout' | 'auth:token';
  id?: string; // unique id for dedupe (defaults to timestamp+rand)
  payload?: unknown;
};

const CHANNEL_NAME = 'sck-auth-sync';
const DEFAULT_DEBOUNCE_MS = 150; // short debounce to collapse rapid sequences

// Lightweight debounce per event-type
// Use ReturnType<typeof setTimeout> to be compatible with browser/node typings
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getChannel(): BroadcastChannel | null {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      return new BroadcastChannel(CHANNEL_NAME);
    }
  } catch {
    // no-op
  }
  return null;
}

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sendAuthEvent(evt: AuthEvent, debounceMs = DEFAULT_DEBOUNCE_MS) {
  const channel = getChannel();
  if (!channel) return; // silently skip if unsupported

  const key = evt.type;
  const existing = debounceTimers.get(key);
  if (existing) {
    clearTimeout(existing);
  }
  const timer = setTimeout(() => {
    const message: AuthEvent = { id: evt.id || nextId(), ...evt };
    try { channel.postMessage(message); } catch { /* no-op */ }
  }, debounceMs);
  debounceTimers.set(key, timer);
}

// Listener registration with dedupe by id
export function onAuthEvent(handler: (evt: AuthEvent) => void) {
  const channel = getChannel();
  if (!channel) return () => {};

  const seen = new Set<string>();
  const listener = (evt: MessageEvent<AuthEvent>) => {
    const msg = evt?.data;
    if (!msg || !msg.type) return;
    const id = msg.id || `${msg.type}-unknown`;
    if (seen.has(id)) return;
    seen.add(id);
    handler(msg);
    // prevent unbounded growth: trim occasionally
    if (seen.size > 1000) {
      // heuristic: reset when large
      seen.clear();
    }
  };
  channel.addEventListener('message', listener);
  return () => {
    try { channel.removeEventListener('message', listener as any); } catch { /* no-op */ }
    try { channel.close(); } catch { /* no-op */ }
  };
}
