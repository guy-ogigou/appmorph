import { render } from 'preact';
import { AppmorphInitOptions, AppmorphSDK, CreateTaskResponse, TaskStatusResponse } from '@appmorph/shared';
import { Widget } from './widget/Widget.js';
import { ApiClient } from './api/client.js';

let containerEl: HTMLElement | null = null;
let apiClient: ApiClient | null = null;
let widgetIsOpen = false;

/**
 * Initialize the Appmorph SDK.
 */
function init(options: AppmorphInitOptions): void {
  // Validate options
  if (!options.endpoint) {
    throw new Error('Appmorph: endpoint is required');
  }
  if (!options.auth) {
    throw new Error('Appmorph: auth adapter is required');
  }

  // Create API client
  apiClient = new ApiClient(options.endpoint, options.auth);

  // Create container element
  containerEl = document.createElement('div');
  containerEl.id = 'appmorph-container';
  document.body.appendChild(containerEl);

  // Render widget
  render(
    <Widget
      position={options.position || 'bottom-right'}
      theme={options.theme || 'auto'}
      buttonLabel={options.buttonLabel}
      onSubmit={handleSubmit}
      onOpenChange={handleOpenChange}
    />,
    containerEl
  );
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
  widgetIsOpen = false;
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

  apiClient.createTask(prompt)
    .then((response) => {
      console.log('Task created:', response.taskId);
      // Stream progress via SSE
      apiClient!.streamTaskProgress(response.taskId, {
        onProgress: (progress) => {
          console.log('Progress:', progress);
        },
        onComplete: (result) => {
          console.log('Complete:', result);
        },
        onError: (error) => {
          console.error('Error:', error);
        },
      });
    })
    .catch((error) => {
      console.error('Failed to create task:', error);
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
