import { useState, useRef } from 'preact/hooks';
import { styles } from './styles.js';

export interface PanelProps {
  theme: 'light' | 'dark';
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

export function Panel({ theme, onClose, onSubmit }: PanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      onSubmit(prompt.trim());
      setPrompt('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  return (
    <div style={styles.panel(theme)}>
      <div style={styles.panelHeader(theme)}>
        <h3 style={styles.panelTitle(theme)}>Appmorph</h3>
        <button
          type="button"
          onClick={onClose}
          style={styles.closeButton(theme)}
          aria-label="Close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={styles.panelBody(theme)}>
        <p style={styles.description(theme)}>
          Describe what you'd like to change or add to this app.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={prompt}
            onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Add a dark mode toggle to the header..."
            style={styles.textarea(theme)}
            rows={4}
            disabled={isSubmitting}
          />

          <div style={styles.actions}>
            <span style={styles.hint(theme)}>
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to submit
            </span>
            <button
              type="submit"
              disabled={!prompt.trim() || isSubmitting}
              style={styles.submitButton(theme, !prompt.trim() || isSubmitting)}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
