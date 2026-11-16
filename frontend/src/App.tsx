import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { FactCheckPage } from './pages/FactCheckPage';
import { ExplorePage } from './pages/ExplorePage';
import { MythsPage } from './pages/MythsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AboutPage } from './pages/AboutPage';
import { WebPet, PetErrorBoundary } from './components/mypet';

export default function App() {
  return (
    <PetErrorBoundary fallback={<p>Something went wrong. Please refresh the page.</p>}>
      <BrowserRouter>
        <WebPet name="Mochi" sleepAfter={30000} />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/fact-check" element={<FactCheckPage />} />
            <Route path="/fact-check/:resultId" element={<FactCheckPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/:organId" element={<ExplorePage />} />
            <Route path="/myths" element={<MythsPage />} />
            <Route path="/learn" element={<Navigate to="/myths" replace />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PetErrorBoundary>
  );
}