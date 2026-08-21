import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { AnalysisProgressPage } from './pages/AnalysisProgressPage';
import { ProductDashboardPage } from './pages/ProductDashboardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-canvas text-neutral-900 flex flex-col font-sans">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analyze/:jobId" element={<AnalysisProgressPage />} />
              <Route path="/products/:productId" element={<ProductDashboardPage />} />
            </Routes>
          </main>
          <footer className="border-t border-surface-border py-5 text-center text-xs text-neutral-500 font-sans bg-white">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="font-semibold text-neutral-700">UniSpecs Platform</span>
              <span>Reliable product intelligence, verified from authoritative sources.</span>
            </div>
          </footer>
        </div>
      </Router>
    </QueryClientProvider>
  );
};
export default App;

