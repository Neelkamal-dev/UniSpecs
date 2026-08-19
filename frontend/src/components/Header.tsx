import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Cpu, Database, FileSpreadsheet, Activity } from 'lucide-react';
import { api } from '../services/api';

export const Header: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    api.getHealth()
      .then(setHealthStatus)
      .catch(() => setHealthStatus({ status: 'offline' }));
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 p-0.5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 font-sans">
                Uni<span className="text-emerald-600">Specs</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                AI PRODUCT INTELLIGENCE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">Evidence-Driven Verified Product Intelligence</p>
          </div>
        </Link>

        {/* Navigation & Status */}
        <div className="flex items-center space-x-6">
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-emerald-600 transition-colors flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>Intelligence Pipeline</span>
            </Link>
          </nav>

          {/* System Status Indicator */}
          <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono">
            <Activity className={`w-3.5 h-3.5 ${healthStatus?.status === 'healthy' ? 'text-emerald-600 animate-pulse' : 'text-amber-600'}`} />
            <span className="text-slate-600 font-sans font-medium hidden sm:inline">System Status:</span>
            <span className={healthStatus?.status === 'healthy' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
              {healthStatus?.status === 'healthy' ? 'OPERATIONAL' : 'LOCAL FALLBACK'}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};
