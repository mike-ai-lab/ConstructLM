import React from 'react';
import { ChevronRight } from 'lucide-react';

export const PageTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 className="text-4xl font-bold text-[#1a1a1a] dark:text-white mb-2">{children}</h1>
);

export const PageDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-base text-[#666666] dark:text-[#a0a0a0] mb-8 pb-6 border-b border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.1)]">{children}</p>
);

export const TOC: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="bg-[rgba(37,99,235,0.05)] dark:bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.2)] rounded-lg p-4 mb-8">
    <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-3">On This Page</h3>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:text-[rgb(37,99,235)] cursor-pointer transition-colors">
          <span className="text-[rgb(37,99,235)] font-mono text-xs mt-0.5">{i + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

export const SectionDivider: React.FC = () => (
  <div className="my-8 border-t border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.1)]" />
);

export const SectionTitle: React.FC<{ number?: string; children: React.ReactNode }> = ({ number, children }) => (
  <h2 className="text-2xl font-bold text-[#1a1a1a] dark:text-white mt-8 mb-4 flex items-center gap-3">
    {number && <span className="text-[rgb(37,99,235)] font-mono text-xl">{number}</span>}
    <span>{children}</span>
  </h2>
);

export const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-semibold text-[#1a1a1a] dark:text-white mt-6 mb-3">{children}</h3>
);

export const FeatureTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-base font-semibold text-[#1a1a1a] dark:text-white mt-5 mb-2">{children}</h4>
);

export const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-[#666666] dark:text-[#a0a0a0] leading-relaxed mb-4">{children}</p>
);

export const List: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="space-y-2 mb-4">{children}</ul>
);

export const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-sm text-[#666666] dark:text-[#a0a0a0]">
    <ChevronRight size={14} className="text-[rgb(37,99,235)] flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </li>
);

export const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-3 mb-4">
    <code className="text-xs text-[#1a1a1a] dark:text-white font-mono">{children}</code>
  </div>
);

export const InfoBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.25)] dark:border-[rgba(37,99,235,0.3)] rounded-lg p-3 mb-4">
    <p className="text-xs text-[#1a1a1a] dark:text-white leading-relaxed">{children}</p>
  </div>
);
