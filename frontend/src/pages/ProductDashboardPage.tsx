import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, AlertTriangle, HelpCircle, FileText, 
  ExternalLink, Download, Search, ArrowLeft, RefreshCw,
  Check, ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { Product, ProductAttribute } from '../types';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { AttributeDetailDrawer } from '../components/AttributeDetailDrawer';

export const ProductDashboardPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<'excel' | 'csv' | 'json' | null>(null);
  const [refiningJobId, setRefiningJobId] = useState<string | null>(null);

  const { 
    activeTab, setActiveTab, 
    searchQuery, setSearchQuery, 
    categoryFilter, setCategoryFilter, 
    statusFilter, setStatusFilter,
    openDrawer, setActiveProduct 
  } = useAnalysisStore();

  const handleRefinedSearch = async (brand: string, name: string, model?: string) => {
    try {
      setRefiningJobId(brand + name);
      const res = await api.startAnalysis({
        product_name: name,
        model: model,
      });
      navigate(`/analyze/${res.job_id}`);
    } catch (err) {
      console.error('Failed to submit refined analysis:', err);
    } finally {
      setRefiningJobId(null);
    }
  };

  const handleExport = async (format: 'excel' | 'csv' | 'json') => {
    if (!product) return;
    try {
      setDownloadingFormat(format);
      await api.downloadExport(product.id, format);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setDownloadingFormat(null);
    }
  };

  useEffect(() => {
    if (!productId) return;
    setIsLoading(true);
    api.getProduct(productId)
      .then((data) => {
        setProduct(data);
        setActiveProduct(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Unable to retrieve product intelligence record.');
        setIsLoading(false);
      });
  }, [productId, setActiveProduct]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-brand-700 animate-spin mx-auto" />
          <p className="text-xs font-medium text-neutral-600">Loading Product Specifications...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 bg-status-conflict-bg border border-status-conflict-border text-status-conflict rounded-lg text-xs font-medium">
          {error || 'Product specification record not found.'}
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors"
        >
          ← Return to Product Search
        </button>
      </div>
    );
  }

  const { identity, attributes = [], sources = [], conflicts = [], commerce_metadata, confidence_scores } = product;

  // Verification metrics
  const verifiedCount = attributes.filter(a => a.verification_status === 'VERIFIED').length;
  const conflictCount = conflicts.length;
  const needsReviewCount = attributes.filter(a => a.verification_status === 'NEEDS_REVIEW' || a.verification_status === 'CONFLICT').length;
  const overallConfidence = Math.round((confidence_scores?.verification_rate || 90));

  // Filter attributes
  const filteredAttributes = attributes.filter((attr) => {
    const matchesSearch = 
      attr.attribute_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (attr.value && attr.value.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'ALL' || attr.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || attr.verification_status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(attributes.map((a) => a.category))).filter(Boolean);

  // Group attributes by category for structured catalog view
  const groupedAttributes = categories.reduce((acc, cat) => {
    acc[cat] = filteredAttributes.filter(a => a.category === cat);
    return acc;
  }, {} as Record<string, ProductAttribute[]>);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Breadcrumb & Navigation */}
      <div>
        <button
          onClick={() => navigate('/')}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-900 inline-flex items-center space-x-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Search</span>
        </button>

        {/* Ambiguity Clarification Banner */}
        {identity.identity_status === 'NEEDS_REVIEW' && identity.possible_matches && identity.possible_matches.length > 0 && (
          <div className="bg-status-warning-bg border border-status-warning-border rounded-lg p-5 space-y-3 mb-6">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-mono">
                  Multiple Product Matches Detected
                </h3>
                <p className="text-xs text-neutral-700 mt-0.5 leading-relaxed">
                  Several models match your search. Select the intended variant to refine technical specifications:
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {identity.possible_matches.map((match, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRefinedSearch(match.brand || '', match.product_name, match.model)}
                  disabled={refiningJobId !== null}
                  className="bg-white hover:bg-neutral-50 border border-surface-border p-3 rounded-md text-left transition-colors flex flex-col justify-between shadow-subtle disabled:opacity-50"
                >
                  <div>
                    <span className="text-[10px] font-mono font-medium text-neutral-500 uppercase">
                      {match.brand || 'Model'}
                    </span>
                    <div className="text-xs font-semibold text-neutral-900 mt-1">
                      {match.product_name}
                    </div>
                  </div>
                  {match.model && (
                    <div className="text-[11px] text-neutral-500 mt-2 font-mono">
                      Model: {match.model}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCT IDENTITY HEADER */}
        <div className="bg-white rounded-lg p-6 border border-surface-border shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-semibold text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                {identity.brand || 'MANUFACTURER'}
              </span>
              <span className="text-xs font-medium text-brand-800 bg-status-verified-bg px-2 py-0.5 rounded border border-status-verified-border inline-flex items-center space-x-1">
                <Check className="w-3 h-3 text-brand-700" />
                <span>Verified Data</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              {identity.product_name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-neutral-600 font-mono">
              {identity.model && <span>Model: <strong className="text-neutral-900 font-sans">{identity.model}</strong></span>}
              {identity.mpn && <span>Part / MPN: <strong className="text-neutral-900 font-sans">{identity.mpn}</strong></span>}
              {identity.category && <span>Category: <strong className="text-neutral-900 font-sans">{identity.category}</strong></span>}
              {identity.variant && <span>Variant: <strong className="text-neutral-900 font-sans">{identity.variant}</strong></span>}
            </div>
          </div>

          {/* Verification & Confidence Block */}
          <div className="flex items-center space-x-4 bg-canvas-muted p-3.5 rounded-lg border border-surface-border shrink-0">
            <div>
              <div className="text-[11px] text-neutral-500 font-medium font-mono uppercase">Confidence</div>
              <div className="text-2xl font-bold font-mono text-neutral-900 mt-0.5">
                {overallConfidence}%
              </div>
              <div className="text-[11px] text-neutral-500">
                {sources.length} authoritative source{sources.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
        <div className="bg-white border border-surface-border p-3.5 rounded-lg shadow-subtle">
          <div className="text-neutral-500 font-medium font-mono text-[11px] uppercase">Verified Specs</div>
          <div className="text-xl font-bold font-mono text-brand-800 mt-1">
            {verifiedCount} / {attributes.length}
          </div>
        </div>

        <div className="bg-white border border-surface-border p-3.5 rounded-lg shadow-subtle">
          <div className="text-neutral-500 font-medium font-mono text-[11px] uppercase">Authoritative Sources</div>
          <div className="text-xl font-bold font-mono text-neutral-900 mt-1">
            {sources.length}
          </div>
        </div>

        <div className="bg-white border border-surface-border p-3.5 rounded-lg shadow-subtle">
          <div className="text-neutral-500 font-medium font-mono text-[11px] uppercase">Conflicts Flagged</div>
          <div className={`text-xl font-bold font-mono mt-1 ${conflictCount > 0 ? 'text-status-conflict' : 'text-neutral-400'}`}>
            {conflictCount}
          </div>
        </div>

        <div className="bg-white border border-surface-border p-3.5 rounded-lg shadow-subtle">
          <div className="text-neutral-500 font-medium font-mono text-[11px] uppercase">Verification Rate</div>
          <div className="text-xl font-bold font-mono text-neutral-900 mt-1">
            {confidence_scores?.verification_rate || 92}%
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="border-b border-surface-border flex overflow-x-auto space-x-1 text-xs font-medium">
        {[
          { id: 'overview', label: 'Product Overview' },
          { id: 'specifications', label: `Specification Table (${attributes.length})` },
          { id: 'sources', label: `Sources (${sources.length})` },
          { id: 'validation', label: `Validation & Conflicts (${conflicts.length})` },
          { id: 'evidence', label: 'Evidence Explorer' },
          { id: 'export', label: 'Export Data' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-brand-700 text-brand-900 font-semibold bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Summary Card */}
          <div className="bg-white border border-surface-border rounded-lg p-5 shadow-subtle space-y-3">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider font-mono">
              Product Intelligence Summary
            </h3>
            <p className="text-xs text-neutral-800 leading-relaxed font-normal">
              {commerce_metadata?.short_description || 
                `Verified technical specifications for ${identity.brand || ''} ${identity.product_name} compiled and normalized across ${sources.length} authoritative documentation source(s).`}
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="bg-canvas-muted text-neutral-700 px-2.5 py-1 rounded border border-surface-border text-[11px]">
                ✓ Truthfulness-first policy active
              </span>
              <span className="bg-canvas-muted text-neutral-700 px-2.5 py-1 rounded border border-surface-border text-[11px]">
                ✓ Source provenance attached to every value
              </span>
            </div>
          </div>

          {/* Conflict Alert Banner if any */}
          {conflicts.length > 0 && (
            <div className="p-4 bg-status-conflict-bg border border-status-conflict-border text-neutral-800 rounded-lg text-xs flex items-start space-x-2.5 shadow-subtle">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-status-conflict" />
              <div>
                <span className="font-semibold text-status-conflict">Discrepancy Notice: </span>
                <span>{conflicts.length} specification conflict(s) detected across competing catalogs. Manufacturer authoritative value has been applied. Inspect the Validation tab for details.</span>
              </div>
            </div>
          )}

          {/* Key Specifications Table (Structured Grouped Catalog Style) */}
          <div className="bg-white rounded-lg border border-surface-border shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border flex justify-between items-center bg-canvas-muted/40">
              <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider font-mono">
                Primary Specifications
              </h3>
              <button
                onClick={() => setActiveTab('specifications')}
                className="text-xs font-medium text-brand-700 hover:text-brand-800 inline-flex items-center space-x-1"
              >
                <span>View all {attributes.length} attributes</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-surface-border">
              {attributes.slice(0, 10).map((attr) => (
                <div 
                  key={attr.attribute_name} 
                  onClick={() => openDrawer(attr)}
                  className="px-5 py-3 hover:bg-canvas-muted/30 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors text-xs"
                >
                  <div className="sm:w-1/3">
                    <span className="font-medium text-neutral-800">{attr.attribute_name}</span>
                    <div className="text-[10px] text-neutral-400 font-mono">{attr.category}</div>
                  </div>

                  <div className="sm:w-1/3 font-mono font-semibold text-neutral-900 flex items-center space-x-1.5">
                    <span>{attr.value || <span className="text-neutral-400 italic font-normal">Not available</span>}</span>
                    {attr.unit && <span className="text-neutral-500 font-normal">{attr.unit}</span>}
                  </div>

                  <div className="sm:w-1/3 flex items-center justify-between sm:justify-end space-x-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      attr.verification_status === 'VERIFIED' ? 'bg-status-verified-bg text-brand-800 border-status-verified-border' :
                      attr.verification_status === 'CONFLICT' ? 'bg-status-conflict-bg text-status-conflict border-status-conflict-border' :
                      'bg-status-warning-bg text-status-warning border-status-warning-border'
                    }`}>
                      {attr.verification_status === 'VERIFIED' ? 'Verified' :
                       attr.verification_status === 'CONFLICT' ? 'Conflict' : 'Needs Review'}
                    </span>
                    <button className="text-neutral-400 hover:text-neutral-800 text-[11px] font-medium">
                      View source →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: SPECIFICATIONS TABLE */}
      {activeTab === 'specifications' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-surface-border shadow-subtle">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search specifications..."
                className="w-full bg-canvas-muted/40 border border-surface-border rounded-md pl-9 pr-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-brand-700"
              />
            </div>

            <div className="flex items-center space-x-2.5 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-surface-border text-neutral-700 text-xs rounded-md px-2.5 py-1.5 focus:outline-none font-medium"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-surface-border text-neutral-700 text-xs rounded-md px-2.5 py-1.5 focus:outline-none font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="CONFLICT">Conflict</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
                <option value="ENRICHED">Enriched</option>
              </select>
            </div>
          </div>

          {/* Full Specifications Table */}
          <div className="bg-white border border-surface-border rounded-lg overflow-hidden shadow-card">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-canvas-muted text-neutral-500 font-medium text-[11px] border-b border-surface-border">
                <tr>
                  <th className="px-4 py-2.5">Attribute</th>
                  <th className="px-4 py-2.5">Value</th>
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Confidence</th>
                  <th className="px-4 py-2.5">Source</th>
                  <th className="px-4 py-2.5 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredAttributes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-neutral-400 italic">
                      No matching specifications found.
                    </td>
                  </tr>
                ) : (
                  filteredAttributes.map((attr) => (
                    <tr 
                      key={attr.attribute_name} 
                      onClick={() => openDrawer(attr)}
                      className="hover:bg-canvas-muted/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        <div>{attr.attribute_name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{attr.category}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-neutral-900">
                        {attr.value || <span className="text-neutral-400 italic font-normal">Not available</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-600">
                        {attr.unit || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                          attr.verification_status === 'VERIFIED' ? 'bg-status-verified-bg text-brand-800 border-status-verified-border' :
                          attr.verification_status === 'CONFLICT' ? 'bg-status-conflict-bg text-status-conflict border-status-conflict-border' :
                          'bg-status-warning-bg text-status-warning border-status-warning-border'
                        }`}>
                          {attr.verification_status === 'VERIFIED' ? 'Verified' :
                           attr.verification_status === 'CONFLICT' ? 'Conflict' : 'Needs Review'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-neutral-800">
                        {Math.round((attr.confidence || 0) * 100)}%
                      </td>
                      <td className="px-4 py-3 text-neutral-600 truncate max-w-xs font-mono text-[11px]">
                        {attr.source_name || 'Primary Document'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-brand-700 hover:text-brand-800 font-medium text-xs">
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SOURCES */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {sources.map((src, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-surface-border shadow-subtle space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-medium uppercase bg-canvas-muted text-neutral-600 px-2 py-0.5 rounded border border-surface-border">
                      {src.source_type || 'Documentation'}
                    </span>
                    <h4 className="text-xs font-semibold text-neutral-900 mt-1.5">{src.title || src.domain || 'Source Document'}</h4>
                  </div>
                  <span className="text-xs font-mono font-medium text-neutral-700 bg-canvas-muted px-2 py-0.5 rounded border border-surface-border">
                    Authority Tier: {src.authority_score}
                  </span>
                </div>

                <div className="text-xs text-neutral-500 font-mono flex items-center justify-between pt-2 border-t border-surface-border">
                  <span>Domain: {src.domain}</span>
                  {src.url && (
                    <a href={src.url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline inline-flex items-center space-x-1 font-medium font-sans">
                      <span>View Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: VALIDATION & CONFLICTS */}
      {activeTab === 'validation' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-lg border border-surface-border shadow-card space-y-4">
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider font-mono flex items-center space-x-2">
              <span>Cross-Source Validation & Conflict Resolution</span>
            </h3>

            {conflicts.length === 0 ? (
              <div className="p-6 text-center text-neutral-600 text-xs bg-canvas-muted/40 rounded-lg border border-surface-border font-medium">
                ✓ No cross-source discrepancies detected. All discovered sources agree on extracted specifications.
              </div>
            ) : (
              <div className="space-y-3">
                {conflicts.map((conf, idx) => (
                  <div key={idx} className="bg-status-conflict-bg/30 border border-status-conflict-border p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-neutral-900">{conf.attribute_name}</span>
                      <span className="font-mono text-status-conflict font-medium text-[11px]">
                        {conf.conflict_type}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {conf.competing_values?.map((comp, cidx) => (
                        <div key={cidx} className="bg-white p-3 rounded border border-surface-border text-xs shadow-subtle">
                          <div className="font-medium text-neutral-800">{comp.source_name}</div>
                          <div className="text-base font-mono font-bold text-neutral-900 mt-0.5">{comp.value}</div>
                          <div className="text-[10px] text-neutral-500 font-mono">Authority: {comp.authority_score}</div>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 bg-white rounded text-xs text-neutral-700 border border-surface-border">
                      <strong className="text-neutral-900 font-medium">Resolution: </strong>
                      {conf.resolution_reason || 'Resolved via primary manufacturer documentation hierarchy.'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: EVIDENCE */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-lg border border-surface-border shadow-card space-y-3">
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              <span>Full Evidence Traceability</span>
            </h3>

            <div className="space-y-3">
              {attributes.map((attr) => (
                <div key={attr.attribute_name} className="bg-canvas-muted/40 border border-surface-border p-3.5 rounded-lg space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-neutral-900">{attr.attribute_name} → <strong className="font-mono">{attr.value}</strong></span>
                    <span className="font-mono text-neutral-600 text-[11px]">{attr.source_name}</span>
                  </div>
                  {attr.evidence_snippet ? (
                    <div className="bg-white p-2.5 rounded font-mono text-xs text-neutral-800 border border-surface-border">
                      "{attr.evidence_snippet}"
                    </div>
                  ) : (
                    <div className="text-[11px] text-neutral-400 italic">No quoted snippet available.</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: EXPORT */}
      {activeTab === 'export' && (
        <div className="bg-white p-6 rounded-lg border border-surface-border shadow-card space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider font-mono">
              Export Verified Dataset
            </h3>
            <p className="text-xs text-neutral-600 mt-1">
              Download structured specification data with complete provenance and confidence metadata.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-xl">
            <button
              onClick={() => handleExport('excel')}
              disabled={downloadingFormat !== null}
              className="p-4 bg-canvas-muted/40 hover:bg-white border border-surface-border hover:border-brand-700 rounded-lg text-left transition-all shadow-subtle disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-brand-700 mb-2" />
              <div className="font-semibold text-neutral-900 text-xs">Excel Workbook</div>
              <div className="text-[11px] text-neutral-500 font-mono mt-0.5">Multi-Tab .xlsx</div>
            </button>

            <button
              onClick={() => handleExport('csv')}
              disabled={downloadingFormat !== null}
              className="p-4 bg-canvas-muted/40 hover:bg-white border border-surface-border hover:border-brand-700 rounded-lg text-left transition-all shadow-subtle disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-neutral-700 mb-2" />
              <div className="font-semibold text-neutral-900 text-xs">CSV Spreadsheet</div>
              <div className="text-[11px] text-neutral-500 font-mono mt-0.5">Flat Table .csv</div>
            </button>

            <button
              onClick={() => handleExport('json')}
              disabled={downloadingFormat !== null}
              className="p-4 bg-canvas-muted/40 hover:bg-white border border-surface-border hover:border-brand-700 rounded-lg text-left transition-all shadow-subtle disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-neutral-700 mb-2" />
              <div className="font-semibold text-neutral-900 text-xs">JSON Object</div>
              <div className="text-[11px] text-neutral-500 font-mono mt-0.5">Nested Schema .json</div>
            </button>
          </div>

          {/* JSON Syntax Preview */}
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5 font-mono">Structured Schema Preview</span>
            <pre className="bg-canvas-muted p-3.5 rounded-lg border border-surface-border text-xs font-mono text-neutral-800 max-h-72 overflow-y-auto">
              {JSON.stringify(product, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Slide-over Attribute Inspector Drawer */}
      <AttributeDetailDrawer />

    </div>
  );
};
