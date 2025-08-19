// Shared API types and helpers (no dependency on store)
export interface ApiResponse<T> {
  data: T | T[];
  message?: string;
  metadata?: { cursor?: string | null };
}

export function toArray<T>(data: T | T[] | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data == null) return [];
  return [data];
}

// Error payload returned on rejected thunks
export interface ApiError {
  status: number;
  message?: string;
  data?: unknown;
}