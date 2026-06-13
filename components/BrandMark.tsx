import React from 'react';

const BRAND_TAGLINE = 'AI INTERIOR DESIGN STUDIO';

export const BrandLogo = ({ className = '' }: { className?: string }) => (
  <img
    src="/logo-full-dark.svg"
    alt="RoomWise AI Interior Design Studio"
    className={`brand-logo ${className}`.trim()}
  />
);

export const BrandIcon = ({ className = '' }: { className?: string }) => (
  <img
    src="/favicon.svg"
    alt=""
    aria-hidden="true"
    className={`brand-icon ${className}`.trim()}
  />
);

export const BrandWordmark = ({ className = '' }: { className?: string }) => (
  <h1 className={`brand-wordmark ${className}`.trim()}>
    <span className="brand-room">Room</span><span className="brand-wise">Wise</span>
  </h1>
);

export const BrandTagline = ({ className = '' }: { className?: string }) => (
  <span className={`brand-tagline ${className}`.trim()} aria-label={BRAND_TAGLINE}>
    {Array.from(BRAND_TAGLINE).map((char, index) => (
      char === ' '
        ? <span key={`space-${index}`} className="brand-tagline__space" aria-hidden="true" />
        : <span key={`${char}-${index}`} aria-hidden="true">{char}</span>
    ))}
  </span>
);
