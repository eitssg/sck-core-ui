// Shared API envelope parser enforcing { data, metadata?: { cursor?: string } } contract
// Returns normalized shape and provides dev-time warnings for contract violations.

export interface ApiEnvelope<T = any> {
  data: T;
  metadata?: { cursor?: string | null; [k: string]: any } | null;
  // We intentionally ignore other top-level fields (status, code, message, links) here.
}

export interface ParsedEnvelope<T = any> {
  data: T;
  cursor: string | null;
  raw: any; // original JSON for debugging
}

export async function parseApiEnvelope<T = any>(response: Response): Promise<ParsedEnvelope<T>> {
  const json = await response.json().catch(() => ({}));
  const hasData = Object.prototype.hasOwnProperty.call(json, 'data');
  if (!hasData) {
    if (import.meta && (import.meta as any).env?.MODE !== 'production') {
      console.warn('[api] Envelope missing data property. Normalizing to empty array/object.', json);
    }
  }
  const data = (json as ApiEnvelope<T>).data as T;
  const cursor = (json as ApiEnvelope<T>)?.metadata?.cursor ?? null;
  return { data, cursor, raw: json };
}

// Helper to assert array data
export function ensureArray<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  return [];
}
