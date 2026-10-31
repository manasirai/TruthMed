import { Shield, BookOpen, AlertTriangle, ExternalLink, Cpu, Database } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const SOURCE_HIERARCHY = [
  { tier: 'Tier 1  Primary', sources: 'WHO, India MoHFW/ICMR, NHS, CDC, NIH/MedlinePlus, FDA', desc: 'Official national and international public health authorities.' },
  { tier: 'Tier 2  Peer-Reviewed', sources: 'Systematic reviews, meta-analyses, RCTs', desc: 'Published in reputable indexed journals with peer review.' },
  { tier: 'Tier 3  Clinical Guidelines', sources: 'Medical specialty organizations', desc: 'Evidence-based guidelines from recognized clinical bodies.' },
  { tier: 'Tier 4  Observational', sources: 'Cohort and case-control studies', desc: 'Used when higher-level evidence is unavailable.' },
];

const LIMITATIONS = [
  'Knowledge cutoff: Models training has a knowledge cutoff. Very recent developments may not be reflected.',
  'No live search by default: Without a configured search provider, analysis relies on training knowledge.',
  'Not a medical device: TruthMed is not approved or regulated as a medical device or diagnostic tool.',
  'Nuance loss: Complex medical topics may be oversimplified. Always read the full cited sources.',
  'Language: Analysis quality may vary for non-English claims.',
  'Hallucination risk: Despite safeguards, AI can generate plausible-sounding but incorrect information.',
  'No personalization: Results reflect general population evidence and do not account for individual medical history.',
];

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">About TruthMed</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
          TruthMed is an AI-powered health information literacy tool. It helps people evaluate the evidence behind health claims  not replace professional medical judgment.
        </p>
      </div>

      {/* Methodology */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          How the Analysis Works
        </h2>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          <p>
            When you submit a health claim, TruthMed's pipeline performs the following steps:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>The claim is validated, normalized, and classified by type (medical, nutritional, supplement, etc.).</li>
            <li>If a search provider is configured (Brave Search API), we query trusted medical domains for relevant evidence.</li>
            <li>Retrieved content is passed to backend model with strict instructions to treat external data as raw input, not trusted instructions.</li>
            <li>Backend synthesizes the evidence, identifies contradictions, and produces a structured assessment.</li>
            <li>The response is validated against a Pydantic schema. If parsing fails, the error is caught and reported  not silently ignored.</li>
            <li>Results, sources, and metadata are persisted in the database.</li>
          </ol>
          <p className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-lg p-3 text-amber-800 dark:text-amber-300 text-xs">
            If real-time source retrieval is not configured, TruthMed tells you explicitly. We never fabricate a web search that did not occur.
          </p>
        </div>
      </section>

      {/* Source hierarchy */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          Source Hierarchy
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {SOURCE_HIERARCHY.map((item) => (
            <Card key={item.tier} padding="sm">
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-1">{item.tier}</p>
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">{item.sources}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
            </Card>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
          The hierarchy guides prioritization, but we always assess the actual quality, relevance, and date of each source.
          Higher-tier sources do not automatically override more recent or directly relevant evidence.
        </p>
      </section>

      {/* Verdicts */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          Verdict Categories
        </h2>
        <div className="space-y-2 text-sm">
          {[
            { v: 'Supported by Evidence', c: 'text-emerald-600', d: 'Strong, consistent evidence from reliable sources supports the claim.' },
            { v: 'Mostly Supported', c: 'text-teal-600', d: 'Evidence generally supports the claim, with some caveats or minor inconsistencies.' },
            { v: 'Misleading or Missing Context', c: 'text-amber-600', d: 'The claim contains a grain of truth but is presented in a misleading way or lacks essential context.' },
            { v: 'Mostly False', c: 'text-orange-600', d: 'The claim contains some factual elements but is predominantly inaccurate.' },
            { v: 'False', c: 'text-red-600', d: 'Strong evidence directly contradicts the claim.' },
            { v: 'Insufficient Evidence', c: 'text-gray-500', d: 'The evidence is absent, conflicting, or too limited to support a clear verdict.' },
          ].map((item) => (
            <div key={item.v} className="flex gap-3">
              <span className={`text-xs font-semibold w-40 flex-shrink-0 ${item.c}`}>{item.v}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{item.d}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Limitations */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Known Limitations
        </h2>
        <ul className="space-y-2">
          {LIMITATIONS.map((l) => (
            <li key={l} className="flex gap-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              <span className="text-amber-500 mt-0.5 flex-shrink-0">·</span>
              {l}
            </li>
          ))}
        </ul>
      </section>

      {/* Medical disclaimer */}
      <section className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl p-5">
        <h2 className="text-sm font-bold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Medical Disclaimer
        </h2>
        <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
          TruthMed is an educational tool, not a medical device, diagnostic system, or clinical decision support tool.
          Results do not constitute medical advice. TruthMed cannot diagnose conditions, prescribe treatments, or account
          for your individual medical history. For any personal health decisions, always consult a qualified healthcare
          professional. In an emergency, contact your local emergency services immediately (999 in UK, 112 in EU, 911 in US/Canada, 102 in India).
        </p>
      </section>
    </div>
  );
}
