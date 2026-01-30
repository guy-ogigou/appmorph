/**
 * Step 3: Add a counter display message
 *
 * This fixture defines the file changes for adding a "Count is X" message.
 * Builds on top of step2 (includes reset button and green header).
 */

import type { MockStep } from '../../../../src/agent/mock-agent.js';

/**
 * The App.tsx content after adding counter message.
 * Includes the reset button from step 1 and green header from step 2.
 */
export const appTsxWithCounterMessage = `import React, { useState } from 'react';

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
          <p style={styles.countMessage}>Count is {count}</p>
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
            <button
              onClick={() => setCount(0)}
              style={styles.resetButton}
            >
              Reset
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
    backgroundColor: '#22c55e',
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
    color: '#22c55e',
    margin: '20px 0',
  },
  countMessage: {
    fontSize: '1.2rem',
    textAlign: 'center',
    color: '#374151',
    marginBottom: '15px',
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
    backgroundColor: '#22c55e',
    color: 'white',
    cursor: 'pointer',
  },
  resetButton: {
    padding: '10px 20px',
    fontSize: '1rem',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#6b7280',
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

export const step3: MockStep = {
  promptMatch: 'counter message',
  progress: [
    { type: 'log', content: 'Reading src/App.tsx...' },
    { type: 'log', content: 'Adding counter display message...' },
    { type: 'log', content: 'Adding countMessage style...' },
  ],
  fileChanges: new Map([['src/App.tsx', appTsxWithCounterMessage]]),
  result: {
    success: true,
    summary: 'Added counter display message',
    filesChanged: ['src/App.tsx'],
  },
};
