import { useMemo } from 'react';
import { useUnauthorizedIssues } from '@/hooks/useUnauthorizedIssues';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function PermissionIssues() {
  const { items, clear } = useUnauthorizedIssues();
  const total = items.reduce((acc, i) => acc + i.count, 0);
  const grouped = useMemo(() => {
    const byLabel = new Map<string, number>();
    for (const i of items) byLabel.set(i.label, (byLabel.get(i.label) || 0) + i.count);
    return Array.from(byLabel.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  if (total === 0) return null;

  return (
    <div className="fixed top-3 right-3 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="secondary" className="shadow">
            Permission issues <Badge variant="destructive" className="ml-2">{total}</Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Unauthorized requests</div>
            <Button size="sm" variant="ghost" onClick={() => clear()}>Clear</Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-auto">
            {grouped.map(([label, count]) => (
              <div key={label} className="flex items-center justify-between">
                <div className="text-sm font-medium">{label}</div>
                <Badge>{count}</Badge>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t pt-2">
            <div className="text-xs text-muted-foreground">Recent 401s (auto-clears after ~60s)</div>
            <div className="mt-2 max-h-48 overflow-auto space-y-1">
              {items.map((i) => (
                <div key={i.id} className="flex items-center justify-between">
                  <div className="text-xs truncate" title={`${i.label} ${i.path}`}>{i.label}: {i.path}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">x{i.count}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => clear(i.id)}>x</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default PermissionIssues;
