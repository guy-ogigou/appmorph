/**
 * Demo chain test fixtures
 *
 * This module exports the mock steps for a 3-step task chain test:
 * 1. Add a reset button to the counter
 * 2. Change the header color to green
 * 3. Add a counter display message
 */

import { step1, appTsxWithResetButton } from './steps/step1.js';
import { step2, appTsxWithGreenHeader } from './steps/step2.js';
import { step3, appTsxWithCounterMessage } from './steps/step3.js';
import type { MockStep } from '../../../src/agent/mock-agent.js';

/**
 * All mock steps for the demo chain test.
 */
export const demoChainSteps: MockStep[] = [step1, step2, step3];

/**
 * Export individual steps for direct access.
 */
export { step1, step2, step3 };

/**
 * Export file contents for verification.
 */
export { appTsxWithResetButton, appTsxWithGreenHeader, appTsxWithCounterMessage };

/**
 * The original App.tsx content (before any modifications).
 */
export const originalAppTsx = `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Appmorph Demo</h1>
        <p style={styles.subtitle}>
          Click the button in the bottom-right corner to customize this app with AI
        </p>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <h2>Counter Example</h2>
          <p style={styles.count}>{count}</p>
          <div style={styles.buttons}>
            <button
              onClick={() => setCount((c) => c - 1)}
              style={styles.button}
            >
              -
            </button>
            <button
              onClick={() => setCount((c) => c + 1)}
              style={styles.button}
            >
              +
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <h2>Try Appmorph</h2>
          <p>Some things you could ask:</p>
          <ul style={styles.list}>
            <li>Add a reset button to the counter</li>
            <li>Change the color scheme to dark mode</li>
            <li>Add a todo list component</li>
            <li>Make the counter show even/odd status</li>
          </ul>
        </div>
      </main>

      <footer style={styles.footer}>
        <p>Powered by Appmorph.ai</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: '#4f46e5',
    color: 'white',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '1.1rem',
    opacity: 0.9,
  },
  main: {
    flex: 1,
    padding: '40px 20px',
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '300px',
  },
  count: {
    fontSize: '4rem',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4f46e5',
    margin: '20px 0',
  },
  buttons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  button: {
    padding: '10px 30px',
    fontSize: '1.5rem',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#4f46e5',
    color: 'white',
    cursor: 'pointer',
  },
  list: {
    marginTop: '15px',
    paddingLeft: '20px',
  },
  footer: {
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#1a1a2e',
    color: '#a0a0a0',
  },
};
`;
