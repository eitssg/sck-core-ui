// Aggregates 401 events emitted by apiFetch to provide contextual UI feedback

export type UnauthorizedEventDetail = { label: string; path: string };
export type UnauthorizedItem = {
  id: string; // label|path
  label: string;
  path: string;
  count: number;
  firstAt: number;
  lastAt: number;
};

type Listener = (items: UnauthorizedItem[]) => void;

const TTL_MS = 60_000; // auto-expire after 60s of inactivity

class UnauthorizedAggregator {
  private items = new Map<string, UnauthorizedItem>();
  private listeners = new Set<Listener>();
  private initialized = false;
  private sweepTimer: number | undefined;

  private ensureInit() {
    if (this.initialized || typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const ev = e as CustomEvent<UnauthorizedEventDetail>;
      const d = ev.detail;
      if (!d) return;
      const key = `${d.label}|${d.path}`;
      const now = Date.now();
      const existing = this.items.get(key);
      if (existing) {
        existing.count += 1;
        existing.lastAt = now;
      } else {
        this.items.set(key, {
          id: key,
          label: d.label,
          path: d.path,
          count: 1,
          firstAt: now,
          lastAt: now,
        });
      }
      this.emit();
    };
    window.addEventListener('sck:api401', handler as EventListener);

    // Periodic sweep to expire stale items
    this.sweepTimer = window.setInterval(() => this.sweep(), 5_000);
    this.initialized = true;
  }

  private sweep() {
    const now = Date.now();
    let changed = false;
    for (const [k, v] of this.items.entries()) {
      if (now - v.lastAt > TTL_MS) {
        this.items.delete(k);
        changed = true;
      }
    }
    if (changed) this.emit();
  }

  private emit() {
    const arr = this.getItems();
    for (const l of this.listeners) {
      try { l(arr); } catch { /* ignore */ }
    }
  }

  subscribe(listener: Listener) {
    this.ensureInit();
    this.listeners.add(listener);
    // initial push
    try { listener(this.getItems()); } catch { /* ignore */ }
    return () => {
      this.listeners.delete(listener);
    };
  }

  getItems(): UnauthorizedItem[] {
    return Array.from(this.items.values()).sort((a, b) => b.lastAt - a.lastAt);
  }

  clear(id?: string) {
    if (id) this.items.delete(id);
    else this.items.clear();
    this.emit();
  }
}

export const unauthorizedAggregator = new UnauthorizedAggregator();
