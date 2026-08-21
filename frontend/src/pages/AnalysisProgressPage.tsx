import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { AnalysisJobStatus } from '../types';

const PROGRESS_STEPS = [
  { key: 'identify_product', label: 'Product Identification', detail: 'Determining exact brand, model, MPN, and category' },
  { key: 'generate_queries', label: 'Finding Authoritative Sources', detail: 'Locating official manufacturer datasheets & technical documentation' },
  { key: 'search_web', label: 'Retrieving Technical Pages', detail: 'Fetching specification documents and catalog entries' },
  { key: 'rank_sources', label: 'Assessing Source Authority', detail: 'Ranking sources by manufacturer hierarchy & validity' },
  { key: 'collect_documents', label: 'Parsing Datasheets & Manuals', detail: 'Reading technical PDF and structured data' },
  { key: 'extract_attributes', label: 'Extracting Specifications', detail: 'Capturing attribute values with source textual evidence' },
  { key: 'normalize_attributes', label: 'Standardizing Units', detail: 'Converting electrical, mechanical, and physical dimensions' },
  { key: 'validate_attributes', label: 'Multi-Source Validation', detail: 'Cross-checking consistency across independent sources' },
  { key: 'resolve_conflicts', label: 'Resolving Discrepancies', detail: 'Applying manufacturer authority rules to resolve conflicts' },
  { key: 'enrich_product', label: 'Enriching Missing Information', detail: 'Targeted research for unverified or missing attributes' },
  { key: 'calculate_confidence', label: 'Verifying Quality & Confidence', detail: 'Computing transparency score based on evidence consensus' },
  { key: 'finalize_product', label: 'Preparing Verified Dataset', detail: 'Assembling complete specification catalog' },
];

export const AnalysisProgressPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [jobStatus, setJobStatus] = useState<AnalysisJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let consecutiveFailures = 0;

    const poll = async () => {
      try {
        const data = await api.getJobStatus(jobId);
        setJobStatus(data);
        consecutiveFailures = 0;

        if (data.status === 'COMPLETED' && data.product_id) {
          setTimeout(() => {
            navigate(`/products/${data.product_id}`);
          }, 800);
        } else if (data.status === 'FAILED') {
          setError(data.error_message || 'Analysis could not be completed with the provided sources.');
        }
      } catch (err: any) {
        consecutiveFailures++;
        if (consecutiveFailures >= 5) {
          setError(err.message || 'Unable to retrieve analysis progress.');
        }
      }
    };

    poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [jobId, navigate]);

  const currentNodeIndex = PROGRESS_STEPS.findIndex(
    (step) => step.key === jobStatus?.current_node
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 font-sans">
          Analyzing Product
        </h1>
        <p className="text-xs text-neutral-500 font-mono">Reference ID: {jobId}</p>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-lg p-6 sm:p-8 border border-surface-border shadow-card space-y-6">

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-neutral-600 font-medium">Analysis Progress</span>
            <span className="font-mono text-sm font-semibold text-brand-700">{jobStatus?.progress || 0}%</span>
          </div>
          <div className="w-full h-2 bg-canvas-muted rounded-full overflow-hidden border border-surface-border">
            <div
              className="h-full bg-brand-700 transition-all duration-500"
              style={{ width: `${jobStatus?.progress || 0}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            {jobStatus?.message || 'Connecting to source registry...'}
          </p>
        </div>

        {/* Stepper Monitor */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <h2 className="text-xs font-semibold uppercase text-neutral-500 tracking-wider font-mono">
            Pipeline Steps
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PROGRESS_STEPS.map((step, idx) => {
              const isCompleted = idx < currentNodeIndex || jobStatus?.status === 'COMPLETED';
              const isCurrent = idx === currentNodeIndex && jobStatus?.status === 'RUNNING';

              return (
                <div
                  key={step.key}
                  className={`p-3 rounded-md border text-xs flex items-center justify-between transition-colors ${
                    isCompleted
                      ? 'bg-status-verified-bg border-status-verified-border text-neutral-900'
                      : isCurrent
                      ? 'bg-blue-50/70 border-blue-200 text-neutral-900 shadow-subtle'
                      : 'bg-canvas-muted/40 border-surface-border text-neutral-400'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-700 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-neutral-300 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold text-xs text-neutral-900">{step.label}</div>
                      <div className="text-[11px] text-neutral-500">{step.detail}</div>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] font-semibold uppercase shrink-0 ml-2">
                    {isCompleted ? (
                      <span className="text-brand-800">Done</span>
                    ) : isCurrent ? (
                      <span className="text-blue-700">Active</span>
                    ) : (
                      <span className="text-neutral-400">Waiting</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-status-conflict-bg border border-status-conflict-border text-status-conflict rounded-md text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Analysis Failed: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Completed status */}
        {jobStatus?.status === 'COMPLETED' && (
          <div className="p-3.5 bg-status-verified-bg border border-status-verified-border text-brand-800 rounded-md text-xs text-center font-medium flex items-center justify-center space-x-2">
            <span>Analysis completed. Loading product specification dashboard...</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand-700" />
          </div>
        )}

      </div>
    </div>
  );
};


