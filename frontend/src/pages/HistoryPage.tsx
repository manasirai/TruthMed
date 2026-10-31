import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, ChevronLeft, ChevronRight, Trash2, CheckSquare, Square, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { VERDICT_CONFIG, formatDate, truncate } from '@/lib/utils';
import type { VerdictType } from '@/types';

function verdictBadgeVariant(v: VerdictType): 'success' | 'warning' | 'danger' | 'neutral' {
  if (v === 'supported' || v === 'mostly_supported') return 'success';
  if (v === 'misleading') return 'warning';
  if (v === 'mostly_false' || v === 'false') return 'danger';
  return 'neutral';
}

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<'all' | 'selected' | null>(null);
  const PAGE_SIZE = 20;
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fact-check-history', page],
    queryFn: () => api.factCheck.getHistory(page, PAGE_SIZE),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  // If the current page was emptied by a deletion, step back to the previous one
  useEffect(() => {
    if (data && data.items.length === 0 && page > 1) setPage((p) => p - 1);
  }, [data, page]);

  const exitSelection = () => {
    setSelecting(false);
    setSelected(new Set());
    setConfirming(null);
  };

  const deleteMutation = useMutation({
    mutationFn: (target: 'all' | 'selected') =>
      target === 'all' ? api.factCheck.clearHistory() : api.factCheck.deleteHistoryItems([...selected]),
    onSuccess: (_res, target) => {
      if (target === 'all') setPage(1);
      exitSelection();
      queryClient.invalidateQueries({ queryKey: ['fact-check-history'] });
    },
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pageIds = data?.items.map((i) => i.id) ?? [];
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allOnPageSelected ? next.delete(id) : next.add(id)));
      return next;
    });

  const hasItems = !!data && data.items.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1.5">Analysis History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data ? `${data.total} claim${data.total !== 1 ? 's' : ''} analyzed` : 'Previously analyzed claims'}
          </p>
        </div>

        {hasItems && (
          <div className="flex flex-wrap items-center gap-2">
            {selecting ? (
              <>
                <Button variant="ghost" size="sm" onClick={toggleAllOnPage}>
                  {allOnPageSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {allOnPageSelected ? 'Deselect page' : 'Select page'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={selected.size === 0}
                  onClick={() => setConfirming('selected')}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete selected ({selected.size})
                </Button>
                <Button variant="secondary" size="sm" onClick={exitSelection}>
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => setSelecting(true)}>
                  <CheckSquare className="w-4 h-4" />
                  Select
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirming('all')}>
                  <Trash2 className="w-4 h-4" />
                  Clear all
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {confirming && (
        <Card className="mb-6 border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-red-700 dark:text-red-300">
              {confirming === 'all'
                ? `Delete all ${data?.total ?? ''} analyses? This cannot be undone.`
                : `Delete ${selected.size} selected ${selected.size === 1 ? 'analysis' : 'analyses'}? This cannot be undone.`}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirming(null)} disabled={deleteMutation.isPending}>
                Keep
              </Button>
              <Button variant="danger" size="sm" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(confirming)}>
                Delete
              </Button>
            </div>
          </div>
          {deleteMutation.isError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">Delete failed: {deleteMutation.error.message}</p>
          )}
        </Card>
      )}

      {isLoading && <PageSpinner />}

      {isError && (
        <Card className="text-center py-8">
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">Failed to load history.</p>
          <p className="text-xs text-gray-400">Make sure the backend is running on localhost:8000.</p>
        </Card>
      )}

      {data && data.items.length === 0 && page === 1 && (
        <Card className="text-center py-12">
          <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No analyses yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">Start by checking your first health claim.</p>
          <Link to="/fact-check">
            <Button size="sm">Check a Claim</Button>
          </Link>
        </Card>
      )}

      {hasItems && (
        <>
          <div className="space-y-3 mb-6">
            {data.items.map((item) => {
              const config = VERDICT_CONFIG[item.verdict as VerdictType] ?? VERDICT_CONFIG.insufficient_evidence;
              const isSelected = selected.has(item.id);
              const card = (
                <Card
                  className={`hover:shadow-card-md transition-all cursor-pointer ${
                    isSelected
                      ? 'border-teal-300 dark:border-teal-700 bg-teal-50/40 dark:bg-teal-950/20'
                      : 'hover:border-teal-100 dark:hover:border-teal-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {selecting && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select "${truncate(item.claim_text, 40)}"`}
                        className="mt-1.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 flex-shrink-0"
                      />
                    )}
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold flex-shrink-0 ${config.bg} ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug mb-1.5 italic">
                        "{truncate(item.claim_text, 120)}"
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-medium ${config.color}`}>{item.verdict_label}</span>
                        <Badge variant="neutral">{item.claim_type}</Badge>
                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.analyzed_at)}
                        </span>
                      </div>
                    </div>
                    {!selecting && <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />}
                  </div>
                </Card>
              );

              return selecting ? (
                <div key={item.id} onClick={() => toggle(item.id)} className="block">
                  {card}
                </div>
              ) : (
                <Link key={item.id} to={`/fact-check/${item.id}`} className="block">
                  {card}
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
