import React, { useState, useRef, useEffect } from 'react';
import { FileText, Link as LinkIcon, FileUp, ChevronDown, Check } from 'lucide-react';

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
      label: 'Product Text & Model',
      description: 'Product name, model number, MPN, or catalog text',
      icon: FileText,
    },
    {
      id: 'link' as InputMode,
      label: 'Product URL',
      description: 'Manufacturer page or catalog link',
      icon: LinkIcon,
    },
    {
      id: 'document' as InputMode,
      label: 'Datasheet (PDF)',
      description: 'Technical document, manual, or spec sheet',
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
      <div className="flex items-center space-x-2">
        {/* Quick Segmented Buttons on Desktop */}
        <div className="flex items-center bg-canvas-muted p-1 rounded-lg border border-surface-border">
          {modes.map((mode) => {
            const isSelected = mode.id === currentMode;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onModeChange(mode.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
                  isSelected
                    ? 'bg-white text-neutral-900 shadow-subtle border border-surface-border font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-700' : 'text-neutral-400'}`} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

