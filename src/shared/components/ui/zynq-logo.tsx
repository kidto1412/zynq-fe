import React from 'react';

interface ZynqLogoProps {
  className?: string;
  size?: number;
  variant?: 'icon' | 'full' | 'mark';
  animatePulse?: boolean;
}

export const ZynqLogo: React.FC<ZynqLogoProps> = ({
  className = '',
  size = 36,
  variant = 'icon',
  animatePulse = false,
}) => {
  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <div style={{ width: size, height: size }} className="relative flex-shrink-0">
          <svg
            viewBox="0 0 512 512"
            fill="none"
            className="w-full h-full drop-shadow-[0_0_12px_rgba(0,240,255,0.35)]"
          >
            <defs>
              <radialGradient id="zynq-bg" cx="50%" cy="30%" r="75%">
                <stop offset="0%" stop-color="#1A2238" />
                <stop offset="100%" stop-color="#080C14" />
              </radialGradient>
              <linearGradient id="zynq-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="50%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#9333EA" />
              </linearGradient>
              <linearGradient id="zynq-secondary" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#EC4899" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="128" fill="url(#zynq-bg)" />
            <rect width="510" height="510" x="1" y="1" rx="127" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="3" />
            
            {/* Radar Orbit */}
            <circle cx="256" cy="256" r="185" stroke="rgba(0, 240, 255, 0.15)" strokeWidth="3" strokeDasharray="6 10" />
            
            {/* Upper Z Wing */}
            <path
              d="M 136 148 C 136 137 145 128 156 128 H 344 C 360 128 373 141 373 157 C 373 166 369 175 362 182 L 236 304 H 308 C 316 304 322 310 322 318 C 322 326 316 332 308 332 H 192 L 314 214 C 322 206 327 195 327 184 C 327 169 315 156 300 156 H 156 C 145 156 136 147 136 148 Z"
              fill="url(#zynq-primary)"
            />
            {/* Lower Z Wing */}
            <path
              d="M 376 364 C 376 375 367 384 356 384 H 168 C 152 384 139 371 139 355 C 139 346 143 337 150 330 L 276 208 H 204 C 196 208 190 202 190 194 C 190 186 196 180 204 180 H 320 L 198 298 C 190 306 185 317 185 328 C 185 343 197 356 212 356 H 356 C 367 356 376 363 376 364 Z"
              fill="url(#zynq-secondary)"
            />
            <circle cx="256" cy="256" r="12" fill="#FFFFFF" />
            <circle cx="256" cy="256" r="22" stroke="#00F0FF" strokeWidth="4" opacity="0.8" />
          </svg>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-0.5 leading-none">
            <span className="font-headline font-black text-white text-lg tracking-wider">ZYN</span>
            <span className="font-headline font-black bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent text-lg tracking-wider">Q</span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400 font-semibold leading-none mt-0.5">
            Sync &amp; Share
          </span>
        </div>
      </div>
    );
  }

  // Icon / Mark Variant
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
    >
      <svg
        viewBox="0 0 512 512"
        fill="none"
        className={`w-full h-full drop-shadow-[0_0_10px_rgba(0,240,255,0.3)] ${
          animatePulse ? 'animate-pulse' : ''
        }`}
      >
        <defs>
          <radialGradient id={`zynq-bg-${size}`} cx="50%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#1A2238" />
            <stop offset="100%" stopColor="#080C14" />
          </radialGradient>
          <linearGradient id={`zynq-p-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="50%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>
          <linearGradient id={`zynq-s-${size}`} x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>

        {variant !== 'mark' && (
          <>
            <rect width="512" height="512" rx="128" fill={`url(#zynq-bg-${size})`} />
            <rect width="510" height="510" x="1" y="1" rx="127" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="3" />
            <circle cx="256" cy="256" r="185" stroke="rgba(0, 240, 255, 0.15)" strokeWidth="3" strokeDasharray="6 10" />
          </>
        )}

        {/* Upper Z Wing */}
        <path
          d="M 136 148 C 136 137 145 128 156 128 H 344 C 360 128 373 141 373 157 C 373 166 369 175 362 182 L 236 304 H 308 C 316 304 322 310 322 318 C 322 326 316 332 308 332 H 192 L 314 214 C 322 206 327 195 327 184 C 327 169 315 156 300 156 H 156 C 145 156 136 147 136 148 Z"
          fill={`url(#zynq-p-${size})`}
        />
        {/* Lower Z Wing */}
        <path
          d="M 376 364 C 376 375 367 384 356 384 H 168 C 152 384 139 371 139 355 C 139 346 143 337 150 330 L 276 208 H 204 C 196 208 190 202 190 194 C 190 186 196 180 204 180 H 320 L 198 298 C 190 306 185 317 185 328 C 185 343 197 356 212 356 H 356 C 367 356 376 363 376 364 Z"
          fill={`url(#zynq-s-${size})`}
        />
        <circle cx="256" cy="256" r="12" fill="#FFFFFF" />
        <circle cx="256" cy="256" r="22" stroke="#00F0FF" strokeWidth="4" opacity="0.8" />
      </svg>
    </div>
  );
};
