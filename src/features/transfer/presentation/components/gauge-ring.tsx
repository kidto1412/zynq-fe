import React from 'react';

interface GaugeRingProps {
  percentage: number;
}

export const GaugeRing: React.FC<GaugeRingProps> = ({ percentage }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // 263.89
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          className="text-surface-container-high"
          cx="50"
          cy="50"
          fill="transparent"
          r={radius}
          stroke="currentColor"
          strokeWidth="7"
        />
        <circle
          className="text-primary transition-all duration-300 ease-out"
          cx="50"
          cy="50"
          fill="transparent"
          r={radius}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="7"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-headline text-lg font-bold text-on-surface">
          {percentage}%
        </span>
        <span className="text-[9px] font-bold uppercase tracking-tight text-on-surface-variant">
          Syncing
        </span>
      </div>
    </div>
  );
};
