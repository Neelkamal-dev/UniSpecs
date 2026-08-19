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
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analyze/:jobId" element={<AnalysisProgressPage />} />
              <Route path="/products/:productId" element={<ProductDashboardPage />} />
            </Routes>
          </main>
          <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 font-mono bg-white">
            UniSpecs Platform — AI Product Intelligence • Evidence-Driven Product Pipeline
          </footer>
        </div>
      </Router>
    </QueryClientProvider>
  );
};
export default App;
