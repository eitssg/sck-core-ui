// Minimal timezone catalog. We try to use Intl.supportedValuesOf('timeZone') if available,
// otherwise fall back to a curated subset of common IANA zones.

const FALLBACK_TZS = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Australia/Sydney',
];

export function getTimezones(): string[] {
  try {
    const supportedValuesOf = (Intl as any)?.supportedValuesOf;
    if (typeof supportedValuesOf === 'function') {
      const list: string[] = supportedValuesOf('timeZone');
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) { /* no-op */ }
  return FALLBACK_TZS;
}
