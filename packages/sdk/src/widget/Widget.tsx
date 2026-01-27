import { useState, useEffect } from 'preact/hooks';
import { Button } from './Button.js';
import { Panel } from './Panel.js';
import { styles } from './styles.js';

export interface WidgetProps {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme: 'light' | 'dark' | 'auto';
  buttonLabel?: string;
  onSubmit: (prompt: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function Widget({
  position,
  theme,
  buttonLabel,
  onSubmit,
  onOpenChange,
}: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Handle theme resolution
  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');

      const handler = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => {
        mediaQuery.removeEventListener('change', handler);
      };
    } else {
      setResolvedTheme(theme);
      return;
    }
  }, [theme]);

  // Listen for programmatic open/close
  useEffect(() => {
    const container = document.getElementById('appmorph-container');
    if (!container) return;

    const handleOpen = () => {
      setIsOpen(true);
      onOpenChange(true);
    };
    const handleClose = () => {
      setIsOpen(false);
      onOpenChange(false);
    };

    container.addEventListener('appmorph:open', handleOpen);
    container.addEventListener('appmorph:close', handleClose);

    return () => {
      container.removeEventListener('appmorph:open', handleOpen);
      container.removeEventListener('appmorph:close', handleClose);
    };
  }, [onOpenChange]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange(newState);
  };

  const handleSubmit = (prompt: string) => {
    onSubmit(prompt);
  };

  return (
    <div
      data-appmorph
      data-theme={resolvedTheme}
      style={styles.container(position)}
    >
      <style>{getGlobalStyles(resolvedTheme)}</style>

      {isOpen && (
        <Panel
          theme={resolvedTheme}
          onClose={() => handleToggle()}
          onSubmit={handleSubmit}
        />
      )}

      <Button
        theme={resolvedTheme}
        label={buttonLabel}
        isOpen={isOpen}
        onClick={handleToggle}
      />
    </div>
  );
}

function getGlobalStyles(theme: 'light' | 'dark'): string {
  const colors = theme === 'dark'
    ? {
        bg: '#1a1a2e',
        bgPanel: '#16213e',
        text: '#eaeaea',
        textMuted: '#a0a0a0',
        border: '#2d3748',
        primary: '#6366f1',
        primaryHover: '#818cf8',
      }
    : {
        bg: '#ffffff',
        bgPanel: '#f8fafc',
        text: '#1a202c',
        textMuted: '#718096',
        border: '#e2e8f0',
        primary: '#4f46e5',
        primaryHover: '#6366f1',
      };

  return `
    [data-appmorph] * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    [data-appmorph] {
      --appmorph-bg: ${colors.bg};
      --appmorph-bg-panel: ${colors.bgPanel};
      --appmorph-text: ${colors.text};
      --appmorph-text-muted: ${colors.textMuted};
      --appmorph-border: ${colors.border};
      --appmorph-primary: ${colors.primary};
      --appmorph-primary-hover: ${colors.primaryHover};
    }
  `;
}
