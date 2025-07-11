export default function InactiveIcon({ size = 28, style = {} }) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" style={style}>
        {/* TV shape */}
        <rect x="6" y="10" width="20" height="12" rx="2" fill="#222" stroke="#bbb" strokeWidth="2" />
        <rect x="12" y="24" width="8" height="2" fill="#bbb" />
        {/* Slash */}
        <line x1="8" y1="12" x2="24" y2="22" stroke="#e74c3c" strokeWidth="3" />
      </svg>
    );
  }