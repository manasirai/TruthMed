import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FlaskConical, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { VERDICT_CONFIG, cn } from '@/lib/utils';
import type { VerdictType } from '@/types';

const CATEGORIES = ['Food & Nutrition', 'Supplements', 'Home Remedies', 'Body & Fitness', 'Viral Forwards'] as const;
type Category = (typeof CATEGORIES)[number];

// Popular claims only. Verdicts come from the fact-checker itself, never hard-coded here.
const MYTHS: { claim: string; category: Category }[] = [
  { claim: 'You need to drink 8 glasses of water every day.', category: 'Food & Nutrition' },
  { claim: 'Eating carrots improves your night vision.', category: 'Food & Nutrition' },
  { claim: 'Eating late at night makes you gain weight.', category: 'Food & Nutrition' },
  { claim: 'Brown sugar is much healthier than white sugar.', category: 'Food & Nutrition' },
  { claim: 'Vitamin C supplements prevent the common cold.', category: 'Supplements' },
  { claim: 'Taking a daily multivitamin prevents chronic disease.', category: 'Supplements' },
  { claim: 'Detox teas flush toxins out of your body.', category: 'Supplements' },
  { claim: 'Papaya leaf juice cures dengue.', category: 'Home Remedies' },
  { claim: 'Haldi doodh (turmeric milk) cures COVID-19.', category: 'Home Remedies' },
  { claim: 'Putting toothpaste on a burn helps it heal.', category: 'Home Remedies' },
  { claim: 'Going out with wet hair gives you a cold.', category: 'Home Remedies' },
  { claim: 'Cracking your knuckles causes arthritis.', category: 'Body & Fitness' },
  { claim: 'We only use 10% of our brains.', category: 'Body & Fitness' },
  { claim: 'Stretching before exercise prevents injuries.', category: 'Body & Fitness' },
  { claim: 'Sugar makes children hyperactive.', category: 'Body & Fitness' },
  { claim: 'Microwaving food destroys its nutrients and makes it harmful.', category: 'Viral Forwards' },
  { claim: 'Drinking hot water kills the coronavirus in your throat.', category: 'Viral Forwards' },
  { claim: 'Vaccines cause autism.', category: 'Viral Forwards' },
];

const WARNING_SIGNS = [
  { title: 'It cures everything', desc: 'One food, herb or drink that "cures" many unrelated diseases.' },
  { title: '"Doctors don\'t want you to know"', desc: 'Claims of a hidden truth instead of published evidence.' },
  { title: 'Stories, not studies', desc: '"It worked for my aunt" is an anecdote, not proof.' },
  { title: '"Forward to everyone!"', desc: 'Urgency and fear are designed to make you share before you check.' },
];

function isVerdict(v: string): v is VerdictType {
  return v in VERDICT_CONFIG;
}

export function MythsPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | 'All'>('All');

  // Only looks up verdicts that were already analyzed; never triggers a new analysis.
  const { data: verdicts } = useQuery({
    queryKey: ['myth-verdicts'],
    queryFn: () => api.factCheck.lookup(MYTHS.map((m) => m.claim)),
    select: (items) => new Map(items.map((i) => [i.claim, i])),
  });

  const visible = category === 'All' ? MYTHS : MYTHS.filter((m) => m.category === category);

  function open(claim: string) {
    const known = verdicts?.get(claim);
    if (known) navigate(`/fact-check/${known.result_id}`);
    else navigate('/fact-check', { state: { claim } });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Health Myths, Checked</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed">
          Claims you've probably heard from family, friends or a WhatsApp forward. Pick one and see what the medical evidence actually says.
        </p>
      </div>

      {/* How to spot a myth */}
      <section className="mb-8 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">How to spot a health myth</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WARNING_SIGNS.map((s) => (
            <div key={s.title}>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-0.5">{s.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Filter myths by category">
        {(['All', ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors focus-ring',
              category === c
                ? 'bg-teal-600 border-teal-600 text-white'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-300 dark:hover:border-teal-700'
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Myth cards */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {visible.map((myth) => {
          const known = verdicts?.get(myth.claim);
          const cfg = known && isVerdict(known.verdict) ? VERDICT_CONFIG[known.verdict] : null;
          return (
            <button
              key={myth.claim}
              type="button"
              onClick={() => open(myth.claim)}
              className="text-left group focus-ring rounded-xl"
            >
              <Card className="h-full flex flex-col group-hover:shadow-card-md group-hover:border-teal-100 dark:group-hover:border-teal-900 transition-all">
                <span className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{myth.category}</span>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug flex-1 mb-4">“{myth.claim}”</p>
                <div className="flex items-center justify-between gap-2">
                  {cfg ? (
                    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', cfg.bg, cfg.color, cfg.border)}>
                      <span aria-hidden>{cfg.icon}</span> {cfg.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">Not checked yet</span>
                  )}
                  <span className="text-xs font-medium text-teal-600 dark:text-teal-400 flex items-center gap-1 whitespace-nowrap">
                    {cfg ? 'See why' : 'Check this'}
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Card>
            </button>
          );
        })}
      </section>

      {/* CTA */}
      <section className="bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50 rounded-xl p-6 text-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Heard something that's not on this list?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
          Paste or say any health claim, in English, Hindi or Hinglish, and get a clear, cited verdict.
        </p>
        <Link to="/fact-check">
          <Button>
            <FlaskConical className="w-4 h-4" />
            Check a Claim
          </Button>
        </Link>
      </section>
    </div>
  );
}
