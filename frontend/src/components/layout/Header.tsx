import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Activity, Menu, X, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/fact-check', label: 'Fact Check' },
  { to: '/explore', label: 'Anatomy' },
  { to: '/learn', label: 'Learn' },
  { to: '/history', label: 'History' },
  { to: '/about', label: 'About' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 focus-ring rounded-lg" aria-label="TruthMed home">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700">
              <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-base tracking-tight">
              Truth<span className="text-teal-600 dark:text-teal-400">Med</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-1.5 text-sm rounded-lg transition-colors focus-ring',
                    isActive
                      ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-2">
            <Link to="/fact-check" className="hidden md:block">
              <Button size="sm" className="gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" />
                Check a Claim
              </Button>
            </Link>
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus-ring"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <nav className="px-4 py-3 space-y-1" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2 text-sm rounded-lg transition-colors',
                    isActive
                      ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <Link to="/fact-check" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full">Check a Claim</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
