export default function MedicalCrossIcon({ size = 28, style = {} }) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" style={style}>
        <circle cx="16" cy="16" r="16" fill="#fff" />
        <rect x="13" y="7" width="6" height="18" fill="#e74c3c" />
        <rect x="7" y="13" width="18" height="6" fill="#e74c3c" />
      </svg>
    );
  }