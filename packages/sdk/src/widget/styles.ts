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

  resetButton: (_theme: Theme): CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid var(--appmorph-border)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: 'var(--appmorph-text-muted)',
    transition: 'all 0.2s ease',
  }),

  buttonGroup: {
    display: 'flex',
    gap: '8px',
  } as CSSProperties,

  // Console output styles
  consoleContainer: (_theme: Theme): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    height: '300px',
    border: '1px solid var(--appmorph-border)',
    borderRadius: '8px',
    overflow: 'hidden',
  }),

  consoleHeader: (_theme: Theme): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: 'var(--appmorph-bg-panel)',
    borderBottom: '1px solid var(--appmorph-border)',
  }),

  consoleTitle: (_theme: Theme): CSSProperties => ({
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--appmorph-text-muted)',
  }),

  consoleOutput: (theme: Theme): CSSProperties => ({
    flex: 1,
    padding: '12px',
    overflowY: 'auto',
    backgroundColor: theme === 'dark' ? '#0d1117' : '#1e1e1e',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '12px',
    lineHeight: 1.5,
  }),

  consoleLine: (_theme: Theme): CSSProperties => ({
    margin: 0,
    padding: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: '#d4d4d4',
  }),

  consoleWaiting: (_theme: Theme): CSSProperties => ({
    color: '#6b7280',
    fontStyle: 'italic',
  }),

  newTaskContainer: {
    marginTop: '12px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  } as CSSProperties,

  newTaskButton: (_theme: Theme): CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: 'var(--appmorph-primary)',
    color: '#ffffff',
    transition: 'all 0.2s ease',
  }),

  openStageButton: (_theme: Theme): CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid var(--appmorph-primary)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: 'var(--appmorph-primary)',
    transition: 'all 0.2s ease',
  }),

  revertButton: (_theme: Theme): CSSProperties => ({
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid var(--appmorph-border)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: 'var(--appmorph-text-muted)',
    transition: 'all 0.2s ease',
  }),

  // History button in header
  historyButton: (_theme: Theme): CSSProperties => ({
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid var(--appmorph-border)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: 'var(--appmorph-text-muted)',
    transition: 'all 0.2s ease',
  }),

  // Chain history styles
  chainContainer: (_theme: Theme): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '350px',
    overflow: 'hidden',
  }),

  chainHeader: (_theme: Theme): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  }),

  chainTitle: (_theme: Theme): CSSProperties => ({
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--appmorph-text)',
  }),

  chainBackButton: (_theme: Theme): CSSProperties => ({
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid var(--appmorph-border)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: 'var(--appmorph-text-muted)',
    transition: 'all 0.2s ease',
  }),

  chainList: (_theme: Theme): CSSProperties => ({
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  }),

  chainEntry: (_theme: Theme, isCurrent: boolean): CSSProperties => ({
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${isCurrent ? 'var(--appmorph-primary)' : 'var(--appmorph-border)'}`,
    backgroundColor: isCurrent ? 'rgba(99, 102, 241, 0.1)' : 'var(--appmorph-bg)',
  }),

  chainEntryHeader: (_theme: Theme): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  }),

  chainPosition: (_theme: Theme): CSSProperties => ({
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--appmorph-primary)',
  }),

  currentBadge: (_theme: Theme): CSSProperties => ({
    fontSize: '10px',
    fontWeight: 500,
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'var(--appmorph-primary)',
    color: '#ffffff',
  }),

  chainPrompt: (_theme: Theme): CSSProperties => ({
    fontSize: '13px',
    color: 'var(--appmorph-text)',
    lineHeight: 1.4,
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  }),

  chainMeta: (_theme: Theme): CSSProperties => ({
    fontSize: '11px',
    color: 'var(--appmorph-text-muted)',
    marginBottom: '8px',
  }),

  chainActions: (_theme: Theme): CSSProperties => ({
    display: 'flex',
    gap: '6px',
  }),

  chainViewButton: (_theme: Theme): CSSProperties => ({
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid var(--appmorph-primary)',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: 'var(--appmorph-primary)',
    transition: 'all 0.2s ease',
  }),

  chainRollbackButton: (_theme: Theme): CSSProperties => ({
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ef4444',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    color: '#ef4444',
    transition: 'all 0.2s ease',
  }),

  chainEmpty: (_theme: Theme): CSSProperties => ({
    textAlign: 'center',
    padding: '24px',
    color: 'var(--appmorph-text-muted)',
    fontSize: '14px',
  }),

  // Toast modal styles
  toastOverlay: (_theme: Theme): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    minHeight: '200px',
  }),

  toastModal: (_theme: Theme): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    borderRadius: '12px',
    backgroundColor: 'var(--appmorph-bg-panel)',
    border: '1px solid var(--appmorph-border)',
    textAlign: 'center',
  }),

  toastIcon: (_theme: Theme): CSSProperties => ({
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '16px',
  }),

  toastTitle: (_theme: Theme): CSSProperties => ({
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--appmorph-text)',
  }),

  toastMessage: (_theme: Theme): CSSProperties => ({
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: 'var(--appmorph-text-muted)',
    lineHeight: 1.5,
  }),

  toastButton: (_theme: Theme): CSSProperties => ({
    padding: '10px 24px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    backgroundColor: 'var(--appmorph-primary)',
    color: '#ffffff',
    transition: 'all 0.2s ease',
  }),
};
