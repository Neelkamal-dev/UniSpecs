import React from 'react';
import { X, ShieldCheck, AlertTriangle, ExternalLink, FileText, CheckCircle2, HelpCircle, Layers } from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';

export const AttributeDetailDrawer: React.FC = () => {
  const { isDrawerOpen, selectedAttribute, closeDrawer, activeProduct } = useAnalysisStore();

  if (!isDrawerOpen || !selectedAttribute) return null;

  const conflict = activeProduct?.conflicts?.find(
    (c) => c.attribute_name.toLowerCase() === selectedAttribute.attribute_name.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white border-l border-slate-200 h-full overflow-y-auto shadow-2xl p-6 flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700">
                {selectedAttribute.category || 'General Specification'}
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">{selectedAttribute.attribute_name}</h2>
            </div>
            <button
              onClick={closeDrawer}
              className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Value & Confidence Overview Card */}
          <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase font-mono">Verified Attribute Value</span>
                <div className="text-3xl font-extrabold text-slate-900 mt-1 flex items-baseline space-x-2">
                  <span>{selectedAttribute.value || <span className="text-slate-400 italic">Information not found</span>}</span>
                  {selectedAttribute.unit && (
                    <span className="text-sm font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                      {selectedAttribute.unit}
                    </span>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border flex items-center space-x-1.5 ${
                selectedAttribute.verification_status === 'VERIFIED'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : selectedAttribute.verification_status === 'CONFLICT'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : selectedAttribute.verification_status === 'NEEDS_REVIEW'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-blue-100 text-blue-800 border-blue-300'
              }`}>
                {selectedAttribute.verification_status === 'VERIFIED' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                {selectedAttribute.verification_status === 'CONFLICT' && <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />}
                {selectedAttribute.verification_status === 'NEEDS_REVIEW' && <HelpCircle className="w-3.5 h-3.5 text-amber-700" />}
                <span>{selectedAttribute.verification_status}</span>
              </span>
            </div>

            {/* Confidence Score Bar */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                <span className="text-slate-700">Explainable Confidence Score</span>
                <span className="font-mono text-emerald-700">
                  {Math.round((selectedAttribute.confidence || 0) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    selectedAttribute.confidence >= 0.85 ? 'bg-emerald-600' :
                    selectedAttribute.confidence >= 0.60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${(selectedAttribute.confidence || 0) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-2 italic leading-relaxed">
                "{selectedAttribute.confidence_reason || 'Derived from source authority score and 7-tier consensus rules.'}"
              </p>
            </div>
          </div>

          {/* Primary Evidence Section */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center space-x-2 font-mono uppercase tracking-wider">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Primary Source Evidence & Provenance</span>
            </h3>
            
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{selectedAttribute.source_name || 'Primary Document'}</span>
                {selectedAttribute.source_url && (
                  <a 
                    href={selectedAttribute.source_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1"
                  >
                    <span>View Source URL</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {selectedAttribute.evidence_snippet ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 font-mono leading-relaxed">
                  "{selectedAttribute.evidence_snippet}"
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No direct textual quote captured.</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 font-mono">
                {selectedAttribute.page_number && <span>Page: {selectedAttribute.page_number}</span>}
                {selectedAttribute.section && <span>Section: {selectedAttribute.section}</span>}
                {selectedAttribute.source_type && (
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-bold">
                    Tier Type: {selectedAttribute.source_type}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Conflict Analysis (if applicable) */}
          {conflict && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-rose-700 mb-3 flex items-center space-x-2 font-mono uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Cross-Source Conflict Breakdown</span>
              </h3>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-xs font-bold text-rose-800">
                  <span>Conflict Classification:</span>
                  <span className="font-mono bg-rose-100 px-2 py-0.5 rounded border border-rose-200">{conflict.conflict_type}</span>
                </div>

                <div className="space-y-2 pt-2">
                  {conflict.competing_values?.map((comp, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center shadow-sm">
                      <div>
                        <span className="font-bold text-slate-900">{comp.source_name}</span>
                        <div className="text-[10px] text-slate-500 font-mono">Authority Tier Score: {comp.authority_score}</div>
                      </div>
                      <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                        {comp.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-rose-200 text-xs text-slate-700">
                  <strong className="text-rose-800 font-mono">Why this value was selected / review status: </strong>
                  {conflict.resolution_reason || 'Pending human verification review.'}
                </div>
              </div>
            </div>
          )}

          {/* Unit Normalization Details */}
          {selectedAttribute.normalized_value && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center space-x-2 font-mono uppercase tracking-wider">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Standardized Normalization Schema</span>
              </h3>
              <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                {JSON.stringify(selectedAttribute.normalized_value, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Close Action */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={closeDrawer}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            Close Attribute Inspector
          </button>
        </div>

      </div>
    </div>
  );
};

