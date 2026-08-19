import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Upload, Link as LinkIcon, Cpu, CheckCircle, ArrowRight, ShieldCheck, FileText, History, Zap, Sparkles, X, Layers, FileUp } from 'lucide-react';
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
      setError('Please enter product information, paste a product URL, or upload a PDF document.');
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
      setError(err.response?.data?.error?.message || err.message || 'Failed to submit analysis job.');
      setIsLoading(false);
    }
  };

  const handlePresetText = (text: string) => {
    setInputMode('text');
    setProductText(text);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div>
        
        {/* HERO HEADER */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI PRODUCT INTELLIGENCE PIPELINE</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Turn Scattered Technical Data Into <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
              Verified Product Intelligence
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Discover, enrich, normalize, and validate product specifications with source-backed evidence and transparent confidence scores.
          </p>

          {/* VISUAL WORKFLOW BANNER */}
          <div className="mt-6 inline-flex items-center space-x-2 sm:space-x-4 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-mono font-semibold text-slate-600 shadow-sm">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">INPUT</span>
            <span className="text-slate-400">→</span>
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">AI PIPELINE</span>
            <span className="text-slate-400">→</span>
            <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">STRUCTURED VERIFIED OUTPUT</span>
          </div>
        </div>

        {/* PRIMARY INPUT CARD CONTAINER */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200 relative">
          
          {/* Top-Left Components Mode Dropdown */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
            <InputModeDropdown currentMode={inputMode} onModeChange={setInputMode} />

            <div className="text-xs text-slate-500 font-medium">
              Mode: <strong className="text-slate-900 uppercase font-mono">{inputMode}</strong>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* MODE 1: PRODUCT TEXT COMPONENT (DEFAULT) */}
            {inputMode === 'text' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                      Product Information Text
                    </label>
                    <span className="text-[11px] text-slate-500 font-sans">
                      Accepts natural language, spec lists, or copied catalog text
                    </span>
                  </div>
                  
                  <textarea
                    rows={5}
                    value={productText}
                    onChange={(e) => setProductText(e.target.value)}
                    placeholder="Enter anything you know about the product — name, model, part number, description, specifications, or catalog text..."
                    className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl p-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-sans leading-relaxed shadow-inner"
                  />
                </div>

                {/* Example Quick Presets */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block mb-2">
                    Or Click a Test Preset:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handlePresetText('Samsung Galaxy S24 SM-S921B, 8GB RAM, 256GB storage')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
                    >
                      ⚡ Samsung Galaxy S24 SM-S921B
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePresetText('Milwaukee 49-94-0501 4 x 1/4 x 5/8 metal grinding wheel')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
                    >
                      ⚡ Milwaukee 49-94-0501 Grinding Wheel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: PRODUCT LINK COMPONENT */}
            {inputMode === 'link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 font-mono">
                    Product Page / Manufacturer Catalog URL
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste product page / manufacturer URL (e.g. https://www.samsung.com/global/galaxy-s24/specs/)"
                      className="w-full bg-slate-50 border border-slate-300 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 italic">
                    The pipeline will fetch, extract specifications, and verify product identity from the page.
                  </p>
                </div>
              </div>
            )}

            {/* MODE 3: FILE / DOCUMENT COMPONENT */}
            {inputMode === 'document' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 font-mono">
                    Upload Technical Document / Datasheet (PDF)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50 cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileUp className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedFile ? selectedFile.name : 'Drag & drop PDF datasheet or click to browse'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Supports PDF technical manuals, catalogs, and spec sheets up to 25MB</p>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Model / MPN refinement fields */}
            {(inputMode === 'text' || inputMode === 'link') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 font-mono">
                    Product Name (Optional Filter)
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Galaxy S24"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 font-mono">
                    Exact Model / MPN (Optional Filter)
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. SM-S921B"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* ACTION BUTTONS BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClear}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Input</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Initiating AI Intelligence Pipeline...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{inputMode === 'link' ? 'Fetch Product' : 'Find & Enrich Product'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* CAPABILITY INDICATORS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-12 text-slate-700 text-xs font-medium">
          <div className="flex items-center space-x-2.5 bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>AI Product Identification</span>
          </div>
          <div className="flex items-center space-x-2.5 bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>7-Tier Source Priority Discovery</span>
          </div>
          <div className="flex items-center space-x-2.5 bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Cross-Source Validation</span>
          </div>
          <div className="flex items-center space-x-2.5 bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Conflict Detection & Human Review</span>
          </div>
          <div className="flex items-center space-x-2.5 bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Evidence Snippets & Provenance</span>
          </div>
          <div className="flex items-center space-x-2.5 bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>JSON & Excel Commerce Export</span>
          </div>
        </div>

        {/* RECENT HISTORY TABLE */}
        {history.length > 0 && (
          <div className="max-w-4xl mx-auto mt-14">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center space-x-2 font-mono">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Recent Product Intelligence Analyses</span>
            </h3>
            
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Product Input</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <tr key={item.job_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 truncate max-w-xs">
                        {item.input_product_name || 'Unnamed Product'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{item.input_model || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          item.status === 'RUNNING' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.product_id ? (
                          <button
                            onClick={() => navigate(`/products/${item.product_id}`)}
                            className="text-emerald-700 hover:text-emerald-900 font-bold"
                          >
                            View Dashboard →
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/analyze/${item.job_id}`)}
                            className="text-slate-500 hover:text-slate-900 font-medium"
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
    </div>
  );
};

