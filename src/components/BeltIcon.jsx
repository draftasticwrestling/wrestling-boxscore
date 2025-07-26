import React from 'react';

const BeltIcon = ({ size = 24, color = '#C6A04F' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 8h18v8H3V8z"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="4"
        fill={color}
        rx="1"
      />
      <circle
        cx="8"
        cy="12"
        r="1"
        fill="#232323"
      />
      <circle
        cx="16"
        cy="12"
        r="1"
        fill="#232323"
      />
    </svg>
  );
};

export default BeltIcon; 