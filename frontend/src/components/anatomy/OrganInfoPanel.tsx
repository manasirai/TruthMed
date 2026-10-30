import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Activity, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface OrganInfoPanelProps {
  organId: string;
  onClose: () => void;
}

function InfoSection({ title, content, defaultOpen = true }: { title: string; content: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded transition-colors px-1"
      >
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {open && (
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pb-3 px-1">{content}</p>
      )}
    </div>
  );
}

export function OrganInfoPanel({ organId, onClose }: OrganInfoPanelProps) {
  const { data: organ, isLoading, isError } = useQuery({
    queryKey: ['organ', organId],
    queryFn: () => api.organs.getById(organId),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-2">
        <Spinner />
        <p className="text-xs text-gray-400">Loading…</p>
      </div>
    );
  }

  if (isError || !organ) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load organ information.</p>
        <Button variant="ghost" size="sm" onClick={onClose} className="mt-2">Close</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: organ.color }}
            aria-hidden
          />
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{organ.name}</h2>
            <Badge variant="neutral" className="text-xs">{organ.system} System</Badge>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5">
        <div className="py-2.5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Location</p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{organ.location}</p>
        </div>

        <InfoSection title="Main Function" content={organ.main_function} />
        <InfoSection title="Key Structures" content={organ.major_structures} defaultOpen={false} />
        <InfoSection title="System Interactions" content={organ.system_interactions} defaultOpen={false} />
        <InfoSection title="Health Facts" content={organ.health_facts} />
        <InfoSection title="Common Conditions" content={organ.common_conditions} />
        <InfoSection title="Symptoms" content={organ.symptoms} defaultOpen={false} />
        <InfoSection title="Prevention" content={organ.prevention} defaultOpen={false} />

        {/* When to seek care */}
        <div className="py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">When to See a Doctor</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-lg p-2.5">
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{organ.when_to_seek_care}</p>
          </div>
        </div>

        {/* Sources */}
        {organ.sources.length > 0 && (
          <div className="py-2.5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Sources</p>
            <ul className="space-y-1.5">
              {organ.sources.map((src, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-xs text-gray-400 mt-0.5">·</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{src.title}</span>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 inline-flex items-center text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
                        aria-label={`Open ${src.title}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-1 pb-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Last reviewed: {organ.last_reviewed} · Source: {organ.content_source}
          </p>
        </div>
      </div>
    </div>
  );
}
