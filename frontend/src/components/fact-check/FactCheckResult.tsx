import { useState } from 'react';
import {
  BookOpen, AlertTriangle, CheckCircle, XCircle,
  HelpCircle, ArrowRight, Clock, ExternalLink, ChevronDown, ChevronUp, Star, Volume2, Square
} from 'lucide-react';
import { VerdictCard } from './VerdictCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { FactCheckResult as Result } from '@/types';

interface Props {
  result: Result;
  onReset: () => void;
}

function Section({ title, icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-teal-600 dark:text-teal-400">{icon}</span>
          <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

function SourceList({ sources, retrievalStatus }: { sources: Result['sources']; retrievalStatus: string }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) {
    return (
      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
        {retrievalStatus === 'unavailable'
          ? 'Real-time source retrieval is not configured. Analysis is based on the model\'s training knowledge.'
          : 'No sources were identified for this analysis.'}
      </div>
    );
  }
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {sources.map((src, i) => (
        <div key={i} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {src.source_tier === 'primary' && (
                  <Badge variant="success" className="text-xs">Primary</Badge>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">{src.publisher}</span>
                {src.publication_date && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">· {src.publication_date}</span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{src.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{src.relevance_note}</p>
            </div>
            {src.url && (
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                aria-label={`Open ${src.title}`}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FactCheckResultView({ result, onReset }: Props) {
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const tts = useSpeechSynthesis();

  function toggleListen() {
    if (tts.speaking) return tts.stop();
    tts.speak([
      result.short_answer,
      result.what_evidence_says,
      result.why_accurate_or_not,
      result.what_to_do_next,
      result.when_to_seek_care,
    ].filter(Boolean).join(' '));
  }

  async function submitFeedback(rating: number) {
    setFeedbackRating(rating);
    try {
      await api.feedback.submit(result.id, rating);
      setFeedbackSubmitted(true);
    } catch {
      // Non-critical
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4 animate-fade-in">
      {/* Claim */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Analyzed claim</p>
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed italic">"{result.claim_text}"</p>
        <div className="flex items-center gap-3 mt-2.5">
          <Badge variant="info">{result.claim_type}</Badge>
          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <Clock className="w-3 h-3" />
            {formatDate(result.analyzed_at)}
          </span>
          {result.retrieval_status === 'unavailable' && (
            <Badge variant="warning">No live search</Badge>
          )}
        </div>
      </div>

      {/* Verdict */}
      <VerdictCard
        verdict={result.verdict}
        verdictLabel={result.verdict_label}
        shortAnswer={result.short_answer}
      />

      {tts.isSupported && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={toggleListen} aria-pressed={tts.speaking}>
            {tts.speaking ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-4 h-4" />}
            {tts.speaking ? 'Stop reading' : 'Listen to result'}
          </Button>
        </div>
      )}

      {/* Detailed sections */}
      <div className="space-y-2">
        <Section title="What the evidence says" icon={<BookOpen className="w-4 h-4" />}>
          <p>{result.what_evidence_says}</p>
        </Section>

        <Section title="Why this verdict" icon={<HelpCircle className="w-4 h-4" />}>
          <p>{result.why_accurate_or_not}</p>
        </Section>

        <Section title="Supporting evidence" icon={<CheckCircle className="w-4 h-4" />} defaultOpen={false}>
          <p>{result.supporting_evidence}</p>
        </Section>

        <Section title="Contradicting evidence" icon={<XCircle className="w-4 h-4" />} defaultOpen={false}>
          <p>{result.contradicting_evidence}</p>
        </Section>

        <Section title="Missing context & limitations" icon={<AlertTriangle className="w-4 h-4" />} defaultOpen={false}>
          <p>{result.missing_context}</p>
        </Section>

        <Section title="What you can do next" icon={<ArrowRight className="w-4 h-4" />}>
          <p>{result.what_to_do_next}</p>
        </Section>

        <Section title="When to seek professional care" icon={<AlertTriangle className="w-4 h-4" />}>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-lg p-3 text-amber-800 dark:text-amber-300">
            {result.when_to_seek_care}
          </div>
        </Section>

        <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 p-4 bg-gray-50 dark:bg-gray-800/50">
            <ExternalLink className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
              Sources ({result.sources.length})
            </span>
            {result.retrieval_status === 'unavailable' && (
              <Badge variant="warning" className="ml-auto">Training knowledge only</Badge>
            )}
          </div>
          <SourceList sources={result.sources} retrievalStatus={result.retrieval_status} />
        </div>
      </div>

      {/* Feedback */}
      {!feedbackSubmitted ? (
        <div className="text-center py-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Was this analysis helpful?</p>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => submitFeedback(r)}
                className="p-1 text-gray-300 hover:text-amber-400 transition-colors"
                aria-label={`Rate ${r} star${r !== 1 ? 's' : ''}`}
              >
                <Star className={`w-5 h-5 ${feedbackRating !== null && r <= feedbackRating ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-2">Thank you for your feedback.</p>
      )}

      {/* Reset */}
      <div className="flex justify-center pt-2">
        <Button variant="secondary" onClick={onReset}>
          Check another claim
        </Button>
      </div>
    </div>
  );
}
