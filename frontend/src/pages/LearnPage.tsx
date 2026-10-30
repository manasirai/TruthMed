import { Link } from 'react-router-dom';
import { BookOpen, FlaskConical, Brain, Heart, Activity, ArrowRight, Droplets } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const TOPICS = [
  {
    title: 'How to Read Health Headlines',
    icon: <BookOpen className="w-5 h-5" />,
    desc: 'Health news often oversimplifies complex studies. Learn to identify misleading claims, correlation vs causation, and publication bias.',
    tags: ['Media literacy', 'Research basics'],
  },
  {
    title: 'Understanding Clinical Trials',
    icon: <FlaskConical className="w-5 h-5" />,
    desc: 'What makes a study reliable? Learn about randomized controlled trials, sample sizes, placebo controls, blinding, and statistical significance.',
    tags: ['Research design', 'Evidence levels'],
  },
  {
    title: 'The Evidence Hierarchy',
    icon: <Brain className="w-5 h-5" />,
    desc: 'From expert opinion to systematic reviews — discover how TruthMed prioritizes different types of evidence and why some sources are more reliable.',
    tags: ['Evidence grading', 'Methodology'],
  },
  {
    title: 'Common Misinformation Patterns',
    icon: <Activity className="w-5 h-5" />,
    desc: 'Anecdotal evidence, cherry-picking, appeal to nature, and other logical fallacies commonly found in health misinformation.',
    tags: ['Critical thinking', 'Fallacies'],
  },
  {
    title: 'Supplements and Alternative Medicine',
    icon: <Droplets className="w-5 h-5" />,
    desc: 'How to evaluate supplement claims, understand regulatory differences between drugs and supplements, and spot pseudoscientific marketing.',
    tags: ['Supplements', 'Regulation'],
  },
  {
    title: 'When AI Gets Health Wrong',
    icon: <Brain className="w-5 h-5" />,
    desc: 'AI systems including TruthMed have limitations. Learn about hallucination, knowledge cutoffs, and when to always consult a professional.',
    tags: ['AI limitations', 'Safety'],
  },
];

const ANATOMY_HIGHLIGHTS = [
  { id: 'heart', name: 'Heart', fact: 'Beats ~100,000 times per day. Cardiovascular disease is the world\'s leading cause of death.' },
  { id: 'brain', name: 'Brain', fact: 'Uses 20% of your body\'s oxygen despite being only 2% of your body weight.' },
  { id: 'kidneys', name: 'Kidneys', fact: 'Filter approximately 180 litres of blood per day and are highly sensitive to dehydration.' },
  { id: 'liver', name: 'Liver', fact: 'The only internal organ that can regenerate from as little as 25% of its original tissue.' },
];

export function LearnPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Health Education Centre</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed">
          Build your health literacy. Learn how to evaluate medical evidence, spot misinformation, and understand your body.
        </p>
      </div>

      {/* Learning topics */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Health Literacy Topics</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOPICS.map((topic) => (
            <Card key={topic.title} className="hover:shadow-card-md transition-shadow flex flex-col">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex-shrink-0">
                  {topic.icon}
                </div>
                <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 leading-tight">{topic.title}</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1 mb-3">{topic.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {topic.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">Full articles coming soon — content under medical review.</p>
      </section>

      {/* Anatomy highlights */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Did You Know?</h2>
          <Link to="/explore" className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
            Full anatomy explorer <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ANATOMY_HIGHLIGHTS.map((item) => (
            <Link key={item.id} to={`/explore/${item.id}`}>
              <Card className="hover:shadow-card-md transition-shadow hover:border-teal-100 dark:hover:border-teal-900 cursor-pointer h-full">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-teal-500" />
                  <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{item.name}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.fact}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50 rounded-xl p-6 text-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Found a suspicious health claim?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
          Use TruthMed's AI fact-checker to analyze it against medical evidence and get a clear, cited verdict.
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
