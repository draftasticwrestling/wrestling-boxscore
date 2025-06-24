import React from 'react';

// SVG championship belt icon, styled for gold/black theme
export default function BeltIcon({ style = {}, size = 36 }) {
  return (
    <svg
      width={size}
      height={size * 0.32}
      viewBox="0 0 340 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <ellipse cx="170" cy="55" rx="165" ry="50" fill="#222" stroke="#888" strokeWidth="6" />
      <ellipse cx="170" cy="55" rx="90" ry="40" fill="#111" stroke="#C6A04F" strokeWidth="6" />
      <ellipse cx="170" cy="55" rx="55" ry="38" fill="#C6A04F" stroke="#FFD700" strokeWidth="4" />
      <ellipse cx="170" cy="55" rx="32" ry="28" fill="#FFD700" stroke="#C6A04F" strokeWidth="2" />
      {/* Side plates */}
      <ellipse cx="60" cy="55" rx="22" ry="18" fill="#C6A04F" stroke="#FFD700" strokeWidth="2" />
      <ellipse cx="280" cy="55" rx="22" ry="18" fill="#C6A04F" stroke="#FFD700" strokeWidth="2" />
      {/* Decorative laurels */}
      <path d="M150 55 Q160 35 170 55 Q180 35 190 55" stroke="#FFD700" strokeWidth="3" fill="none" />
      <path d="M150 55 Q160 75 170 55 Q180 75 190 55" stroke="#FFD700" strokeWidth="3" fill="none" />
      {/* Crown */}
      <path d="M160 38 Q165 30 170 38 Q175 30 180 38" stroke="#FFD700" strokeWidth="2" fill="none" />
      <circle cx="170" cy="38" r="2" fill="#FFD700" />
      {/* Strap holes */}
      <circle cx="18" cy="55" r="6" fill="#111" stroke="#888" strokeWidth="2" />
      <circle cx="38" cy="55" r="6" fill="#111" stroke="#888" strokeWidth="2" />
      <circle cx="322" cy="55" r="6" fill="#111" stroke="#888" strokeWidth="2" />
      <circle cx="302" cy="55" r="6" fill="#111" stroke="#888" strokeWidth="2" />
    </svg>
  );
} 