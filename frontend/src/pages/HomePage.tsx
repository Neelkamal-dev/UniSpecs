import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Link as LinkIcon, FileUp, ArrowRight, X, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { AnalysisHistoryItem } from '../types';
import { InputModeDropdown, InputMode } from '../components/InputModeDropdown';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [productText, setProductText] = useState('');
  const [productName, setProductName] = useState('');
  const [model, setModel] = useState('');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

  useEffect(() => {
    api.getHistory().then(setHistory).catch(() => {});
  }, []);

  const handleClear = () => {
    setProductText('');
    setProductName('');
    setModel('');
    setUrl('');
    setSelectedFile(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productText && !productName && !model && !url && !selectedFile) {
      setError('Please enter a product name, model number, or upload a datasheet.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (inputMode === 'document' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (productName) formData.append('product_name', productName);
        if (model) formData.append('model', model);

        const res = await api.uploadPDF(formData);
        navigate(`/analyze/${res.job_id}`);
      } else {
        const res = await api.startAnalysis({
          text: inputMode === 'text' ? productText : undefined,
          product_name: productName || (inputMode === 'text' ? productText : undefined),
          model: model,
          url: inputMode === 'link' ? url : undefined,
        });
        navigate(`/analyze/${res.job_id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Unable to start product analysis.');
      setIsLoading(false);
    }
  };

  const handlePreset = (text: string, pName?: string, mName?: string) => {
    setInputMode('text');
    setProductText(text);
    if (pName) setProductName(pName);
    if (mName) setModel(mName);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* HEADER / HERO */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 font-sans">
          Analyze a Product
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-normal">
          Turn scattered technical information into reliable, structured specifications verified against authoritative sources.
        </p>
      </div>

      {/* PRIMARY INPUT CARD */}
      <div className="bg-white rounded-lg border border-surface-border shadow-card p-6 sm:p-8 space-y-6">
        
        {/* Input Mode Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-border pb-4 gap-3">
          <InputModeDropdown currentMode={inputMode} onModeChange={setInputMode} />
          <span className="text-xs text-neutral-500">
            Select input format
          </span>
        </div>

        {error && (
          <div className="p-3.5 bg-status-conflict-bg border border-status-conflict-border text-status-conflict rounded-md text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-neutral-500 hover:text-neutral-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* MODE: TEXT */}
          {inputMode === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2 font-mono">
                  Product Name or Identification Text
                </label>
                <textarea
                  rows={4}
                  value={productText}
                  onChange={(e) => setProductText(e.target.value)}
                  placeholder="Enter product name, model number (e.g. Samsung Galaxy S24 SM-S921B), part number, or paste catalog specifications..."
                  className="w-full bg-canvas-muted/40 border border-surface-border focus:bg-white rounded-md p-3.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 transition-colors"
                />
              </div>

              {/* Presets */}
              <div className="flex items-center flex-wrap gap-2 pt-1">
                <span className="text-xs text-neutral-500 font-medium mr-1">Examples:</span>
                <button
                  type="button"
                  onClick={() => handlePreset('Samsung Galaxy S24 SM-S921B, 8GB RAM, 256GB storage', 'Samsung Galaxy S24', 'SM-S921B')}
                  className="px-2.5 py-1 bg-canvas-muted hover:bg-neutral-200/70 text-neutral-700 text-xs font-medium rounded border border-surface-border transition-colors"
                >
                  Samsung Galaxy S24 (SM-S921B)
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('Milwaukee 49-94-0501 4 x 1/4 x 5/8 metal grinding wheel', 'Milwaukee 49-94-0501', '49-94-0501')}
                  className="px-2.5 py-1 bg-canvas-muted hover:bg-neutral-200/70 text-neutral-700 text-xs font-medium rounded border border-surface-border transition-colors"
                >
                  Milwaukee 49-94-0501 Grinding Wheel
                </button>
              </div>
            </div>
          )}

          {/* MODE: LINK */}
          {inputMode === 'link' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1 font-mono">
                Product or Manufacturer URL
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.example.com/product/model-specs"
                  className="w-full bg-canvas-muted/40 border border-surface-border focus:bg-white rounded-md pl-10 pr-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700"
                />
              </div>
              <p className="text-xs text-neutral-500">
                UniSpecs will fetch the page, discover referenced documentation, and extract verified attributes.
              </p>
            </div>
          )}

          {/* MODE: DOCUMENT */}
          {inputMode === 'document' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1 font-mono">
                Upload Technical Datasheet (PDF)
              </label>
              <div className="border border-dashed border-neutral-300 hover:border-brand-700 rounded-md p-6 text-center transition-colors bg-canvas-muted/20 cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileUp className="w-8 h-8 text-brand-700 mx-auto mb-2" />
                <p className="text-xs font-medium text-neutral-800">
                  {selectedFile ? selectedFile.name : 'Click to select or drag and drop a PDF specification document'}
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">PDF datasheets, brochures, and technical manuals up to 25MB</p>
              </div>
            </div>
          )}

          {/* Optional Refinement Fields */}
          {(inputMode === 'text' || inputMode === 'link') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-surface-border">
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Product Name (Optional filter)
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Galaxy S24"
                  className="w-full bg-white border border-surface-border rounded-md px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-brand-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Model / Part Number (Optional filter)
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. SM-S921B"
                  className="w-full bg-white border border-surface-border rounded-md px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-brand-700"
                />
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-surface-border">
            <button
              type="button"
              onClick={handleClear}
              className="w-full sm:w-auto px-3.5 py-2 text-neutral-600 hover:text-neutral-900 text-xs font-medium rounded-md hover:bg-neutral-100 transition-colors"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-medium text-xs rounded-md shadow-subtle transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Analyzing Product...</span>
              ) : (
                <>
                  <span>Analyze Product</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* CORE ASSURANCES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-neutral-700 text-xs">
        <div className="bg-white border border-surface-border p-4 rounded-lg shadow-subtle space-y-1">
          <div className="font-semibold text-neutral-900 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-700" />
            <span>Authoritative Sourcing</span>
          </div>
          <p className="text-neutral-500 leading-relaxed text-[11px]">
            Ranked multi-tier source hierarchy prioritizing manufacturer datasheets and official documentation.
          </p>
        </div>

        <div className="bg-white border border-surface-border p-4 rounded-lg shadow-subtle space-y-1">
          <div className="font-semibold text-neutral-900 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-700" />
            <span>Cross-Source Verification</span>
          </div>
          <p className="text-neutral-500 leading-relaxed text-[11px]">
            Specifications are checked for cross-source consensus and physical range consistency.
          </p>
        </div>

        <div className="bg-white border border-surface-border p-4 rounded-lg shadow-subtle space-y-1">
          <div className="font-semibold text-neutral-900 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-700" />
            <span>Conflict & Evidence Audit</span>
          </div>
          <p className="text-neutral-500 leading-relaxed text-[11px]">
            Every extracted value links to exact source snippets with transparent conflict resolution.
          </p>
        </div>
      </div>

      {/* RECENT ANALYSES */}
      {history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 font-mono flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <span>Recent Analyses</span>
            </h2>
            <span className="text-xs text-neutral-400">{history.length} items</span>
          </div>
          
          <div className="bg-white border border-surface-border rounded-lg overflow-hidden shadow-subtle">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-canvas-muted text-neutral-500 font-medium text-[11px] border-b border-surface-border">
                <tr>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Model</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {history.map((item) => (
                  <tr key={item.job_id} className="hover:bg-canvas-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {item.input_product_name || 'Product'}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-500 text-[11px]">
                      {item.input_model || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                        item.status === 'COMPLETED' ? 'bg-status-verified-bg text-brand-800 border border-status-verified-border' :
                        item.status === 'RUNNING' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 
                        'bg-neutral-100 text-neutral-600 border border-neutral-200'
                      }`}>
                        {item.status === 'COMPLETED' ? 'Verified' : item.status === 'RUNNING' ? 'Analyzing' : item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.product_id ? (
                        <button
                          onClick={() => navigate(`/products/${item.product_id}`)}
                          className="text-brand-700 hover:text-brand-800 font-medium text-xs hover:underline"
                        >
                          View Results →
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/analyze/${item.job_id}`)}
                          className="text-neutral-500 hover:text-neutral-900 font-medium text-xs hover:underline"
                        >
                          View Progress →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};


