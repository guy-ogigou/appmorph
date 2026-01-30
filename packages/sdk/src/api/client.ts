import {
  AuthAdapter,
  CreateTaskRequest,
  CreateTaskResponse,
  TaskStatusResponse,
  ChainResponse,
  RollbackRequest,
  RollbackResponse,
  API_ROUTES,
  SSE_EVENTS,
  AgentProgress,
  AgentResult,
} from '@appmorph/shared';

export interface StreamCallbacks {
  onProgress?: (progress: AgentProgress) => void;
  onComplete?: (result: AgentResult) => void;
  onError?: (error: Error) => void;
}

/**
 * API client for communicating with the Appmorph backend.
 */
export class ApiClient {
  private endpoint: string;
  private auth: AuthAdapter;
  private appmorphUserId: string;

  constructor(endpoint: string, auth: AuthAdapter, appmorphUserId: string) {
    this.endpoint = endpoint.replace(/\/$/, ''); // Remove trailing slash
    this.auth = auth;
    this.appmorphUserId = appmorphUserId;
  }

  /**
   * Get authorization headers for requests.
   */
  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.auth.getAuthToken();
    const userContext = await this.auth.getUserContext();

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-User-Id': userContext.userId,
      'X-Group-Ids': userContext.groupIds.join(','),
      'X-Appmorph-User-Id': this.appmorphUserId,
      ...(userContext.tenantId && { 'X-Tenant-Id': userContext.tenantId }),
    };
  }

  /**
   * Create a new task.
   */
  async createTask(prompt: string, groupId?: string): Promise<CreateTaskResponse> {
    const headers = await this.getHeaders();
    const body: CreateTaskRequest = { prompt, groupId };

    const response = await fetch(`${this.endpoint}${API_ROUTES.TASK}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get the status of a task.
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const headers = await this.getHeaders();
    const url = `${this.endpoint}${API_ROUTES.TASK_STATUS.replace(':taskId', taskId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Stream task progress via SSE.
   */
  streamTaskProgress(taskId: string, callbacks: StreamCallbacks): () => void {
    const url = `${this.endpoint}${API_ROUTES.TASK_STREAM.replace(':taskId', taskId)}`;

    const eventSource = new EventSource(url);

    eventSource.addEventListener(SSE_EVENTS.PROGRESS, (event: MessageEvent) => {
      try {
        const progress: AgentProgress = JSON.parse(event.data);
        callbacks.onProgress?.(progress);
      } catch (e) {
        console.error('Failed to parse progress event:', e);
      }
    });

    eventSource.addEventListener(SSE_EVENTS.COMPLETE, (event: MessageEvent) => {
      try {
        const result: AgentResult = JSON.parse(event.data);
        callbacks.onComplete?.(result);
      } catch (e) {
        console.error('Failed to parse complete event:', e);
      }
      eventSource.close();
    });

    eventSource.addEventListener(SSE_EVENTS.ERROR, (event: MessageEvent) => {
      try {
        const error = JSON.parse(event.data);
        callbacks.onError?.(new Error(error.message || 'Unknown error'));
      } catch (e) {
        callbacks.onError?.(new Error('Unknown error'));
      }
      eventSource.close();
    });

    eventSource.onerror = () => {
      callbacks.onError?.(new Error('SSE connection failed'));
      eventSource.close();
    };

    // Return cleanup function
    return () => eventSource.close();
  }

  /**
   * Get the user's chain of changes.
   */
  async getChain(): Promise<ChainResponse> {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.endpoint}${API_ROUTES.CHAIN}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get chain: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Rollback to a specific version in the chain.
   */
  async rollbackTo(targetSessionId: string): Promise<RollbackResponse> {
    const headers = await this.getHeaders();
    const body: RollbackRequest = { target_session_id: targetSessionId };

    const response = await fetch(`${this.endpoint}${API_ROUTES.CHAIN_ROLLBACK}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to rollback: ${response.statusText}`);
    }

    return response.json();
  }
}
