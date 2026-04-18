import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface SectionProps {
  title: string;
  count?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const ControlSection = ({ title, count, children, defaultOpen = false }: SectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-light/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown size={14} className="text-text-dim" /> : <ChevronRight size={14} className="text-text-dim" />}
          <span className="font-sans text-[11px] uppercase tracking-widest font-bold text-text-dim">{title}</span>
        </div>
        {count && <span className="font-mono text-[10px] opacity-40">{count}</span>}
      </button>
      {isOpen && <div className="p-4 pt-0 space-y-4">{children}</div>}
    </div>
  );
};

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

export const Label = ({ children, className }: LabelProps) => (
  <label className={cn("block font-sans text-[12px] text-text-main mb-1.5", className)}>
    {children}
  </label>
);

interface InputProps {
  className?: string;
  [key: string]: any;
}

export const Input = ({ className, ...props }: InputProps) => (
  <input
    className={cn(
      "w-full bg-bg border border-border p-2 text-sm focus:border-accent focus:outline-none transition-colors rounded font-sans text-text-main placeholder:text-text-dim/30",
      className
    )}
    {...props}
  />
);

interface SelectProps {
  options: { label: string; value: string }[];
  className?: string;
  [key: string]: any;
}

export const Select = ({ options, className, ...props }: SelectProps) => (
  <select
    className={cn(
      "w-full bg-bg border border-border p-2 text-sm focus:border-accent focus:outline-none transition-colors rounded font-sans text-text-main appearance-none",
      className
    )}
    {...props}
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);
