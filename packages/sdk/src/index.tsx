import { render } from 'preact';
import { AppmorphInitOptions, AppmorphSDK, CreateTaskResponse, TaskStatusResponse, ChainEntry } from '@appmorph/shared';
import { Widget } from './widget/Widget.js';
import { ApiClient } from './api/client.js';
import { getOrCreateAppmorphUserId } from './utils/cookie.js';

const COOKIE_NAME = 'appmorph_session';

let containerEl: HTMLElement | null = null;
let apiClient: ApiClient | null = null;
let appmorphUserId: string | null = null;
let widgetIsOpen = false;
let consoleOutput: string[] = [];
let isRunning = false;
let currentOptions: AppmorphInitOptions | null = null;
let currentStageUrl: string | undefined = undefined;
let chain: ChainEntry[] = [];
let showHistory = false;
let isDeploying = false;
let showReadyToast = false;

/**
 * Check if an agent message should be filtered out (file read/write operations).
 */
function shouldFilterMessage(content: string): boolean {
  const lowerContent = content.toLowerCase();
  // Filter out file read messages
  if (lowerContent.includes('reading file') ||
      lowerContent.includes('read file') ||
      lowerContent.includes('reading:') ||
      lowerContent.includes('⏺ read')) {
    return true;
  }
  // Filter out file write messages
  if (lowerContent.includes('writing to') ||
      lowerContent.includes('wrote file') ||
      lowerContent.includes('writing file') ||
      lowerContent.includes('⏺ write') ||
      lowerContent.includes('⏺ edit')) {
    return true;
  }
  return false;
}

/**
 * Clear console output and return to prompt form.
 */
function handleNewTask(): void {
  consoleOutput = [];
  isRunning = false;
  currentStageUrl = undefined;
  showHistory = false;
  isDeploying = false;
  showReadyToast = false;
  renderWidget();
}

/**
 * Fetch the user's chain from the backend.
 */
async function fetchChain(): Promise<void> {
  if (!apiClient) return;
  try {
    const response = await apiClient.getChain();
    chain = response.chain;
    renderWidget();
  } catch (error) {
    console.error('[Appmorph] Failed to fetch chain:', error);
  }
}

/**
 * Show the chain history view.
 */
function handleShowHistory(): void {
  showHistory = true;
  fetchChain(); // Refresh chain data
  renderWidget();
}

/**
 * Hide the chain history view.
 */
function handleHideHistory(): void {
  showHistory = false;
  renderWidget();
}

/**
 * View a specific version by setting the session cookie.
 */
function handleViewVersion(sessionId: string): void {
  document.cookie = `${COOKIE_NAME}=${sessionId}; path=/; max-age=86400`;
  console.log(`[Appmorph] Set session cookie: ${sessionId}`);
  window.location.reload();
}

/**
 * Rollback to a specific version.
 */
async function handleRollback(sessionId: string): Promise<void> {
  if (!apiClient) return;
  try {
    const response = await apiClient.rollbackTo(sessionId);
    if (response.success) {
      console.log(`[Appmorph] Rolled back to ${sessionId}. Removed: ${response.removed_sessions.join(', ')}`);

      if (response.current_session_id) {
        // Update cookie to the new current session
        document.cookie = `${COOKIE_NAME}=${response.current_session_id}; path=/; max-age=86400`;
      } else {
        // Reset to original - delete the session cookie
        document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
        console.log('[Appmorph] Reset to original state');
      }

      // Refresh chain and page
      await fetchChain();
      window.location.reload();
    } else {
      console.error('[Appmorph] Rollback failed:', response.error);
      alert(`Rollback failed: ${response.error}`);
    }
  } catch (error) {
    console.error('[Appmorph] Rollback error:', error);
    alert(`Rollback error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Re-render the widget with current state.
 */
function handleLoadNewVersion(): void {
  if (!currentStageUrl) return;

  // Parse session ID from URL hash (format: http://host:port/#session=<id>)
  const url = new URL(currentStageUrl);
  const hashParams = new URLSearchParams(url.hash.slice(1));
  const sessionId = hashParams.get('session');

  if (sessionId) {
    // Set the session cookie
    document.cookie = `${COOKIE_NAME}=${sessionId}; path=/; max-age=86400`;
    console.log(`[Appmorph] Loading new version with session: ${sessionId}`);
  }

  // Reset state and reload
  showReadyToast = false;
  isDeploying = false;
  window.location.reload();
}

function renderWidget(): void {
  if (!containerEl || !currentOptions) return;

  render(
    <Widget
      position={currentOptions.position || 'bottom-right'}
      theme={currentOptions.theme || 'auto'}
      buttonLabel={currentOptions.buttonLabel}
      onSubmit={handleSubmit}
      onOpenChange={handleOpenChange}
      onNewTask={handleNewTask}
      consoleOutput={consoleOutput}
      isRunning={isRunning}
      stageUrl={currentStageUrl}
      chain={chain}
      onShowHistory={handleShowHistory}
      onRollback={handleRollback}
      onViewVersion={handleViewVersion}
      showHistory={showHistory}
      onHideHistory={handleHideHistory}
      isDeploying={isDeploying}
      showReadyToast={showReadyToast}
      onLoadNewVersion={handleLoadNewVersion}
    />,
    containerEl
  );
}

/**
 * Initialize the Appmorph SDK.
 */
function init(options: AppmorphInitOptions): void {
  // Validate options
  if (options.endpoint === undefined || options.endpoint === null) {
    throw new Error('Appmorph: endpoint is required');
  }
  if (!options.auth) {
    throw new Error('Appmorph: auth adapter is required');
  }

  // Store options for re-rendering
  currentOptions = options;

  // Get or create appmorph_user_id (from provided user_id or cookie)
  appmorphUserId = getOrCreateAppmorphUserId(options.user_id);

  // Create API client with appmorph user ID
  apiClient = new ApiClient(options.endpoint, options.auth, appmorphUserId);

  // Create container element
  containerEl = document.createElement('div');
  containerEl.id = 'appmorph-container';
  document.body.appendChild(containerEl);

  // Render widget
  renderWidget();

  // Fetch chain data in the background
  fetchChain();
}

/**
 * Open the widget panel.
 */
function open(): void {
  widgetIsOpen = true;
  if (containerEl) {
    containerEl.dispatchEvent(new CustomEvent('appmorph:open'));
  }
}

/**
 * Close the widget panel.
 */
function close(): void {
  widgetIsOpen = false;
  if (containerEl) {
    containerEl.dispatchEvent(new CustomEvent('appmorph:close'));
  }
}

/**
 * Destroy the widget and clean up.
 */
function destroy(): void {
  if (containerEl) {
    render(null, containerEl);
    containerEl.remove();
    containerEl = null;
  }
  apiClient = null;
  appmorphUserId = null;
  widgetIsOpen = false;
  consoleOutput = [];
  isRunning = false;
  currentOptions = null;
  currentStageUrl = undefined;
  chain = [];
  showHistory = false;
  isDeploying = false;
  showReadyToast = false;
}

/**
 * Submit a prompt to the backend.
 */
async function submitPrompt(prompt: string): Promise<CreateTaskResponse> {
  if (!apiClient) {
    throw new Error('Appmorph: SDK not initialized');
  }
  return apiClient.createTask(prompt);
}

/**
 * Get the status of a task.
 */
async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  if (!apiClient) {
    throw new Error('Appmorph: SDK not initialized');
  }
  return apiClient.getTaskStatus(taskId);
}

// Internal handlers
function handleSubmit(prompt: string): void {
  if (!apiClient) return;

  // Clear previous output and set running state
  consoleOutput = [];
  isRunning = true;
  isDeploying = false;
  showReadyToast = false;
  renderWidget();

  apiClient.createTask(prompt)
    .then((response) => {
      console.log('Task created:', response.taskId);
      // Stream progress via SSE
      apiClient!.streamTaskProgress(response.taskId, {
        onProgress: (progress) => {
          // Add stdout content to console output (filter out file read/write messages)
          if (progress.type === 'stdout' || progress.type === 'log') {
            if (!shouldFilterMessage(progress.content)) {
              consoleOutput = [...consoleOutput, progress.content];
              renderWidget();
            }
          }
        },
        onComplete: (result) => {
          console.log('Complete:', result);
          isRunning = false;

          if (result.success) {
            // Show deploying state
            isDeploying = true;
            renderWidget();

            // Extract deploy URL if available
            if (result.deployInfo?.deployUrl) {
              currentStageUrl = result.deployInfo.deployUrl;
              // Deployment complete - show toast
              isDeploying = false;
              showReadyToast = true;
              renderWidget();
              // Refresh chain after task completes
              fetchChain();
            } else {
              // No deploy info - just show completion
              isDeploying = false;
              consoleOutput = [...consoleOutput, `\n--- Task completed ---`];
              renderWidget();
              fetchChain();
            }
          } else {
            // Task failed
            consoleOutput = [...consoleOutput, `\n--- Task failed ---`];
            renderWidget();
          }
        },
        onError: (error) => {
          console.error('Error:', error);
          isRunning = false;
          isDeploying = false;
          consoleOutput = [...consoleOutput, `\n--- Error: ${error.message} ---`];
          renderWidget();
        },
      });
    })
    .catch((error) => {
      console.error('Failed to create task:', error);
      isRunning = false;
      isDeploying = false;
      consoleOutput = [...consoleOutput, `Failed to create task: ${error.message}`];
      renderWidget();
    });
}

function handleOpenChange(newOpenState: boolean): void {
  widgetIsOpen = newOpenState;
}

/**
 * Check if the widget is currently open.
 */
function isOpen(): boolean {
  return widgetIsOpen;
}

// Export SDK interface
const Appmorph: AppmorphSDK = {
  init,
  open,
  close,
  isOpen,
  destroy,
  submitPrompt,
  getTaskStatus,
};

export default Appmorph;
export { Appmorph };
export type { AppmorphInitOptions, AppmorphSDK } from '@appmorph/shared';

// Re-export auth adapter utilities
export {
  createStaticAuthAdapter,
  createCallbackAuthAdapter,
  createLocalStorageAuthAdapter,
} from './auth/adapter.js';
export type { AuthAdapter, UserContext } from '@appmorph/shared';
