import React, { useState, useRef, useEffect } from 'react';
import { Layers, FileText, Link as LinkIcon, FileUp, ChevronDown, Check } from 'lucide-react';

export type InputMode = 'text' | 'link' | 'document';

interface InputModeDropdownProps {
  currentMode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

export const InputModeDropdown: React.FC<InputModeDropdownProps> = ({
  currentMode,
  onModeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const modes = [
    {
      id: 'text' as InputMode,
      label: 'Product Text',
      description: 'Raw product name, model, part number, specs, or catalog snippet',
      icon: FileText,
      badge: 'Default',
    },
    {
      id: 'link' as InputMode,
      label: 'Product Link',
      description: 'Paste manufacturer or product catalog URL',
      icon: LinkIcon,
    },
    {
      id: 'document' as InputMode,
      label: 'File / Document',
      description: 'Upload PDF datasheet, manual, or technical specification sheet',
      icon: FileUp,
    },
  ];

  const activeMode = modes.find((m) => m.id === currentMode) || modes[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center space-x-2 mb-1">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
          Components
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-64 bg-white border border-slate-300 hover:border-emerald-500 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-slate-800 text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <activeMode.icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">{activeMode.label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Select Product Input Mode
          </div>
          <div className="space-y-1 mt-1">
            {modes.map((mode) => {
              const isSelected = mode.id === currentMode;
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    onModeChange(mode.id);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left text-xs flex items-start space-x-3 transition-colors ${
                    isSelected ? 'bg-emerald-50 text-emerald-950 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border mt-0.5 ${
                    isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{mode.label}</span>
                      {mode.badge && (
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {mode.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 ml-1" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5 leading-tight">
                      {mode.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
