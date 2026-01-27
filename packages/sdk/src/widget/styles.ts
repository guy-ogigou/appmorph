import { CSSProperties } from 'preact/compat';

type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
type Theme = 'light' | 'dark';

const getPositionStyles = (position: Position): CSSProperties => {
  const base: CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
  };

  switch (position) {
    case 'bottom-right':
      return { ...base, bottom: '20px', right: '20px' };
    case 'bottom-left':
      return { ...base, bottom: '20px', left: '20px' };
    case 'top-right':
      return { ...base, top: '20px', right: '20px' };
    case 'top-left':
      return { ...base, top: '20px', left: '20px' };
  }
};

export const styles = {
  container: (position: Position): CSSProperties => ({
    ...getPositionStyles(position),
    display: 'flex',
    flexDirection: 'column',
    alignItems: position.includes('right') ? 'flex-end' : 'flex-start',
    gap: '12px',
  }),

  button: (_theme: Theme): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px',
    borderRadius: '24px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: 'var(--appmorph-primary)',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.2s ease',
  }),

  panel: (_theme: Theme): CSSProperties => ({
    width: '360px',
    maxHeight: '500px',
    backgroundColor: 'var(--appmorph-bg)',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
    border: '1px solid var(--appmorph-border)',
    overflow: 'hidden',
  }),

  panelHeader: (_theme: Theme): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid var(--appmorph-border)',
    backgroundColor: 'var(--appmorph-bg-panel)',
  }),

  panelTitle: (_theme: Theme): CSSProperties => ({
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--appmorph-text)',
  }),

  closeButton: (_theme: Theme): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    padding: 0,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: 'var(--appmorph-text-muted)',
  }),

  panelBody: (_theme: Theme): CSSProperties => ({
    padding: '16px',
  }),

  description: (_theme: Theme): CSSProperties => ({
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: 'var(--appmorph-text-muted)',
    lineHeight: 1.5,
  }),

  textarea: (_theme: Theme): CSSProperties => ({
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid var(--appmorph-border)',
    backgroundColor: 'var(--appmorph-bg)',
    color: 'var(--appmorph-text)',
    fontSize: '14px',
    lineHeight: 1.5,
    resize: 'vertical',
    outline: 'none',
  }),

  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '12px',
  } as CSSProperties,

  hint: (_theme: Theme): CSSProperties => ({
    fontSize: '12px',
    color: 'var(--appmorph-text-muted)',
  }),

  submitButton: (_theme: Theme, disabled: boolean): CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: disabled ? 'var(--appmorph-border)' : 'var(--appmorph-primary)',
    color: disabled ? 'var(--appmorph-text-muted)' : '#ffffff',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s ease',
  }),
};
