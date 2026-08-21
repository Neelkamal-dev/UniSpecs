import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';

export const Header: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    api.getHealth()
      .then(setHealthStatus)
      .catch(() => setHealthStatus({ status: 'offline' }));
  }, []);

  const isHealthy = healthStatus?.status === 'healthy';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-border bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        {/* Brand / Wordmark */}
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <span className="text-lg font-bold tracking-tight text-neutral-900 font-sans">
              Uni<span className="text-brand-700">Specs</span>
            </span>
            <span className="hidden sm:inline-block text-[11px] font-medium text-neutral-500 border-l border-neutral-200 pl-2.5">
              Product Intelligence
            </span>
          </Link>

          {/* Clean Navigation */}
          <nav className="hidden md:flex items-center space-x-1 text-xs font-medium text-neutral-600">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === '/' 
                  ? 'bg-neutral-100 text-neutral-900 font-semibold' 
                  : 'hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Analyze
            </Link>
          </nav>
        </div>

        {/* System Status Indicator */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-neutral-600 bg-canvas-muted px-2.5 py-1 rounded-md border border-surface-border font-mono">
            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-brand-600' : 'bg-amber-500'}`} />
            <span className="text-[11px] font-sans font-medium text-neutral-600 hidden sm:inline">System:</span>
            <span className="text-[11px] font-semibold text-neutral-800">
              {isHealthy ? 'Operational' : 'Active'}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};

