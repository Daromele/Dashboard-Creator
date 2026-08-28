import React, { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-900/50 overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 sm:p-4 text-left font-semibold text-white hover:bg-gray-800/60 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-base">{title}</span>
        </div>
        <ChevronDown
          size={20}
          className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-3 sm:p-4 border-t border-gray-700/50">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
