import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const PAGE_SIZE = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fact-check-history', page],
    queryFn: () => api.factCheck.getHistory(page, PAGE_SIZE),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1.5">Analysis History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {data ? `${data.total} claim${data.total !== 1 ? 's' : ''} analyzed` : 'Previously analyzed claims'}
        </p>
      </div>

      {isLoading && <PageSpinner />}

      {isError && (
        <Card className="text-center py-8">
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">Failed to load history.</p>
          <p className="text-xs text-gray-400">Make sure the backend is running on localhost:8000.</p>
        </Card>
      )}

      {data && data.items.length === 0 && (
        <Card className="text-center py-12">
          <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No analyses yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">Start by checking your first health claim.</p>
          <Link to="/fact-check">
            <Button size="sm">Check a Claim</Button>
          </Link>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="space-y-3 mb-6">
            {data.items.map((item) => {
              const config = VERDICT_CONFIG[item.verdict as VerdictType] ?? VERDICT_CONFIG.insufficient_evidence;
              return (
                <Link
                  key={item.id}
                  to={`/fact-check/${item.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-card-md transition-all hover:border-teal-100 dark:hover:border-teal-900 cursor-pointer">
                    <div className="flex items-start gap-3">
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
                      <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                    </div>
                  </Card>
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
