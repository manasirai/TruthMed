import { Link } from 'react-router-dom';
import { Activity, AlertTriangle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Disclaimer */}
        <div className="flex gap-3 items-start p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl mb-6">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>Medical Disclaimer:</strong> TruthMed is an educational tool for health information literacy. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for personal health decisions. In an emergency, call your local emergency services immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-teal-700">
                <Activity className="w-3 h-3 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                Truth<span className="text-teal-600 dark:text-teal-400">Med</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              AI-powered health claim verification and health education.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">Tools</h4>
            <ul className="space-y-2">
              {[
                { to: '/fact-check', label: 'Fact Checker' },
                { to: '/explore', label: '3D Anatomy Explorer', hidden: true },
                { to: '/learn', label: 'Health Education' },
                { to: '/history', label: 'Analysis History' },
              ].filter((l) => !l.hidden).map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-xs text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">Info</h4>
            <ul className="space-y-2">
              {[
                { to: '/about', label: 'Methodology' },
                { to: '/privacy', label: 'Privacy Policy' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-xs text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} TruthMed. For educational purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
