import { cn, VERDICT_CONFIG } from '@/lib/utils';
import type { VerdictType } from '@/types';

interface VerdictCardProps {
  verdict: VerdictType;
  verdictLabel: string;
  shortAnswer: string;
}

export function VerdictCard({ verdict, verdictLabel, shortAnswer }: VerdictCardProps) {
  const config = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.insufficient_evidence;

  return (
    <div className={cn('rounded-xl border p-5', config.bg, config.border)}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('flex items-center justify-center w-9 h-9 rounded-full font-bold text-lg', config.bg, config.color)}>
          {config.icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium mb-0.5">Verdict</p>
          <p className={cn('font-bold text-lg leading-tight', config.color)}>{verdictLabel}</p>
        </div>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{shortAnswer}</p>
    </div>
  );
}
