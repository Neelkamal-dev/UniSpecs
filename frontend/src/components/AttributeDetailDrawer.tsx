import React from 'react';
import { X, CheckCircle2, AlertTriangle, HelpCircle, ExternalLink, FileText, Check } from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';

export const AttributeDetailDrawer: React.FC = () => {
  const { isDrawerOpen, selectedAttribute, closeDrawer, activeProduct } = useAnalysisStore();

  if (!isDrawerOpen || !selectedAttribute) return null;

  const conflict = activeProduct?.conflicts?.find(
    (c) => c.attribute_name.toLowerCase() === selectedAttribute.attribute_name.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-900/40 backdrop-blur-[2px] flex justify-end">
      <div 
        className="w-full max-w-lg bg-white border-l border-surface-border h-full overflow-y-auto shadow-dropdown p-6 flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-surface-border pb-4">
            <div>
              <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-neutral-500">
                {selectedAttribute.category || 'Specification'}
              </span>
              <h2 className="text-xl font-bold text-neutral-900 mt-0.5">{selectedAttribute.attribute_name}</h2>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1.5 text-neutral-400 hover:text-neutral-900 bg-canvas-muted hover:bg-neutral-200 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Value & Confidence Overview */}
          <div className="bg-canvas-muted/50 rounded-lg p-4 border border-surface-border space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] text-neutral-500 uppercase font-mono font-medium">Verified Value</span>
                <div className="text-2xl font-bold text-neutral-900 mt-1 flex items-baseline space-x-2">
                  <span>{selectedAttribute.value || <span className="text-neutral-400 italic font-normal text-base">Not available</span>}</span>
                  {selectedAttribute.unit && (
                    <span className="text-xs font-mono font-semibold text-neutral-700 bg-white px-2 py-0.5 rounded border border-surface-border">
                      {selectedAttribute.unit}
                    </span>
                  )}
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center space-x-1.5 ${
                selectedAttribute.verification_status === 'VERIFIED'
                  ? 'bg-status-verified-bg text-brand-800 border-status-verified-border'
                  : selectedAttribute.verification_status === 'CONFLICT'
                  ? 'bg-status-conflict-bg text-status-conflict border-status-conflict-border'
                  : selectedAttribute.verification_status === 'NEEDS_REVIEW'
                  ? 'bg-status-warning-bg text-status-warning border-status-warning-border'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {selectedAttribute.verification_status === 'VERIFIED' && <CheckCircle2 className="w-3.5 h-3.5 text-brand-700" />}
                {selectedAttribute.verification_status === 'CONFLICT' && <AlertTriangle className="w-3.5 h-3.5 text-status-conflict" />}
                {selectedAttribute.verification_status === 'NEEDS_REVIEW' && <HelpCircle className="w-3.5 h-3.5 text-status-warning" />}
                <span>
                  {selectedAttribute.verification_status === 'VERIFIED' ? 'Verified' :
                   selectedAttribute.verification_status === 'CONFLICT' ? 'Conflict' :
                   selectedAttribute.verification_status === 'NEEDS_REVIEW' ? 'Needs Review' : selectedAttribute.verification_status}
                </span>
              </span>
            </div>

            {/* Confidence Bar */}
            <div className="pt-3 border-t border-surface-border">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-neutral-600 font-medium">Confidence Score</span>
                <span className="font-mono font-semibold text-neutral-900">
                  {Math.round((selectedAttribute.confidence || 0) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    selectedAttribute.confidence >= 0.85 ? 'bg-brand-700' :
                    selectedAttribute.confidence >= 0.60 ? 'bg-amber-500' : 'bg-status-conflict'
                  }`}
                  style={{ width: `${(selectedAttribute.confidence || 0) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-600 mt-2 leading-relaxed">
                {selectedAttribute.confidence_reason || 'Verified against authoritative manufacturer specifications.'}
              </p>
            </div>
          </div>

          {/* Evidence Provenance */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-neutral-700 flex items-center space-x-1.5 font-mono uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              <span>Source Evidence & Provenance</span>
            </h3>
            
            <div className="bg-white border border-surface-border rounded-lg p-4 space-y-3 shadow-subtle">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-900">{selectedAttribute.source_name || 'Primary Document'}</span>
                {selectedAttribute.source_url && (
                  <a 
                    href={selectedAttribute.source_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-brand-700 hover:text-brand-800 font-medium flex items-center space-x-1 hover:underline"
                  >
                    <span>View URL</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {selectedAttribute.evidence_snippet ? (
                <div className="bg-canvas-muted/60 border border-surface-border rounded p-3 text-xs text-neutral-800 font-mono leading-relaxed">
                  "{selectedAttribute.evidence_snippet}"
                </div>
              ) : (
                <p className="text-xs text-neutral-400 italic">No direct textual quote captured.</p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 font-mono">
                {selectedAttribute.page_number && <span className="bg-canvas-muted px-2 py-0.5 rounded border border-surface-border">Page {selectedAttribute.page_number}</span>}
                {selectedAttribute.section && <span className="bg-canvas-muted px-2 py-0.5 rounded border border-surface-border">{selectedAttribute.section}</span>}
                {selectedAttribute.source_type && (
                  <span className="bg-canvas-muted px-2 py-0.5 rounded border border-surface-border">
                    {selectedAttribute.source_type}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Conflict Analysis */}
          {conflict && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-status-conflict flex items-center space-x-1.5 font-mono uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-status-conflict" />
                <span>Discrepancy Details</span>
              </h3>

              <div className="bg-status-conflict-bg/50 border border-status-conflict-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-xs font-medium text-neutral-800">
                  <span>Conflict Classification:</span>
                  <span className="font-mono text-status-conflict font-semibold">{conflict.conflict_type}</span>
                </div>

                <div className="space-y-2 pt-1">
                  {conflict.competing_values?.map((comp, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded border border-surface-border text-xs flex justify-between items-center">
                      <div>
                        <div className="font-medium text-neutral-900">{comp.source_name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">Tier Score: {comp.authority_score}</div>
                      </div>
                      <span className="font-mono font-bold text-neutral-900 bg-canvas-muted px-2 py-0.5 rounded border border-surface-border">
                        {comp.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-status-conflict-border/50 text-xs text-neutral-700 leading-relaxed">
                  <strong className="text-neutral-900">Resolution: </strong>
                  {conflict.resolution_reason || 'Manufacturer source prioritised over secondary catalog.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-surface-border">
          <button
            onClick={closeDrawer}
            className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs rounded-md transition-colors"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};


