import { useEffect, useState } from 'react';
import { unauthorizedAggregator, type UnauthorizedItem } from '@/lib/unauthorized-aggregator';

export function useUnauthorizedIssues() {
  const [items, setItems] = useState<UnauthorizedItem[]>(() => unauthorizedAggregator.getItems());
  useEffect(() => unauthorizedAggregator.subscribe(setItems), []);

  const clear = (id?: string) => unauthorizedAggregator.clear(id);

  return { items, clear };
}
