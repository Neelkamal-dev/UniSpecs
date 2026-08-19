import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cpu, CheckCircle2, Loader2, AlertCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { api } from '../services/api';
import { AnalysisJobStatus } from '../types';

const PIPELINE_STAGES = [
  { stage: 'IDENTIFY', key: 'identify_product', label: 'AI 1 — Product Identity Resolution', detail: 'Determining brand, model, MPN & category' },
  { stage: 'RESEARCH', key: 'generate_queries', label: '7-Tier Source Discovery & Search', detail: 'Querying manufacturer datasheets & technical sources' },
  { stage: 'RESEARCH', key: 'search_web', label: 'Web & Specification Page Fetching', detail: 'Retrieving official product specifications' },
  { stage: 'RESEARCH', key: 'rank_sources', label: 'Domain Authority & Recency Scoring', detail: 'Ranking sources by 7-tier authority matrix' },
  { stage: 'EXTRACT', key: 'collect_documents', label: 'Document & PDF Text Parsing', detail: 'Ingesting technical manuals & datasheets' },
  { stage: 'EXTRACT', key: 'extract_attributes', label: 'AI 2 — Attribute & Evidence Extraction', detail: 'Extracting specifications with raw text quotes' },
  { stage: 'NORMALIZE', key: 'normalize_attributes', label: 'Unit Normalization Engine', detail: 'Standardizing units (GB, mAh, mm, W, V)' },
  { stage: 'VALIDATE', key: 'validate_attributes', label: 'Cross-Source Layer 1 & 2 Validation', detail: 'Checking physical bounds & multi-source agreement' },
  { stage: 'VERIFY', key: 'resolve_conflicts', label: 'Conflict Detection & Authority Resolution', detail: 'Applying manufacturer priority rules & flagging review' },
  { stage: 'ENRICH', key: 'enrich_product', label: 'Targeted Missing Data Research', detail: 'Researching missing core product specs' },
  { stage: 'GENERATE', key: 'calculate_confidence', label: 'Explainable Confidence Calculation', detail: 'Computing score & transparent rationale' },
  { stage: 'GENERATE', key: 'finalize_product', label: 'AI 3 — Presentation & Export Assembly', detail: 'Building verified Product Intelligence record' },
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
          }, 1000);
        } else if (data.status === 'FAILED') {
          setError(data.error_message || 'Analysis pipeline execution failed.');
        }
      } catch (err: any) {
        consecutiveFailures++;
        if (consecutiveFailures >= 5) {
          setError(err.message || 'Failed to check analysis progress after multiple attempts.');
        }
      }
    };

    poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [jobId, navigate]);

  const currentNodeIndex = PIPELINE_STAGES.findIndex(
    (step) => step.key === jobStatus?.current_node
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
          <span>AI 3-STAGE INTELLIGENCE PIPELINE</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Executing Product Intelligence Pipeline</h1>
        <p className="text-xs text-slate-500 mt-1 font-mono">Job Reference: {jobId}</p>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-8">

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-2">
            <span className="text-slate-700 uppercase tracking-wider font-mono">Pipeline Progress</span>
            <span className="text-emerald-700 font-mono text-sm font-extrabold">{jobStatus?.progress || 0}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 transition-all duration-500"
              style={{ width: `${jobStatus?.progress || 0}%` }}
            />
          </div>
          <p className="text-xs text-slate-600 mt-2 font-mono italic">
            {jobStatus?.message || 'Initializing pipeline worker...'}
          </p>
        </div>

        {/* Pipeline Node Stepper */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4 font-mono">
            Pipeline Stage Execution Monitor
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PIPELINE_STAGES.map((step, idx) => {
              const isCompleted = idx < currentNodeIndex || jobStatus?.status === 'COMPLETED';
              const isCurrent = idx === currentNodeIndex && jobStatus?.status === 'RUNNING';

              return (
                <div
                  key={step.key}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${isCompleted
                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                      : isCurrent
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-xs">{step.label}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{step.detail}</div>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ml-2">
                    {isCompleted ? (
                      <span className="text-emerald-700 bg-emerald-100">DONE</span>
                    ) : isCurrent ? (
                      <span className="text-blue-700 bg-blue-100">ACTIVE</span>
                    ) : (
                      <span className="text-slate-400">QUEUED</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <span className="font-bold">Pipeline Failure: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Redirecting Prompt */}
        {jobStatus?.status === 'COMPLETED' && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs text-center font-bold flex items-center justify-center space-x-2">
            <span>✓ Intelligence pipeline completed! Loading Product Intelligence Dashboard...</span>
            <ArrowRight className="w-4 h-4 text-emerald-600 animate-bounce" />
          </div>
        )}

      </div>
    </div>
  );
};

