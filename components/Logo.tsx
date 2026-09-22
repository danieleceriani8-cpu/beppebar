// Logo placeholder (da rifare graficamente in seguito).
export default function Logo({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ borderRadius: "50%", flex: "none", display: "block" }}>
      <circle cx="32" cy="32" r="31" fill="#335A44" />
      <circle cx="32" cy="32" r="31" fill="none" stroke="#C97E41" strokeWidth="1.4" opacity=".55" />
      <path d="M16.5 24.5Q32 5 47.5 24.5Q47.5 26.5 45 26.5H19Q16.5 26.5 16.5 24.5Z" fill="#C97E41" />
      <path d="M19 26.5h26" stroke="#A8642F" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="32" cy="8.5" r="2.6" fill="#A8642F" />
      <circle cx="32" cy="35.5" r="17" fill="#F5EFE1" />
      <circle cx="25.3" cy="33.5" r="2.1" fill="#211F1C" />
      <circle cx="38.7" cy="33.5" r="2.1" fill="#211F1C" />
      <ellipse cx="21" cy="39.5" rx="3.7" ry="2.4" fill="#C97E41" opacity=".55" />
      <ellipse cx="43" cy="39.5" rx="3.7" ry="2.4" fill="#C97E41" opacity=".55" />
      <path d="M18.5 41.5Q32 52.5 45.5 41.5Q39 48 32 46.3Q25 48 18.5 41.5Z" fill="#211F1C" />
      <rect x="26.2" y="47.5" width="11.6" height="8.6" rx="2.2" fill="#FFFFFF" />
      <path d="M37.8 49.6h2.4a3 3 0 0 1 0 6h-2.4" fill="none" stroke="#FFFFFF" strokeWidth="2" />
      <rect x="26.2" y="47.5" width="11.6" height="2.2" rx="1.1" fill="#E7DFCB" />
    </svg>
  );
}
