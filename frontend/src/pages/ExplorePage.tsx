import { lazy, Suspense, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { ORGAN_MESHES, SYSTEM_COLORS } from '@/data/organPositions';
import { OrganInfoPanel } from '@/components/anatomy/OrganInfoPanel';
import type { ViewMode } from '@/components/anatomy/AnatomyViewer';

const AnatomyViewer = lazy(() =>
  import('@/components/anatomy/AnatomyViewer').then((m) => ({ default: m.AnatomyViewer }))
);

export function ExplorePage() {
  const { organId: routeOrganId } = useParams<{ organId?: string }>();
  const navigate = useNavigate();

  const [selectedOrganId, setSelectedOrganId] = useState<string | null>(routeOrganId ?? null);
  const [hoveredOrganId, setHoveredOrganId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [systemFilter, setSystemFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('full');

  const systems = Array.from(new Set(ORGAN_MESHES.map((o) => o.system)));

  const filteredOrgans = ORGAN_MESHES.filter((o) => {
    const matchesSearch = o.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSystem = !systemFilter || o.system === systemFilter;
    return matchesSearch && matchesSystem;
  });

  function handleOrganSelect(id: string) {
    setSelectedOrganId(id);
    navigate(`/explore/${id}`, { replace: true });
  }

  function handleClose() {
    setSelectedOrganId(null);
    navigate('/explore', { replace: true });
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row overflow-hidden">
      {/* Left sidebar  organ list */}
      <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-y-auto">
        <div className="p-3 sticky top-0 bg-white dark:bg-gray-950 z-10 border-b border-gray-100 dark:border-gray-800">
          <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Anatomy Explorer</h1>
          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search organs…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              aria-label="Search organs"
            />
          </div>
          {/* System filters */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSystemFilter(null)}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                !systemFilter
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            {systems.map((sys) => (
              <button
                key={sys}
                onClick={() => setSystemFilter(sys === systemFilter ? null : sys)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                  systemFilter === sys
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                style={systemFilter === sys ? { backgroundColor: SYSTEM_COLORS[sys] } : {}}
              >
                {sys}
              </button>
            ))}
          </div>
        </div>

        <nav aria-label="Organ list">
          {filteredOrgans.length === 0 ? (
            <p className="p-4 text-xs text-gray-400 dark:text-gray-500">No organs match your search.</p>
          ) : (
            <ul>
              {filteredOrgans.map((organ) => (
                <li key={organ.id}>
                  <button
                    onClick={() => handleOrganSelect(organ.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      selectedOrganId === organ.id
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-l-2 border-teal-500'
                        : 'border-l-2 border-transparent'
                    }`}
                    aria-pressed={selectedOrganId === organ.id}
                    onMouseEnter={() => setHoveredOrganId(organ.id)}
                    onMouseLeave={() => setHoveredOrganId(null)}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: organ.color }}
                      aria-hidden
                    />
                    <span className={`font-medium ${selectedOrganId === organ.id ? 'text-teal-700 dark:text-teal-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {organ.name}
                    </span>
                    <span className="ml-auto text-gray-400 dark:text-gray-500 text-xs">{organ.system}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>

      {/* Center: 3D viewer */}
      <div className="flex-1 relative bg-gradient-to-b from-slate-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-400">Loading 3D anatomy…</p>
              </div>
            </div>
          }
        >
          <AnatomyViewer
            selectedOrganId={selectedOrganId}
            hoveredOrganId={hoveredOrganId}
            onSelect={handleOrganSelect}
            onHover={setHoveredOrganId}
            viewMode={viewMode}
            className="w-full h-full"
          />
        </Suspense>

        {/* Controls hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 pointer-events-none">
          Drag to rotate · Scroll to zoom · Click an organ to learn more
        </div>

        {/* Top-left: reset + view-mode toggle */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {selectedOrganId && (
            <button
              onClick={handleClose}
              className="flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm transition-colors"
              aria-label="Reset camera"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset view
            </button>
          )}
          <button
            onClick={() => setViewMode((v) => (v === 'full' ? 'organs' : 'full'))}
            className="flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm transition-colors"
            aria-label="Toggle body silhouette"
            title={viewMode === 'full' ? 'Hide body outline' : 'Show body outline'}
          >
            {viewMode === 'full' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {viewMode === 'full' ? 'Organs only' : 'Show body'}
          </button>
        </div>

        {/* Model disclaimer */}
        <div className="absolute top-3 right-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-800">
          Procedural model  educational use only
        </div>
      </div>

      {/* Right: organ info panel */}
      {selectedOrganId && (
        <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden flex flex-col max-h-60 lg:max-h-full">
          <OrganInfoPanel organId={selectedOrganId} onClose={handleClose} />
        </aside>
      )}
    </div>
  );
}
