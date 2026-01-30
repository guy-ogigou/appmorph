import { useState, useRef, useEffect } from 'preact/hooks';
import { ChainEntry } from '@appmorph/shared';
import { styles } from './styles.js';

const COOKIE_NAME = 'appmorph_session';

/**
 * Check if the appmorph_session cookie exists.
 */
function hasSessionCookie(): boolean {
  return document.cookie.split(';').some(c => c.trim().startsWith(`${COOKIE_NAME}=`));
}

/**
 * Delete the session cookie.
 */
function deleteSessionCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

export interface PanelProps {
  theme: 'light' | 'dark';
  onClose: () => void;
  onSubmit: (prompt: string) => void;
  onNewTask?: () => void;
  consoleOutput?: string[];
  isRunning?: boolean;
  stageUrl?: string;
  chain?: ChainEntry[];
  onShowHistory?: () => void;
  onRollback?: (sessionId: string) => void;
  onViewVersion?: (sessionId: string) => void;
  showHistory?: boolean;
  onHideHistory?: () => void;
}

export function Panel({
  theme,
  onClose,
  onSubmit,
  onNewTask,
  consoleOutput = [],
  isRunning = false,
  stageUrl,
  chain = [],
  onShowHistory,
  onRollback,
  onViewVersion,
  showHistory = false,
  onHideHistory,
}: PanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSession, setHasSession] = useState(hasSessionCookie());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Check for session cookie on mount and when stageUrl changes
  useEffect(() => {
    setHasSession(hasSessionCookie());
  }, [stageUrl]);

  // Auto-scroll console to bottom when new output arrives
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleOutput]);

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

  const handleOpenStage = () => {
    if (!stageUrl) return;

    // Parse session ID from URL hash (format: http://host:port/#session=<id>)
    const url = new URL(stageUrl);
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const sessionId = hashParams.get('session');

    if (sessionId) {
      // Set the session cookie
      document.cookie = `${COOKIE_NAME}=${sessionId}; path=/; max-age=86400`;
      console.log(`[Appmorph] Set session cookie: ${sessionId}`);
      setHasSession(true);
    }

    // Open the base URL (without hash) in a new tab
    const baseUrl = `${url.protocol}//${url.host}`;
    window.open(baseUrl, '_blank');
  };

  const handleRevertToDefault = () => {
    deleteSessionCookie();
    setHasSession(false);
    console.log('[Appmorph] Session cookie deleted, reverting to default');
    // Refresh the page to load the default version
    window.location.reload();
  };

  return (
    <div style={styles.panel(theme)}>
      <div style={styles.panelHeader(theme)}>
        <h3 style={styles.panelTitle(theme)}>Appmorph</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {chain.length > 0 && onShowHistory && !showHistory && (
            <button
              type="button"
              onClick={onShowHistory}
              style={styles.historyButton(theme)}
              title="View change history"
            >
              History ({chain.length})
            </button>
          )}
          {hasSession && (
            <button
              type="button"
              onClick={handleRevertToDefault}
              style={styles.revertButton(theme)}
              title="Revert to default version"
            >
              Revert
            </button>
          )}
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
      </div>

      <div style={styles.panelBody(theme)}>
        {showHistory ? (
          // Show chain history view
          <div style={styles.chainContainer(theme)}>
            <div style={styles.chainHeader(theme)}>
              <span style={styles.chainTitle(theme)}>Change History</span>
              {onHideHistory && (
                <button
                  type="button"
                  onClick={onHideHistory}
                  style={styles.chainBackButton(theme)}
                >
                  Back
                </button>
              )}
            </div>
            {chain.length === 0 ? (
              <div style={styles.chainEmpty(theme)}>
                No changes yet. Submit a task to start building your chain.
              </div>
            ) : (
              <div style={styles.chainList(theme)}>
                {chain.map((entry) => (
                  <div key={entry.session_id} style={styles.chainEntry(theme, entry.is_current)}>
                    <div style={styles.chainEntryHeader(theme)}>
                      <span style={styles.chainPosition(theme)}>
                        #{entry.chain_position + 1}
                      </span>
                      {entry.is_current && (
                        <span style={styles.currentBadge(theme)}>Current</span>
                      )}
                    </div>
                    <div style={styles.chainPrompt(theme)}>
                      {entry.prompt}
                    </div>
                    <div style={styles.chainMeta(theme)}>
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                    <div style={styles.chainActions(theme)}>
                      {onViewVersion && (
                        <button
                          type="button"
                          onClick={() => onViewVersion(entry.session_id)}
                          style={styles.chainViewButton(theme)}
                        >
                          View
                        </button>
                      )}
                      {!entry.is_current && onRollback && (
                        <button
                          type="button"
                          onClick={() => onRollback(entry.session_id)}
                          style={styles.chainRollbackButton(theme)}
                        >
                          Rollback Here
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : consoleOutput.length > 0 || isRunning ? (
          // Show console output when running or when there's output
          <>
            <div style={styles.consoleContainer(theme)}>
              <div style={styles.consoleHeader(theme)}>
                <span style={styles.consoleTitle(theme)}>
                  {isRunning ? '● Running...' : '✓ Complete'}
                </span>
              </div>
              <div ref={consoleRef} style={styles.consoleOutput(theme)}>
                {consoleOutput.map((line, i) => (
                  <pre key={i} style={styles.consoleLine(theme)}>{line}</pre>
                ))}
                {isRunning && consoleOutput.length === 0 && (
                  <span style={styles.consoleWaiting(theme)}>Waiting for output...</span>
                )}
              </div>
            </div>
            {!isRunning && (
              <div style={styles.newTaskContainer}>
                {stageUrl && (
                  <button
                    type="button"
                    onClick={handleOpenStage}
                    style={styles.openStageButton(theme)}
                  >
                    Open Stage
                  </button>
                )}
                {onNewTask && (
                  <button
                    type="button"
                    onClick={onNewTask}
                    style={styles.newTaskButton(theme)}
                  >
                    New Task
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          // Show prompt form when not running
          <>
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
                <div style={styles.buttonGroup}>
                  {prompt.trim() && (
                    <button
                      type="button"
                      onClick={() => setPrompt('')}
                      style={styles.resetButton(theme)}
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isSubmitting}
                    style={styles.submitButton(theme, !prompt.trim() || isSubmitting)}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
