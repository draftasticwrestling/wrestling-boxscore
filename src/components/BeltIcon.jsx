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
      {/* Gold oval outer ring */}
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="6"
        fill={color}
        stroke={color}
        strokeWidth="1"
      />
      {/* Black center */}
      <ellipse
        cx="12"
        cy="12"
        rx="6"
        ry="3.5"
        fill="#232323"
      />
    </svg>
  );
};

export default BeltIcon; 