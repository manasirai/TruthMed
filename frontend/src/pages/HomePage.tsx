import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FlaskConical, Shield, BookOpen, Zap, Brain, Search,
  ArrowRight, CheckCircle, AlertTriangle, HelpCircle, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ClaimInput } from '@/components/fact-check/ClaimInput';
import { useMutation } from '@tanstack/react-query';
import { pet } from '@/components/mypet';
import { api } from '@/lib/api';
import { useNavigate as useNav } from 'react-router-dom';

const AnatomyViewer = lazy(() =>
  import('@/components/anatomy/AnatomyViewer').then((m) => ({ default: m.AnatomyViewer }))
);

// Anatomy section is temporarily hidden; set to true to bring it back.
const SHOW_ANATOMY = false;

const FEATURES = [
  {
    icon: <Search className="w-5 h-5" />,
    title: 'Evidence-Based Analysis',
    desc: 'Claims are assessed against medical literature from WHO, NHS, NIH, and peer-reviewed sources.',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Transparent Verdicts',
    desc: 'Six verdict categories with clear explanations  we never force a claim into just "true" or "false".',
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: 'Interactive Anatomy',
    desc: 'Explore the human body in 3D. Click any organ to learn its function, conditions, and evidence-based facts.',
    hidden: !SHOW_ANATOMY,
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Cited Sources',
    desc: 'Every analysis cites its sources  no hallucinated URLs, no fabricated statistics.',
  },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Submit a claim', desc: 'Paste any health claim, viral post, or medical headline.' },
  { step: '2', title: 'Evidence retrieval', desc: 'We search trusted medical sources for relevant evidence.' },
  { step: '3', title: 'AI synthesis', desc: 'AI weighs evidences and identifies any contradictions or missing context.' },
  { step: '4', title: 'Structured verdict', desc: 'You receive a clear verdict with citations and next steps.' },
];

export function HomePage() {
  const navigate = useNavigate();
  const [previewOrganId, setPreviewOrganId] = useState<string | null>(null);
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null);

  const { mutate: checkClaim, isPending } = useMutation({
    mutationFn: (claim: string) => api.factCheck.create(claim),
    onSuccess: (result) => {
      pet.stopWork('celebrate', 'Done! Here’s what I found.');
      navigate('/fact-check', { state: { result } });
    },
    onError: () => {
      pet.stopWork('sad', 'Hmm, I couldn’t finish that one.');
      navigate('/fact-check', { state: { error: true } });
    },
  });

  return (
    <div className="overflow-hidden">
      {/* Hero section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-16 lg:pb-20">
        <div className={`grid gap-12 items-center ${SHOW_ANATOMY ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto'}`}>
          {/* Left: claim input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 text-xs font-medium mb-5 border border-teal-100 dark:border-teal-900">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse-soft" aria-hidden />
              AI-Powered Health Fact Checker
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-50 tracking-tight leading-[1.15] mb-4">
              Is that health claim{' '}
              <span className="text-teal-600 dark:text-teal-400">actually true?</span>
            </h1>

            <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-xl">
              TruthMed analyzes health claims against peer-reviewed medical evidence and
              trusted authorities  and tells you exactly what the science actually says.
            </p>

            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-card-md">
              <ClaimInput onSubmit={checkClaim} loading={isPending} />
            </div>

            <div className="flex flex-wrap gap-4 mt-5">
              {[
                { icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />, text: 'Source-cited analysis' },
                { icon: <Shield className="w-3.5 h-3.5 text-teal-500" />, text: 'No fabricated data' },
                { icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />, text: 'Acknowledges uncertainty' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {item.icon}
                  {item.text}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: 3D anatomy preview */}
          {SHOW_ANATOMY && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative"
          >
            <div className="bg-gradient-to-b from-teal-50/50 to-blue-50/30 dark:from-teal-950/20 dark:to-blue-950/20 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden aspect-[4/5]">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-gray-400">Loading 3D viewer…</p>
                    </div>
                  </div>
                }
              >
                <AnatomyViewer
                  selectedOrganId={previewOrganId}
                  hoveredOrganId={hoveredOrgan}
                  onSelect={setPreviewOrganId}
                  onHover={setHoveredOrgan}
                  className="w-full h-full"
                />
              </Suspense>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <Link
                  to="/explore"
                  className="flex items-center gap-1.5 text-xs font-medium bg-white/90 dark:bg-gray-900/90 text-teal-700 dark:text-teal-400 px-3 py-1.5 rounded-full border border-teal-100 dark:border-teal-800 hover:bg-white dark:hover:bg-gray-900 transition-colors shadow-sm"
                >
                  Explore Full Anatomy
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">Click an organ to learn more</p>
          </motion.div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-10">
            Evidence-based. Transparent. Honest.
          </h2>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${SHOW_ANATOMY ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            {FEATURES.filter((f) => !f.hidden).map((f) => (
              <Card key={f.title} className="hover:shadow-card-md transition-shadow">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 mb-3">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-10">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.step} className="relative">
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden lg:block absolute top-4 left-full w-full h-px bg-gray-200 dark:bg-gray-700 z-0" />
              )}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-600 text-white text-sm font-bold mb-3">
                  {step.step}
                </div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1.5">{step.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-teal-600 to-teal-700 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Start verifying health claims</h2>
          <p className="text-teal-100 text-sm mb-6">
            Join the fight against health misinformation with evidence-based AI analysis.
          </p>
          <Link to="/fact-check">
            <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50">
              <FlaskConical className="w-4 h-4" />
              Check a Claim Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}