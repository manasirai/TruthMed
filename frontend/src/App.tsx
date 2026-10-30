import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { FactCheckPage } from './pages/FactCheckPage';
import { ExplorePage } from './pages/ExplorePage';
import { LearnPage } from './pages/LearnPage';
import { HistoryPage } from './pages/HistoryPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/fact-check" element={<FactCheckPage />} />
          <Route path="/fact-check/:resultId" element={<FactCheckPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/explore/:organId" element={<ExplorePage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
