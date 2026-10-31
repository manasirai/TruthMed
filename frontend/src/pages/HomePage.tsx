import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FlaskConical, Shield, BookOpen, Brain, Search, Sparkles, ArrowRight,
  CheckCircle2, XCircle, AlertTriangle, ClipboardPaste, FileSearch, Cpu, BadgeCheck,
  Globe2, Landmark, Microscope, Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ClaimInput } from '@/components/fact-check/ClaimInput';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

const AnatomyViewer = lazy(() =>
  import('@/components/anatomy/AnatomyViewer').then((m) => ({ default: m.AnatomyViewer }))
);

// Anatomy section is temporarily hidden; set to true to bring it back.
const SHOW_ANATOMY = false;

const FEATURES = [
  { icon: Search, title: 'Real evidence', desc: 'WHO, NHS, NIH & journals', tint: 'from-teal-400 to-emerald-500' },
  { icon: Shield, title: 'Clear verdicts', desc: 'Six levels, not just true/false', tint: 'from-sky-400 to-indigo-500' },
  { icon: Brain, title: 'Interactive anatomy', desc: 'Explore the body in 3D', tint: 'from-fuchsia-400 to-purple-500', hidden: !SHOW_ANATOMY },
  { icon: BookOpen, title: 'Cited sources', desc: 'Every claim, every link', tint: 'from-amber-400 to-orange-500' },
];

const STEPS = [
  { icon: ClipboardPaste, title: 'Paste', desc: 'Any health claim' },
  { icon: FileSearch, title: 'Search', desc: 'Trusted sources' },
  { icon: Cpu, title: 'Analyze', desc: 'AI weighs evidence' },
  { icon: BadgeCheck, title: 'Verdict', desc: 'With citations' },
];

const SOURCES = [
  { icon: Globe2, label: 'WHO' },
  { icon: Landmark, label: 'NIH' },
  { icon: Stethoscope, label: 'NHS' },
  { icon: Microscope, label: 'PubMed' },
];

const SHOWCASE = [
  { claim: 'Vaccines cause autism', verdict: 'False', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/40', bar: 'bg-red-500', score: 4 },
  { claim: 'Exercise boosts mood', verdict: 'Supported', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', bar: 'bg-emerald-500', score: 92 },
  { claim: 'Carrots improve eyesight', verdict: 'Misleading', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40', bar: 'bg-amber-500', score: 41 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = { show: { transition: { staggerChildren: 0.1 } } };

function VerdictShowcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SHOWCASE.length), 3200);
    return () => clearInterval(id);
  }, []);

  const item = SHOWCASE[index];
  const Icon = item.icon;

  return (
    <div className="relative h-full flex items-center justify-center p-8">
      {/* Floating icon bubbles */}
      {[
        { Icon: Shield, cls: 'top-10 left-8 text-teal-500', delay: 0 },
        { Icon: BookOpen, cls: 'top-16 right-10 text-indigo-500', delay: 0.6 },
        { Icon: Microscope, cls: 'bottom-16 left-12 text-fuchsia-500', delay: 1.2 },
        { Icon: Sparkles, cls: 'bottom-10 right-14 text-amber-500', delay: 1.8 },
      ].map(({ Icon: B, cls, delay }, i) => (
        <motion.div
          key={i}
          className={`absolute ${cls} w-12 h-12 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-card-lg flex items-center justify-center`}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay }}
          aria-hidden
        >
          <B className="w-6 h-6" />
        </motion.div>
      ))}

      {/* Verdict card */}
      <div className="relative w-full max-w-xs">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-card-lg border border-gray-100 dark:border-gray-800"
          >
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Claim</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-5">“{item.claim}”</p>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${item.bg} mb-4`}>
              <Icon className={`w-5 h-5 ${item.color}`} />
              <span className={`font-bold ${item.color}`}>{item.verdict}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
              <span>Evidence strength</span>
              <span>{item.score}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${item.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${item.score}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>

            <div className="flex gap-1.5 mt-4">
              {SOURCES.slice(0, 3).map((s) => (
                <span key={s.label} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                  {s.label}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-5">
          {SHOWCASE.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-teal-500' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [previewOrganId, setPreviewOrganId] = useState<string | null>(null);
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null);

  const { mutate: checkClaim, isPending } = useMutation({
    mutationFn: (claim: string) => api.factCheck.create(claim),
    onSuccess: (result) => {
      navigate('/fact-check', { state: { result } });
    },
    onError: () => {
      navigate('/fact-check', { state: { error: true } });
    },
  });

  const features = FEATURES.filter((f) => !f.hidden);

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative">
        {/* Animated background blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <motion.div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-teal-300/30 dark:bg-teal-500/10 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-20 -right-32 w-[28rem] h-[28rem] rounded-full bg-indigo-300/30 dark:bg-indigo-500/10 blur-3xl"
            animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-gray-900/70 backdrop-blur text-teal-700 dark:text-teal-400 text-xs font-semibold mb-6 border border-teal-100 dark:border-teal-900 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI health fact checker
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-6xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight leading-[1.05] mb-5"
              >
                Heard a health claim?{' '}
                <span className="bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500 bg-clip-text text-transparent">
                  Check it.
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                Science-backed answers in seconds.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-card-lg"
              >
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-teal-400/30 via-transparent to-indigo-400/30 -z-10 blur-md" aria-hidden />
                <ClaimInput onSubmit={checkClaim} loading={isPending} />
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2 mt-6">
                <span className="text-xs text-gray-400 mr-1">Backed by</span>
                {SOURCES.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/70 dark:bg-gray-900/70 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300"
                  >
                    <Icon className="w-3.5 h-3.5 text-teal-500" />
                    {label}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-teal-50 via-white to-indigo-50 dark:from-teal-950/30 dark:via-gray-950 dark:to-indigo-950/30 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden aspect-[4/5] lg:aspect-square">
                {SHOW_ANATOMY ? (
                  <>
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center h-full">
                          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
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
                        className="flex items-center gap-1.5 text-xs font-medium bg-white/90 dark:bg-gray-900/90 text-teal-700 dark:text-teal-400 px-3 py-1.5 rounded-full border border-teal-100 dark:border-teal-800 shadow-sm"
                      >
                        Explore Full Anatomy
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <VerdictShowcase />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center mb-10"
          >
            Why TruthMed
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${features.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
          >
            {features.map(({ icon: Icon, title, desc, tint }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                whileHover={{ y: -6 }}
                className="group relative bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-card hover:shadow-card-lg transition-shadow"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tint} text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center mb-12"
          >
            How it works
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="relative grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-teal-300 via-emerald-300 to-indigo-300 dark:from-teal-800 dark:via-emerald-800 dark:to-indigo-800" aria-hidden />
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} variants={fadeUp} className="relative flex flex-col items-center text-center">
                <div className="relative w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-card-md flex items-center justify-center mb-3 text-teal-600 dark:text-teal-400">
                  <Icon className="w-7 h-7" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative max-w-4xl mx-auto overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 via-emerald-600 to-indigo-600 px-6 py-14 text-center shadow-card-lg"
        >
          <motion.div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-2xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
          <h2 className="relative text-3xl sm:text-4xl font-extrabold text-white mb-3">Stop guessing. Start knowing.</h2>
          <p className="relative text-teal-50 mb-8">Free, fast, and evidence-based.</p>
          <Link to="/fact-check" className="relative inline-block">
            <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50 rounded-full px-8 shadow-lg">
              <FlaskConical className="w-4 h-4" />
              Check a claim
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
