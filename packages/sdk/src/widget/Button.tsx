import { styles } from './styles.js';

export interface ButtonProps {
  theme: 'light' | 'dark';
  label?: string;
  isOpen: boolean;
  onClick: () => void;
}

export function Button({ theme, label, isOpen, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={styles.button(theme)}
      aria-label={label || 'Open Appmorph'}
      title={label || 'Open Appmorph'}
    >
      {isOpen ? (
        <CloseIcon />
      ) : label ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SparkleIcon />
          {label}
        </span>
      ) : (
        <SparkleIcon />
      )}
    </button>
  );
}

function SparkleIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v1m0 16v1m-8-9H3m18 0h-1M5.6 5.6l.7.7m12.1-.7-.7.7m-12.1 12.1.7-.7m12.1.7-.7-.7" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
